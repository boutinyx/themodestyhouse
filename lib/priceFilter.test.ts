import { describe, it, expect } from 'vitest';
import { priceBounds, withinPrice, clampRange, priceHistogram, MIN_ROWS_FOR_SLIDER } from './priceFilter';
import type { CompactCatalogue } from './compactCatalogue';

function catWith(prices: number[], currency = 'USD'): CompactCatalogue {
  return {
    brands: [{ slug: 'b', name: 'B', currency }],
    rows: { price: prices, brandIdx: prices.map(() => 0), title: prices.map(() => 't'), firstSeenDay: prices.map(() => 0) },
  } as unknown as CompactCatalogue;
}
const all = (n: number) => Array.from({ length: n }, (_, i) => i);

describe('priceBounds', () => {
  it('rounds outward to a clean step, never inside the real data', () => {
    const cat = catWith([12, 37, 44, 61, 88, 91, 103, 118, 129, 140]);
    const b = priceBounds(cat, all(10), 'USD');
    expect(b.min).toBeLessThanOrEqual(12);
    // Interpolated p95 (this module's `percentile`, not nearest-rank) is
    // 135.05 — between index 8 (129) and index 9 (140) — which then rounds
    // outward to a step-10 track: b.max = 140.
    expect(b.max).toBeGreaterThanOrEqual(129);
    expect(b.min % b.step).toBe(0);
    expect(b.max % b.step).toBe(0);
  });

  // The measured problem the spec is built around: /modest-hijabs runs $1-$243
  // and 75% of it sits under $32, so a track to the true max is unusable.
  it('caps the track at p95 and flags openTop when a tail exists', () => {
    const prices = [...Array(95).fill(20), ...Array(5).fill(2000)];
    const b = priceBounds(catWith(prices), all(100), 'USD');
    expect(b.openTop).toBe(true);
    expect(b.max).toBeLessThan(2000);
  });

  // Degenerate case only: every row is identical, so `lo === trueMax` returns
  // UNUSABLE before the real `openTop` computation ever runs. `openTop: false`
  // here is just the UNUSABLE constant's default, not evidence about the
  // computed path — see the next test for that.
  it('reports unusable (not openTop) when every row is the exact same price', () => {
    const b = priceBounds(catWith(Array(100).fill(50)), all(100), 'USD');
    expect(b.usable).toBe(false);
    expect(b.openTop).toBe(false);
  });

  // The genuine computed path: a real spread with no tail above p95. Values
  // 10, 20, ..., 1000 give cap=950.5 (interpolated p95), step=50, so the
  // track rounds UP to max=1000 — exactly trueMax — and openTop is false
  // because there's truly nothing above it, not because an early return
  // skipped the comparison. A mutant hardcoding `openTop: true` on the
  // usable path fails only this test.
  it('does not flag openTop when the track rounds up to cover the true max', () => {
    const prices = Array.from({ length: 100 }, (_, i) => 10 * (i + 1));
    const b = priceBounds(catWith(prices), all(100), 'USD');
    expect(b.usable).toBe(true);
    expect(b.max).toBe(1000);
    expect(b.openTop).toBe(false);
  });

  it('reports unusable when every row is the same price', () => {
    expect(priceBounds(catWith(Array(20).fill(50)), all(20), 'USD').usable).toBe(false);
  });

  it('reports unusable below the row floor', () => {
    const n = MIN_ROWS_FOR_SLIDER - 1;
    const prices = Array.from({ length: n }, (_, i) => 10 + i * 10);
    expect(priceBounds(catWith(prices), all(n), 'USD').usable).toBe(false);
  });

  it('ignores rows it cannot convert when computing bounds', () => {
    const cat = {
      brands: [{ slug: 'a', name: 'A', currency: 'USD' }, { slug: 'z', name: 'Z', currency: 'ZZZ' }],
      rows: { price: [10, 20, 30, 40, 50, 60, 70, 80, 999999], brandIdx: [0, 0, 0, 0, 0, 0, 0, 0, 1], title: Array(9).fill('t'), firstSeenDay: Array(9).fill(0) },
    } as unknown as CompactCatalogue;
    expect(priceBounds(cat, all(9), 'USD').max).toBeLessThan(999999);
  });
});

