import test from 'node:test';
import assert from 'node:assert/strict';
import { createCanvasViewport } from '../www/js/editor/viewport.js';

const originalWindow = globalThis.window;
const originalResizeObserver = globalThis.ResizeObserver;
const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
const originalCancelAnimationFrame = globalThis.cancelAnimationFrame;
let pendingFrames;
let resizeObserver;

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
    devicePixelRatio: 2,
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
  const viewport = createCanvasViewport(canvas, { onZoomChange: (state) => zoomUpdates.push(state) });
  const flushFrames = () => {
    while (pendingFrames.size) {
      const [id, callback] = pendingFrames.entries().next().value;
      pendingFrames.delete(id);
      callback();
    }
  };
  return { canvas, dimensions, flushFrames, host, viewport, zoomUpdates };
}

test('canvas viewport fits, displays actual size, zooms around a point, pans, and clears', () => {
  const { canvas, dimensions, flushFrames, viewport, zoomUpdates } = setup();
  const image = { naturalWidth: 200, naturalHeight: 100, alt: 'Test image' };
  viewport.setImage(image);
  flushFrames();

  assert.equal(canvas.hidden, false);
  assert.equal(canvas.width, 1200);
  assert.equal(canvas.height, 800);
  assert.equal(viewport.getState().zoom, 3);
  assert.deepEqual(canvas.drawCalls.at(-1).slice(1), [0, 50, 600, 300]);

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
  let prevented = false;
  canvas.dispatch('wheel', { deltaY: 120, clientX: 320, clientY: 220, preventDefault() { prevented = true; } });
  assert.ok(viewport.getState().zoom < beforeWheel);
  assert.equal(prevented, true);
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

  const replacement = { naturalWidth: 50, naturalHeight: 100, alt: 'Replacement image' };
  viewport.setImage(replacement);
  flushFrames();
  assert.equal(canvas.drawCalls.at(-1)[0], replacement);

  const drawCount = canvas.drawCalls.length;
  viewport.setImage(null);
  flushFrames();
  assert.equal(canvas.hidden, true);
  assert.equal(canvas.drawCalls.length, drawCount);
  assert.ok(canvas.clearCalls.length > 0);
  viewport.destroy();
  assert.equal(resizeObserver.disconnected, true);
  assert.equal(canvas.width, 0);
  assert.equal(canvas.height, 0);
  assert.equal(canvas.events.get('wheel').size, 0);

  globalThis.window = originalWindow;
  globalThis.ResizeObserver = originalResizeObserver;
  globalThis.requestAnimationFrame = originalRequestAnimationFrame;
  globalThis.cancelAnimationFrame = originalCancelAnimationFrame;
});
