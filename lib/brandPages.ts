import { BRANDS } from '@/data/brands';
import { getProducts } from './products';

/**
 * Which houses get a /designers/[slug] page — ONE predicate, imported by both
 * the route (`generateStaticParams`) and `app/sitemap.ts`.
 *
 * It lives here rather than in either of those files because they are the exact
 * pair that must never disagree. `app/sitemap.ts`'s own comment describes the
 * §8 landmine — a route family that exists but is absent from the sitemap is
 * silently orphaned — and the cheapest way to cause that is to write the same
 * condition twice and later change one of them.
 *
 * BACKGROUND (2026-08-24). The condition used to be "the house has a
 * hand-written `description` in data/brands.ts". Five did, so 108 of 113 brand
 * pages 404'd — including the houses whose names carry the most search demand
 * on the whole site. The two concerns behind that gate were real, and both
 * survive here in a form that does not require someone to have written a
 * paragraph first:
 *
 *   - thin content -> MIN_PRODUCTS, a measured threshold;
 *   - never shipping invented copy about a real company (CLAUDE.md §10.18) ->
 *     the page renders a description only when one genuinely exists, and falls
 *     back to measured facts everywhere else.
 */

/** One full grid. `FilterableGrid` renders 24 rows before "show more", so a
 *  house below this cannot fill the page it is handed — which is the real
 *  thin-content condition. Houses carrying a description are kept regardless,
 *  so adding one can only ever ADD a page, never remove one. */
export const MIN_PRODUCTS = 24;

/**
 * Computed in ONE pass over the catalogue and memoised.
 *
 * Deliberately not `BRANDS.map(b => productsForBrand(b.slug))`: `getProducts()`
 * is uncached and re-reads and re-parses the entire 10.9 MB products.json on
 * every call (CLAUDE.md §8), so the obvious version parses it 113 times per
 * build. This parses once.
 */
let cache: { pages: Set<string>; listed: Set<string>; newest: Map<string, string> } | null = null;
function computed() {
  if (cache) return cache;
  const counts = new Map<string, number>();
  /** The newest `firstSeen` per house — the last date this house's page
   *  demonstrably gained something. Collected in the SAME pass, because
   *  getProducts() re-reads and re-parses 10.9 MB every call (§8). */
  const newest = new Map<string, string>();
  for (const p of getProducts()) {
    counts.set(p.brandSlug, (counts.get(p.brandSlug) ?? 0) + 1);
    const seen = p.firstSeen;
    if (seen && seen > (newest.get(p.brandSlug) ?? '')) newest.set(p.brandSlug, seen);
  }
  cache = {
    pages: new Set(
      BRANDS.filter((b) => (counts.get(b.slug) ?? 0) >= MIN_PRODUCTS || b.description?.trim()).map((b) => b.slug),
    ),
    listed: new Set(BRANDS.filter((b) => (counts.get(b.slug) ?? 0) > 0).map((b) => b.slug)),
    newest,
  };
  return cache;
}

/**
 * When this house's page last verifiably changed, as `YYYY-MM-DD`, or null.
 *
 * TWO HONEST INPUTS, and the later of them wins:
 *
 *   1. the newest `firstSeen` among the house's published pieces — the page
 *      gained a product, so the page changed;
 *   2. BRAND_PAGE_CONTENT, the date the TEMPLATE last changed what these pages
 *      say. That is a real content change on all 89 at once and no per-brand
 *      datum can express it.
 *
 * Deliberately NOT the build time or a file mtime: Railway builds from a fresh
 * clone, so every mtime is the checkout instant — measured 9.6h off, and wrong
 * again on every deploy including deploys that change nothing (§8). Google uses
 * `lastmod` only when it is verifiably accurate, so a fabricated one is worse
 * than none. Both inputs here are data, so two builds of the same commit emit
 * the same date.
 */
export const BRAND_PAGE_CONTENT = '2026-08-31';

export function brandPageLastModified(slug: string): string | null {
  const newest = computed().newest.get(slug);
  if (!newest) return BRAND_PAGE_CONTENT;
  const day = newest.slice(0, 10);
  return day > BRAND_PAGE_CONTENT ? day : BRAND_PAGE_CONTENT;
}

export function brandPageSlugs(): Set<string> {
  return computed().pages;
}

export function hasBrandPage(slug: string): boolean {
  return brandPageSlugs().has(slug);
}

/**
 * Houses with at least one published piece — who appears on /designers.
 *
 * A house can be listed in data/brands.ts and publish nothing: Tina empties one
 * deliberately when she wants to re-curate it piece by piece (2026-08-27,
 * Urban Modesty — see data/default-cut-brands.json). Its tile then renders as an
 * EMPTY ARCH, because `houses()` picks the tile photograph from the house's own
 * published products and there are none, so `image` is `undefined` and the
 * <img> ships with no src. Among 112 photographs that reads as a broken image,
 * not as an editorial state.
 *
 * Deliberately `> 0` and not MIN_PRODUCTS: this is "has anything to show at
 * all", a different question from "has enough to fill a page of its own", and
 * collapsing the two would silently delist 20-odd small houses from the index.
 * It self-heals — one published piece and the house is back, with a photograph.
 */
export function listedBrandSlugs(): Set<string> {
  return computed().listed;
}
