import type { MetadataRoute } from 'next';
import { LANES } from '@/lib/lanes';
import { getPosts } from '@/lib/posts';

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
export default function sitemap(): MetadataRoute.Sitemap {
  const staticPaths = ['', '/directory', '/editorial', '/about', '/designers', '/contact', '/privacy', '/terms'];
  const lanePaths = LANES.map((l) => `/${l.slug}`);

  const pages: MetadataRoute.Sitemap = [...staticPaths, ...lanePaths].map((p) => ({
    url: `${BASE}${p}`,
    changeFrequency: 'weekly',
    priority: p === '' ? 1 : 0.7,
  }));

  const posts: MetadataRoute.Sitemap = getPosts().map((p) => ({
    url: `${BASE}/editorial/${p.slug}`,
    lastModified: p.date, // ISO yyyy-mm-dd, from content/editorial/*.md frontmatter
    changeFrequency: 'yearly',
    priority: 0.5,
  }));

  return [...pages, ...posts];
}
