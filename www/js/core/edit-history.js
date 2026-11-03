const DEFAULT_MAX_ENTRIES = 50;

/** Keep a bounded, immutable memento history of edit metadata (never image pixels). */
export function createEditHistory({ initialState = null, maxEntries = DEFAULT_MAX_ENTRIES } = {}) {
  const limit = Number.isFinite(maxEntries) ? Math.max(1, Math.floor(maxEntries)) : DEFAULT_MAX_ENTRIES;
  let past = [];
  let present = freezeSnapshot(initialState);
  let future = [];

  return {
    push(state) {
      const next = freezeSnapshot(state);
      if (sameSnapshot(next, present)) return false;
      past.push(present);
      if (past.length >= limit) past.shift();
      present = next;
      future = [];
      return true;
    },
    undo() {
      if (past.length === 0) return null;
      future.unshift(present);
      if (future.length >= limit) future.pop();
      present = past.pop();
      return cloneSnapshot(present);
    },
    redo() {
      if (future.length === 0) return null;
      past.push(present);
      if (past.length >= limit) past.shift();
      present = future.shift();
      return cloneSnapshot(present);
    },
    reset(state = null) {
      past = [];
      present = freezeSnapshot(state);
      future = [];
      return cloneSnapshot(present);
    },
    get present() { return cloneSnapshot(present); },
    get canUndo() { return past.length > 0; },
    get canRedo() { return future.length > 0; },
    get size() { return past.length + (present ? 1 : 0) + future.length; },
  };
}

function freezeSnapshot(state) {
  if (state == null) return null;
  const crop = state.crop == null ? null : Object.freeze({
    x: state.crop.x,
    y: state.crop.y,
    width: state.crop.width,
    height: state.crop.height,
  });
  return Object.freeze({
    rotation: state.rotation,
    flipHorizontal: Boolean(state.flipHorizontal),
    flipVertical: Boolean(state.flipVertical),
    crop,
    aspectRatio: typeof state.aspectRatio === 'string' ? state.aspectRatio : null,
  });
}

function cloneSnapshot(state) {
  return state == null ? null : {
    ...state,
    crop: state.crop ? { ...state.crop } : null,
  };
}

function sameSnapshot(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}
