// Phase 1 will add immutable source data and non-destructive working state.
export function createImageDocument({ name, mimeType, width, height, size }) {
  return Object.freeze({ id: crypto.randomUUID(), name, mimeType, width, height, size, status: 'preview' });
}
