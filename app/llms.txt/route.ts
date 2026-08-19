import { LANES } from '@/lib/lanes';
import { getPosts } from '@/lib/posts';

/**
 * /llms.txt — generated, not hand-maintained.
 *
 * This replaces a static public/llms.txt that had already drifted: it listed
 * 12 lanes while lib/lanes.ts had 14, missing /layering-basics (added three
 * hours after llms.txt shipped) and /outerwear (added 2026-08-13). Both were
 * in sitemap.xml the whole time, so the two files disagreed about what the
 * site is.
 *
 * Be clear-eyed about the value: llms.txt is a proposed convention with no
 * committed consumer. docs/log/2026-08-08-robots-llmstxt-crawlability-audit.md
 * measured this already — Google states it has no effect on Search or AI
 * Overviews, no frontier lab commits to reading it, and Ahrefs found ~3% of
 * llms.txt files ever receive a request. Expected return: zero.
 *
 * The real reason this is a route and not a file: public/ is served with
 * `cache-control: max-age=14400` and is NOT fingerprinted, and unlike an
 * image (§6, §10.21) llms.txt cannot be renamed to bust that cache — its path
 * IS the spec. So every future edit to the static version carried a
 * guaranteed 4-hour stale window with no workaround. A route has none of that,
 * and it cannot drift from LANES because it is derived from it.
 *
 * NOTE: public/llms.txt must stay deleted. A static asset at the same path
 * shadows this route, and the failure is silent — the route still builds and
 * simply never serves.
 */

const BASE = 'https://themodestyhouse.com';

export const dynamic = 'force-static';

function line(label: string, path: string, desc: string) {
  return `- [${label}](${BASE}${path}): ${desc}`;
}

export function GET() {
  const sections = [
    line('Products', '/directory', 'Browse modest pieces from every verified house.'),
    // Driven off LANES, so a new lane appears here the moment it is routable —
    // the same source app/sitemap.ts uses, for the same reason.
    ...LANES.map((l) => line(l.title, `/${l.slug}`, l.intro)),
    line('Designers', '/designers', 'A curated index of modest brands, vetted for craft and taste.'),
    line('The Edit', '/editorial', 'Stories, edits and styling from The Modesty House.'),
    // /about is deliberately absent from SEO_COPY (lib/seoCopy.test.ts's
    // STATIC_PATHS excludes it), so its description is the same literal
    // app/about/page.tsx sets — kept in step by hand, not invented here.
    line('About', '/about', 'What The Modesty House does, the problem it solves, how it solves it, and who is behind it.'),
  ].join('\n');

  // Editorial posts, newest first — getPosts() is already sorted, and this is
  // the one part of the site that is original long-form writing, so it is the
  // part most worth pointing an answer engine at.
  const posts = getPosts()
    .map((p) => line(p.title, `/editorial/${p.slug}`, p.dek || 'Editorial from The Modesty House.'))
    .join('\n');

  const body = `# The Modesty House

> The archive for everything modest. A curated index of modest brands and pieces.

The Modesty House is a curated women's modest-fashion directory: independent
Shopify storefronts, filtered to an aspirational, well-designed edit. It is
not a shop — there is no cart or checkout. Every product links out to the
brand's own site to complete a purchase.

## Sections

${sections}

## Editorial

${posts}

## Notes

- Product links are outbound affiliate links (\`rel="sponsored"\`) to the listed brand's own storefront — price and availability are the brand's, not ours, and should be attributed to the brand, not to The Modesty House.
- Editorial coverage (The Edit) is original and independently written.
- Full machine-readable listings: [sitemap.xml](${BASE}/sitemap.xml).
`;

  return new Response(body, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });
}
