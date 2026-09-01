import { getProducts } from './products';
import { groupColourVariants } from './colorVariants';
import { interleaveByBrand } from './ordering';
import { isSwim, isActivewear, isJilbab, isKhimarAbaya, isUndercap, isPrayer } from './specialty';
import type { Product } from './types';

/**
 * New In — recent arrivals from a hand-picked set of houses.
 *
 * Tina's list, 2026-09-01. `touche-prive` and `touche-prive-eu` are two brand
 * records for one house; the -eu record had 0 published rows when the list was
 * written and is included so a future publish cannot silently omit it.
 */
export const NEW_IN_HOUSES: readonly string[] = [
  'veiled', 'aab', 'summer-evenings', 'vela', 'niswa', 'jawda', 'hawaa', 'klay',
  'diversity-modest', 'esme-ny', 'arakai', 'bemu', 'merrachi', 'manzaram', 'fares',
  'losyana', 'whiteicy', 'chador', 'hum', 'chic-modesty', 'kimodesty', 'by-hasanat',
  'noureen', 'khair-archives', 'amariah', 'touche-prive', 'touche-prive-eu',
  'jennah-boutique', 'ayaana', 'eynaa-paris', 'elaa-the-label', 'modesty-in-style',
  'labayah', 'aurora-abaya', 'nour-al-houda', 'mondo-the-label',
  'la-petite-parisienne', 'glamberry', 'parladusa',
];

export const NEW_IN_WINDOW_DAYS = 30;

/**
 * A `firstSeen` day holding at least this share of a house's dated rows is the
 * day this project first SCRAPED that house, not a day the house published
 * anything.
 *
 * `Product.firstSeen` records ingest, not release. Without this rule the page
 * opens with Merrachi's entire 1,022-piece catalogue: 94% of it carries the
 * single date 2026-08-05. Every house in NEW_IN_HOUSES shows the same shape,
 * between 42% and 100%, and a raw 30-day window returns 5,147 rows of which
 * almost none are arrivals.
 *
 * The threshold is a judgement, not a measurement — named here so it can be
 * tuned from one place. Once every house's ingest day is older than the
 * window it becomes a no-op except when a NEW house joins the list, which is
 * the correct long-run behaviour.
 */
export const INGEST_BATCH_SHARE = 0.3;

/**
 * The most cards any one house may contribute.
 *
 * Tina, 2026-09-01: *"try to keep a balance between the number of products so
 * instead of if a brand has more you put everything in try to keep a balance"*.
 * Without it the page is proportional to how prolific a house is rather than to
 * how good it is: measured before the cap, La Petite Parisienne held 75 of 343
 * cards and the five biggest houses held 200 of them, while nine houses had
 * fewer than ten between them.
 *
 * A house's OWN newest pieces are the ones kept, so the cap costs a house its
 * long tail, never its latest work.
 */
export const NEW_IN_MAX_PER_HOUSE = 12;

/**
 * Losyana is seeded deliberately, because the site is in its referral
 * programme. It also HAS to be: all 826 of its published pieces carry
 * firstSeen 2026-08-28, the .shop domain move that reissued every product id
 * (CLAUDE.md §10.54), so that is one batch and de-batching removes all of it.
 * Losyana's organic contribution to this page is zero.
 *
 * Positions are 0-indexed and spliced in ASCENDING order into the growing
 * array, so the final one-indexed positions are 3, 9, 16 and 22. Tina asked
 * for four "but not next to eachother that its obvious", and the gaps between
 * them (6, 7, 6) are what deliver that.
 *
 * MEASURED against the real grid on staging, not assumed — the grid is TWO
 * columns on a phone and THREE at every width from 768 up, never four:
 *
 *   390px   cols=2   r1c1  r4c1  r7c2  r10c2
 *   768px+  cols=3   r0c3  r2c3  r5c1  r7c1
 *
 * Four different rows in both layouts, and no two in consecutive rows. If the
 * grid's column count ever changes, RE-MEASURE — these four numbers are only
 * well-spaced by arithmetic that depends on it.
 *
 * The seed is part of the server-rendered Featured order only. When a visitor
 * changes the sort or applies a filter the client re-sorts everything and
 * these pieces move with the rest — a starting arrangement, not a lock.
 */
