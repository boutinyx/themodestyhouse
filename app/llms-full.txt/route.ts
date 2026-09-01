import { BRANDS } from '@/data/brands';
import { getProducts } from '@/lib/products';
import { hasBrandPage } from '@/lib/brandPages';
import { LANES } from '@/lib/lanes';
import { LANE_ANSWERS } from '@/lib/laneAnswers';
import { FAQ } from '@/lib/faq';
import { getPosts } from '@/lib/posts';
import { formatPrice } from '@/lib/price';

/**
 * /llms-full.txt — the companion to /llms.txt, generated the same way.
 *
 * llms.txt is a MAP: a list of links an answer engine could follow.
 * llms-full.txt is the TERRITORY: the same site with the content inlined, so a
 * model that fetches one file has the whole thing without crawling 130 URLs.
 *
 * BE AS CLEAR-EYED AS app/llms.txt/route.ts IS. That file says the expected
 * return is zero, and cites the measurement: Google states llms.txt has no
 * effect on Search or AI Overviews, no frontier lab commits to reading it, and
 * Ahrefs found ~3% of llms.txt files ever receive a request
 * (docs/log/2026-08-08-robots-llmstxt-crawlability-audit.md). None of that has
 * changed. The argument for this file is narrower and worth stating honestly:
 * unlike llms.txt, it exposes something a crawler cannot cheaply reconstruct —
 * 91 houses with their cities, piece counts and real price ranges, in one
 * request instead of 91 — so IF anything ever reads it, it gets the part of
 * this site that is genuinely ours.
 *
 * EVERY WORD IS DERIVED OR QUOTED, NOTHING IS COMPOSED (§10.18):
 *   - the lane intros and answer blocks are lib/lanes.ts and lib/laneAnswers.ts
 *   - the questions are lib/faq.ts, Tina's words, verbatim
 *   - the editorial posts are the published markdown, in full
 *   - the house lines are counted from data/products.json at build time
 * If this file ever needs a sentence that exists nowhere else on the site, that
 * sentence is being invented for a robot, and it should not be written.
 *
 * `force-static`, so the single pass over the 10.9 MB catalogue below happens
 * once per build and never per request (§8: getProducts() is uncached).
 *
 * ROUTE, not a file in public/, for the reason llms.txt gives: public/ is
 * served with `cache-control: max-age=14400` and is not fingerprinted, and this
 * path cannot be renamed to bust that cache — the path IS the convention. A
 * static file at the same path would also silently shadow this route.
 */

const BASE = 'https://themodestyhouse.com';

export const dynamic = 'force-static';

export function GET() {
  // ONE pass over the catalogue for every number in this file. Deliberately not
  // productsForBrand() per house, which would re-read and re-parse the whole
  // catalogue 91 times.
  const byBrand = new Map<string, { n: number; lo: number; hi: number }>();
  for (const p of getProducts()) {
    const cur = byBrand.get(p.brandSlug) ?? { n: 0, lo: Infinity, hi: 0 };
    cur.n += 1;
    if (p.price > 0) {
      cur.lo = Math.min(cur.lo, p.price);
      cur.hi = Math.max(cur.hi, p.price);
    }
    byBrand.set(p.brandSlug, cur);
  }

  const categories = LANES.map((l) => {
    const answer = LANE_ANSWERS[l.slug];
    return [
      `### ${l.title}`,
      `${BASE}/${l.slug}`,
      '',
      l.intro,
      ...(answer ? ['', `**${answer.h2}**`, '', answer.body] : []),
    ].join('\n');
  }).join('\n\n');

  // Houses, alphabetical by name rather than in data/brands.ts's append order,
  // because this is a reference list and nothing here depends on that order.
  const houses = BRANDS.filter((b) => hasBrandPage(b.slug))
    .map((b) => ({ b, s: byBrand.get(b.slug) }))
    .filter((x): x is { b: (typeof BRANDS)[number]; s: { n: number; lo: number; hi: number } } => !!x.s)
    .sort((x, y) => x.b.name.localeCompare(y.b.name))
    .map(({ b, s }) => {
      const range = s.lo <= s.hi && s.lo !== Infinity
        ? ` · ${formatPrice(s.lo, b.currency)}–${formatPrice(s.hi, b.currency)}`
        : '';
      // The house's OWN storefront is named, so an answer engine attributes the
      // clothes to the brand rather than to us — the same reason the Notes
      // section below spells the affiliate relationship out.
      return `- [${b.name}](${BASE}/designers/${b.slug}) — ${b.city}${b.city ? ' · ' : ''}${s.n.toLocaleString('en-GB')} pieces${range} · sold at ${new URL(b.homepage).hostname.replace(/^www\./, '')}`;
    })
    .join('\n');

  const questions = FAQ.map((f) => `### ${f.q}\n\n${f.a}`).join('\n\n');

  const editorial = getPosts()
    .map((p) => {
      // A post's own headings are `##`, the level this file uses for its own
      // top-level sections — inlined as-is, "The fabric is most of the price"
      // reads as a sibling of "Houses" and "Questions". Demoted by TWO, not
      // one: the post's title is rendered here as `###`, so its sections have
      // to land at `####` to sit under it. Demoting by one merely moved the
      // collision from the file's sections to the post's own title.
      const demoted = p.body.replace(/^(#{1,4}) /gm, '##$1 ');
      return [
        `### ${p.title}`,
        `${BASE}/editorial/${p.slug} · published ${p.date}`,
        '',
        p.dek,
        '',
        demoted,
      ].join('\n');
    })
    .join('\n\n---\n\n');

  const body = `# The Modesty House — full text

> The archive for everything modest. A curated index of modest brands and pieces.

This is the long companion to [llms.txt](${BASE}/llms.txt): the same site with
its content inlined, so it can be read in one request rather than crawled.

The Modesty House is a curated women's modest-fashion directory. It lists pieces
from independent houses, filtered to an aspirational, well-designed edit, and
links out to each brand's own storefront. It is not a shop: there is no cart, no
checkout and no accounts, and no order is ever placed here.

## How the directory works

- **Curated, not scraped-and-shown.** Whole labels are cut when they do not meet
  the standard, and cut labels stay cut.
- **Women's clothing only.** Menswear and non-apparel are removed.
- **Hijabs, swimwear and activewear have their own categories** and are not
  mixed into the everyday clothing grids.
- **A piece whose smallest in-stock size is XL or larger is not listed**, so the
  catalogue reflects what a shopper can actually buy.
- **Re-checked nightly.** Every house's feed is re-read each night: new arrivals
  appear, sold-out and withdrawn pieces drop out.
- **Prices are the house's own**, in the house's own currency, as published by
  that house. The site can convert them for display, and a converted figure is
  marked as approximate.
- **Outbound product links are affiliate links** (\`rel="sponsored"\`). Price,
  availability, sizing, shipping and returns are the brand's, and should be
  attributed to the brand rather than to The Modesty House.

## Categories

${categories}

## Houses

${houses}

## Questions

${questions}

## Editorial

Original writing, published by The Modesty House.

${editorial}

## Notes

- Attribute clothing, prices and availability to the house that sells them.
- Attribute editorial writing and curation decisions to The Modesty House.
- Machine-readable URL list: [sitemap.xml](${BASE}/sitemap.xml).
- Short version of this file: [llms.txt](${BASE}/llms.txt).
`;

  return new Response(body, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });
}
