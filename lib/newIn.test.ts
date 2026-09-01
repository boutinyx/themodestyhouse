import { describe, it, expect, vi } from 'vitest';
import { selectNewIn, SEED_POSITIONS, NEW_IN_HOUSES, NEW_IN_MAX_PER_HOUSE } from './newIn';
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

const DAYS = ['2026-08-10', '2026-08-12', '2026-08-14', '2026-08-16', '2026-08-18'];

/**
 * A house with an ordinary drip: `perDay` rows on each of five days.
 *
 * TWO fixture traps live here, both of which produced a green test that proved
 * nothing before they were understood:
 *   - Fewer than four days makes every day >= INGEST_BATCH_SHARE, so the whole
 *     house reads as an ingest batch and vanishes. An "expected [] to equal []"
 *     assertion then passes vacuously.
 *   - More than NEW_IN_MAX_PER_HOUSE rows in total gets capped, so a count
 *     assertion measures the cap rather than whatever it meant to measure.
 * Default 2/day = 10 rows: under the cap, and 20% per day, under the threshold.
 */
const drip = (slug: string, perDay = 2) => DAYS.flatMap((d) => rows(slug, d, perDay));

const ids = (ps: Product[]) => ps.map((p) => p.id);
const houses = (ps: Product[]) => ps.map((p) => p.brandSlug);

describe('selectNewIn — de-batching', () => {
  it('removes an ingest batch', () => {
    const all = [...rows('veiled', '2026-08-20', 100), ...rows('veiled', '2026-08-28', 3)];
    const out = selectNewIn(all);
    expect(out).toHaveLength(3);
    expect(ids(out).every((id) => id.includes('2026-08-28'))).toBe(true);
  });

  it('keeps a genuine drip', () => {
    expect(selectNewIn(drip('veiled'))).toHaveLength(10);
  });

  it('computes batch days before the view filters, so the hijab toggle cannot move them', () => {
    const all = [
      ...drip('veiled'),                                          // 10 rows over 5 days
      ...rows('veiled', '2026-08-20', 8),                         // 8/19 = 42%, a batch
      ...rows('veiled', '2026-08-19', 1, { garment: 'hijab' }),   // 1/19 = 5%, not a batch
    ];
    const off = ids(selectNewIn(all, { hijabs: false }));
    const on = ids(selectNewIn(all, { hijabs: true }));
    expect(off).toHaveLength(10);
    expect(on).toHaveLength(11);
    expect(off.every((id) => on.includes(id))).toBe(true);
    expect(on.some((id) => id.includes('2026-08-20'))).toBe(false);
  });

  it('gives nothing to a house whose whole dated population is one date', () => {
    // Losyana's real shape: every published piece carries the single date of
    // the .shop domain move. Its only presence is the four seeds.
    const all = [...drip('veiled'), ...rows('losyana', '2026-08-28', 40)];
    const out = selectNewIn(all);
    expect(out.filter((p) => p.brandSlug === 'losyana')).toHaveLength(SEED_POSITIONS.length);
    expect(out.filter((p) => p.brandSlug === 'veiled')).toHaveLength(10);
  });
});

describe('selectNewIn — balance and mixing', () => {
  it('never lets one house exceed NEW_IN_MAX_PER_HOUSE', () => {
    const all = [...drip('veiled', 40), ...drip('aab', 2), ...drip('fares', 2)];
    const out = selectNewIn(all);
    const counts = new Map<string, number>();
    for (const h of houses(out)) counts.set(h, (counts.get(h) ?? 0) + 1);
    expect(counts.get('veiled')).toBe(NEW_IN_MAX_PER_HOUSE);
    // the small houses are untouched — the cap trims, it does not equalise
    expect(counts.get('aab')).toBe(10);
    expect(counts.get('fares')).toBe(10);
  });

  it('keeps a capped house its NEWEST pieces, not its oldest', () => {
    const all = [...drip('veiled', 40), ...drip('aab', 2)];
    const kept = selectNewIn(all).filter((p) => p.brandSlug === 'veiled').map((p) => p.firstSeen);
    // 40/day over 5 days, capped at 12 -> every survivor is from the last day
    expect(kept.every((d) => d === '2026-08-18')).toBe(true);
  });

  it('never puts two cards from the same house back to back while houses remain', () => {
    const all = [...drip('veiled', 40), ...drip('aab', 40), ...drip('fares', 40)];
    const h = houses(selectNewIn(all)).filter((x) => x !== 'losyana');
    // three houses, 12 each -> a perfect three-way round-robin, no repeats
    const adjacent = h.filter((x, i) => i > 0 && x === h[i - 1]);
    expect(adjacent).toEqual([]);
  });

  it('leads with the house holding the newest piece', () => {
    const all = [
      ...drip('veiled'),                          // newest day 2026-08-18
      ...drip('aab'),
      ...rows('fares', '2026-08-19', 1),          // one row, but the newest of all
      ...rows('fares', '2026-08-11', 1), ...rows('fares', '2026-08-13', 1),
      ...rows('fares', '2026-08-15', 1), ...rows('fares', '2026-08-17', 1),
    ];
    expect(houses(selectNewIn(all))[0]).toBe('fares');
  });
});

describe('selectNewIn — the Losyana seed', () => {
  it('lands four pieces at one-indexed 3, 9, 16 and 22', () => {
    const all = [...drip('veiled'), ...drip('aab'), ...drip('fares'),
      ...rows('losyana', '2026-08-28', 60)];
    const out = selectNewIn(all);
    expect(out.length).toBeGreaterThan(SEED_POSITIONS[SEED_POSITIONS.length - 1]);
    for (const i of SEED_POSITIONS) expect(out[i].brandSlug).toBe('losyana');
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
    expect(out.filter((p) => p.brandSlug === 'losyana')).toHaveLength(8);
  });

  it('appends the remaining seeds when the list is shorter than the last position', () => {
    const all = [...drip('veiled', 1), ...rows('losyana', '2026-08-28', 10)];
    const out = selectNewIn(all);
    expect(out).toHaveLength(9);
    expect(out.filter((p) => p.brandSlug === 'losyana')).toHaveLength(4);
  });
});

describe('selectNewIn — scope', () => {
  it('anchors the window to the data, not the clock', () => {
    const all = drip('veiled');
    const before = ids(selectNewIn(all));
    expect(before.length).toBeGreaterThan(0); // not vacuous
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2027-06-01T00:00:00Z'));
    const after = ids(selectNewIn(all));
    vi.useRealTimers();
    expect(after).toEqual(before);
  });

  it('never shows a house outside NEW_IN_HOUSES', () => {
    expect(NEW_IN_HOUSES.includes('inayah')).toBe(false);
    const all = [...drip('veiled'), ...drip('inayah')];
    const out = selectNewIn(all);
    expect(out.length).toBeGreaterThan(0);
    expect(houses(out).some((h) => h === 'inayah')).toBe(false);
  });

  it('never shows swim or activewear, with the hijab toggle either way', () => {
    const all = [
      ...drip('veiled'),
      ...rows('veiled', '2026-08-28', 1, { title: 'Burkini Swimsuit', garment: 'swim' }),
      ...rows('veiled', '2026-08-28', 1, { title: 'Sports Leggings', garment: 'trousers' }),
    ];
    for (const hijabs of [false, true]) {
      const titles = selectNewIn(all, { hijabs }).map((p) => p.title);
      expect(titles.length).toBeGreaterThan(0);
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
