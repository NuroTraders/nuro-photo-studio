export const DEFAULT_TRANSFORM = Object.freeze({
  rotation: 0,
  flipHorizontal: false,
  flipVertical: false,
});

/** Return a fresh, serializable transform state with a normalized quarter-turn rotation. */
export function normalizeTransform(transform = DEFAULT_TRANSFORM) {
  const degrees = Number.isFinite(transform.rotation) ? Math.round(transform.rotation / 90) * 90 : 0;
  return {
    rotation: ((degrees % 360) + 360) % 360,
    flipHorizontal: Boolean(transform.flipHorizontal),
    flipVertical: Boolean(transform.flipVertical),
  };
}

export function rotateClockwise(transform) {
  const current = normalizeTransform(transform);
  return { ...current, rotation: (current.rotation + 90) % 360 };
}

export function rotateCounterClockwise(transform) {
  const current = normalizeTransform(transform);
  return { ...current, rotation: (current.rotation + 270) % 360 };
}

export function toggleFlipHorizontal(transform) {
  const current = normalizeTransform(transform);
  return { ...current, flipHorizontal: !current.flipHorizontal };
}

export function toggleFlipVertical(transform) {
  const current = normalizeTransform(transform);
  return { ...current, flipVertical: !current.flipVertical };
}

export function getTransformedDimensions(width, height, transform) {
  const { rotation } = normalizeTransform(transform);
  return rotation === 90 || rotation === 270
    ? { width: height, height: width }
    : { width, height };
}
