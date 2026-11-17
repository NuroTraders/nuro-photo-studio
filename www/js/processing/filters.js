import { getAdjustmentFilter } from './adjustments.js';

export const FILTER_PRESETS = Object.freeze({
  original: Object.freeze({ label: 'Original', filter: '' }),
  grayscale: Object.freeze({ label: 'Grayscale', filter: 'grayscale(100%)' }),
  sepia: Object.freeze({ label: 'Sepia', filter: 'sepia(78%)' }),
  vintage: Object.freeze({ label: 'Vintage', filter: 'sepia(30%) contrast(108%) saturate(82%)' }),
  warm: Object.freeze({ label: 'Warm', filter: 'sepia(16%) saturate(112%)' }),
  cool: Object.freeze({ label: 'Cool', filter: 'saturate(108%) hue-rotate(8deg)' }),
});

export function normalizeFilter(value) {
  return Object.hasOwn(FILTER_PRESETS, value) ? value : 'original';
}

/** Compose deterministic preset and manual adjustment filters for Canvas 2D. */
export function getCanvasFilter(adjustments, preset = 'original') {
  const manualFilter = getAdjustmentFilter(adjustments);
  const presetFilter = FILTER_PRESETS[normalizeFilter(preset)].filter;
  return [manualFilter === 'none' ? '' : manualFilter, presetFilter].filter(Boolean).join(' ') || 'none';
}
