import { describe, it, expect } from 'vitest';
import { LANES } from './lanes';
import type { Product } from '@/lib/types';

const base: Product = {
  id: 'x:1', brandSlug: 'x', brandName: 'X', title: 't', price: 1, currency: 'USD',
  image: 'i', url: 'u', inStock: true, garment: 'dress', community: 'general',
  occasion: [], season: [], activity: [],
};

describe('LANES', () => {
  it('includes the core lanes', () => {
    const slugs = LANES.map((l) => l.slug);
    for (const s of ['modest-dresses', 'hijabi-outfits', 'modest-swimwear', 'modest-abayas', 'modest-wedding-guest']) {
      expect(slugs).toContain(s);
    }
  });
  it('hijabi lane matches a hijabi-brand product', () => {
    const hijabi = LANES.find((l) => l.slug === 'hijabi-outfits')!;
    expect(hijabi.match({ ...base, community: 'hijabi', garment: 'hijab' })).toBe(true);
    expect(hijabi.match(base)).toBe(false);
  });
  it('abaya lane matches an abaya', () => {
    const abaya = LANES.find((l) => l.slug === 'modest-abayas')!;
    expect(abaya.match({ ...base, garment: 'abaya' })).toBe(true);
  });
  it('wedding lane matches a wedding occasion', () => {
    const wed = LANES.find((l) => l.slug === 'modest-wedding-guest')!;
    expect(wed.match({ ...base, occasion: ['wedding'] })).toBe(true);
  });
});
