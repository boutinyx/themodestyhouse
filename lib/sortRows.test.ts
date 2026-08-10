import { describe, it, expect } from 'vitest';
import { encodeCatalogue } from './compactCatalogue';
import { sortRowIndices, SORT_OPTIONS } from './sortRows';
import type { Product, Brand } from './types';

const GBP_BRAND: Brand = {
  slug: 'inayah', name: 'Inayah', homepage: 'https://inayah.co', feedUrl: 'https://inayah.co/products.json',
  community: 'hijabi', currency: 'GBP', category: 'Modest dresses', city: 'London', vibe: 'elegant',
};
const USD_BRAND: Brand = {
  slug: 'aab', name: 'Aab', homepage: 'https://us.aabcollection.com', feedUrl: 'https://us.aabcollection.com/products.json',
  community: 'hijabi', currency: 'USD', category: 'Modest & abayas', city: 'London', vibe: 'elegant',
};

const base: Omit<Product, 'id' | 'brandSlug' | 'brandName' | 'currency' | 'price' | 'firstSeen'> = {
  title: 'Item', image: 'https://cdn.shopify.com/a.jpg', url: 'https://x.com/products/a',
  inStock: true, garment: 'dress', community: 'hijabi', occasion: [], season: [], activity: [],
};

const products: Product[] = [
  { ...base, id: 'inayah:1', brandSlug: 'inayah', brandName: 'Inayah', currency: 'GBP', price: 100, firstSeen: '2026-08-06' }, // idx 0
  { ...base, id: 'aab:1', brandSlug: 'aab', brandName: 'Aab', currency: 'USD', price: 50, firstSeen: '2026-08-08' },           // idx 1
  { ...base, id: 'inayah:2', brandSlug: 'inayah', brandName: 'Inayah', currency: 'GBP', price: 30, firstSeen: null },          // idx 2, unknown date
];

const cat = encodeCatalogue(products, [GBP_BRAND, USD_BRAND]);
const allRows = [0, 1, 2];

describe('SORT_OPTIONS', () => {
  it('lists featured first and both price directions before newest/oldest', () => {
    expect(SORT_OPTIONS.map((o) => o.value)).toEqual(['featured', 'price-asc', 'price-desc', 'newest', 'oldest']);
  });
});

describe('sortRowIndices', () => {
  it('featured leaves order untouched', () => {
    expect(sortRowIndices(cat, allRows, 'featured', null)).toEqual([0, 1, 2]);
  });

  it('price-asc sorts by native price when no currency preference is set', () => {
    // native: inayah:1=£100, aab:1=$50, inayah:2=£30 -> compared as raw numbers 100, 50, 30
    expect(sortRowIndices(cat, allRows, 'price-asc', null)).toEqual([2, 1, 0]);
  });

  it('price-desc is the exact reverse of price-asc', () => {
    expect(sortRowIndices(cat, allRows, 'price-desc', null)).toEqual([0, 1, 2]);
  });

  it('price-asc converts to the selected display currency before comparing', () => {
    // Both GBP rows convert to whatever GBP->USD is; aab:1 is already USD ($50).
    // We don't assert exact converted numbers (fx-rates.json can change) — only
    // that the comparison is internally consistent: whichever of the two GBP
    // rows is cheaper stays cheaper relative to each other regardless of
    // conversion, and the result is a permutation of all three rows.
    const result = sortRowIndices(cat, allRows, 'price-asc', 'USD');
    expect(result.slice().sort()).toEqual([0, 1, 2]);
    // inayah:2 (£30) must sort below inayah:1 (£100) either way — conversion
    // is monotonic per currency.
    expect(result.indexOf(2)).toBeLessThan(result.indexOf(0));
  });

  it('newest sorts by firstSeenDay descending, unknown dates last', () => {
    // idx1 (2026-08-08) newest, idx0 (2026-08-06) next, idx2 (unknown/-1) last
    expect(sortRowIndices(cat, allRows, 'newest', null)).toEqual([1, 0, 2]);
  });

  it('oldest sorts by firstSeenDay ascending, unknown dates first', () => {
    // idx2 (-1, unknown) is treated as oldest, then idx0, then idx1
    expect(sortRowIndices(cat, allRows, 'oldest', null)).toEqual([2, 0, 1]);
  });

  it('does not mutate the input array', () => {
    const input = [0, 1, 2];
    sortRowIndices(cat, input, 'price-asc', null);
    expect(input).toEqual([0, 1, 2]);
  });
});
