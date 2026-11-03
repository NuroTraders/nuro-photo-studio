import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createCanvasViewport } from '../www/js/editor/viewport.js';

const originalWindow = globalThis.window;
const originalDocument = globalThis.document;
const originalResizeObserver = globalThis.ResizeObserver;
const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
const originalCancelAnimationFrame = globalThis.cancelAnimationFrame;
let pendingFrames;
let resizeObserver;

afterEach(() => {
  globalThis.window = originalWindow;
  globalThis.document = originalDocument;
  globalThis.ResizeObserver = originalResizeObserver;
  globalThis.requestAnimationFrame = originalRequestAnimationFrame;
  globalThis.cancelAnimationFrame = originalCancelAnimationFrame;
});

test('R shortcuts rotate only when the canvas is the active shortcut target', () => {
  const { canvas, viewport } = setup();
  const rotations = [];
  viewport.destroy();
  const focusedCanvas = new MockCanvas(canvas.parentElement);
  const focusedViewport = createCanvasViewport(focusedCanvas, { onRotate: (action) => rotations.push(action) });
  focusedViewport.setImage({ naturalWidth: 200, naturalHeight: 100 });
  let prevented = false;
  focusedCanvas.dispatch('keydown', { target: focusedCanvas, key: 'r', shiftKey: false, preventDefault() { prevented = true; } });
  assert.deepEqual(rotations, ['rotate-cw']);
  assert.equal(prevented, true);
  focusedCanvas.dispatch('keydown', { target: focusedCanvas, key: 'R', shiftKey: true, preventDefault() {} });
  assert.deepEqual(rotations, ['rotate-cw', 'rotate-ccw']);
  focusedCanvas.dispatch('keydown', { target: focusedCanvas, key: 'r', ctrlKey: true, shiftKey: false, preventDefault() {} });
  assert.equal(rotations.length, 2, 'modified browser shortcuts are left alone');
  globalThis.document.querySelector = () => ({ open: true });
  focusedCanvas.dispatch('keydown', { target: focusedCanvas, key: 'r', shiftKey: false, preventDefault() {} });
  assert.equal(rotations.length, 2, 'shortcuts are ignored while a modal is open');
  focusedViewport.destroy();
});

class MockResizeObserver {
  constructor(callback) { this.callback = callback; this.disconnected = false; resizeObserver = this; }
  observe() {}
  disconnect() { this.disconnected = true; }
  notify() { this.callback(); }
}

class MockCanvas {
  constructor(host) {
    this.parentElement = host;
    this.width = 300;
    this.height = 150;
    this.hidden = false;
    this.attributes = new Map();
    this.events = new Map();
    this.classes = new Set();
    this.drawCalls = [];
    this.clearCalls = [];
    this.transformCalls = [];
    this.transforms = [];
    this.capturedPointers = new Set();
    this.context = {
      setTransform: (...args) => this.transforms.push(args),
      clearRect: (...args) => this.clearCalls.push(args),
      beginPath: () => this.transformCalls.push(['beginPath']),
      rect: (...args) => this.transformCalls.push(['rect', ...args]),
      clip: () => this.transformCalls.push(['clip']),
      fillRect: (...args) => this.transformCalls.push(['fillRect', ...args]),
      strokeRect: (...args) => this.transformCalls.push(['strokeRect', ...args]),
      moveTo: (...args) => this.transformCalls.push(['moveTo', ...args]),
      lineTo: (...args) => this.transformCalls.push(['lineTo', ...args]),
      stroke: () => this.transformCalls.push(['stroke']),
      drawImage: (...args) => { this.drawCalls.push(args); this.transformCalls.push(['drawImage', ...args]); },
      save: () => this.transformCalls.push(['save']),
      translate: (...args) => this.transformCalls.push(['translate', ...args]),
      rotate: (...args) => this.transformCalls.push(['rotate', ...args]),
      scale: (...args) => this.transformCalls.push(['scale', ...args]),
      restore: () => this.transformCalls.push(['restore']),
      imageSmoothingEnabled: false,
      imageSmoothingQuality: 'low',
    };
    this.classList = {
      add: (name) => this.classes.add(name),
      remove: (name) => this.classes.delete(name),
    };
  }
  getContext(type) { return type === '2d' ? this.context : null; }
  addEventListener(type, callback, options = {}) {
    const listeners = this.events.get(type) || new Set();
    listeners.add(callback);
    this.events.set(type, listeners);
    options.signal?.addEventListener('abort', () => listeners.delete(callback), { once: true });
  }
  setAttribute(name, value) { this.attributes.set(name, value); }
  focus() { this.focused = true; }
  setPointerCapture(pointerId) { this.capturedPointers.add(pointerId); }
  hasPointerCapture(pointerId) { return this.capturedPointers.has(pointerId); }
  releasePointerCapture(pointerId) { this.capturedPointers.delete(pointerId); }
  dispatch(type, event) { for (const listener of this.events.get(type) || []) listener(event); }
}

