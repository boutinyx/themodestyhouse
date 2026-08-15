import { describe, it, expect } from 'vitest';
import { LANES, currentCategoryLabel } from './lanes';
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
  it('hijabs lane also matches jilbab-titled products, whatever their garment field, and is specialty', () => {
    const hijabs = LANES.find((l) => l.slug === 'modest-hijabs')!;
    expect(hijabs.specialty).toBe(true);
    expect(hijabs.match({ ...base, garment: 'hijab', title: 'Plain Hijab' })).toBe(true);
    expect(hijabs.match({ ...base, garment: 'abaya', title: 'Black Corduroy Jilbab' })).toBe(true);
    expect(hijabs.match({ ...base, garment: 'abaya', title: 'Black Open Abaya' })).toBe(false);
  });
  // 2026-08-15: a jilbab-titled product that is ALSO prayer wear now belongs
  // to Layering Basics instead — see lib/specialty.ts's isLayering() and the
  // `&& !isLayering(p)` guard this lane's match gained the same day.
  it('hijabs lane defers to Layering Basics for jilbab-titled prayer sets', () => {
    const hijabs = LANES.find((l) => l.slug === 'modest-hijabs')!;
    const layering = LANES.find((l) => l.slug === 'layering-basics')!;
    const prayerSet = { ...base, garment: 'abaya' as const, title: '2-Piece Prayer Set (Jilbab)' };
    expect(hijabs.match(prayerSet)).toBe(false);
    expect(layering.match(prayerSet)).toBe(true);
  });
});

describe('currentCategoryLabel', () => {
  it('labels a plain garment by its category lane title', () => {
    expect(currentCategoryLabel({ ...base, garment: 'skirt' })).toBe('Skirts');
    expect(currentCategoryLabel({ ...base, garment: 'trousers' })).toBe('Trousers');
  });

  it('labels an outerwear item with its subtype', () => {
    const blazer = { ...base, garment: 'top' as const, title: 'Tailored Blazer' };
    expect(currentCategoryLabel(blazer)).toBe('Outerwear — Blazers');
  });

  it('labels a layering item with its subtype', () => {
    const neckCover = { ...base, garment: 'top' as const, title: 'Black Neck Cover' };
    expect(currentCategoryLabel(neckCover)).toBe('Layering Basics — Neck Covers & Dickeys');
  });

  it('reflects a forcedLane override rather than the raw garment', () => {
    const forced = { ...base, garment: 'top' as const, forcedLane: 'outerwear' as const, forcedOuterwearSubtype: 'vest' as const };
    expect(currentCategoryLabel(forced)).toBe('Outerwear — Vests');
  });
});
