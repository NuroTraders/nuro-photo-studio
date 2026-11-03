import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampCropRect, createFullCrop, mapCropRectToSource, mapCropRectToVisual,
  moveCropRect, resizeCropRect,
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