function setup() {
  pendingFrames = new Map();
  let frameId = 0;
  globalThis.window = {
    devicePixelRatio: 3,
    addEventListener() {},
  };
  globalThis.document = { querySelector: () => null };
  globalThis.ResizeObserver = MockResizeObserver;
  globalThis.requestAnimationFrame = (callback) => {
    const id = ++frameId;
    pendingFrames.set(id, callback);
    return id;
  };
  globalThis.cancelAnimationFrame = (id) => pendingFrames.delete(id);

  const dimensions = { width: 600, height: 400 };
  const host = {
    classList: { toggle() {} },
    getBoundingClientRect: () => ({ left: 10, top: 20, width: dimensions.width, height: dimensions.height }),
  };
  const canvas = new MockCanvas(host);
  const zoomUpdates = [];
  const emptyState = { hidden: false };
  const viewport = createCanvasViewport(canvas, { emptyState, onZoomChange: (state) => zoomUpdates.push(state) });
  const flushFrames = () => {
    while (pendingFrames.size) {
      const [id, callback] = pendingFrames.entries().next().value;
      pendingFrames.delete(id);
      callback();
    }
  };
  return { canvas, dimensions, emptyState, flushFrames, host, viewport, zoomUpdates };
}

test('canvas viewport fits, displays actual size, zooms around a point, pans, and clears', () => {
  const { canvas, dimensions, emptyState, flushFrames, viewport, zoomUpdates } = setup();
  const image = { naturalWidth: 200, naturalHeight: 100, alt: 'Test image' };
  viewport.setImage(image);
  flushFrames();

  assert.equal(canvas.hidden, false);
  assert.equal(emptyState.hidden, true);
  assert.equal(canvas.width, 1200);
  assert.equal(canvas.height, 800);
  assert.deepEqual(canvas.transforms.at(-1), [2, 0, 0, 2, 0, 0]);
  assert.equal(viewport.getState().zoom, 3);
  assert.deepEqual(canvas.drawCalls.at(-1).slice(1), [-100, -50, 200, 100]);
  assert.equal(canvas.context.imageSmoothingQuality, 'high');

  viewport.actualSize();
  flushFrames();
  assert.equal(viewport.getState().zoom, 1);
  assert.deepEqual(canvas.drawCalls.at(-1).slice(1), [-100, -50, 200, 100]);

  viewport.zoomIn();
  viewport.zoomOut();
  assert.ok(Math.abs(viewport.getState().zoom - 1) < 1e-10);
  viewport.setZoom(2, 100, 100);
  assert.deepEqual([viewport.getState().panX, viewport.getState().panY], [200, 100]);

  const beforePan = viewport.getState();
  canvas.dispatch('pointerdown', { button: 0, pointerId: 1, clientX: 20, clientY: 40, preventDefault() {} });
  canvas.dispatch('pointermove', { pointerId: 1, clientX: 65, clientY: 70, preventDefault() {} });
  assert.deepEqual([viewport.getState().panX, viewport.getState().panY], [beforePan.panX + 45, beforePan.panY + 30]);
  canvas.dispatch('pointerup', { pointerId: 1 });

  const beforeWheel = viewport.getState().zoom;
  const anchor = { x: 310, y: 200 };
  const imagePointBeforeWheel = {
    x: (anchor.x - 300 - viewport.getState().panX) / viewport.getState().zoom,
    y: (anchor.y - 200 - viewport.getState().panY) / viewport.getState().zoom,
  };
  let prevented = false;
  canvas.dispatch('wheel', { deltaY: 120, clientX: 320, clientY: 220, preventDefault() { prevented = true; } });
  assert.ok(viewport.getState().zoom < beforeWheel);
  assert.equal(prevented, true);
  assert.ok(Math.abs((anchor.x - 300 - viewport.getState().panX) / viewport.getState().zoom - imagePointBeforeWheel.x) < 1e-9);
  assert.ok(Math.abs((anchor.y - 200 - viewport.getState().panY) / viewport.getState().zoom - imagePointBeforeWheel.y) < 1e-9);
  const beforeLineWheel = viewport.getState().zoom;
  canvas.dispatch('wheel', { deltaY: 3, deltaMode: 1, clientX: 320, clientY: 220, preventDefault() {} });
  assert.ok(viewport.getState().zoom < beforeLineWheel);
  viewport.setZoom(100);
  assert.equal(viewport.getState().zoom, 8);
  viewport.setZoom(0.001);
  assert.equal(viewport.getState().zoom, 0.01);

  viewport.fitToScreen();
  assert.equal(viewport.getState().fitMode, true);
  assert.equal(viewport.getState().zoom, 3);
  dimensions.width = 1200;
  resizeObserver.notify();
  flushFrames();
  assert.equal(viewport.getState().zoom, 4);
  assert.equal(zoomUpdates.at(-1).percent, 400);

  viewport.setZoom(2);
  canvas.dispatch('pointerdown', { button: 0, pointerId: 5, clientX: 50, clientY: 60, preventDefault() {} });
  canvas.dispatch('pointermove', { pointerId: 5, clientX: 75, clientY: 80, preventDefault() {} });
  canvas.dispatch('pointerup', { pointerId: 5 });
  const zoomedState = viewport.getState();
  dimensions.height = 500;
  resizeObserver.notify();
  flushFrames();
  assert.deepEqual(viewport.getState(), zoomedState, 'manual zoom and pan should persist on resize');

  const replacement = { naturalWidth: 50, naturalHeight: 100, alt: 'Replacement image' };
  viewport.setImage(replacement);
  flushFrames();
  assert.equal(canvas.drawCalls.at(-1)[0], replacement);
  assert.equal(viewport.getState().zoom, 5, 'portrait image should fit by the workspace height');

  const square = { naturalWidth: 100, naturalHeight: 100, alt: 'Square synthetic image' };
  viewport.setImage(square);
  flushFrames();
  assert.equal(canvas.drawCalls.at(-1)[0], square);
  assert.equal(viewport.getState().zoom, 5);

  viewport.setImage(image);
  viewport.setTransform({ rotation: 90, flipHorizontal: true, flipVertical: false });
  flushFrames();
  assert.equal(viewport.getState().zoom, 2.5, 'quarter-turn fit uses swapped working dimensions');
  assert.deepEqual(viewport.getState().transform, { rotation: 90, flipHorizontal: true, flipVertical: false });
  assert.deepEqual(canvas.transformCalls.slice(-6).map((call) => call[0]), ['translate', 'scale', 'rotate', 'scale', 'drawImage', 'restore']);
  assert.deepEqual(canvas.transformCalls.slice(-6, -3), [['translate', 600, 250], ['scale', 2.5, 2.5], ['rotate', Math.PI / 2]]);
  assert.deepEqual(canvas.drawCalls.at(-1).slice(1), [-100, -50, 200, 100]);

  viewport.setImage(image);
  assert.deepEqual(viewport.getState().transform, { rotation: 0, flipHorizontal: false, flipVertical: false }, 'replacement resets transform state');
  viewport.actualSize();
  const beforePinch = viewport.getState().zoom;
  canvas.dispatch('pointerdown', { button: 0, pointerId: 2, pointerType: 'touch', isPrimary: true, clientX: 200, clientY: 180, preventDefault() {} });
  canvas.dispatch('pointerdown', { button: 0, pointerId: 3, pointerType: 'touch', isPrimary: false, clientX: 400, clientY: 180, preventDefault() {} });
  canvas.dispatch('pointermove', { pointerId: 3, clientX: 500, clientY: 180, preventDefault() {} });
  assert.ok(viewport.getState().zoom > beforePinch, 'two touch pointers should pinch-zoom');
  canvas.dispatch('pointercancel', { pointerId: 3 });
  assert.equal(canvas.hasPointerCapture(3), false);
  assert.equal(canvas.classes.has('is-panning'), true, 'remaining touch pointer should continue as pan');
  canvas.dispatch('pointercancel', { pointerId: 2 });
  assert.equal(canvas.classes.has('is-panning'), false);

  canvas.dispatch('pointerdown', { button: 0, pointerId: 4, clientX: 100, clientY: 100, preventDefault() {} });
  viewport.setImage(replacement);
  assert.equal(canvas.hasPointerCapture(4), false, 'replacing the image releases active pointers');
  flushFrames();

  const drawCount = canvas.drawCalls.length;
  viewport.setImage(null);
  flushFrames();
  assert.equal(canvas.hidden, true);
  assert.equal(emptyState.hidden, false);
  assert.equal(canvas.drawCalls.length, drawCount);
  assert.ok(canvas.clearCalls.length > 0);
  assert.deepEqual(viewport.getState().transform, { rotation: 0, flipHorizontal: false, flipVertical: false });
  viewport.destroy();
  assert.equal(resizeObserver.disconnected, true);
  assert.equal(canvas.width, 0);
  assert.equal(canvas.height, 0);
  assert.equal(canvas.events.get('wheel').size, 0);

});

