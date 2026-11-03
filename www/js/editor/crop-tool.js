import { getTransformedDimensions, normalizeTransform } from './transform-tool.js';

export const MIN_CROP_SIZE = 20;
const ASPECT_PRESET_SWAPS = Object.freeze({
  '16:9': '9:16', '9:16': '16:9',
  '4:3': '3:4', '3:4': '4:3',
  '3:2': '2:3', '2:3': '3:2',
});

export function swapCropAspectPreset(preset) {
  return ASPECT_PRESET_SWAPS[preset] || preset;
}

export function invertCropAspectRatio(ratio) {
  return isAspectRatio(ratio) ? 1 / ratio : null;
}

export function createFullCrop(width, height) {
  return { x: 0, y: 0, width, height };
}

export function clampCropRect(rect, bounds, minimum = MIN_CROP_SIZE) {
  const minWidth = Math.min(minimum, bounds.width);
  const minHeight = Math.min(minimum, bounds.height);
  const width = clamp(finite(rect.width, bounds.width), minWidth, bounds.width);
  const height = clamp(finite(rect.height, bounds.height), minHeight, bounds.height);
  return {
    x: clamp(finite(rect.x, 0), 0, bounds.width - width),
    y: clamp(finite(rect.y, 0), 0, bounds.height - height),
    width,
    height,
  };
}

export function moveCropRect(rect, deltaX, deltaY, bounds) {
  const safe = clampCropRect(rect, bounds);
  return {
    ...safe,
    x: clamp(safe.x + deltaX, 0, bounds.width - safe.width),
    y: clamp(safe.y + deltaY, 0, bounds.height - safe.height),
  };
}

/** Swap W/H around the prior center and uniformly scale down if the swapped box exceeds bounds. */
export function swapCropRectDimensions(rect, bounds) {
  let width = rect.height;
  let height = rect.width;
  const scale = Math.min(1, bounds.width / width, bounds.height / height);
  width *= scale;
  height *= scale;
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;
  return clampCropRect({ x: centerX - width / 2, y: centerY - height / 2, width, height }, bounds, 0.000001);
}

/** Create a clamped crop rectangle from two visual-space drag points. */
export function createCropFromPoints(start, current, bounds, minimum = MIN_CROP_SIZE, aspectRatio = null) {
  const x1 = clamp(start.x, 0, bounds.width), y1 = clamp(start.y, 0, bounds.height);
  const x2 = clamp(current.x, 0, bounds.width), y2 = clamp(current.y, 0, bounds.height);
  let left = Math.min(x1, x2), right = Math.max(x1, x2);
  let top = Math.min(y1, y2), bottom = Math.max(y1, y2);
  const minWidth = Math.min(minimum, bounds.width), minHeight = Math.min(minimum, bounds.height);
  if (right - left < minWidth) {
    if (x2 >= x1) right = left + minWidth;
    else left = right - minWidth;
    if (left < 0) { right -= left; left = 0; }
    if (right > bounds.width) { left -= right - bounds.width; right = bounds.width; }
  }
  if (bottom - top < minHeight) {
    if (y2 >= y1) bottom = top + minHeight;
    else top = bottom - minHeight;
    if (top < 0) { bottom -= top; top = 0; }
    if (bottom > bounds.height) { top -= bottom - bounds.height; bottom = bounds.height; }
  }
  if (isAspectRatio(aspectRatio)) {
    let width = right - left, height = bottom - top;
    let dirX = x2 < x1 ? -1 : 1;
    let dirY = y2 < y1 ? -1 : 1;
    const minRatioHeight = Math.max(Math.min(minimum, bounds.height), Math.min(minimum, bounds.width) / aspectRatio);
    const requiredWidth = minRatioHeight * aspectRatio;
    const requiredHeight = minRatioHeight;
    if ((dirX < 0 ? x1 : bounds.width - x1) < requiredWidth && (dirX > 0 ? x1 : bounds.width - x1) >= requiredWidth) dirX *= -1;
    if ((dirY < 0 ? y1 : bounds.height - y1) < requiredHeight && (dirY > 0 ? y1 : bounds.height - y1) >= requiredHeight) dirY *= -1;
    const availableWidth = dirX < 0 ? x1 : bounds.width - x1;
    const availableHeight = dirY < 0 ? y1 : bounds.height - y1;
    const ratioHeight = Math.max(height, width / aspectRatio, minRatioHeight);
    width = ratioHeight * aspectRatio;
    height = ratioHeight;
    const scale = Math.min(1, availableWidth / width, availableHeight / height);
    width *= scale;
    height *= scale;
    left = dirX < 0 ? x1 - width : x1;
    top = dirY < 0 ? y1 - height : y1;
    right = left + width;
    bottom = top + height;
  }
  return { x: left, y: top, width: right - left, height: bottom - top };
}

