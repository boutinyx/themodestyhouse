import { describe, it, expect } from 'vitest';
import { demoteGarment } from './ordering';
import type { Product } from '@/lib/types';

// Mirrors the real catalogue: ~37% abayas, brand-interleaved.
const build = (n: number, abayaEvery: number): Product[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `b:${i}`, brandSlug: 'b', brandName: 'B', title: `p${i}`, price: 1, currency: 'GBP',
    image: 'i', url: 'u', inStock: true,
    garment: (i % abayaEvery === 0 ? 'abaya' : 'dress'),
    community: 'general', occasion: [], season: [], activity: [],
  })) as Product[];

const shareIn = (rows: Product[], from: number, to: number) => {
  const w = rows.slice(from, to);
  return w.filter((p) => p.garment === 'abaya').length / w.length;
};

describe('demoteGarment', () => {
  const rows = build(6000, 3); // ~33% abayas
  const out = demoteGarment(rows, 'abaya');

  it('loses nothing and invents nothing', () => {
    expect(out).toHaveLength(rows.length);
    expect(new Set(out.map((p) => p.id)).size).toBe(rows.length);
  });

  // THE LOAD-BEARING PROPERTY. /modest-abayas filters the published order down to
  // abayas, so as long as abayas keep their order RELATIVE TO EACH OTHER, the
  // abaya lane is byte-identical before and after this demotion.
  it('preserves the relative order of abayas, so the abaya lane is unaffected', () => {
    const before = rows.filter((p) => p.garment === 'abaya').map((p) => p.id);
    const after = out.filter((p) => p.garment === 'abaya').map((p) => p.id);
    expect(after).toEqual(before);
  });

  it('preserves the relative order of everything else', () => {
    const before = rows.filter((p) => p.garment !== 'abaya').map((p) => p.id);
    const after = out.filter((p) => p.garment !== 'abaya').map((p) => p.id);
    expect(after).toEqual(before);
  });

  it('roughly halves abayas across the first 100', () => {
    const s = shareIn(out, 0, 100);
    expect(s).toBeGreaterThan(0.10);
    expect(s).toBeLessThan(0.20);
  });

  it('demotes rather than hides — abayas still appear in the first screenful', () => {
    expect(out.slice(0, 24).some((p) => p.garment === 'abaya')).toBe(true);
  });

  it('blends back to the natural share by around position 300', () => {
    expect(shareIn(out, 300, 800)).toBeGreaterThan(0.25);
  });

  it('does not push them all to the bottom', () => {
    // Deep-tail share must not be wildly above the natural rate; if it were,
    // "lower" would have become "last".
    expect(shareIn(out, out.length - 500, out.length)).toBeLessThan(0.75);
  });

  it('handles a list with no abayas', () => {
    const none = build(50, 999).filter((p) => p.garment !== 'abaya');
    expect(demoteGarment(none, 'abaya').map((p) => p.id)).toEqual(none.map((p) => p.id));
  });

  it('handles a list that is entirely abayas', () => {
    const all = build(50, 1);
    expect(demoteGarment(all, 'abaya').map((p) => p.id)).toEqual(all.map((p) => p.id));
  });

  it('handles an empty list', () => {
    expect(demoteGarment([], 'abaya')).toEqual([]);
  });

  it('is idempotent enough to be safe if applied twice', () => {
    const once = demoteGarment(rows, 'abaya');
    const twice = demoteGarment(once, 'abaya');
    expect(twice).toHaveLength(rows.length);
    expect(shareIn(twice, 0, 100)).toBeLessThan(0.20);
  });

  // /directory calls browseProducts(), which strips hijabs and swim/activewear
  // BEFORE rendering. Capping the share across the full published list therefore
  // measures the wrong sequence: removing those rows re-concentrates abayas, and
  // the first attempt at this pushed them from 12% UP to 21%. The cap has to be
  // computed over the visible subsequence only.
  it('caps the share within the VISIBLE subsequence, not the raw list', () => {
    const mixed: Product[] = [];
    for (let i = 0; i < 3000; i++) {
      mixed.push({ ...build(1, 999)[0], id: `x:${i}`, garment: i % 3 === 0 ? 'abaya' : 'dress' } as Product);
      mixed.push({ ...build(1, 999)[0], id: `h:${i}`, garment: 'hijab' } as Product);
    }
    const isVisible = (p: Product) => p.garment !== 'hijab';
    const out = demoteGarment(mixed, 'abaya', isVisible);

    const visible = out.filter(isVisible);
    const share = visible.slice(0, 100).filter((p) => p.garment === 'abaya').length / 100;
    expect(share).toBeGreaterThan(0.10);
    expect(share).toBeLessThan(0.20);
  });

  it('leaves invisible rows where they were, so other lanes are untouched', () => {
    const mixed: Product[] = [];
    for (let i = 0; i < 200; i++) {
      mixed.push({ ...build(1, 999)[0], id: `x:${i}`, garment: i % 3 === 0 ? 'abaya' : 'dress' } as Product);
      mixed.push({ ...build(1, 999)[0], id: `h:${i}`, garment: 'hijab' } as Product);
    }
    const isVisible = (p: Product) => p.garment !== 'hijab';
    const out = demoteGarment(mixed, 'abaya', isVisible);
    const posBefore = mixed.map((p, i) => [p.id, i] as const).filter(([id]) => id.startsWith('h:'));
    const posAfter = out.map((p, i) => [p.id, i] as const).filter(([id]) => id.startsWith('h:'));
    expect(posAfter).toEqual(posBefore);
  });

  // Comparing the CUMULATIVE share forces catch-up: everything held back early
  // has to be repaid to drag the running average up to the natural rate, which
  // produced a 59%-abaya stretch at positions 200-300 — worse than doing
  // nothing. The schedule must track the LOCAL rate, not the running average.
  it('does not produce a catch-up burst after the ramp', () => {
    const out = demoteGarment(build(6000, 3), 'abaya');
    for (let a = 100; a < 1000; a += 100) {
      expect(shareIn(out, a, a + 100), `burst at ${a}-${a + 100}`).toBeLessThan(0.45);
    }
  });
});