test('crop mode previews, applies, cancels, resets, and clears crop on image replacement', () => {
  const { canvas, flushFrames, viewport } = setup();
  const applied = [];
  const cancelled = [];
  viewport.destroy();
  const focused = new MockCanvas(canvas.parentElement);
  const editor = createCanvasViewport(focused, { onCropApply: (crop) => applied.push(crop), onCropCancel: () => cancelled.push(true) });
  editor.setImage({ naturalWidth: 300, naturalHeight: 200 });
  assert.equal(editor.beginCrop(), true);
  flushFrames();
  assert.equal(editor.getState().cropMode, true);
  assert.equal(focused.classes.has('is-crop-mode'), true);
  assert.ok(focused.transformCalls.some((call) => call[0] === 'fillRect'), 'crop scrim is drawn');
  focused.dispatch('keydown', { target: focused, key: 'ArrowLeft', shiftKey: true, preventDefault() {} });
  focused.dispatch('keydown', { target: focused, key: 'Enter', preventDefault() {} });
  flushFrames();
  assert.equal(editor.getState().cropMode, false);
  assert.deepEqual(applied[0], { x: 0, y: 0, width: 290, height: 200 });
  assert.deepEqual(editor.getState().crop, applied[0]);
  editor.setTransform({ rotation: 90, flipHorizontal: true });
  flushFrames();
  assert.ok(editor.getState().zoom > 0, 'cropped bounds remain fitted after transform');
  editor.beginCrop();
  focused.dispatch('keydown', { target: focused, key: 'Escape', preventDefault() {} });
  assert.equal(editor.getState().cropMode, false);
  assert.equal(cancelled.length, 1);
  editor.resetCrop();
  assert.equal(editor.getState().crop, null);
  editor.setCrop({ x: 30, y: 20, width: 100, height: 80 });
  editor.setImage({ naturalWidth: 100, naturalHeight: 80 });
  assert.equal(editor.getState().crop, null);
  editor.destroy();
});

