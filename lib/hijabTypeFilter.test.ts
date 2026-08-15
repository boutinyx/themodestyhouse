import { describe, it, expect } from 'vitest';
import { hijabTypeFilter, HIJAB_TYPE_FILTER_LABELS } from './hijabTypeFilter';
import type { Product } from '@/lib/types';
import { productsForLane } from '@/lib/products';

const base: Product = {
  id: 'x:1', brandSlug: 'x', brandName: 'X', title: 't', price: 1, currency: 'USD',
  image: 'i', url: 'u', inStock: true, garment: 'hijab', community: 'general',
  occasion: [], season: [], activity: [],
};

const p = (title: string, garment: Product['garment'] = 'hijab', extra: Partial<Product> = {}): Product =>
  ({ ...base, title, garment, ...extra });

describe('hijabTypeFilter', () => {
  it('returns null for a product outside the Hijabs & Scarves lane', () => {
    expect(hijabTypeFilter(p('Jersey Maxi Dress', 'dress'))).toBeNull();
  });

  it('returns null for a plain, unclassifiable hijab title', () => {
    expect(hijabTypeFilter(p('Riverwalk Blue Hijab'))).toBeNull(); // haute-hijab, real title
  });

  it('sorts a real title from each of the 15 groups into exactly the right group', () => {
    expect(hijabTypeFilter(p('Syrian Full-Neck Underscarf'))).toBe('caps-underscarves'); // jaida
    expect(hijabTypeFilter(p('Khimar Medina silk'))).toBe('khimar'); // jennah-boutique
    expect(hijabTypeFilter(p('Jilbab - Black', 'abaya'))).toBe('jilbab');
    expect(hijabTypeFilter(p('Premium Instant Hijab'))).toBe('instant'); // lafemme
    expect(hijabTypeFilter(p('Lina Knit Sweater and Removable Shawl'))).toBe('shawl'); // mondo-the-label
    expect(hijabTypeFilter(p('The Culture Starter Set'))).toBe('set'); // culture-hijab
    expect(hijabTypeFilter(p('Airy Jersey Scarf Mocha Brown'))).toBe('jersey'); // diversity-modest
    expect(hijabTypeFilter(p('Navy Lace Trim Modal Hijab'))).toBe('modal'); // urban-modesty
    expect(hijabTypeFilter(p('Small Premium Chiffon Hijab (Non-Slip)'))).toBe('chiffon'); // voile-chic
    expect(hijabTypeFilter(p('Premium Cotton Hijab'))).toBe('cotton');
    expect(hijabTypeFilter(p('Scarlet of Granada Satin'))).toBe('satin'); // jaida
    expect(hijabTypeFilter(p('Hijab ready to tie burgundy Medina silk'))).toBe('silk-viscose'); // chic-modesty
  });

  // Each pair is a REAL catalogue title matching two groups at once — confirms
  // the priority order resolves to the higher one, not just whichever group
  // happens to be tested first.
  it('resolves priority order when a real title matches more than one group', () => {
    expect(hijabTypeFilter(p('Khimar Medina silk'))).toBe('khimar'); // khimar over silk-viscose
    // hidayah, garment:'abaya' — "One-Piece" alone would say instant
    expect(hijabTypeFilter(p('Mirah One-Piece Jilbab (Bordeaux)', 'abaya'))).toBe('jilbab'); // jilbab over instant
    expect(hijabTypeFilter(p('BreathLite Sports Hijab Set- Ivory Blush - Final Sale'))).toBe('sport'); // sport over set, dignitii
    expect(hijabTypeFilter(p('Printed Satin'))).toBe('printed'); // printed over satin, culture-hijab
    expect(hijabTypeFilter(p('Diamond Satin Crinkle (Oat)'))).toBe('crinkle'); // crinkle over satin, hidayah
    expect(hijabTypeFilter(p('Liquid Jersey Instant Hijab'))).toBe('instant'); // instant over jersey, lafemme
  });

  it('classifies a khimar-abaya item (garment !== "hijab") via isKhimarAbaya, not the plain garment check', () => {
    // Real title, cited in lib/specialty.ts's own isKhimarAbaya() comment.
    expect(hijabTypeFilter(p('Mastour Khimaar Burnished Lilac', 'abaya'))).toBe('khimar');
  });

  it('every label in HIJAB_TYPE_FILTER_LABELS is reachable — regression guard against a group with a label but no working regex', () => {
    const realExampleByGroup: Record<string, Product> = {
      'caps-underscarves': p('Syrian Full-Neck Underscarf'),
      khimar: p('Khimar Medina silk'),
      jilbab: p('Jilbab - Black', 'abaya'),
      instant: p('Premium Instant Hijab'),
      sport: p('BreathLite Sports Hijab Set- Ivory Blush - Final Sale'),
      shawl: p('Lina Knit Sweater and Removable Shawl'),
      printed: p('Printed Satin'),
      set: p('The Culture Starter Set'),
      crinkle: p('Diamond Satin Crinkle (Oat)'),
      jersey: p('Airy Jersey Scarf Mocha Brown'),
      modal: p('Navy Lace Trim Modal Hijab'),
      chiffon: p('Small Premium Chiffon Hijab (Non-Slip)'),
      cotton: p('Premium Cotton Hijab'),
      satin: p('Scarlet of Granada Satin'),
      'silk-viscose': p('Hijab ready to tie burgundy Medina silk'),
    };
    for (const key of Object.keys(HIJAB_TYPE_FILTER_LABELS)) {
      expect(hijabTypeFilter(realExampleByGroup[key])).toBe(key);
    }
  });

  // Regression guard, not an exact snapshot — data/products.json is
  // republished nightly (CLAUDE.md §10.35), so pinning an exact count here
  // would fail on ordinary catalogue growth, not a real bug. This only
  // catches the classifier actually breaking (e.g. GROUPS emptied, or
  // reordered so nothing resolves). Measured 2026-08-15: 5,146 items on the
  // lane, 83.5% classified.
  it('classifies most of the real modest-hijabs lane', () => {
    const items = productsForLane('modest-hijabs');
    const classified = items.filter((prod) => hijabTypeFilter(prod) !== null).length;
    expect(items.length).toBeGreaterThan(1000);
    expect(classified / items.length).toBeGreaterThan(0.6);
  });
});
