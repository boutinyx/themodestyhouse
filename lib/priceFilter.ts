import { convertedRowPrice } from './sortRows';
import type { CompactCatalogue } from './compactCatalogue';
import type { CurrencyPreference } from './fx';

/**
 * A slider over fewer than this many rows is worse than no slider: the control
 * costs a row of the filter bar and can only ever remove two or three cards.
 */
export const MIN_ROWS_FOR_SLIDER = 8;

/**
 * The track stops here rather than at the true maximum.
 *
 * MEASURED, 2026-09-05, not chosen: prices are heavily right-skewed, and on
 * /modest-hijabs (which runs $1-$243) three quarters of the catalogue sits
 * inside the FIRST 13% of a linear track to the max. Every adjustment a real
 * shopper wants happens within a few pixels while 87% of the travel separates
 * a handful of outliers. Capping at p95 moves that 75% into 43% of the track.
 *
 * Nothing is hidden: a top handle parked at the maximum sets openTop, and
 * withinPrice then admits everything above it.
 */
const TAIL_PERCENTILE = 0.95;

/** Steps that make a slider land on numbers a person would say out loud. */
const STEPS = [1, 5, 10, 25, 50];

export type PriceBounds = {
  min: number;
  max: number;
  step: number;
  /** True when rows exist above `max`; the top handle then means "and up". */
  openTop: boolean;
  /** False when the control should not be rendered at all. */
  usable: boolean;
};

const UNUSABLE: PriceBounds = { min: 0, max: 0, step: 1, openTop: false, usable: false };

function stepFor(span: number): number {
  // ~20 stops across the track: fine enough to be precise, coarse enough that
  // dragging does not produce $73.
  for (const s of STEPS) if (span / s <= 20) return s;
  return STEPS[STEPS.length - 1];
}

/**
 * Linear-interpolation percentile (numpy's default "linear" method), not
 * nearest-rank. The two differ exactly where this module needs the right
 * answer: over `[...Array(95).fill(20), ...Array(5).fill(2000)]`, nearest-rank
 * (`values[floor((n-1)*p)]`) lands on index 94 — still 20, the same as `lo` —
 * because the 95th percentile boundary sits ONE STEP before the tail begins,
 * not inside it. That collapses the track to zero width and forces the
 * UNUSABLE path even though a real tail exists above it. Interpolating
 * between index 94 (20) and index 95 (2000) instead yields 119, a genuine
 * point partway into the gap — which is what lets `cap` exceed `lo` and the
 * tail render as `openTop` rather than as "no slider at all".
 */
function percentile(sortedValues: number[], p: number): number {
  const idx = (sortedValues.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sortedValues[lo];
  return sortedValues[lo] + (idx - lo) * (sortedValues[hi] - sortedValues[lo]);
}

export function priceBounds(
  cat: CompactCatalogue,
  rows: number[],
  preference: CurrencyPreference,
): PriceBounds {
  if (rows.length < MIN_ROWS_FOR_SLIDER) return UNUSABLE;

  const values: number[] = [];
  for (const row of rows) {
    const v = convertedRowPrice(cat, row, preference);
    // An unconvertible row cannot inform the bounds — it has no comparable
    // number. It is still never FILTERED OUT; see withinPrice.
    if (v !== null) values.push(v);
  }
  if (values.length < MIN_ROWS_FOR_SLIDER) return UNUSABLE;

  values.sort((a, b) => a - b);
  const lo = values[0];
  const trueMax = values[values.length - 1];
  const cap = percentile(values, TAIL_PERCENTILE);
  if (lo === trueMax) return UNUSABLE;

  const step = stepFor(Math.max(cap - lo, 1));
  const min = Math.floor(lo / step) * step;
  const max = Math.ceil(cap / step) * step;
  if (min === max) return UNUSABLE;

  return { min, max, step, openTop: trueMax > max, usable: true };
}

export function withinPrice(
  cat: CompactCatalogue,
  row: number,
  preference: CurrencyPreference,
  range: [number, number],
  openTop: boolean,
): boolean {
  const v = convertedRowPrice(cat, row, preference);
  // Invariant 9's reasoning one layer out: not being able to classify — here,
  // to price — a product is not evidence it should disappear.
  if (v === null) return true;
  const [lo, hi] = range;
  if (v < lo) return false;
  return v <= hi || openTop;
}

/** Keeps a range inside bounds that moved, e.g. after a currency change. */
export function clampRange(range: [number, number], bounds: PriceBounds): [number, number] {
  const lo = Math.min(Math.max(range[0], bounds.min), bounds.max);
  const hi = Math.min(Math.max(range[1], bounds.min), bounds.max);
  return lo <= hi ? [lo, hi] : [hi, lo];
}
