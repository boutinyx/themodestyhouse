import { getProducts } from './products';
import { groupColourVariants } from './colorVariants';
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
 * Losyana is seeded deliberately, because the site is in its referral
 * programme. It also HAS to be: all 826 of its published pieces carry
 * firstSeen 2026-08-28, the .shop domain move that reissued every product id
 * (CLAUDE.md §10.54), so that is one batch and de-batching removes all of it.
 * Losyana's organic contribution to this page is zero.
 *
 * Positions are 0-indexed and spliced in ASCENDING order into the growing
 * array, so the final one-indexed positions are 3, 9, 16 and 22 — on a
 * four-column grid, rows 1/3/4/6 and columns 3/1/4/2. Four different rows,
 * four different columns, no two adjacent: Tina asked for four "but not next
 * to eachother that its obvious".
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

  // Newest first. The index tiebreak keeps the catalogue's own Featured order
  // within a day rather than relying on sort stability.
  const ordered = arrivals
    .map((p, i) => ({ p, i }))
    .sort((a, b) => {
      const da = day(a.p) ?? '';
      const db = day(b.p) ?? '';
      return da === db ? a.i - b.i : da < db ? 1 : -1;
    })
    .map((x) => x.p);

  // Colour runs collapse to one card LAST, after every other filter — same
  // reasoning as productsForLane(): grouping earlier lets a card claim
  // "+5 colours" when four of them were filtered off this page.
  return seed(groupColourVariants(ordered), all.filter(eligible));
}

/**
 * Server-only wrapper. getProducts() is uncached and re-parses ~11 MB, so call
 * this ONCE per render (CLAUDE.md §8).
 */
export function newInProducts(opts: { hijabs?: boolean } = {}): Product[] {
  return selectNewIn(getProducts(), opts);
}
