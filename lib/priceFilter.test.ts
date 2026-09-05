import { describe, it, expect } from 'vitest';
import { priceBounds, withinPrice, clampRange, MIN_ROWS_FOR_SLIDER } from './priceFilter';
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
    expect(b.max).toBeGreaterThanOrEqual(129); // p95 of this set
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

  it('does not flag openTop when there is no tail above p95', () => {
    const b = priceBounds(catWith(Array(100).fill(50)), all(100), 'USD');
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
});
