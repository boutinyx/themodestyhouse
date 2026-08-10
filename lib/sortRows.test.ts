import { describe, it, expect } from 'vitest';
import { encodeCatalogue } from './compactCatalogue';
import { sortRowIndices, SORT_OPTIONS } from './sortRows';
import { convert } from './fx';
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
    // The fixture has to be one whose ORDER FLIPS under conversion. The previous
    // version of this test used the shared `cat` above, whose rows happen to sort
    // identically converted or not — so it passed just as happily against a
    // comparablePrice() that ignored currencyPreference entirely, and was no
    // regression guard at all.
    //
    // £60 vs $70: compared as raw numbers 60 < 70, so NATIVE order is GBP-first.
    // data/fx-rates.json is USD-based with GBP = 0.741549, so
    //   £60 -> 60 / 0.741549 = $80.91  which is ABOVE $70,
    // and CONVERTED order is USD-first. Native comparison alone can never produce
    // that, so the assertions below cannot be satisfied without real conversion.
    const flipProducts: Product[] = [
      { ...base, id: 'inayah:9', brandSlug: 'inayah', brandName: 'Inayah', currency: 'GBP', price: 60, firstSeen: '2026-08-06' }, // row 0
      { ...base, id: 'aab:9', brandSlug: 'aab', brandName: 'Aab', currency: 'USD', price: 70, firstSeen: '2026-08-06' },          // row 1
    ];
    const flipCat = encodeCatalogue(flipProducts, [GBP_BRAND, USD_BRAND]);
    const pair = [0, 1];

    // Premise, asserted against the live rate file rather than a baked-in number:
    // if a future rate refresh ever puts £60 below $70 the flip disappears, and
    // this line fails loudly instead of the test quietly going back to proving
    // nothing.
    const sixtyPoundsInUsd = convert(60, 'GBP', 'USD');
    expect(sixtyPoundsInUsd).not.toBeNull();
    expect(sixtyPoundsInUsd as number).toBeGreaterThan(70);

    // Native: £60 (row 0) then $70 (row 1).
    expect(sortRowIndices(flipCat, pair, 'price-asc', null)).toEqual([0, 1]);
    // Converted to USD: $70 (row 1) then ≈$80.91 (row 0) — the reverse.
    expect(sortRowIndices(flipCat, pair, 'price-asc', 'USD')).toEqual([1, 0]);
    // price-desc must flip with it, not just price-asc.
    expect(sortRowIndices(flipCat, pair, 'price-desc', 'USD')).toEqual([0, 1]);
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
