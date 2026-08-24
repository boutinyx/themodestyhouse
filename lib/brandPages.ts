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
let cache: Set<string> | null = null;
export function brandPageSlugs(): Set<string> {
  if (cache) return cache;
  const counts = new Map<string, number>();
  for (const p of getProducts()) counts.set(p.brandSlug, (counts.get(p.brandSlug) ?? 0) + 1);
  cache = new Set(
    BRANDS.filter((b) => (counts.get(b.slug) ?? 0) >= MIN_PRODUCTS || b.description?.trim()).map((b) => b.slug),
  );
  return cache;
}

export function hasBrandPage(slug: string): boolean {
  return brandPageSlugs().has(slug);
}