test('crop pointer handles resize and interior drag remain within image bounds', () => {
  const { canvas, flushFrames, viewport } = setup();
  viewport.setImage({ naturalWidth: 300, naturalHeight: 200 });
  viewport.beginCrop();
  flushFrames();
  const dispatchDrag = (id, from, to) => {
    canvas.dispatch('pointerdown', { button: 0, pointerId: id, clientX: from.x + 10, clientY: from.y + 20, preventDefault() {} });
    canvas.dispatch('pointermove', { pointerId: id, clientX: to.x + 10, clientY: to.y + 20, preventDefault() {} });
    canvas.dispatch('pointerup', { pointerId: id });
  };
  dispatchDrag(1, { x: 600, y: 400 }, { x: 500, y: 300 });
  assert.deepEqual(viewport.getState().draftCrop, { x: 0, y: 0, width: 250, height: 150 });
  dispatchDrag(2, { x: 20, y: 20 }, { x: 1000, y: 1000 });
  assert.deepEqual(viewport.getState().draftCrop, { x: 50, y: 50, width: 250, height: 150 });
  viewport.cancelCrop();
  viewport.destroy();
});

test('crop mode lets a drag draw a new box from a full-image selection', () => {
  const { canvas, viewport } = setup();
  viewport.setImage({ naturalWidth: 300, naturalHeight: 200 });
  viewport.beginCrop();
  canvas.dispatch('pointerdown', { button: 0, pointerId: 11, clientX: 110, clientY: 120, preventDefault() {} });
  canvas.dispatch('pointermove', { pointerId: 11, clientX: 310, clientY: 270, preventDefault() {} });
  assert.deepEqual(viewport.getState().draftCrop, { x: 50, y: 50, width: 100, height: 75 });
  canvas.dispatch('pointerup', { pointerId: 11 });
  viewport.applyCrop();
  assert.deepEqual(viewport.getState().crop, { x: 50, y: 50, width: 100, height: 75 });
  viewport.destroy();
});

