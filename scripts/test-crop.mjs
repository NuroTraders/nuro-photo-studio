import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampCropRect, conformCropRectToAspect, createCropFromPoints, createFullCrop, mapCropRectToSource, mapCropRectToVisual,
  invertCropAspectRatio, moveCropRect, resizeCropRect, resizeCropToDimensions, swapCropAspectPreset, swapCropRectDimensions,
} from '../www/js/editor/crop-tool.js';

const bounds = { width: 300, height: 200 };

test('crop rectangles clamp within bounds and preserve the minimum size', () => {
  assert.deepEqual(clampCropRect({ x: -5, y: 190, width: 500, height: 50 }, bounds), { x: 0, y: 150, width: 300, height: 50 });
  assert.deepEqual(createFullCrop(300, 200), { x: 0, y: 0, width: 300, height: 200 });
  assert.deepEqual(moveCropRect({ x: 20, y: 30, width: 100, height: 80 }, 500, -500, bounds), { x: 200, y: 0, width: 100, height: 80 });
  assert.deepEqual(resizeCropRect({ x: 20, y: 30, width: 100, height: 80 }, 'nw', 500, 500, bounds), { x: 100, y: 90, width: 20, height: 20 });
  assert.deepEqual(resizeCropRect({ x: 20, y: 30, width: 100, height: 80 }, 'se', 500, 500, bounds), { x: 20, y: 30, width: 280, height: 170 });
});

test('crop mappings round-trip through quarter turns and flips', () => {
  const source = { x: 31, y: 23, width: 111, height: 77 };
  for (const rotation of [0, 90, 180, 270]) {
    for (const flipHorizontal of [false, true]) for (const flipVertical of [false, true]) {
      const transform = { rotation, flipHorizontal, flipVertical };
      const visual = mapCropRectToVisual(source, bounds.width, bounds.height, transform);
      const restored = mapCropRectToSource(visual, bounds.width, bounds.height, transform);
      for (const key of ['x', 'y', 'width', 'height']) assert.ok(Math.abs(restored[key] - source[key]) < 1e-8, `${key} @ ${rotation}/${flipHorizontal}/${flipVertical}`);
    }
  }
  const rotated = mapCropRectToVisual(source, bounds.width, bounds.height, { rotation: 90 });
  assert.deepEqual(rotated, { x: 100, y: 31, width: 77, height: 111 });
});

test('drag selection normalizes direction, enforces minimum size, and clamps to image edges', () => {
  assert.deepEqual(createCropFromPoints({ x: 150, y: 125 }, { x: 50, y: 50 }, bounds), { x: 50, y: 50, width: 100, height: 75 });
  assert.deepEqual(createCropFromPoints({ x: 298, y: 198 }, { x: 500, y: 500 }, bounds), { x: 280, y: 180, width: 20, height: 20 });
  assert.deepEqual(createCropFromPoints({ x: 10, y: 10 }, { x: 12, y: 14 }, bounds), { x: 10, y: 10, width: 20, height: 20 });
});

test('aspect presets conform around the crop center and lock drags to the selected ratio', () => {
  const crop = { x: 20, y: 20, width: 100, height: 80 };
  const square = conformCropRectToAspect(crop, bounds, 1);
  assert.deepEqual(square, { x: 30, y: 20, width: 80, height: 80 });
  const selection = createCropFromPoints({ x: 50, y: 50 }, { x: 150, y: 100 }, bounds, 20, 1);
  assert.deepEqual(selection, { x: 50, y: 50, width: 100, height: 100 });
  const edgeSelection = createCropFromPoints({ x: 298, y: 198 }, { x: 300, y: 200 }, bounds, 20, 1);
  assert.deepEqual(edgeSelection, { x: 278, y: 178, width: 20, height: 20 });
  const edgeResize = resizeCropRect({ x: 20, y: 20, width: 100, height: 100 }, 'e', 20, 0, bounds, 20, 1);
  assert.deepEqual(edgeResize, { x: 20, y: 10, width: 120, height: 120 });
  const cornerResize = resizeCropRect({ x: 20, y: 20, width: 100, height: 100 }, 'se', 20, 20, bounds, 20, 1);
  assert.deepEqual(cornerResize, { x: 20, y: 20, width: 120, height: 120 });
});

test('pixel dimension changes update the paired field under a locked ratio and clamp to bounds', () => {
  const start = { x: 80, y: 50, width: 120, height: 90 };
  const widthChange = resizeCropToDimensions(start, 160, 90, 'width', bounds, 4 / 3);
  assert.ok(Math.abs(widthChange.width - 160) < 1e-8);
  assert.ok(Math.abs(widthChange.height - 120) < 1e-8);
  const heightChange = resizeCropToDimensions(start, 120, 100, 'height', bounds, 16 / 9);
  assert.ok(Math.abs(heightChange.height - 100) < 1e-8);
  assert.ok(Math.abs(heightChange.width - (100 * 16 / 9)) < 1e-8);
  const clamped = resizeCropToDimensions(start, 900, 90, 'width', bounds, 4 / 3);
  assert.ok(clamped.x >= 0 && clamped.y >= 0);
  assert.ok(clamped.x + clamped.width <= bounds.width);
  assert.ok(clamped.y + clamped.height <= bounds.height);
  assert.ok(Math.abs(clamped.width / clamped.height - 4 / 3) < 1e-8);
});

test('crop orientation swaps inverse presets and leaves square, Original, and Freeform selections intact', () => {
  for (const [portrait, landscape] of [['9:16', '16:9'], ['3:4', '4:3'], ['2:3', '3:2']]) {
    assert.equal(swapCropAspectPreset(portrait), landscape);
    assert.equal(swapCropAspectPreset(landscape), portrait);
  }
  for (const preset of ['1:1', 'Original', 'original', 'Freeform', 'freeform']) {
    assert.equal(swapCropAspectPreset(preset), preset);
  }
  assert.equal(invertCropAspectRatio(16 / 9), 9 / 16);
  assert.equal(invertCropAspectRatio(1), 1);
  assert.equal(invertCropAspectRatio(null), null);
});

test('crop orientation swaps W/H around center and uniformly scales to image bounds', () => {
  assert.deepEqual(swapCropRectDimensions({ x: 50, y: 20, width: 100, height: 150 }, bounds), {
    x: 25, y: 45, width: 150, height: 100,
  });
  const scaled = swapCropRectDimensions({ x: 10, y: 10, width: 280, height: 180 }, bounds);
  assert.ok(scaled.x >= 0 && scaled.y >= 0);
  assert.ok(scaled.x + scaled.width <= bounds.width);
  assert.ok(scaled.y + scaled.height <= bounds.height);
  assert.ok(Math.abs(scaled.width / scaled.height - 180 / 280) < 1e-8);
  assert.ok(Math.abs(scaled.x + scaled.width / 2 - 150) < 1e-8);
  assert.ok(Math.abs(scaled.y + scaled.height / 2 - 100) < 1e-8);
});
