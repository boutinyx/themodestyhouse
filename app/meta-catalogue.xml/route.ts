import { getProducts } from '@/lib/products';
import { metaFeedXml } from '@/lib/metaFeed';

/**
 * The catalogue Meta Commerce Manager fetches on a schedule, so that a product
 * URL can be tagged on Instagram. See lib/metaFeed.ts for why the page's own
 * metadata cannot do this job.
 *
 * Served from a route rather than written into public/: the file is ~10 MB and
 * changes every night with the refresh, so committing a regenerated copy daily
 * would be 10 MB of churn in git for a file nobody reads from the repo. It also
 * sidesteps section 6's rule that a replaced public/ asset needs a NEW
 * filename - the whole point of a feed URL is that it is stable.
 *
 * NOT in app/sitemap.ts and linked from nowhere. It is a machine endpoint; a
 * crawler finding it gains nothing and Meta is given the URL directly.
 */

// Regenerated at most hourly. The underlying data moves once a night (the 04:10
// refresh), and Meta fetches on its own schedule, so rebuilding a 10 MB
// document per request would be pure waste.
export const revalidate = 3600;

export async function GET() {
  const products = getProducts();
  const xml = metaFeedXml(products);
  return new Response(xml, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=3600',
      // The feed is not a page and has no business in any search index. Unlike
      // app/product/..., there is no link-preview crawler to keep happy here,
      // so this can be the blanket directive rather than a bot-scoped one.
      'x-robots-tag': 'noindex',
    },
  });
}
