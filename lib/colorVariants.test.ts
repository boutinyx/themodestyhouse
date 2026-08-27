import { describe, it, expect } from 'vitest';
import { splitColourSuffix, groupColourVariants } from './colorVariants';
import type { Product } from '@/lib/types';

const base: Product = {
  id: 'x:1', brandSlug: 'x', brandName: 'X', title: 't', price: 10, currency: 'USD',
  image: 'i', url: 'u', inStock: true, garment: 'dress', community: 'general',
  occasion: [], season: [], activity: [],
};
const p = (title: string, extra: Partial<Product> = {}): Product =>
  ({ ...base, id: `${extra.brandSlug ?? 'x'}:${title}`, title, ...extra });

describe('splitColourSuffix', () => {
  it('splits the two real separators', () => {
    // Every string here is a literal published title.
    expect(splitColourSuffix('Amara Maxi Dress - Sage Green'))
      .toEqual({ base: 'Amara Maxi Dress', colour: 'Sage Green' });
    expect(splitColourSuffix('Kamar (Oud Santal)'))
      .toEqual({ base: 'Kamar', colour: 'Oud Santal' });
  });

  it('does not split a title that is merely hyphenated', () => {
    // The suffix pattern forbids a further dash inside it, which is what keeps
    // "Tie-Back" from being read as a separator.
    expect(splitColourSuffix('Signature Tie-Back Maxi Dress')).toBe(null);
    expect(splitColourSuffix('Half-Placket Lyocell Dress')).toBe(null);
  });

  it('refuses SIZE and CUT suffixes, which are choices and not duplicates', () => {
    // All four are real suffixes found among the 6,896 grouped rows.
    expect(splitColourSuffix('Chador Essential Dress - 146 cm')).toBe(null);
    expect(splitColourSuffix('Chador Gilet Dress - S/M 142 cm')).toBe(null);
    expect(splitColourSuffix('Jersey Body Top - Long Sleeve')).toBe(null);
    expect(splitColourSuffix('Ribbed Knit Dress - XL')).toBe(null);
  });

  it('needs a real product name in front of the separator', () => {
    expect(splitColourSuffix('Red - Blue')).toBe(null);
  });

  it('accepts a non-English colour without knowing it is one', () => {
    // The whole point of grouping structurally: no vocabulary is consulted, so
    // Turkish and Dutch work with no extra rules (Sec 10.16 / Sec 10.31).
    expect(splitColourSuffix('Basic Örme Elbise - Lacivert')?.colour).toBe('Lacivert');
    expect(splitColourSuffix('Maxi Jurk - Donkerblauw')?.colour).toBe('Donkerblauw');
  });
});

describe('groupColourVariants', () => {
  it('collapses a colour run to one card and counts the siblings', () => {
    const out = groupColourVariants([
      p('Amara Maxi Dress - Off White'),
      p('Amara Maxi Dress - Sage Green'),
      p('Amara Maxi Dress - Butter Yellow'),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe('Amara Maxi Dress - Off White'); // input order leads
    expect(out[0].variantCount).toBe(3);
  });

  it('leaves an ungrouped product with NO variantCount, not 1', () => {
    // decodeCard treats the field as "has siblings", so a stray 1 would light
    // up a badge on a card that has nothing to advertise.
    const out = groupColourVariants([p('Razan Lace Shirt Dress')]);
    expect(out[0].variantCount).toBeUndefined();
  });

  it('never merges across brands or across garments', () => {
    const out = groupColourVariants([
      p('Linen Maxi Dress - Black', { brandSlug: 'a' }),
      p('Linen Maxi Dress - Black', { brandSlug: 'b' }),
      p('Amara Set - Black', { garment: 'set' }),
      p('Amara Set - Black', { garment: 'dress' }),
    ]);
    expect(out).toHaveLength(4);
    expect(out.every((x) => x.variantCount === undefined)).toBe(true);
  });

  it('keeps the caller order and does not mutate the input', () => {
    // getProducts() hands out a CACHED array that other callers share, so
    // mutating a product here would corrupt every other surface.
    const input = [p('Zeta Skirt - Black'), p('Alpha Top - Red'), p('Zeta Skirt - Stone')];
    const snapshot = input.map((x) => ({ ...x }));
    const out = groupColourVariants(input);
    expect(out.map((x) => x.title)).toEqual(['Zeta Skirt - Black', 'Alpha Top - Red']);
    expect(input).toEqual(snapshot);
    expect(input[0].variantCount).toBeUndefined();
  });

  it('counts only what the caller is showing', () => {
    // Grouping runs LAST, after every lane/specialty filter, so a card can
    // never advertise siblings that this surface has already filtered away.
    const shown = [p('Nyla Dress - Black'), p('Nyla Dress - White')];
    expect(groupColourVariants(shown)[0].variantCount).toBe(2);
    expect(groupColourVariants([shown[0]])[0].variantCount).toBeUndefined();
  });
});
