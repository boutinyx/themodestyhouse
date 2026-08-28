/**
 * Per-brand affiliate parameters, applied to outbound links at render time.
 *
 * WHY A SEPARATE FILE, not a field on `data/brands.ts`. `withUtm()`
 * (lib/outbound.ts) runs inside client components — ProductCard, QuickView,
 * the rails — so anything it imports is bundled and shipped to the browser.
 * `data/brands.ts` is 112 records carrying `description` prose; importing it
 * there to read one field would put all of it in the client bundle. This map
 * is the two strings that are actually needed. Same reasoning as Invariant 16:
 * the cost of a field is its size times everywhere it is serialised.
 *
 * WHY KEYED BY HOSTNAME rather than brand slug. `withUtm()` is handed a URL,
 * not a product — several of its ten call sites pass `brand.homepage` and have
 * no slug in scope. The host is the one thing every outbound URL carries.
 *
 * THESE CODES ARE PUBLIC BY DESIGN. An affiliate ref appears in every link we
 * publish; it is an identifier, not a secret. It is still Tina's earnings, so
 * do not change one without her.
 *
 * ADDING A BRAND: the code must be issued for the STORE WE ACTUALLY LINK TO.
 * On 2026-08-28 a Losyana code was issued on `losyana.shop` while every
 * published Losyana product pointed at `losyana.nl` — two separate Shopify
 * stores (`losyana-shop.myshopify.com` vs `losyana.myshopify.com`), each with
 * its own GoAffPro install and its own affiliate database. Measured in a clean
 * browser: `losyana.shop/?ref=dsgnnfgp` sets `ref`, `gfp_v_id` and
 * `gfp_ref_expires`; `losyana.nl/?ref=dsgnnfgp` sets nothing at all. A wrong
 * host here fails silently and completely — the page loads, the product is
 * there, and the commission simply never exists.
 * → docs/log/2026-08-28-losyana-affiliate-wrong-store.md
 */

/** Hostname (no `www.`) → query parameters to add to every outbound link. */
const BY_HOST: Record<string, Readonly<Record<string, string>>> = {
  // GoAffPro, 10% commission. Its own config names the parameters it accepts:
  // `goaffpro_identifiers: "gfp_ref,ref,aff,wpam_id,click_id"`, last-touch,
  // 24h cookie. `ref` is the one the portal itself hands out.
  'losyana.shop': { ref: 'dsgnnfgp' },
};

/**
 * The affiliate parameters for a URL's host, or an empty object.
 * `www.` is stripped so one entry covers both forms — `losyana.nl` redirects to
 * `www.losyana.nl`, and a brand can serve either.
 */
export function affiliateParamsFor(hostname: string): Readonly<Record<string, string>> {
  const host = hostname.toLowerCase().replace(/^www\./, '');
  return BY_HOST[host] ?? {};
}

/** Every host we hold a code for. Exported for tests and audits. */
export const AFFILIATE_HOSTS = Object.keys(BY_HOST);
