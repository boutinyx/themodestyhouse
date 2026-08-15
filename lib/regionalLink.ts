// Picks which of a product's (at most two) URLs to send a visitor to, using
// ONLY their browser's IANA timezone — no cookies, no IP lookup, no consent
// banner. See Product.altUrl (lib/types.ts) and
// docs/log/2026-08-15-touche-prive-dual-region-links.md for why this exists:
// Touché Privé's own geo-redirect app sends EU visitors to a materially
// different regional storefront, so a single stored URL can't be correct for
// everyone.

/** IANA zone ids under "Europe/" — the timezone database's own regional
 *  grouping, needing no external lookup or maintained country list. */
export function isEuropeanTimeZone(timeZone: string): boolean {
  return timeZone.startsWith('Europe/');
}

/**
 * `url` is the SSR/crawler default and what every visitor sees until this
 * runs client-side. Falls back to it whenever there's no alternate to pick,
 * or the timezone can't be read (old browser, environment without Intl).
 */
export function pickRegionalUrl(url: string, altUrl: string | undefined, timeZone: string | undefined): string {
  if (!altUrl || !timeZone) return url;
  return isEuropeanTimeZone(timeZone) ? altUrl : url;
}

/** Reads the visitor's timezone via Intl, never throwing — a measurement
 *  helper must not be able to break the outbound click it's routing. */
export function readTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}
