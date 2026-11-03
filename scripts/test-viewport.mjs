import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createCanvasViewport } from '../www/js/editor/viewport.js';

const originalWindow = globalThis.window;
const originalResizeObserver = globalThis.ResizeObserver;
const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
const originalCancelAnimationFrame = globalThis.cancelAnimationFrame;
let pendingFrames;
let resizeObserver;

afterEach(() => {
  globalThis.window = originalWindow;
  globalThis.ResizeObserver = originalResizeObserver;
  globalThis.requestAnimationFrame = originalRequestAnimationFrame;
  globalThis.cancelAnimationFrame = originalCancelAnimationFrame;
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
    this.transforms = [];
    this.capturedPointers = new Set();
    this.context = {
      setTransform: (...args) => this.transforms.push(args),
      clearRect: (...args) => this.clearCalls.push(args),
      drawImage: (...args) => this.drawCalls.push(args),
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
  assert.deepEqual(canvas.drawCalls.at(-1).slice(1), [0, 50, 600, 300]);
  assert.equal(canvas.context.imageSmoothingQuality, 'high');

  viewport.actualSize();
  flushFrames();
  assert.equal(viewport.getState().zoom, 1);
  assert.deepEqual(canvas.drawCalls.at(-1).slice(1), [200, 150, 200, 100]);

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
  viewport.destroy();
  assert.equal(resizeObserver.disconnected, true);
  assert.equal(canvas.width, 0);
  assert.equal(canvas.height, 0);
  assert.equal(canvas.events.get('wheel').size, 0);

});
