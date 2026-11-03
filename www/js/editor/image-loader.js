import { createImageDocument } from '../core/image-document.js';

export const IMAGE_IMPORT_LIMITS = Object.freeze({
  maxFileBytes: 100 * 1024 * 1024,
  maxPixels: 80_000_000,
  maxDimension: 20_000,
  headerBytes: 1024 * 1024,
});

const MIME_BY_FORMAT = Object.freeze({ jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' });
const FORMAT_BY_EXTENSION = Object.freeze({ jpg: 'jpeg', jpeg: 'jpeg', png: 'png', webp: 'webp' });

export class ImageImportError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ImageImportError';
    this.code = code;
  }
}

/** Validate, safely inspect, and decode one local image. The caller owns the returned object URL. */
export async function loadImageFile(file) {
  const format = await validateImageFile(file);
  const header = await readImageHeader(file, format);
  validateDimensions(header.width, header.height);

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = 'async';
    image.src = objectUrl;
    await image.decode();

    // Chromium and current browser image decoders apply EXIF orientation when decoding <img>.
    const width = image.naturalWidth;
    const height = image.naturalHeight;
    validateDimensions(width, height);
    if (width !== header.width || height !== header.height) {
      // Header dimensions are raw JPEG dimensions; EXIF orientations 5–8 swap the axes.
      const orientationSwapsAxes = header.orientation >= 5 && header.orientation <= 8;
      const expectedWidth = orientationSwapsAxes ? header.height : header.width;
      const expectedHeight = orientationSwapsAxes ? header.width : header.height;
      if (width !== expectedWidth || height !== expectedHeight) {
        throw new ImageImportError('dimension-mismatch', 'The image dimensions could not be read reliably. Try another copy of this image.');
      }
    }

    const document = createImageDocument({
      file,
      name: file.name,
      mimeType: MIME_BY_FORMAT[format],
      width,
      height,
      size: file.size,
      orientation: header.orientation,
    });
    return { document, objectUrl };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    if (error instanceof ImageImportError) throw error;
    throw new ImageImportError('decode-failed', 'This file could not be opened as an image. It may be damaged or use an unsupported encoding.');
  }
}

export function releaseLoadedImage(loadedImage) {
  if (loadedImage?.objectUrl) URL.revokeObjectURL(loadedImage.objectUrl);
}

async function validateImageFile(file) {
  if (!(file instanceof Blob) || typeof file.name !== 'string') {
    throw new ImageImportError('invalid-file', 'Choose an image file to open.');
  }
  if (!file.size) throw new ImageImportError('empty-file', 'This file is empty. Choose a JPG, PNG, or WebP image.');
  if (file.size > IMAGE_IMPORT_LIMITS.maxFileBytes) {
    throw new ImageImportError('file-too-large', 'This image is over the 100 MB import limit. Choose a smaller file.');
  }

  const extension = file.name.split('.').pop()?.toLowerCase();
  const extensionFormat = FORMAT_BY_EXTENSION[extension];
  if (!extensionFormat) {
    throw new ImageImportError('unsupported-type', 'Choose a JPG, JPEG, PNG, or WebP image.');
  }
  const declaredType = file.type.toLowerCase();
  const declaredFormat = declaredType ? Object.keys(MIME_BY_FORMAT).find((key) => MIME_BY_FORMAT[key] === declaredType) : null;
  if (declaredType && !declaredFormat) {
    throw new ImageImportError('unsupported-type', 'This file type is not supported. Choose a JPG, JPEG, PNG, or WebP image.');
  }
  if (declaredFormat && declaredFormat !== extensionFormat) {
    throw new ImageImportError('type-mismatch', 'The file extension and image type do not match. Choose a valid image file.');
  }

  const header = new Uint8Array(await file.slice(0, IMAGE_IMPORT_LIMITS.headerBytes).arrayBuffer());
  const actualFormat = detectFormat(header);
  if (!actualFormat || actualFormat !== extensionFormat || (declaredFormat && actualFormat !== declaredFormat)) {
    throw new ImageImportError('invalid-content', 'The file contents do not match a supported JPG, PNG, or WebP image.');
  }
  return actualFormat;
}

