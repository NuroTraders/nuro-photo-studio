export const MAX_OUTPUT_SIDE = 20_000;
export const MAX_OUTPUT_PIXELS = 80_000_000;

/** Return validated custom output dimensions, preserving the source aspect ratio when locked. */
export function createResizeDimensions(baseWidth, baseHeight, requestedWidth, requestedHeight, changedDimension = 'width', lockAspectRatio = true) {
  const base = validateDimensions(baseWidth, baseHeight);
  let width = positiveDimension(requestedWidth, 'width');
  let height = positiveDimension(requestedHeight, 'height');
  if (lockAspectRatio) {
    const aspectRatio = base.width / base.height;
    if (changedDimension === 'width') height = Math.max(1, Math.round(width / aspectRatio));
    else if (changedDimension === 'height') width = Math.max(1, Math.round(height * aspectRatio));
    else throw new RangeError('The changed resize dimension must be width or height.');
  }
  return validateDimensions(width, height);
}

/** Choose either original effective dimensions or a user-selected output size. */
export function getResizeOutputDimensions(baseWidth, baseHeight, resize = null) {
  const base = validateDimensions(baseWidth, baseHeight);
  return resize == null ? base : validateDimensions(resize.width, resize.height);
}

export function isResizeAtOriginalSize(resize, baseWidth, baseHeight) {
  if (!resize) return true;
  const base = validateDimensions(baseWidth, baseHeight);
  return resize.width === base.width && resize.height === base.height;
}

function validateDimensions(width, height) {
  const normalizedWidth = positiveDimension(width, 'width');
  const normalizedHeight = positiveDimension(height, 'height');
  if (normalizedWidth > MAX_OUTPUT_SIDE || normalizedHeight > MAX_OUTPUT_SIDE) {
    throw new RangeError(`Output dimensions cannot exceed ${MAX_OUTPUT_SIDE.toLocaleString()} px per side.`);
  }
  if (normalizedWidth * normalizedHeight > MAX_OUTPUT_PIXELS) {
    throw new RangeError('Output dimensions cannot exceed 80 megapixels.');
  }
  return { width: normalizedWidth, height: normalizedHeight };
}

function positiveDimension(value, name) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 1) throw new RangeError(`${name} must be a positive pixel dimension.`);
  return Math.round(number);
}
