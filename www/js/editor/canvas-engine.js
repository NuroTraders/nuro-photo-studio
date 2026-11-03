// Phase 1 boundary. Rendering algorithms must remain outside DOM event handlers.
export function createCanvasEngine() {
  return { render() { throw new Error('Canvas editing is not implemented in Phase 0.'); } };
}