/** Resize a rectangle from one of n, ne, e, se, s, sw, w, nw handles. */
export function resizeCropRect(rect, handle, deltaX, deltaY, bounds, minimum = MIN_CROP_SIZE, aspectRatio = null) {
  const safe = clampCropRect(rect, bounds, minimum);
  if (isAspectRatio(aspectRatio)) return resizeCropWithAspect(safe, handle, deltaX, deltaY, bounds, minimum, aspectRatio);
  let left = safe.x;
  let right = safe.x + safe.width;
  let top = safe.y;
  let bottom = safe.y + safe.height;
  const minWidth = Math.min(minimum, bounds.width);
  const minHeight = Math.min(minimum, bounds.height);

  if (handle.includes('w')) left = clamp(left + deltaX, 0, right - minWidth);
  if (handle.includes('e')) right = clamp(right + deltaX, left + minWidth, bounds.width);
  if (handle.includes('n')) top = clamp(top + deltaY, 0, bottom - minHeight);
  if (handle.includes('s')) bottom = clamp(bottom + deltaY, top + minHeight, bounds.height);

  const resized = { x: left, y: top, width: right - left, height: bottom - top };
  return isAspectRatio(aspectRatio) ? conformCropRectToAspect(resized, bounds, aspectRatio, minimum) : resized;
}

function resizeCropWithAspect(rect, handle, deltaX, deltaY, bounds, minimum, aspectRatio) {
  const oppositeX = handle.includes('w') ? rect.x + rect.width : handle.includes('e') ? rect.x : rect.x + rect.width / 2;
  const oppositeY = handle.includes('n') ? rect.y + rect.height : handle.includes('s') ? rect.y : rect.y + rect.height / 2;
  const draggedWidth = handle.includes('w') ? oppositeX - (rect.x + deltaX)
    : handle.includes('e') ? rect.x + rect.width + deltaX - oppositeX : rect.width;
  const draggedHeight = handle.includes('n') ? oppositeY - (rect.y + deltaY)
    : handle.includes('s') ? rect.y + rect.height + deltaY - oppositeY : rect.height;
  const widthScaleChange = Math.abs(draggedWidth / rect.width - 1);
  const heightScaleChange = Math.abs(draggedHeight / rect.height - 1);
  let height = handle.includes('n') || handle.includes('s')
    ? draggedHeight
    : handle.includes('e') || handle.includes('w')
      ? draggedWidth / aspectRatio
      : widthScaleChange >= heightScaleChange ? draggedWidth / aspectRatio : draggedHeight;
  const maxHeight = Math.min(bounds.height, bounds.width / aspectRatio);
  const minHeight = Math.max(Math.min(minimum, bounds.height), Math.min(minimum, bounds.width) / aspectRatio);
  height = clamp(height, Math.min(minHeight, maxHeight), maxHeight);
  const width = height * aspectRatio;
  const left = handle.includes('w') ? oppositeX - width : handle.includes('e') ? oppositeX : oppositeX - width / 2;
  const top = handle.includes('n') ? oppositeY - height : handle.includes('s') ? oppositeY : oppositeY - height / 2;
  return clampCropRect({ x: left, y: top, width, height }, bounds, 0.000001);
}

