/**
 * The product feed Meta Commerce Manager fetches.
 *
 * Tina, 2026-09-06: pasting a product URL into Instagram returned "geen
 * overeenkomst gevonden - dit product kan niet worden toegevoegd op Instagram".
 * That is Instagram SHOPPING product tagging, which does not read the page at
 * all: it looks the URL up in a Meta catalogue attached to the account. No
 * amount of page metadata can satisfy it - the products have to be IN a
 * catalogue, and this file is what puts them there.
 *
 * RSS 2.0 with the Google Merchant namespace, which Meta accepts directly. The
 * field names, the required set and the formats are Meta's published spec
 * (developers.facebook.com/docs/commerce-platform/catalog/fields), read rather
 * than remembered.
 *
 * `link` points at OUR product page, not the brand's, for two reasons: Meta
 * requires the link to sit on a domain the catalogue owner has verified, and a
 * tapped product tag has to land somewhere we control. app/product/... already
 * exists for exactly this kind of share.
 *
 * NOT INCLUDED, deliberately:
 *  - `size`. Meta lists it as conditionally required for apparel Shops. Sizes
 *    live on the RAW row (`raw.sizes`) and are stripped at publish, and
 *    lib/rawData.ts is gated to local dev (Invariant 11), so the feed cannot
 *    see them. If Meta's review asks for it, the fix is a published sidecar,
 *    not reading raw at request time.
 *  - `sale_price` and `item_group_id`. We hold neither. lib/colorVariants.ts
 *    could supply the latter later; a wrong grouping is worse than none.
 */
import type { Product } from '@/lib/types';
import { SITE_URL } from '@/lib/schema';
import { shopifyImage } from '@/lib/shopifyImage';

/** Meta's minimum is 500x500. A Shopify `width=1200` portrait clears it on both
 *  axes; the WooCommerce brands serve their originals, which are larger still. */
const FEED_IMAGE_WIDTH = 1200;

/** Meta truncates past 200 and recommends 65. Ours are brand titles, already short. */
const MAX_TITLE = 200;

/**
 * Google's taxonomy, which Meta reuses. Only the eight garments the catalogue
 * actually publishes are mapped; anything unmapped falls back to the parent
 * category rather than guessing a leaf, because a wrong leaf is what gets a
 * product rejected.
 */
const CATEGORY: Record<string, string> = {
  dress: 'Apparel & Accessories > Clothing > Dresses',
  top: 'Apparel & Accessories > Clothing > Shirts & Tops',
  trousers: 'Apparel & Accessories > Clothing > Pants',
  skirt: 'Apparel & Accessories > Clothing > Skirts',
  set: 'Apparel & Accessories > Clothing > Outfit Sets',
  swim: 'Apparel & Accessories > Clothing > Swimwear',
  // An abaya is not a dress in this taxonomy, and filing it as one is the kind
  // of mismatch a reviewer notices.
  abaya: 'Apparel & Accessories > Clothing > Traditional & Ceremonial Clothing',
  hijab: 'Apparel & Accessories > Clothing Accessories > Scarves & Shawls',
};
const CATEGORY_FALLBACK = 'Apparel & Accessories > Clothing';

