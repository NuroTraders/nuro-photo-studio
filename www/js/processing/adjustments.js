export const DEFAULT_ADJUSTMENTS = Object.freeze({
  brightness: 0,
  contrast: 0,
  saturation: 0,
});

export const ADJUSTMENT_RANGES = Object.freeze({
  brightness: Object.freeze({ min: -100, max: 100, step: 1, label: 'Brightness' }),
  contrast: Object.freeze({ min: -100, max: 100, step: 1, label: 'Contrast' }),
  saturation: Object.freeze({ min: -100, max: 100, step: 1, label: 'Saturation' }),
});

/** Normalize serializable adjustment metadata without touching source pixels. */
export function normalizeAdjustments(value = {}) {
  return Object.fromEntries(Object.keys(DEFAULT_ADJUSTMENTS).map((key) => {
    const amount = Number(value?.[key]);
    return [key, Number.isFinite(amount) ? clamp(Math.round(amount), -100, 100) : 0];
  }));
}

export function setAdjustmentValue(current, key, value) {
  if (!Object.hasOwn(DEFAULT_ADJUSTMENTS, key)) throw new RangeError(`Unsupported adjustment: ${key}`);
  return { ...normalizeAdjustments(current), [key]: normalizeAdjustments({ [key]: value })[key] };
}

export function hasAdjustmentChanges(value) {
  return Object.values(normalizeAdjustments(value)).some((amount) => amount !== 0);
}

/** Build a native Canvas 2D filter. Zero is neutral; -100..100 maps to 0..200%. */
export function getAdjustmentFilter(value) {
  const adjustments = normalizeAdjustments(value);
  if (!hasAdjustmentChanges(adjustments)) return 'none';
  return `brightness(${100 + adjustments.brightness}%) contrast(${100 + adjustments.contrast}%) saturate(${100 + adjustments.saturation}%)`;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}
