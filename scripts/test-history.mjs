import test from 'node:test';
import assert from 'node:assert/strict';
import { createEditHistory } from '../www/js/core/edit-history.js';
import { DEFAULT_TRANSFORM, rotateClockwise, toggleFlipHorizontal } from '../www/js/editor/transform-tool.js';

const initial = {
  ...DEFAULT_TRANSFORM,
  crop: null,
  aspectRatio: null,
};

test('history starts at its immutable initial state and supports push, undo, redo, and duplicate suppression', () => {
  const history = createEditHistory({ initialState: initial });
  assert.deepEqual(history.present, initial);
  assert.equal(history.canUndo, false);
  assert.equal(history.canRedo, false);

  const rotated = { ...initial, ...rotateClockwise(initial) };
  assert.equal(history.push(rotated), true);
  assert.equal(history.canUndo, true);
  assert.equal(history.push(rotated), false);
  assert.equal(history.size, 2);
  assert.deepEqual(history.undo(), initial);
  assert.equal(history.canRedo, true);
  assert.deepEqual(history.redo(), rotated);
  assert.equal(history.canRedo, false);

  const outward = history.present;
  outward.crop = { x: 10, y: 10, width: 20, height: 20 };
  assert.equal(history.present.crop, null);
});

test('a new edit after undo invalidates redo', () => {
  const history = createEditHistory({ initialState: initial });
  history.push({ ...initial, ...rotateClockwise(initial) });
  history.undo();
  assert.equal(history.canRedo, true);
  history.push({ ...initial, ...toggleFlipHorizontal(initial) });
  assert.equal(history.canRedo, false);
  assert.deepEqual(history.undo(), initial);
});

test('history bounds its entries and reset clears both stacks', () => {
  const history = createEditHistory({ initialState: initial, maxEntries: 3 });
  let state = initial;
  for (let i = 0; i < 5; i += 1) {
    state = { ...state, rotation: (state.rotation + 90) % 360 };
    history.push(state);
  }
  assert.equal(history.size, 3);
  assert.equal(history.canUndo, true);
  history.reset(initial);
  assert.equal(history.size, 1);
  assert.equal(history.canUndo, false);
  assert.equal(history.canRedo, false);
  assert.deepEqual(history.present, initial);
});

test('rotation and applied crop snapshots restore in order through undo and redo', () => {
  const history = createEditHistory({ initialState: initial });
  const rotated = { ...initial, ...rotateClockwise(initial) };
  history.push(rotated);
  const cropped = {
    ...rotated,
    crop: { x: 12, y: 18, width: 90, height: 60 },
    aspectRatio: '3:2',
  };
  history.push(cropped);

  assert.deepEqual(history.undo(), rotated);
  assert.deepEqual(history.undo(), initial);
  assert.deepEqual(history.redo(), rotated);
  assert.deepEqual(history.redo(), cropped);
});
