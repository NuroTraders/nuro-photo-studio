import { normalizeTransform } from '../editor/transform-tool.js';

export const EXPORT_FORMATS = Object.freeze({
  png: Object.freeze({ mimeType: 'image/png', extension: 'png', defaultQuality: null }),
  jpeg: Object.freeze({ mimeType: 'image/jpeg', extension: 'jpg', defaultQuality: 0.92 }),
  webp: Object.freeze({ mimeType: 'image/webp', extension: 'webp', defaultQuality: 0.90 }),
});

/** Return pixel-aligned crop bounds and the full-resolution output dimensions. */
export function getExportGeometry(sourceWidth, sourceHeight, transform = {}, crop = null) {
  const width = positivePixelDimension(sourceWidth, 'sourceWidth');
  const height = positivePixelDimension(sourceHeight, 'sourceHeight');
  const normalizedTransform = normalizeTransform(transform);
  const requested = crop ?? { x: 0, y: 0, width, height };
  if (![requested.x, requested.y, requested.width, requested.height].every(Number.isFinite)
    || requested.width <= 0 || requested.height <= 0) {
    throw new RangeError('Crop bounds must have finite, positive dimensions.');
  }

  const clippedLeft = clamp(requested.x, 0, width);
  const clippedTop = clamp(requested.y, 0, height);
  const clippedRight = clamp(requested.x + requested.width, 0, width);
  const clippedBottom = clamp(requested.y + requested.height, 0, height);
  if (clippedRight <= clippedLeft || clippedBottom <= clippedTop) throw new RangeError('Crop bounds do not intersect the source image.');
  const left = clamp(Math.round(clippedLeft), 0, width - 1);
  const top = clamp(Math.round(clippedTop), 0, height - 1);
  const right = clamp(Math.round(clippedRight), left + 1, width);
  const bottom = clamp(Math.round(clippedBottom), top + 1, height);
  const cropRect = { x: left, y: top, width: right - left, height: bottom - top };
  const swapsAxes = normalizedTransform.rotation === 90 || normalizedTransform.rotation === 270;
  return {
    sourceWidth: width,
    sourceHeight: height,
    crop: cropRect,
    rotation: normalizedTransform.rotation,
    flipHorizontal: normalizedTransform.flipHorizontal,
    flipVertical: normalizedTransform.flipVertical,
    width: swapsAxes ? cropRect.height : cropRect.width,
    height: swapsAxes ? cropRect.width : cropRect.height,
  };
}

export function getExportFormat(format) {
  const config = EXPORT_FORMATS[format];
  if (!config) throw new RangeError(`Unsupported export format: ${format}`);
  return config;
}

export function clampExportQuality(quality) {
  const value = Number(quality);
  if (!Number.isFinite(value)) return 0.92;
  return Math.min(1, Math.max(0, value));
}

export function getExportQuality(format, quality) {
  const config = getExportFormat(format);
  return config.defaultQuality == null ? null : clampExportQuality(quality ?? config.defaultQuality);
}

export function generateExportFilename(originalName, format) {
  const config = getExportFormat(format);
  const sourceName = String(originalName || 'image').split(/[\\/]/).pop();
  const baseName = sourceName.replace(/\.(?:jpe?g|png|webp)$/i, '').trim() || 'image';
  return `${sanitizeFilename(baseName)}-edited.${config.extension}`;
}

export function normalizeExportFilename(filename, format) {
  const config = getExportFormat(format);
  const leaf = String(filename || '').split(/[\\/]/).pop() || 'image-edited';
  const baseName = leaf.replace(/\.[^.]*$/, '').trim() || 'image-edited';
  return `${sanitizeFilename(baseName)}.${config.extension}`;
}

/** Render at source-pixel resolution to a detached canvas, independent of the viewport canvas. */
export function renderExportCanvas(image, { transform = {}, crop = null, canvasFactory = () => document.createElement('canvas') } = {}) {
  if (!image || !Number.isFinite(image.naturalWidth) || !Number.isFinite(image.naturalHeight)) {
    throw new TypeError('A decoded source image is required for export.');
  }
  const geometry = getExportGeometry(image.naturalWidth, image.naturalHeight, transform, crop);
  const canvas = canvasFactory();
  canvas.width = geometry.width;
  canvas.height = geometry.height;
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) throw new Error('The full-resolution export canvas could not be created.');

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.translate(geometry.width / 2, geometry.height / 2);
  context.rotate(geometry.rotation * Math.PI / 180);
  context.scale(geometry.flipHorizontal ? -1 : 1, geometry.flipVertical ? -1 : 1);
  context.translate(
    -(geometry.crop.x + geometry.crop.width / 2 - geometry.sourceWidth / 2),
    -(geometry.crop.y + geometry.crop.height / 2 - geometry.sourceHeight / 2),
  );
  context.beginPath();
  context.rect(
    geometry.crop.x - geometry.sourceWidth / 2,
    geometry.crop.y - geometry.sourceHeight / 2,
    geometry.crop.width,
    geometry.crop.height,
  );
  context.clip();
  context.drawImage(image, -geometry.sourceWidth / 2, -geometry.sourceHeight / 2, geometry.sourceWidth, geometry.sourceHeight);
  return { canvas, geometry };
}

export function canvasToBlob(canvas, format, quality) {
  const config = getExportFormat(format);
  const normalizedQuality = getExportQuality(format, quality);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('The image could not be encoded. Try a smaller image or another format.'));
        return;
      }
      if (blob.type && blob.type !== config.mimeType) {
        reject(new Error(`${format.toUpperCase()} export is not supported by this browser.`));
        return;
      }
      resolve(blob);
    }, config.mimeType, normalizedQuality ?? undefined);
  });
}

export async function downloadEditedImage({ image, transform, crop, format, quality, filename, canvasFactory, documentRef = document, urlApi = URL }) {
  const { canvas, geometry } = renderExportCanvas(image, { transform, crop, canvasFactory });
  try {
    const blob = await canvasToBlob(canvas, format, quality);
    const outputName = normalizeExportFilename(filename || generateExportFilename(image.name, format), format);
    const objectUrl = urlApi.createObjectURL(blob);
    let anchor;
    try {
      anchor = documentRef.createElement('a');
      anchor.href = objectUrl;
      anchor.download = outputName;
      anchor.hidden = true;
      documentRef.body.append(anchor);
      anchor.click();
    } finally {
      anchor?.remove();
      urlApi.revokeObjectURL(objectUrl);
    }
    return { filename: outputName, geometry, mimeType: blob.type || getExportFormat(format).mimeType };
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}

function positivePixelDimension(value, name) {
  if (!Number.isFinite(value) || value < 1) throw new RangeError(`${name} must be a positive pixel dimension.`);
  return Math.round(value);
}

function sanitizeFilename(value) {
  return value.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').replace(/[. ]+$/g, '').trim() || 'image';
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}
