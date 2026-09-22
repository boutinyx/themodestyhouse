import { getProducts } from '@/lib/products';
import { metaFeedXml, PINTEREST_FEED_UTM } from '@/lib/metaFeed';

/**
 * The same catalogue as app/meta-catalogue.xml, for Pinterest Catalogs
 * (Pinterest's data-source feature accepts a Google Shopping XML feed
 * directly — no developer API or app review needed, which is why this
 * exists rather than waiting on Pinterest's API approval).
 *
 * A SEPARATE route rather than pointing Pinterest at the Meta feed directly:
 * the only thing that differs is the UTM tag on every link. Reusing the same
 * feed for both destinations would make every Pinterest-driven click count as
 * an Instagram one in Pulse — see lib/metaFeed.ts's FEED_UTM comment for why
 * that distinction is the entire point of tagging inbound links at all.
 *
 * Everything else — see app/meta-catalogue.xml/route.ts's own comments for
 * why a route and not a public/ file, why noindex, why revalidate hourly.
 */
export const revalidate = 3600;

export async function GET() {
  const products = getProducts();
  const xml = metaFeedXml(products, PINTEREST_FEED_UTM);
  return new Response(xml, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=3600',
      'x-robots-tag': 'noindex',
    },
  });
}
