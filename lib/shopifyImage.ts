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
