import type { MetadataRoute } from 'next';
import { LANES } from '@/lib/lanes';
import { getPosts } from '@/lib/posts';
import { sitemapSubtypesForLane } from '@/lib/laneSubtypes';
import { BRANDS } from '@/data/brands';
import { brandPageLastModified, hasBrandPage } from '@/lib/brandPages';
import { EDITS } from '@/lib/edits';
import { productsForBrand } from '@/lib/products';
import { sitemapImages } from '@/lib/sitemapImages';

const BASE = 'https://themodestyhouse.com';

/* ------------------------------------------------------------------ *
 * sitemap.xml
 * ------------------------------------------------------------------ *
 *
 * EVERY route family that has a generateStaticParams must be mapped here.
 * This file previously imported only LANES, which meant /editorial/[slug]
 * (2 posts) was absent — and the failure was structural rather than an
 * oversight: a new lane was picked up automatically, so the file LOOKED
 * self-maintaining, while a new post was automatically EXCLUDED. Adding a
 * route family to the app without adding it here is silent. Measured
 * 2026-08-08, fixed 2026-08-09. Keep the .map() calls below in step with
 * generateStaticParams in app/[lane] and app/editorial/[slug].
 *
 * (A third family, /style/[vibe], was added here on 2026-08-09 and removed
 * the same day when the aesthetic pages were deleted at Tina's request —
 * see docs/log/2026-08-09-remove-style-vibe-feature.md.)
 *
 * NOT listed, deliberately:
 *   /favourites       Client-state page — its contents come from
 *                     localStorage, so a crawler only ever receives the
 *                     empty state. It wants a noindex (which it does not yet
 *                     have), not a sitemap entry.
 *   /designers?page=2 A query variant of a URL already listed, reachable by
 *                     a real link from page 1. Duplication there is a
 *                     canonical-tag problem, not a sitemap one.
 *
 * lastModified is emitted ONLY where a truthful date exists — the editorial
 * frontmatter, which getPosts() already parses. Google Search Central
 * (build-sitemap, updated 2026-07-08) ignores <priority> and <changefreq>
 * outright and uses <lastmod> only "if it's consistently and verifiably
 * accurate", so a made-up value is worse than none: it teaches the crawler
 * to distrust the field.
 *
 * DO NOT derive lastmod from file mtime. Railway builds from a fresh clone
 * and git does not preserve mtimes, so on the build server every mtime is
 * the checkout instant — measured 9.6h off on a test clone, and it would be
 * wrong again on every deploy, including deploys that change no content. If
 * lane lastmod is wanted later, the honest source is a generatedAt written
 * by scripts/build-data.mjs, not the filesystem.
 *
 * changeFrequency/priority are kept on the non-post entries: Google ignores
 * them but other crawlers still read them, and they cost nothing.
 */
// Not build-time only: the post list comes from Ghost, so a publish must reach the sitemap.
// The webhook revalidates it; the hour is the floor if a webhook is lost.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPaths = ['', '/new-in', '/editorial', '/edits', '/about', '/designers', '/faq', '/contact', '/privacy', '/terms'];
  const lanePaths = LANES.map((l) => `/${l.slug}`);

  const pages: MetadataRoute.Sitemap = [...staticPaths, ...lanePaths].map((p) => ({
    url: `${BASE}${p}`,
    changeFrequency: 'weekly',
    priority: p === '' ? 1 : 0.7,
  }));

  // ?type= subtype pages, added 2026-08-19. Each is a real server-rendered
  // page over genuinely different inventory (/modest-hijabs and
  // /modest-hijabs?type=undercap share ZERO outbound product URLs), and as of
  // the same date each carries its own canonical, title and CollectionPage.
  // Driven off lib/laneSubtypes so it cannot drift from what the lane renders
  // — the same property the LANES map above relies on.
  //
  // sitemapSubtypesForLane, not subtypesForLane: the four thinnest subtypes
  // (9-21 products) are linked on the page but deliberately NOT submitted.
  // Five lanes are already sitting at "Discovered - currently not indexed"
  // (docs/log/2026-08-19-gsc-api-access-and-index-coverage.md); adding
  // nine-product pages to the submission queue would earn the same verdict and
  // teach the crawler that this sitemap is not worth its time.
  const subtypes: MetadataRoute.Sitemap = LANES.flatMap((l) =>
    sitemapSubtypesForLane(l.slug).map((st) => ({
      url: `${BASE}/${l.slug}?type=${st.type}`,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
  );

  // Brand pages, added 2026-08-19. Gated on the SAME predicate the route uses
  // (a house must carry `description`), so the two cannot disagree: adding a
  // description publishes a page AND lists it, removing one does both in
  // reverse. This is the §8 landmine — a route family that exists but is absent
  // here is silently orphaned, which is how /editorial/[slug] went unlisted for
  // months while looking self-maintaining.
  // Same predicate as the route itself, imported rather than restated — see
  // lib/brandPages.ts for why these two files are the pair that must not drift.
  // 2026-08-24: this was `b.description?.trim()`, which listed 5 of 113 houses
  // while the route 404'd the other 108. Now 89.
  // lastModified, added 2026-08-31. These 91 URLs carried `changefreq` and
  // `priority`, both of which Google ignores, and no date at all — so a sitemap
  // that is the ONLY route by which Google reaches most brand pages was giving
  // it no reason to come back after the pages changed. The date comes from
  // lib/brandPages.ts and is derived from data, never from build time (§8).
  const brands: MetadataRoute.Sitemap = BRANDS.filter((b) => hasBrandPage(b.slug)).map((b) => ({
    url: `${BASE}/designers/${b.slug}`,
    lastModified: brandPageLastModified(b.slug) ?? undefined,
    // 2026-09-21: photographs, so Google Images learns about the cards behind "Load more".
    images: sitemapImages(productsForBrand(b.slug)),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  // /edits/[slug] — added 2026-08-24 with the route itself, in the same commit,
  // which is the only reliable way to avoid the §8 trap this file's own header
  // describes: a route family that exists but is absent here is silently
  // orphaned, and nothing fails.
  const edits: MetadataRoute.Sitemap = EDITS.map((e) => ({
    url: `${BASE}/edits/${e.slug}`,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const posts: MetadataRoute.Sitemap = (await getPosts()).map((p) => ({
    url: `${BASE}/editorial/${p.slug}`,
    lastModified: p.date, // ISO yyyy-mm-dd, from content/editorial/*.md frontmatter
    changeFrequency: 'yearly',
    priority: 0.5,
  }));

  return [...pages, ...subtypes, ...brands, ...edits, ...posts];
}
