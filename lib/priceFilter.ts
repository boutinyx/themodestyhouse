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

/**
 * How many pieces sit in each slice of the track — the bars behind the slider.
 *
 * Tina asked for the Airbnb treatment (2026-09-05), and the bars are the whole
 * point of it: they are the only part of a price filter that tells you where
 * the catalogue actually IS before you drag anything. On /modest-hijabs the
 * median is $21 against a $243 maximum, and without the bars a visitor has no
 * way to know that by looking.
 *
 * Binned across the SAME [min, max] the track spans, so a bar lines up with the
 * handle above it. Anything above `max` lands in the last bin rather than being
 * dropped — the same promise `openTop` makes: the track stops at the 95th
 * percentile, the catalogue does not.
 *
 * A row whose currency has no rate contributes to no bin — it has no comparable
 * number to place. It is still never FILTERED OUT; see withinPrice.
 */
export function priceHistogram(
  cat: CompactCatalogue,
  rows: number[],
  preference: CurrencyPreference,
  bounds: PriceBounds,
  binCount = 32,
): number[] {
  const bins = new Array<number>(binCount).fill(0);
  if (!bounds.usable || binCount < 1 || bounds.max <= bounds.min) return bins;
  const width = (bounds.max - bounds.min) / binCount;
  for (const row of rows) {
    const v = convertedRowPrice(cat, row, preference);
    if (v === null) continue;
    const i = Math.floor((v - bounds.min) / width);
    bins[Math.min(binCount - 1, Math.max(0, i))]++;
  }
  return bins;
}

/**
 * Keeps a range inside bounds that moved, e.g. after a currency change.
 *
 * When `oldBounds` is given (and genuinely differs from `bounds`), the range
 * is repositioned PROPORTIONALLY: a handle at 60% of the old track lands at
 * 60% of the new one, not at the same raw number. That number carries no
 * meaning across a currency change — `[300, 500]` USD has nothing to say
 * about a TRY track running 650-23,400 — and clamping it absolutely just
 * pushes both handles to the new floor, collapsing the range to a point and
 * emptying the grid. Without `oldBounds` (or when it equals `bounds`), this
 * degrades to a plain absolute clamp, which is what a same-currency bounds
 * change (e.g. another filter narrowing the row set) should do: the chosen
 * numbers still mean the same thing, so only out-of-band values move.
 */
export function clampRange(
  range: [number, number],
  bounds: PriceBounds,
  oldBounds?: PriceBounds,
): [number, number] {
  let lo = range[0];
  let hi = range[1];

  if (
    oldBounds &&
    oldBounds.max > oldBounds.min &&
    (oldBounds.min !== bounds.min || oldBounds.max !== bounds.max)
  ) {
    const oldSpan = oldBounds.max - oldBounds.min;
    const newSpan = bounds.max - bounds.min;
    const fracLo = (range[0] - oldBounds.min) / oldSpan;
    const fracHi = (range[1] - oldBounds.min) / oldSpan;
    lo = bounds.min + fracLo * newSpan;
    hi = bounds.min + fracHi * newSpan;
  }

  lo = Math.min(Math.max(lo, bounds.min), bounds.max);
  hi = Math.min(Math.max(hi, bounds.min), bounds.max);
  return lo <= hi ? [lo, hi] : [hi, lo];
}