function detectFormat(bytes) {
  if (bytes.length >= 8 && bytes[0] === 0x89 && ascii(bytes, 1, 3) === 'PNG' && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return 'png';
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpeg';
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') return 'webp';
  return null;
}

async function readImageHeader(file, format) {
  const bytes = new Uint8Array(await file.slice(0, IMAGE_IMPORT_LIMITS.headerBytes).arrayBuffer());
  if (format === 'png') return readPngHeader(bytes);
  if (format === 'webp') return readWebpHeader(bytes);
  return readJpegHeader(bytes);
}

function readPngHeader(bytes) {
  if (bytes.length < 24 || ascii(bytes, 12, 4) !== 'IHDR') throw invalidHeader();
  return { width: readUint32(bytes, 16), height: readUint32(bytes, 20), orientation: 1 };
}

function readWebpHeader(bytes) {
  const chunk = ascii(bytes, 12, 4);
  if (chunk === 'VP8X' && bytes.length >= 30) {
    return { width: readUint24LE(bytes, 24) + 1, height: readUint24LE(bytes, 27) + 1, orientation: 1 };
  }
  if (chunk === 'VP8 ' && bytes.length >= 30 && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) {
    return { width: readUint16LE(bytes, 26) & 0x3fff, height: readUint16LE(bytes, 28) & 0x3fff, orientation: 1 };
  }
  if (chunk === 'VP8L' && bytes.length >= 25 && bytes[20] === 0x2f) {
    return {
      width: 1 + bytes[21] + ((bytes[22] & 0x3f) << 8),
      height: 1 + (bytes[22] >> 6) + (bytes[23] << 2) + ((bytes[24] & 0x0f) << 10),
      orientation: 1,
    };
  }
  throw invalidHeader();
}

function readJpegHeader(bytes) {
  let offset = 2;
  let orientation = 1;
  while (offset + 4 <= bytes.length && bytes[offset] === 0xff) {
    while (bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset++];
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > bytes.length) break;
    const segmentLength = readUint16BE(bytes, offset);
    if (segmentLength < 2 || offset + segmentLength > bytes.length) break;
    const payloadStart = offset + 2;
    const payloadLength = segmentLength - 2;
    if (marker === 0xe1) orientation = readExifOrientation(bytes, payloadStart, payloadLength) || orientation;
    if (isJpegFrameMarker(marker)) {
      if (payloadLength < 5) break;
      return {
        width: readUint16BE(bytes, payloadStart + 3),
        height: readUint16BE(bytes, payloadStart + 1),
        orientation,
      };
    }
    offset += segmentLength;
  }
  throw invalidHeader();
}

function readExifOrientation(bytes, start, length) {
  if (length < 14 || ascii(bytes, start, 6) !== 'Exif\0\0') return null;
  const tiff = start + 6;
  const littleEndian = ascii(bytes, tiff, 2) === 'II';
  if (!littleEndian && ascii(bytes, tiff, 2) !== 'MM') return null;
  const u16 = (at) => littleEndian ? readUint16LE(bytes, at) : readUint16BE(bytes, at);
  const u32 = (at) => littleEndian ? readUint32LE(bytes, at) : readUint32(bytes, at);
  if (u16(tiff + 2) !== 42) return null;
  const directory = tiff + u32(tiff + 4);
  if (directory + 2 > start + length) return null;
  const count = u16(directory);
  for (let index = 0; index < count; index += 1) {
    const entry = directory + 2 + index * 12;
    if (entry + 12 > start + length) return null;
    if (u16(entry) === 0x0112 && u16(entry + 2) === 3 && u32(entry + 4) >= 1) {
      const value = u16(entry + 8);
      return value >= 1 && value <= 8 ? value : null;
    }
  }
  return null;
}

function validateDimensions(width, height) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) throw invalidHeader();
  if (width > IMAGE_IMPORT_LIMITS.maxDimension || height > IMAGE_IMPORT_LIMITS.maxDimension || width * height > IMAGE_IMPORT_LIMITS.maxPixels) {
    throw new ImageImportError('image-too-large', 'This image is too large to open safely (maximum 80 megapixels and 20,000 pixels per side).');
  }
}

function isJpegFrameMarker(marker) {
  return (marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf);
}

function invalidHeader() {
  return new ImageImportError('invalid-image', 'The image header is incomplete or damaged. Choose another image file.');
}

function ascii(bytes, start, length) {
  let value = '';
  for (let index = start; index < start + length && index < bytes.length; index += 1) value += String.fromCharCode(bytes[index]);
  return value;
}

function readUint16BE(bytes, offset) { return (bytes[offset] << 8) | bytes[offset + 1]; }
function readUint16LE(bytes, offset) { return bytes[offset] | (bytes[offset + 1] << 8); }
function readUint24LE(bytes, offset) { return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16); }
function readUint32(bytes, offset) { return ((bytes[offset] * 0x1000000) + (bytes[offset + 1] << 16) + (bytes[offset + 2] << 8) + bytes[offset + 3]) >>> 0; }
function readUint32LE(bytes, offset) { return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0; }