export const SEED_HOUSE = 'losyana';
export const SEED_POSITIONS: readonly number[] = [2, 8, 15, 21];

const HOUSES = new Set(NEW_IN_HOUSES);

const day = (p: Product): string | null => (p.firstSeen ? p.firstSeen.slice(0, 10) : null);

/**
 * Anything a visitor would call a hijab. Mirrors the Hijabs & Scarves lane's
 * `match` in lib/lanes.ts, minus its `&& !isLayering` — the question here is
 * only what the toggle should hide, and a prayer piece that is also a layering
 * piece still belongs behind it.
 *
 * `garment === 'hijab'` alone is NOT enough: jilbabs and khimars carry garment
 * 'abaya' or 'dress', so a garment-only filter leaks them onto a page whose
 * default is meant to be clothing. That is the case lib/newIn.test.ts pins.
 */
function isHijabLane(p: Product): boolean {
  return p.garment === 'hijab' || isJilbab(p) || isKhimarAbaya(p) || isUndercap(p) || isPrayer(p);
}

/** The newest `firstSeen` day anywhere in the published catalogue, or null. */
function latestDay(all: Product[]): string | null {
  let max: string | null = null;
  for (const p of all) {
    const d = day(p);
    if (d && (max === null || d > max)) max = d;
  }
  return max;
}

function minusDays(iso: string, n: number): string {
  const t = Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) - n * 86400000;
  return new Date(t).toISOString().slice(0, 10);
}

/**
 * Per house, the `firstSeen` days that are ingest batches.
 *
 * Computed over every published dated row of that house, BEFORE the swim,
 * activewear and hijab filters. If it ran on the filtered subset, turning the
 * hijab toggle on would change which day counted as a batch and the two views
 * would disagree about what is new. A batch day is a property of the house,
 * not of the view.
 */
function ingestBatchDays(all: Product[]): Map<string, Set<string>> {
  const counts = new Map<string, Map<string, number>>();
  const totals = new Map<string, number>();
  for (const p of all) {
    if (!HOUSES.has(p.brandSlug)) continue;
    const d = day(p);
    if (!d) continue;
    let m = counts.get(p.brandSlug);
    if (!m) { m = new Map(); counts.set(p.brandSlug, m); }
    m.set(d, (m.get(d) ?? 0) + 1);
    totals.set(p.brandSlug, (totals.get(p.brandSlug) ?? 0) + 1);
  }
  const out = new Map<string, Set<string>>();
  for (const [slug, m] of counts) {
    const total = totals.get(slug) ?? 0;
    const batch = new Set<string>();
    for (const [d, c] of m) if (total > 0 && c / total >= INGEST_BATCH_SHARE) batch.add(d);
    out.set(slug, batch);
  }
  return out;
}

/** Splice the seed house's pieces in at SEED_POSITIONS, skipping any already shown. */
function seed(list: Product[], pool: Product[]): Product[] {
  const present = new Set(list.map((p) => p.id));
  const picks = groupColourVariants(pool.filter((p) => p.brandSlug === SEED_HOUSE))
    .filter((p) => !present.has(p.id))
    .slice(0, SEED_POSITIONS.length);
  const out = [...list];
  for (let i = 0; i < picks.length; i++) {
    out.splice(Math.min(SEED_POSITIONS[i], out.length), 0, picks[i]);
  }
  return out;
}

