import { BRANDS } from '@/data/brands';
import { hasBrandPage } from '@/lib/brandPages';
import { EDITS } from '@/lib/edits';
import { LANES } from '@/lib/lanes';
import { productsForBrand, productsForEdit, productsForLane } from '@/lib/products';
import { editSitemapImages, imageSitemapXml, sitemapImages, SITEMAP_IMAGES_PER_LANE } from '@/lib/sitemapImages';

/**
 * Image sitemap. See lib/sitemapImages.ts.
 * - designer pages: the first 48 photographs, gated on hasBrandPage (the same predicate app/sitemap.ts and
 *   the route use), so it cannot list a page that 404s.
 * - lane pages (2026-10-13): the first 20 photographs of every lane in LANES — the same list app/sitemap.ts
 *   maps, in the order productsForLane hands the grid. `?type=` subtype pages are not listed: they show the
 *   same photographs as their lane.
 * - edit pages (2026-10-13): hero + own story images + the first 20 picks. An edit with no live picks is
 *   skipped, because the page itself 404s then (app/edits/[slug]/page.tsx).
 * Listed in app/robots.ts, and submitted in Search Console by hand (the API token here is read-only).
 */
export const revalidate = 3600;

const ORIGIN = 'https://themodestyhouse.com';

export async function GET() {
  const designers = BRANDS.filter((b) => hasBrandPage(b.slug)).map((b) => ({
    url: `${ORIGIN}/designers/${b.slug}`,
    images: sitemapImages(productsForBrand(b.slug)),
  }));
  const lanes = LANES.map((l) => ({
    url: `${ORIGIN}/${l.slug}`,
    images: sitemapImages(productsForLane(l.slug), SITEMAP_IMAGES_PER_LANE),
  }));
  const edits = EDITS.flatMap((e) => {
    const picks = productsForEdit(e);
    return picks.length === 0 ? [] : [{ url: `${ORIGIN}/edits/${e.slug}`, images: editSitemapImages(e, picks) }];
  });
  return new Response(imageSitemapXml([...lanes, ...edits, ...designers]), {
    headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' },
  });
}
