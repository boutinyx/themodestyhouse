import { describe, it, expect } from 'vitest';
import { LANES } from './lanes';
import type { Product } from '@/lib/types';

const base: Product = {
  id: 'x:1', brandSlug: 'x', brandName: 'X', title: 't', price: 1, currency: 'USD',
  image: 'i', url: 'u', inStock: true, garment: 'dress', community: 'general',
  occasion: [], season: [], activity: [],
};

describe('LANES', () => {
  it('has the 4 phase-1 lanes', () => {
    expect(LANES.map((l) => l.slug).sort()).toEqual(
      ['hijabi-outfits', 'modest-church-outfits', 'modest-dresses', 'modest-swimwear'].sort()
    );
  });
  it('church lane matches a general dress', () => {
    const church = LANES.find((l) => l.slug === 'modest-church-outfits')!;
    expect(church.match(base)).toBe(true);
  });
  it('hijabi lane matches a hijabi-brand product', () => {
    const hijabi = LANES.find((l) => l.slug === 'hijabi-outfits')!;
    expect(hijabi.match({ ...base, community: 'hijabi', garment: 'hijab' })).toBe(true);
    expect(hijabi.match(base)).toBe(false);
  });
});
