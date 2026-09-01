import { describe, it, expect, vi } from 'vitest';
import { selectNewIn, SEED_POSITIONS, NEW_IN_HOUSES } from './newIn';
import type { Product } from './types';

const base: Omit<Product, 'id' | 'brandSlug' | 'brandName' | 'firstSeen' | 'title'> = {
  price: 50, currency: 'USD', image: 'https://cdn.shopify.com/a.jpg',
  url: 'https://x.com/products/a', inStock: true, garment: 'dress',
  community: 'hijabi', occasion: [], season: [], activity: [],
};

/** `n` products for one house, all on one day, with unique titles so
 *  groupColourVariants cannot collapse them into a single card. */
function rows(slug: string, day: string, n: number, over: Partial<Product> = {}): Product[] {
  return Array.from({ length: n }, (_, i) => ({
    ...base,
    id: `${slug}:${day}-${i}`,
    brandSlug: slug,
    brandName: slug,
    title: `${slug} ${day} piece ${i}`,
    firstSeen: day,
    ...over,
  }));
}

const ids = (ps: Product[]) => ps.map((p) => p.id);

/** 100 rows over five days — 20% each, comfortably under INGEST_BATCH_SHARE,
 *  so every one of them survives de-batching. Two days of 50 would NOT: each
 *  would be half the house's population and both would read as ingest
 *  batches, which is correct behaviour and caught four bad fixtures here. */
const drip = (slug: string) =>
  ['2026-08-10', '2026-08-12', '2026-08-14', '2026-08-16', '2026-08-18']
    .flatMap((d) => rows(slug, d, 20));

describe('selectNewIn — de-batching', () => {
  it('removes an ingest batch', () => {
    const all = [...rows('veiled', '2026-08-20', 100), ...rows('veiled', '2026-08-28', 3)];
    const out = selectNewIn(all);
    expect(out).toHaveLength(3);
    expect(ids(out).every((id) => id.includes('2026-08-28'))).toBe(true);
  });

  it('keeps a genuine drip', () => {
    // five days at 20% each — every day is under the 30% threshold
    const all = ['2026-08-10', '2026-08-12', '2026-08-14', '2026-08-16', '2026-08-18']
      .flatMap((d) => rows('veiled', d, 20));
    expect(selectNewIn(all)).toHaveLength(100);
  });

  it('computes batch days before the view filters, so the hijab toggle cannot move them', () => {
    const all = [
      ...drip('veiled'),                                          // 100 rows, 5 days
      ...rows('veiled', '2026-08-20', 60),                        // 60/166 = 36%, a batch
      ...rows('veiled', '2026-08-19', 6, { garment: 'hijab' }),   // 6/166 = 4%, not a batch
    ];
    const off = ids(selectNewIn(all, { hijabs: false }));
    const on = ids(selectNewIn(all, { hijabs: true }));
    expect(off).toHaveLength(100);
    expect(on).toHaveLength(106);
    // every id surviving with the toggle OFF also survives with it ON: the
    // batch day is identical in both views
    expect(off.every((id) => on.includes(id))).toBe(true);
    expect(on.some((id) => id.includes('2026-08-20'))).toBe(false);
  });

  it('gives nothing to a house whose whole dated population is one date', () => {
    // This is Losyana's real shape: every published piece carries the single
    // date of the .shop domain move. Its only presence is the four seeds.
    const all = [...drip('veiled'), ...rows('losyana', '2026-08-28', 40)];
    const out = selectNewIn(all);
    expect(out.filter((p) => p.brandSlug === 'losyana')).toHaveLength(SEED_POSITIONS.length);
    expect(out.filter((p) => p.brandSlug === 'veiled')).toHaveLength(100);
  });
});

describe('selectNewIn — the Losyana seed', () => {
  it('lands four pieces at one-indexed 3, 9, 16 and 22', () => {
    const all = [...drip('veiled'), ...rows('losyana', '2026-08-28', 60)];
    const out = selectNewIn(all);
    for (const i of SEED_POSITIONS) expect(out[i].brandSlug).toBe('losyana');
    // no two seeds adjacent
    for (let i = 1; i < SEED_POSITIONS.length; i++) {
      expect(SEED_POSITIONS[i] - SEED_POSITIONS[i - 1]).toBeGreaterThan(1);
    }
  });

  it('does not duplicate a seed that already arrived through the window', () => {
    const all = [
      ...drip('veiled'),
      ...rows('losyana', '2026-08-05', 60),  // 60/64 = 94%, a batch
      ...rows('losyana', '2026-08-28', 4),   // 6%, a genuine arrival
    ];
    const out = selectNewIn(all);
    expect(new Set(ids(out)).size).toBe(out.length);
    // the 4 that arrived through the window, plus 4 seeds that are not them
    expect(out.filter((p) => p.brandSlug === 'losyana')).toHaveLength(8);
  });

  it('appends the remaining seeds when the list is shorter than the last position', () => {
    // five days at one row each — a drip, not a batch, but only 5 rows long,
    // so every seed position past the end has to append rather than throw
    const all = [
      ...['2026-08-10', '2026-08-12', '2026-08-14', '2026-08-16', '2026-08-18']
        .flatMap((d) => rows('veiled', d, 1)),
      ...rows('losyana', '2026-08-28', 10),
    ];
    const out = selectNewIn(all);
    expect(out).toHaveLength(9);
    expect(out.filter((p) => p.brandSlug === 'losyana')).toHaveLength(4);
  });
});

describe('selectNewIn — scope', () => {
  it('anchors the window to the data, not the clock', () => {
    const all = drip('veiled');
    const before = ids(selectNewIn(all));
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2027-06-01T00:00:00Z'));
    const after = ids(selectNewIn(all));
    vi.useRealTimers();
    expect(after).toEqual(before);
  });

  it('never shows a house outside NEW_IN_HOUSES', () => {
    expect(NEW_IN_HOUSES.includes('inayah')).toBe(false);
    const all = [...drip('veiled'), ...rows('inayah', '2026-08-28', 10)];
    expect(ids(selectNewIn(all)).some((id) => id.startsWith('inayah:'))).toBe(false);
  });

  it('never shows swim or activewear, with the hijab toggle either way', () => {
    const all = [
      ...drip('veiled'),
      ...rows('veiled', '2026-08-28', 1, { title: 'Burkini Swimsuit', garment: 'swim' }),
      ...rows('veiled', '2026-08-28', 1, { title: 'Sports Leggings', garment: 'trousers' }),
    ];
    for (const hijabs of [false, true]) {
      const titles = selectNewIn(all, { hijabs }).map((p) => p.title);
      expect(titles).not.toContain('Burkini Swimsuit');
      expect(titles).not.toContain('Sports Leggings');
    }
  });

  it('shows hijabs only with the toggle on — including a jilbab whose garment is abaya', () => {
    const all = [
      ...drip('veiled'),
      ...rows('veiled', '2026-08-28', 1, { title: 'Chiffon Hijab Rose', garment: 'hijab' }),
      ...rows('veiled', '2026-08-28', 1, { title: 'Jilbab Two Piece', garment: 'abaya' }),
    ];
    const off = selectNewIn(all, { hijabs: false }).map((p) => p.title);
    const on = selectNewIn(all, { hijabs: true }).map((p) => p.title);
    expect(off).not.toContain('Chiffon Hijab Rose');
    expect(off).not.toContain('Jilbab Two Piece');
    expect(on).toContain('Chiffon Hijab Rose');
    expect(on).toContain('Jilbab Two Piece');
  });
});