describe('withinPrice', () => {
  const cat = catWith([10, 50, 100]);

  it('includes a row inside the range and excludes one outside it', () => {
    expect(withinPrice(cat, 1, 'USD', [40, 60], false)).toBe(true);
    expect(withinPrice(cat, 0, 'USD', [40, 60], false)).toBe(false);
  });

  it('is inclusive at both ends', () => {
    expect(withinPrice(cat, 0, 'USD', [10, 50], false)).toBe(true);
    expect(withinPrice(cat, 1, 'USD', [10, 50], false)).toBe(true);
  });

  it('admits everything above the top handle when openTop is set', () => {
    expect(withinPrice(cat, 2, 'USD', [10, 60], true)).toBe(true);
    expect(withinPrice(cat, 2, 'USD', [10, 60], false)).toBe(false);
  });

  // A filter must never delete a product because we could not price it.
  it('includes a row whose currency has no rate, whatever the range', () => {
    const noRate = {
      brands: [{ slug: 'z', name: 'Z', currency: 'ZZZ' }],
      rows: { price: [500], brandIdx: [0], title: ['t'], firstSeenDay: [0] },
    } as unknown as CompactCatalogue;
    expect(withinPrice(noRate, 0, 'USD', [0, 1], false)).toBe(true);
  });
});

describe('clampRange', () => {
  it('pulls both handles inside new bounds after a currency change', () => {
    const b = { min: 10, max: 100, step: 5, openTop: false, usable: true };
    expect(clampRange([5, 500], b)).toEqual([10, 100]);
  });

  it('leaves a range that already fits alone', () => {
    const b = { min: 10, max: 100, step: 5, openTop: false, usable: true };
    expect(clampRange([20, 80], b)).toEqual([20, 80]);
  });

  it('never returns an inverted range', () => {
    const b = { min: 10, max: 100, step: 5, openTop: false, usable: true };
    const [lo, hi] = clampRange([90, 20], b);
    expect(lo).toBeLessThanOrEqual(hi);
  });

  // The I1 regression: a USD range handed straight to TRY bounds used to
  // collapse to a single point at the new floor, because [300, 500] carries
  // no meaning once the currency underneath it changes. Real bounds from a
  // real rate (TRY ~48.08 per USD, data/fx-rates.json) — a USD track of
  // $0-$500 and its TRY equivalent, ~0-24,040.
  it('repositions a range proportionally across a currency change, instead of collapsing it', () => {
    const usdBounds = { min: 0, max: 500, step: 25, openTop: false, usable: true };
    const tryBounds = { min: 0, max: 24000, step: 500, openTop: false, usable: true };
    // Visitor narrowed to the top 40% of the USD track: [300, 500].
    const [lo, hi] = clampRange([300, 500], tryBounds, usdBounds);
    expect(lo).toBeGreaterThan(tryBounds.min); // not collapsed to the floor
    expect(hi).toBeLessThanOrEqual(tryBounds.max);
    expect(lo).toBeLessThan(hi); // a real, non-empty range — not a point
    // Proportional position survives: still ~60%-100% of the new track.
    expect(lo / tryBounds.max).toBeCloseTo(300 / usdBounds.max, 1);
    expect(hi / tryBounds.max).toBeCloseTo(500 / usdBounds.max, 1);
  });

  it('falls back to an absolute clamp when no old bounds are given (bounds narrowed by another filter, same currency)', () => {
    const b = { min: 10, max: 100, step: 5, openTop: false, usable: true };
    expect(clampRange([5, 500], b)).toEqual([10, 100]);
  });
});

describe('priceHistogram', () => {
  const bounds = { min: 0, max: 100, step: 5, openTop: false, usable: true };

  it('bins every row across the same span the track covers', () => {
    const cat = catWith([0, 25, 50, 75, 99]);
    const bins = priceHistogram(cat, [0, 1, 2, 3, 4], 'USD', bounds, 4);
    expect(bins).toEqual([1, 1, 1, 2]);
    expect(bins.reduce((a, b) => a + b, 0)).toBe(5);
  });

  // The same promise openTop makes: the track stops at p95, the catalogue does
  // not. A tail row must be counted, not dropped, or the last bar under-reports.
  it('counts a row above the cap in the last bin rather than dropping it', () => {
    const cat = catWith([10, 10, 10, 10_000]);
    const bins = priceHistogram(cat, [0, 1, 2, 3], 'USD', bounds, 4);
    expect(bins[3]).toBe(1);
    expect(bins.reduce((a, b) => a + b, 0)).toBe(4);
  });

  it('returns all zeroes for unusable bounds rather than dividing by zero', () => {
    const dead = { min: 0, max: 0, step: 1, openTop: false, usable: false };
    expect(priceHistogram(catWith([1, 2, 3]), [0, 1, 2], 'USD', dead, 4)).toEqual([0, 0, 0, 0]);
  });

  it('omits a row it cannot price, without shifting the other bins', () => {
    const cat = {
      brands: [{ slug: 'a', name: 'A', currency: 'USD' }, { slug: 'z', name: 'Z', currency: 'ZZZ' }],
      rows: { price: [10, 90, 50], brandIdx: [0, 0, 1], title: ['t', 't', 't'], firstSeenDay: [0, 0, 0] },
    } as unknown as CompactCatalogue;
    const bins = priceHistogram(cat, [0, 1, 2], 'USD', bounds, 2);
    expect(bins).toEqual([1, 1]);
  });
});