/**
 * Campaign tag on every link Meta hands out.
 *
 * Tina, 2026-09-07: *"i want to add it like a campaign with the utm shit so
 * then when people click on instagram i see"*. A product tag sends the shopper
 * to the `link` in this feed, so tagging it here is what makes the visit
 * attributable — and Pulse reports Source / Medium / Campaign natively
 * (verified in the dashboard before this was written, rather than assumed).
 *
 * Instagram ALREADY shows up in Pulse's referrer list, so this is not about
 * seeing Instagram at all — it is about telling the three Instagram surfaces
 * apart. A tap on a product tag, a tap on the link in bio and a story sticker
 * are one undifferentiated "Instagram" row today; only the medium distinguishes
 * them, and only if we set it.
 *
 * This is the INBOUND direction and has nothing to do with lib/outbound.ts,
 * which tags links LEAVING for a brand so the brand's analytics can see us.
 *
 * TWO UTM HELPERS POINTING OPPOSITE WAYS, and the obvious worry about them was
 * raised by Tina and then MEASURED rather than argued: *"but wont people see
 * instagram next time so the businesses? and not the modestyhouse"* — i.e. does
 * an inbound `utm_source=instagram` follow the visitor out and rob us of credit
 * with the brand? It does not. `withUtm()` builds its tag from the BRAND's own
 * product URL out of the catalogue and never reads the current page's query
 * string, so there is no path for one to reach the other. Verified on
 * production by loading the same product page with and without the Instagram
 * tag and diffing the outbound anchors:
 *
 *   without -> ...?utm_source=themodestyhouse.com&utm_medium=referral&...
 *   with    -> ...?utm_source=themodestyhouse.com&utm_medium=referral&...
 *   identical: true
 *
 * If either helper ever starts reading `window.location`, that guarantee is
 * gone — re-run that diff before believing otherwise.
 */
export const FEED_UTM = {
  utm_source: 'instagram',
  utm_medium: 'product_tag',
  utm_campaign: 'meta_shop',
} as const;

export function feedLink(
  p: Pick<Product, 'id' | 'brandSlug'>,
  utm: Record<string, string> | null = FEED_UTM,
): string {
  // Invariant 1: the id is `${brandSlug}:${shopifyId}`.
  const url = new URL(`${SITE_URL}/product/${p.brandSlug}/${p.id.slice(p.brandSlug.length + 1)}`);
  for (const [k, v] of Object.entries(utm ?? {})) url.searchParams.set(k, v);
  return url.toString();
}

/**
 * Meta requires a non-empty description and we scrape none (the 2026-08-05
 * revert is why). This states only facts already on the page - what it is, who
 * makes it, and that they are the seller - and deliberately reads as a data
 * field rather than as copy. It is NOT brand voice: section 10.18 is explicit
 * that writing marketing for Tina is not mine to do.
 */
export function feedDescription(p: Product): string {
  return `${p.title} by ${p.brandName}. Listed on The Modesty House, a curated directory of modest fashion. Sold and shipped by ${p.brandName}.`;
}

/** Characters XML 1.0 does not allow at all. One of these in a brand title
 *  makes the whole feed unparseable, and Meta rejects the FILE, not the row. */
const ILLEGAL_XML = new RegExp('[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F]', 'g');

/** XML text escaping. `&` first, or it double-escapes the entities it just wrote. */
export function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(ILLEGAL_XML, '');
}

const truncate = (s: string, max: number) =>
  s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;

export function feedItem(p: Product): string {
  const fields: [string, string][] = [
    ['g:id', p.id],
    ['g:title', truncate(p.title, MAX_TITLE)],
    ['g:description', feedDescription(p)],
    ['g:link', feedLink(p)],
    ['g:image_link', shopifyImage(p.image, FEED_IMAGE_WIDTH)],
    ['g:brand', truncate(p.brandName, 100)],
    // products.json only ever contains in-stock rows - build-data filters on
    // `inStock` - so this is a fact about the file, not an assumption.
    ['g:availability', 'in stock'],
    ['g:condition', 'new'],
    ['g:price', `${p.price.toFixed(2)} ${p.currency}`],
    ['g:product_type', p.garment],
    ['g:google_product_category', CATEGORY[p.garment] ?? CATEGORY_FALLBACK],
  ];
  return `<item>${fields.map(([k, v]) => `<${k}>${xmlEscape(String(v))}</${k}>`).join('')}</item>`;
}

export function metaFeedXml(products: Product[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
<title>The Modesty House</title>
<link>${SITE_URL}</link>
<description>Curated modest fashion from independent houses.</description>
${products.map(feedItem).join('\n')}
</channel>
</rss>
`;
}
