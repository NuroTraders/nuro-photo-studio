import test from 'node:test';
import assert from 'node:assert/strict';
import { File } from 'node:buffer';
import { ImageImportError, IMAGE_IMPORT_LIMITS, loadImageFile, releaseLoadedImage } from '../www/js/editor/image-loader.js';

const filesByUrl = new Map();
const dimensionsByName = new Map();
const revokedUrls = [];
let nextUrl = 0;
const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;
const originalImage = globalThis.Image;

URL.createObjectURL = (file) => {
  const url = `blob:test-${++nextUrl}`;
  filesByUrl.set(url, file);
  return url;
};
URL.revokeObjectURL = (url) => { revokedUrls.push(url); filesByUrl.delete(url); };
globalThis.Image = class MockImage {
  decoding = '';
  naturalWidth = 0;
  naturalHeight = 0;
  set src(url) { this.file = filesByUrl.get(url); }
  async decode() {
    if (this.file?.name.startsWith('broken')) throw new Error('decode error');
    const dimensions = dimensionsByName.get(this.file.name);
    this.naturalWidth = dimensions.width;
    this.naturalHeight = dimensions.height;
  }
};

function png(width, height) {
  const bytes = new Uint8Array(24);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  bytes.set([0x49, 0x48, 0x44, 0x52], 12);
  new DataView(bytes.buffer).setUint32(16, width, false);
  new DataView(bytes.buffer).setUint32(20, height, false);
  return bytes;
}

function webp(width, height) {
  const bytes = new Uint8Array(30);
  bytes.set([...Buffer.from('RIFF'), 22, 0, 0, 0, ...Buffer.from('WEBP'), ...Buffer.from('VP8X')]);
  bytes[24] = (width - 1) & 0xff;
  bytes[25] = ((width - 1) >> 8) & 0xff;
  bytes[26] = ((width - 1) >> 16) & 0xff;
  bytes[27] = (height - 1) & 0xff;
  bytes[28] = ((height - 1) >> 8) & 0xff;
  bytes[29] = ((height - 1) >> 16) & 0xff;
  return bytes;
}

function orientedJpeg(width, height, orientation) {
  const exif = new Uint8Array([
    0xff, 0xd8, 0xff, 0xe1, 0x00, 0x22,
    0x45, 0x78, 0x69, 0x66, 0x00, 0x00,
    0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00,
    0x01, 0x00, 0x12, 0x01, 0x03, 0x00, 0x01, 0x00, 0x00, 0x00,
    orientation, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  ]);
  const frame = new Uint8Array([
    0xff, 0xc0, 0x00, 0x11, 0x08,
    (height >> 8) & 0xff, height & 0xff,
    (width >> 8) & 0xff, width & 0xff,
    0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x00, 0x03, 0x11, 0x00,
  ]);
  const bytes = new Uint8Array(exif.length + frame.length);
  bytes.set(exif);
  bytes.set(frame, exif.length);
  return bytes;
}

test('validates JPG, PNG, and WebP headers; keeps the original File and uses decoded dimensions', async (t) => {
  const cases = [
    { name: 'portrait.jpg', type: 'image/jpeg', bytes: orientedJpeg(3, 2, 1), width: 3, height: 2 },
    { name: 'landscape.png', type: 'image/png', bytes: png(4, 2), width: 4, height: 2 },
    { name: 'photo.webp', type: 'image/webp', bytes: webp(5, 3), width: 5, height: 3 },
  ];
  for (const item of cases) {
    await t.test(item.name, async () => {
      dimensionsByName.set(item.name, { width: item.width, height: item.height });
      const file = new File([item.bytes], item.name, { type: item.type });
      const before = new Uint8Array(await file.arrayBuffer());
      const loaded = await loadImageFile(file);
      assert.equal(loaded.document.original.file, file);
      assert.equal(loaded.document.width, item.width);
      assert.equal(loaded.document.height, item.height);
      assert.equal(loaded.document.workingState.width, item.width);
      assert.equal(loaded.document.status, 'loaded');
      assert.deepEqual(new Uint8Array(await file.arrayBuffer()), before);
      releaseLoadedImage(loaded);
      assert.ok(revokedUrls.includes(loaded.objectUrl));
    });
  }
});

test('applies EXIF orientation to reported dimensions while retaining original bytes', async () => {
  const name = 'rotated.jpeg';
  dimensionsByName.set(name, { width: 2, height: 3 });
  const file = new File([orientedJpeg(3, 2, 6)], name, { type: 'image/jpeg' });
  const loaded = await loadImageFile(file);
  assert.equal(loaded.document.orientation, 6);
  assert.equal(loaded.document.width, 2);
  assert.equal(loaded.document.height, 3);
  releaseLoadedImage(loaded);
});

test('rejects unsupported content and dimensions beyond the safety limit', async () => {
  const invalid = new File(['plain text'], 'not-an-image.png', { type: 'image/png' });
  await assert.rejects(loadImageFile(invalid), { code: 'invalid-content' });

  const oversizedFile = new File(['x'], 'large.png', { type: 'image/png' });
  Object.defineProperty(oversizedFile, 'size', { value: IMAGE_IMPORT_LIMITS.maxFileBytes + 1 });
  await assert.rejects(loadImageFile(oversizedFile), { code: 'file-too-large' });

  const mismatched = new File([png(2, 2)], 'misnamed.jpg', { type: 'image/png' });
  await assert.rejects(loadImageFile(mismatched), { code: 'type-mismatch' });

  const tooLarge = new File([png(10_000, 10_000)], 'huge.png', { type: 'image/png' });
  await assert.rejects(loadImageFile(tooLarge), (error) => error instanceof ImageImportError && error.code === 'image-too-large');
  const tooWide = new File([png(20_001, 1)], 'too-wide.png', { type: 'image/png' });
  await assert.rejects(loadImageFile(tooWide), (error) => error instanceof ImageImportError && error.code === 'image-too-large');
  assert.equal(IMAGE_IMPORT_LIMITS.maxPixels, 80_000_000);
});

test('releases its object URL when decoding fails', async () => {
  const name = 'broken.png';
  dimensionsByName.set(name, { width: 2, height: 2 });
  const file = new File([png(2, 2)], name, { type: 'image/png' });
  const revokedBefore = revokedUrls.length;
  await assert.rejects(loadImageFile(file), { code: 'decode-failed' });
  assert.equal(revokedUrls.length, revokedBefore + 1);
  assert.equal([...filesByUrl.values()].includes(file), false);
});

test.after(() => {
  URL.createObjectURL = originalCreateObjectURL;
  URL.revokeObjectURL = originalRevokeObjectURL;
  globalThis.Image = originalImage;
});
