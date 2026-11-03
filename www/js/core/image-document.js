// Keep the original File immutable and separate from future editing state.
export function createImageDocument({ file, name, mimeType, width, height, size, orientation = 1 }) {
  const original = Object.freeze({ file, name, mimeType, width, height, size, orientation });
  const workingState = Object.freeze({ width, height });
  return Object.freeze({
    id: crypto.randomUUID(),
    name,
    mimeType,
    width,
    height,
    size,
    orientation,
    status: 'loaded',
    original,
    workingState,
  });
}
