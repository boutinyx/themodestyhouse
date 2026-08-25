/**
 * Campaign-tag every link that leaves this site for a brand.
 *
 * Why this exists: every outbound anchor here carries
 * `rel="noopener noreferrer sponsored"` (CLAUDE.md §6 — the `sponsored` token
 * is an FTC requirement). `noreferrer` strips the `Referer` header, so a brand's
 * analytics records our visitors as DIRECT traffic — not as a referral, not
 * under our name, not as anything at all. We send thousands of clicks a month
 * and are invisible in every report that receives them.
 *
 * UTM parameters survive that, because they travel in the URL rather than in a
 * header. `themodestyhouse.com / referral` is the exact source/medium pair a
 * browser-sent referrer would have produced, so this does not invent a new row
 * in a merchant's report — it restores the one `noreferrer` removes.
 *
 * Two rules the implementation is built around:
 *  - A URL that ALREADY carries a `utm_source` belongs to whoever tagged it.
 *    We return it untouched; overwriting would corrupt the brand's own
 *    attribution, which is the opposite of the point.
 *  - Anything we cannot parse, or that is not http(s), is returned unchanged.
 *    Same contract as `lib/shopifyImage.ts`: never mangle a URL we do not
 *    understand.
 *
 * Client-safe — no `fs`, no Node built-ins (Invariant 10).
 *
 * NOTE: this runs at RENDER time, never at ingest. `Product.url` in
 * `data/raw-products.json` stays clean, so changing or removing the tag is one
 * edit here and needs no re-scrape (CLAUDE.md §8 — raw rows are frozen).
 */

/** The tag itself, in one place, so an audit reads it rather than greps for it. */
export const OUTBOUND_UTM = {
  utm_source: 'themodestyhouse.com',
  utm_medium: 'referral',
  utm_campaign: 'directory',
} as const;

/**
 * Where the click came from. Mirrors the `data-surface` value already on each
 * anchor for Pulse's `outbound_click` event, so our own analytics and the
 * brand's tell the same story.
 */
export type OutboundSurface =
  | 'product-card'
  | 'quickview'
  | 'product-page'
  | 'product-page-related'
  | 'brand-page'
  | 'designers'
  | 'marquee'
  | 'popular-showcase'
  | 'editors-rail'
  | 'designer-discovery';

export function withUtm(url: string, surface?: OutboundSurface): string {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return url;
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return url;
  if (u.searchParams.has('utm_source')) return url;

  for (const [k, v] of Object.entries(OUTBOUND_UTM)) u.searchParams.set(k, v);
  if (surface) u.searchParams.set('utm_content', surface);
  return u.toString();
}
