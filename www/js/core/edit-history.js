// Placeholder boundary: Phase 1 will implement bounded operation history.
export function createEditHistory() {
  return { undo() { return null; }, redo() { return null; }, canUndo: false, canRedo: false };
}
