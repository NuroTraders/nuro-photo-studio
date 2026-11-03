import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_TRANSFORM, getTransformedDimensions, normalizeTransform,
  rotateClockwise, rotateCounterClockwise, toggleFlipHorizontal, toggleFlipVertical,
} from '../www/js/editor/transform-tool.js';

test('quarter-turn rotations cycle in both directions without mutating input', () => {
  const original = { ...DEFAULT_TRANSFORM };
  assert.deepEqual(rotateClockwise(original), { rotation: 90, flipHorizontal: false, flipVertical: false });
  assert.deepEqual([0, 1, 2, 3].reduce((angles) => [...angles, rotateClockwise({ rotation: angles.at(-1) }).rotation], [0]), [0, 90, 180, 270, 0]);
  assert.deepEqual([0, 1, 2, 3].reduce((angles) => [...angles, rotateCounterClockwise({ rotation: angles.at(-1) }).rotation], [0]), [0, 270, 180, 90, 0]);
  assert.deepEqual(original, DEFAULT_TRANSFORM);
});

test('flip toggles compose as independent serializable flags', () => {
  const horizontal = toggleFlipHorizontal(DEFAULT_TRANSFORM);
  const both = toggleFlipVertical(horizontal);
  assert.deepEqual(horizontal, { rotation: 0, flipHorizontal: true, flipVertical: false });
  assert.deepEqual(both, { rotation: 0, flipHorizontal: true, flipVertical: true });
  assert.deepEqual(toggleFlipHorizontal(both), { rotation: 0, flipHorizontal: false, flipVertical: true });
});

test('normalization restricts rotation to quarter turns and dimensions swap at 90 and 270 degrees', () => {
  assert.deepEqual(normalizeTransform({ rotation: -90, flipHorizontal: 1 }), { rotation: 270, flipHorizontal: true, flipVertical: false });
  assert.deepEqual(normalizeTransform({ rotation: 44 }), { ...DEFAULT_TRANSFORM });
  assert.deepEqual(getTransformedDimensions(640, 400, { rotation: 90 }), { width: 400, height: 640 });
  assert.deepEqual(getTransformedDimensions(640, 400, { rotation: 270 }), { width: 400, height: 640 });
  assert.deepEqual(getTransformedDimensions(640, 400, { rotation: 180 }), { width: 640, height: 400 });
});
