/**
 * Ask Shopify's CDN for an image at the size we actually render it.
 *
 * Every product photograph on this site is hotlinked from `cdn.shopify.com` at
 * whatever resolution the brand uploaded — routinely 1500–2600px wide. On a
 * phone those land in a 164px-wide card, so we were downloading roughly 250x
 * more pixels than the screen can show, and a single grid page transferred
 * ~6.7MB of images to fill one 390px viewport.
 *
 * The CDN resizes on request. Measured 2026-08-07 against a real catalogue URL
 * (Aab, CCB2A751…_1_201_a.jpg):
 *
 *     no parameter   351176 bytes
 *     &width=400      36006 bytes   (9.75x smaller)
 *
 * It also already content-negotiates WebP from the `Accept` header, so no
 * `format` parameter is needed — both requests above came back `image/webp`.
 *
 * Only `cdn.shopify.com` URLs are touched. Local `public/` assets and any other
 * host are returned unchanged, because the parameter would be meaningless there
 * and we must never mangle a URL we do not understand.
 */

/** Widths offered to the browser. Covers a 164px phone card at 2x through a
 *  full-bleed desktop card, without generating variants nobody requests. */
export const CARD_WIDTHS = [200, 300, 400, 600, 800] as const;

/** Bigger set for the quick-view modal, which shows the photograph large. */
export const DETAIL_WIDTHS = [400, 600, 900, 1200] as const;

export function isShopifyCdn(url: string): boolean {
  try {
    return new URL(url).hostname === 'cdn.shopify.com';
  } catch {
    // Relative paths ("/logo.png") and anything unparseable are not Shopify.
    return false;
  }
}

/**
 * The same image at `width` pixels. Idempotent: re-applying it replaces the
 * existing parameter rather than appending a second one, so a URL that has
 * already been through here cannot accumulate `&width=400&width=800`.
 */
// Overloaded rather than simply widened: a `string` in must give a `string` out,
// or every existing call site would start seeing `string | undefined`. Some
// callers legitimately hold an optional image (House.image), so the undefined
// case has to pass through untouched.
export function shopifyImage(url: string, width: number): string;
export function shopifyImage(url: string | undefined, width: number): string | undefined;
export function shopifyImage(url: string | undefined, width: number): string | undefined {
  if (!url || !isShopifyCdn(url)) return url;
  try {
    const u = new URL(url);
    u.searchParams.set('width', String(Math.round(width)));
    return u.toString();
  } catch {
    return url;
  }
}

/**
 * A `srcset` string, or `undefined` for anything not on the Shopify CDN — an
 * absent attribute is correct there, and `undefined` is what React needs in
 * order to omit it entirely.
 */
export function shopifySrcSet(url: string | undefined, widths: readonly number[] = CARD_WIDTHS): string | undefined {
  if (!url || !isShopifyCdn(url)) return undefined;
  return widths.map((w) => `${shopifyImage(url, w)} ${w}w`).join(', ');
}

/** The exact box a social card image is rendered into. Square rather than
 *  Facebook's 1.91:1 because these are full-length garment photographs: a
 *  1200x630 centre crop of a 2:3 product shot is a horizontal band of fabric
 *  with no garment shape left, and a top crop is the model's face with the
 *  product out of frame. Both were generated and looked at before choosing
 *  (2026-09-06). Square keeps the whole garment; the platforms crop it
 *  further themselves, from something that still reads as the product. */
export const SOCIAL_CARD_SIZE = 1200;

export interface SocialCardImage {
  url: string;
  /** Present only when the size is GUARANTEED — i.e. we asked the CDN for an
   *  exact box. Undeclared beats wrongly declared: a wrong og:image:height is
   *  worse than none, because the crawler trusts it and lays out to it. */
  width?: number;
  height?: number;
}

/**
 * The image to put in `og:image`, with its dimensions when we can guarantee
 * them.
 *
 * Declaring `og:image:width`/`height` is the point of this helper. Without
 * them a crawler has to download and measure the image before it can lay the
 * card out, and Facebook/Instagram commonly render the first share with no
 * image at all while that happens — which is exactly what Tina reported on
 * 2026-09-06 ("i wnt to be able to grab the link and put the product in my
 * instagram which doesnnt work rn"). The page's own OG tags were otherwise
 * correct and fetchable, verified as `facebookexternalhit`.
 *
 * Non-Shopify images (the WooCommerce brands) cannot be resized by URL, so
 * they come back with no dimensions rather than guessed ones.
 */
export function socialCardImage(url: string | undefined): SocialCardImage | undefined {
  if (!url) return undefined;
  if (!isShopifyCdn(url)) return { url };
  try {
    const u = new URL(url);
    u.searchParams.set('width', String(SOCIAL_CARD_SIZE));
    u.searchParams.set('height', String(SOCIAL_CARD_SIZE));
    // Shopify only honours `height` alongside a crop mode; without it the
    // parameter is ignored and the response is the natural aspect again,
    // which would make the dimensions we declare below a lie.
    u.searchParams.set('crop', 'center');
    return { url: u.toString(), width: SOCIAL_CARD_SIZE, height: SOCIAL_CARD_SIZE };
  } catch {
    return { url };
  }
}
