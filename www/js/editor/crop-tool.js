import { getTransformedDimensions, normalizeTransform } from './transform-tool.js';

export const MIN_CROP_SIZE = 20;

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

/** Resize a rectangle from one of n, ne, e, se, s, sw, w, nw handles. */
export function resizeCropRect(rect, handle, deltaX, deltaY, bounds, minimum = MIN_CROP_SIZE) {
  const safe = clampCropRect(rect, bounds, minimum);
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

  return { x: left, y: top, width: right - left, height: bottom - top };
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
