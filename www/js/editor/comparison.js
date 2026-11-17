/** Comparison view state is temporary viewport UI state, never an edit/history entry. */
export const COMPARISON_LABELS = Object.freeze({ before: 'Show original image', after: 'Show edited image' });

export function normalizeComparisonMode(value) {
  return value === true;
}