/**
 * Pure — takes the catalogue, returns the page's rows.
 *
 * The window is anchored to the newest date in the DATA rather than to
 * `Date.now()`. This page is prerendered, so its data is frozen at build time;
 * a clock-based window would slide away from frozen data and quietly empty the
 * page over a long gap between deploys. Anchoring to the data also makes the
 * function deterministic, which is the only reason it can be unit-tested.
 */
export function selectNewIn(all: Product[], opts: { hijabs?: boolean } = {}): Product[] {
  const hijabs = opts.hijabs ?? false;
  const anchor = latestDay(all);
  if (!anchor) return [];
  const cutoff = minusDays(anchor, NEW_IN_WINDOW_DAYS);
  const batches = ingestBatchDays(all);

  const eligible = (p: Product): boolean =>
    HOUSES.has(p.brandSlug) && !isSwim(p) && !isActivewear(p) && (hijabs || !isHijabLane(p));

  const arrivals = all.filter((p) => {
    if (!eligible(p)) return false;
    const d = day(p);
    if (!d || d < cutoff) return false;
    return !batches.get(p.brandSlug)?.has(d);
  });

  // Newest first, as the INPUT ordering — what each house's own queue is
  // sorted by, and what decides which of its pieces survive the cap.
  const newestFirst = arrivals
    .map((p, i) => ({ p, i }))
    .sort((a, b) => {
      const da = day(a.p) ?? '';
      const db = day(b.p) ?? '';
      return da === db ? a.i - b.i : da < db ? 1 : -1;
    })
    .map((x) => x.p);

  // Colour runs collapse to one card BEFORE the cap and the interleave, not
  // after, and this is the one place that ordering matters.
  //
  // The house rule is "group LAST, after every other filter" (productsForLane),
  // and its reason is that a filter which removes SIBLINGS would leave a card
  // claiming "+5 colours" when four of them are not on the page. Neither step
  // below removes a sibling — the cap and the interleave move and drop whole
  // CARDS — so the badge stays truthful. Grouping first is what makes the cap
  // and the round-robin count what a visitor actually sees: a house whose 12
  // newest rows are four colourways of three garments should read as three
  // cards against the cap, not twelve.
  const cards = groupColourVariants(newestFirst);

  // BALANCE, then MIX. Two separate asks, and they need this order: capping
  // after interleaving would delete cards from the middle of an already-mixed
  // sequence and reopen the runs it just removed.
  const perHouse = new Map<string, Product[]>();
  for (const p of cards) {
    let q = perHouse.get(p.brandSlug);
    if (!q) { q = []; perHouse.set(p.brandSlug, q); }
    if (q.length < NEW_IN_MAX_PER_HOUSE) q.push(p);
  }

  // Round-robin across ALL houses, houses ordered by their own newest piece,
  // so the most recently-active house leads and the opening is one card each.
  //
  // This DELIBERATELY gives up strict newest-first — Tina, 2026-09-01, having
  // seen the alternative on staging: "try to mix the items instead of putting
  // all the brands next to eachother". Previously the interleave ran inside a
  // single day, which preserved newest-first but could do nothing about a day
  // when one house published 40 pieces and nobody else published at all: 16 of
  // the first 24 cards were Jennah Boutique. Anyone who wants the strict order
  // back has it — "Newest" is an option in the grid's own Sort control
  // (lib/sortRows.ts), which re-sorts the whole page client-side.
  const houses = [...perHouse.values()].sort((a, b) => {
    const da = day(a[0]) ?? '';
    const db = day(b[0]) ?? '';
    return da === db ? 0 : da < db ? 1 : -1;
  });
  const mixed = interleaveByBrand(houses.flat());

  return seed(mixed, all.filter(eligible));
}

/**
 * Server-only wrapper. getProducts() is uncached and re-parses ~11 MB, so call
 * this ONCE per render (CLAUDE.md §8).
 */
export function newInProducts(opts: { hijabs?: boolean } = {}): Product[] {
  return selectNewIn(getProducts(), opts);
}