test('viewport ratio presets conform the draft, pixel changes stay proportional, and replacement resets ratio', () => {
  const { viewport } = setup();
  viewport.setImage({ naturalWidth: 300, naturalHeight: 200 });
  viewport.setCropAspectRatio(1);
  viewport.beginCrop();
  assert.deepEqual(viewport.getState().draftCrop, { x: 50, y: 0, width: 200, height: 200 });
  assert.deepEqual(viewport.setCropDimensions(120, 200, 'width'), { x: 90, y: 40, width: 120, height: 120 });
  viewport.setCropAspectRatio(16 / 9);
  const ratioCrop = viewport.getState().draftCrop;
  assert.ok(Math.abs(ratioCrop.width / ratioCrop.height - 16 / 9) < 1e-8);
  viewport.applyCrop();
  viewport.setImage({ naturalWidth: 100, naturalHeight: 80 });
  assert.equal(viewport.getState().cropAspectRatio, null);
  viewport.destroy();
});

test('viewport crop orientation swaps ratio and dimensions while keeping the draft in image bounds', () => {
  const { viewport } = setup();
  viewport.setImage({ naturalWidth: 300, naturalHeight: 200 });
  viewport.setCropAspectRatio(16 / 9);
  viewport.beginCrop();
  const before = viewport.getState().draftCrop;
  const swapped = viewport.swapCropOrientation(9 / 16);
  assert.equal(viewport.getState().cropAspectRatio, 9 / 16);
  assert.ok(Math.abs(swapped.width / swapped.height - 9 / 16) < 1e-8);
  assert.ok(swapped.x >= 0 && swapped.y >= 0);
  assert.ok(swapped.x + swapped.width <= 300);
  assert.ok(swapped.y + swapped.height <= 200);
  assert.deepEqual(viewport.getState().draftCrop, swapped);
  assert.notDeepEqual(swapped, before);
  viewport.destroy();
});
