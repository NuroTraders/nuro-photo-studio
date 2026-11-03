import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EXPORT_FORMATS, canvasToBlob, clampExportQuality, downloadEditedImage, generateExportFilename,
  getExportFormat, getExportGeometry, getExportQuality, normalizeExportFilename, renderExportCanvas,
} from '../www/js/processing/export-engine.js';

test('export geometry swaps full and cropped bounds for quarter turns', () => {
  const expected = new Map([[0, [400, 300]], [90, [300, 400]], [180, [400, 300]], [270, [300, 400]]]);
  for (const [rotation, [width, height]] of expected) {
    const geometry = getExportGeometry(400, 300, { rotation });
    assert.equal(geometry.width, width);
    assert.equal(geometry.height, height);
    assert.deepEqual(geometry.crop, { x: 0, y: 0, width: 400, height: 300 });
  }
  const cropped = getExportGeometry(400, 300, { rotation: 90 }, { x: 100, y: 50, width: 200, height: 100 });
  assert.deepEqual(cropped.crop, { x: 100, y: 50, width: 200, height: 100 });
  assert.equal(cropped.width, 100);
  assert.equal(cropped.height, 200);
});

test('export geometry pixel-aligns and clamps the effective crop; flips do not change bounds', () => {
  const geometry = getExportGeometry(400, 300, { rotation: 270, flipHorizontal: true, flipVertical: true }, {
    x: 10.2, y: 20.4, width: 100.1, height: 50.2,
  });
  assert.deepEqual(geometry.crop, { x: 10, y: 20, width: 100, height: 51 });
  assert.equal(geometry.width, 51);
  assert.equal(geometry.height, 100);
  assert.equal(geometry.flipHorizontal, true);
  assert.equal(geometry.flipVertical, true);
  assert.throws(() => getExportGeometry(400, 300, {}, { x: 500, y: 0, width: 20, height: 20 }), RangeError);
});

test('export format MIME types, quality bounds, and smart filename extensions are correct', () => {
  assert.equal(getExportFormat('png').mimeType, 'image/png');
  assert.equal(getExportFormat('jpeg').mimeType, 'image/jpeg');
  assert.equal(getExportFormat('webp').mimeType, 'image/webp');
  assert.deepEqual(Object.keys(EXPORT_FORMATS), ['png', 'jpeg', 'webp']);
  assert.equal(getExportQuality('png', 0.4), null);
  assert.equal(getExportQuality('jpeg'), 0.92);
  assert.equal(getExportQuality('webp'), 0.9);
  assert.equal(clampExportQuality(-1), 0);
  assert.equal(clampExportQuality(1.5), 1);
  assert.equal(clampExportQuality(0.35), 0.35);
  assert.equal(generateExportFilename('family.photo.JPG', 'png'), 'family.photo-edited.png');
  assert.equal(normalizeExportFilename('../final version.png', 'webp'), 'final version.webp');
  assert.throws(() => getExportFormat('gif'), RangeError);
});

test('renderer creates a detached full-resolution canvas and applies crop, rotation, and flips', () => {
  const calls = [];
  const context = {
    translate: (...args) => calls.push(['translate', ...args]),
    rotate: (...args) => calls.push(['rotate', ...args]),
    scale: (...args) => calls.push(['scale', ...args]),
    beginPath: () => calls.push(['beginPath']),
    rect: (...args) => calls.push(['rect', ...args]),
    clip: () => calls.push(['clip']),
    drawImage: (...args) => calls.push(['drawImage', ...args]),
  };
  let offscreenCanvas;
  const image = { naturalWidth: 400, naturalHeight: 300 };
  const { canvas, geometry } = renderExportCanvas(image, {
    transform: { rotation: 90, flipHorizontal: true },
    crop: { x: 100, y: 50, width: 200, height: 100 },
    canvasFactory: () => (offscreenCanvas = { width: 0, height: 0, getContext: () => context }),
  });
  assert.equal(canvas, offscreenCanvas);
  assert.deepEqual([canvas.width, canvas.height], [100, 200]);
  assert.equal(context.imageSmoothingEnabled, true);
  assert.equal(context.imageSmoothingQuality, 'high');
  assert.ok(calls.some((call) => call[0] === 'rotate' && Math.abs(call[1] - Math.PI / 2) < 1e-12));
  assert.ok(calls.some((call) => call[0] === 'scale' && call[1] === -1 && call[2] === 1));
  assert.ok(calls.some((call) => call[0] === 'rect' && call.slice(1).join(',') === '-100,-100,200,100'));
  assert.ok(calls.some((call) => call[0] === 'drawImage' && call[1] === image));
  assert.equal(geometry.rotation, 90);
});

test('canvas encoding passes the chosen MIME and quality and fails clearly on a null blob', async () => {
  let args;
  const canvas = { toBlob(callback, ...rest) { args = rest; callback(new Blob(['pixels'], { type: 'image/jpeg' })); } };
  const blob = await canvasToBlob(canvas, 'jpeg', 2);
  assert.equal(blob.type, 'image/jpeg');
  assert.deepEqual(args, ['image/jpeg', 1]);
  await assert.rejects(canvasToBlob({ toBlob(callback) { callback(null); } }, 'png'), /could not be encoded/);
});

test('download uses a new filename and revokes its temporary URL after triggering the anchor', async () => {
  let anchor;
  const order = [];
  const body = { append(node) { anchor = node; order.push('append'); } };
  const documentRef = {
    body,
    createElement() { return { click() { order.push('click'); }, remove() { order.push('remove'); } }; },
  };
  const urlApi = {
    createObjectURL() { order.push('create-url'); return 'blob:local-export'; },
    revokeObjectURL(url) { assert.equal(url, 'blob:local-export'); order.push('revoke-url'); },
  };
  const canvasFactory = () => ({
    width: 0, height: 0, getContext: () => ({
      translate() {}, rotate() {}, scale() {}, beginPath() {}, rect() {}, clip() {}, drawImage() {},
    }),
    toBlob(callback, mimeType) { callback(new Blob(['new output'], { type: mimeType })); },
  });
  const result = await downloadEditedImage({
    image: { name: 'source.png', naturalWidth: 40, naturalHeight: 20 },
    transform: {}, crop: null, format: 'png', filename: 'edited.png', canvasFactory, documentRef, urlApi,
  });
  assert.equal(anchor.download, 'edited.png');
  assert.equal(result.mimeType, 'image/png');
  assert.deepEqual(order, ['create-url', 'append', 'click', 'remove', 'revoke-url']);
});