/** Fit an existing crop to a fixed ratio while keeping its center as stable as bounds allow. */
export function conformCropRectToAspect(rect, bounds, aspectRatio, minimum = MIN_CROP_SIZE) {
  const safe = clampCropRect(rect, bounds, minimum);
  if (!isAspectRatio(aspectRatio)) return safe;
  const maxHeight = Math.min(bounds.height, bounds.width / aspectRatio);
  const minHeight = Math.max(Math.min(minimum, bounds.height), Math.min(minimum, bounds.width) / aspectRatio);
  if (maxHeight <= 0) return safe;
  const height = clamp(Math.min(safe.height, safe.width / aspectRatio), Math.min(minHeight, maxHeight), maxHeight);
  const width = height * aspectRatio;
  const centerX = safe.x + safe.width / 2;
  const centerY = safe.y + safe.height / 2;
  return clampCropRect({ x: centerX - width / 2, y: centerY - height / 2, width, height }, bounds, 0.000001);
}

/** Update displayed pixel dimensions; in locked mode the changed field drives the other dimension. */
export function resizeCropToDimensions(rect, requestedWidth, requestedHeight, changedDimension, bounds, aspectRatio = null, minimum = MIN_CROP_SIZE) {
  let width = finite(requestedWidth, rect.width);
  let height = finite(requestedHeight, rect.height);
  if (isAspectRatio(aspectRatio)) {
    if (changedDimension === 'width') height = width / aspectRatio;
    else width = height * aspectRatio;
    const maxHeight = Math.min(bounds.height, bounds.width / aspectRatio);
    const minHeight = Math.min(Math.max(Math.min(minimum, bounds.height), Math.min(minimum, bounds.width) / aspectRatio), maxHeight);
    height = clamp(height, minHeight, maxHeight);
    width = height * aspectRatio;
  } else {
    width = clamp(width, Math.min(minimum, bounds.width), bounds.width);
    height = clamp(height, Math.min(minimum, bounds.height), bounds.height);
  }
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;
  return clampCropRect(
    { x: centerX - width / 2, y: centerY - height / 2, width, height },
    bounds,
    isAspectRatio(aspectRatio) ? 0.000001 : Math.min(minimum, bounds.width, bounds.height),
  );
}

export function mapCropRectToVisual(sourceRect, sourceWidth, sourceHeight, transform) {
  return mapRect(sourceRect, (point) => sourcePointToVisual(point, sourceWidth, sourceHeight, transform), transformBounds(sourceWidth, sourceHeight, transform));
}

export function mapCropRectToSource(visualRect, sourceWidth, sourceHeight, transform) {
  return mapRect(visualRect, (point) => visualPointToSource(point, sourceWidth, sourceHeight, transform), { width: sourceWidth, height: sourceHeight });
}

function mapRect(rect, mapPoint, destinationBounds) {
  const points = [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x, y: rect.y + rect.height },
    { x: rect.x + rect.width, y: rect.y + rect.height },
  ].map(mapPoint);
  const left = Math.min(...points.map((point) => point.x));
  const top = Math.min(...points.map((point) => point.y));
  const right = Math.max(...points.map((point) => point.x));
  const bottom = Math.max(...points.map((point) => point.y));
  return clampCropRect({ x: left, y: top, width: right - left, height: bottom - top }, destinationBounds, 0.000001);
}

function sourcePointToVisual(point, width, height, transform) {
  const state = normalizeTransform(transform);
  const bounds = transformBounds(width, height, state);
  let x = point.x - width / 2;
  let y = point.y - height / 2;
  if (state.flipHorizontal) x = -x;
  if (state.flipVertical) y = -y;
  ({ x, y } = rotatePoint(x, y, state.rotation));
  return { x: x + bounds.width / 2, y: y + bounds.height / 2 };
}

function visualPointToSource(point, width, height, transform) {
  const state = normalizeTransform(transform);
  const bounds = transformBounds(width, height, state);
  let { x, y } = point;
  x -= bounds.width / 2;
  y -= bounds.height / 2;
  ({ x, y } = rotatePoint(x, y, (360 - state.rotation) % 360));
  if (state.flipHorizontal) x = -x;
  if (state.flipVertical) y = -y;
  return { x: x + width / 2, y: y + height / 2 };
}

function rotatePoint(x, y, rotation) {
  if (rotation === 90) return { x: -y, y: x };
  if (rotation === 180) return { x: -x, y: -y };
  if (rotation === 270) return { x: y, y: -x };
  return { x, y };
}

function transformBounds(width, height, transform) {
  return getTransformedDimensions(width, height, transform);
}

function finite(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function isAspectRatio(value) {
  return Number.isFinite(value) && value > 0;
}
