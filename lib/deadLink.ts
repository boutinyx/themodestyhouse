/**
 * Deciding whether an outbound product link is dead.
 *
 * `scripts/storefront-health.mjs` answers "is this HOUSE still there" — it was
 * written after 2026-09-03, when three dead storefronts were carrying 718
 * published products. This file answers the other half: **is this PRODUCT still
 * there, on a storefront that is otherwise fine.** A sweep of 2,524 outbound
 * URLs on 2026-09-15 found 50 dead products across 13 houses that were all
 * perfectly alive, so the storefront check could never have seen them.
 *
 * THE TRAP, and the reason this is a function with tests rather than a status
 * comparison inline in a script:
 *
 *   A dead Shopify product does not reliably 404. Measured 3/3 each way on the
 *   same URL: WITH an `Accept:` header (what a browser sends) these storefronts
 *   302 to the shop homepage; with no `Accept:` header they return a hard 404.
 *   So 44 of those 50 answer **200 OK** to any checker that follows redirects,
 *   and land a real shopper on a front page with no sign the piece is gone.
 *   That is almost certainly why an external SEO tool reported 10 rather than 50.
 *
 * Hence: a 200 is not evidence of life. Where the response ENDED UP is.
 *
 * UNKNOWN IS NOT DEAD. A timeout, a 429, a 5xx or a DNS failure means the check
 * failed, not that the product did — the same rule Invariant 13 puts on the
 * scraper, and the one §10.44 broke by reporting 90 rate-limited brands as
 * "skipped". This machine's own resolver SERVFAILs on at least one live brand
 * domain (losyana.nl, 2026-09-15), which is exactly how a live storefront got
 * written down as closed.
 */

export type LinkVerdict = 'ok' | 'dead' | 'moved' | 'unknown';

export type LinkProbe = {
  /** The URL we asked for. */
  url: string;
  /** HTTP status of the final response, or null if the request never completed. */
  status: number | null;
  /** The URL the response ended at after redirects, or null if unknown. */
  finalUrl: string | null;
  /** Set when the request threw — DNS failure, timeout, reset. */
  error?: string;
};

/** The product handle in a Shopify-style `/products/<handle>` path, if any. */
export function productHandle(url: string): string | null {
  const m = /\/products\/([^/?#]+)/.exec(url);
  return m ? decodeURIComponent(m[1]).toLowerCase() : null;
}

/**
 * ok      — the response ended on the product it was asked for
 * dead    — the house says it is gone (404/410)
 * moved   — 2xx, but the response ended somewhere other than that product:
 *           the shop homepage, a collection, another product. A shopper
 *           following this link does not get what the card promised
 * unknown — the check failed. Never treat as dead
 */
export function linkVerdict(probe: LinkProbe): LinkVerdict {
  if (probe.error || probe.status === null) return 'unknown';
  if (probe.status === 404 || probe.status === 410) return 'dead';
  // 401/403 are a bot block far more often than a removed product, and 429 and
  // 5xx are the site having a bad minute. None is evidence about the garment.
  if (probe.status < 200 || probe.status >= 300) return 'unknown';

  const wanted = productHandle(probe.url);
  // Not a product URL (a brand homepage, a collection). A 2xx is all we can ask.
  if (!wanted) return 'ok';

  const landedOn = probe.finalUrl ? productHandle(probe.finalUrl) : null;
  if (landedOn === null) return 'moved';
  return landedOn === wanted ? 'ok' : 'moved';
}

/** A verdict that should be acted on, as opposed to re-checked later. */
export function isBroken(v: LinkVerdict): boolean {
  return v === 'dead' || v === 'moved';
}
