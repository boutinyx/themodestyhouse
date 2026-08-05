// Single source of truth for rendering a price. Every display of a price in the
// app must go through this — see ADR-0002.
//
// WHY: three components used to format prices independently, so the same product
// showed as "$45" on the homepage rail and "USD 44.95" in the directory grid.
//
// Prices are shown in their NATIVE currency and are never converted. The number
// on screen is the number the shopper pays at checkout on the brand's own site.

/** en-US renders the dominant currency clean ($44.95 — 81% of the catalogue) and
 *  disambiguates the rest (A$189, CA$32, £120, €89.90). A GB locale would render
 *  USD as "US$44.95", which is worse for the main case. */
const LOCALE = 'en-US';

/**
 * Format a price in its native currency.
 *
 * Whole numbers drop the decimals (`£120`, not `£120.00`); fractional amounts
 * keep two (`$44.95`). An unrecognised currency code degrades to `"XYZ 44.95"`
 * rather than throwing, so adding a brand with an odd currency cannot break a page.
 */
export function formatPrice(amount: number, currency: string): string {
  const n = Number.isFinite(amount) ? amount : 0;
  const fractionDigits = n % 1 === 0 ? 0 : 2;
  try {
    return new Intl.NumberFormat(LOCALE, {
      style: 'currency',
      currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    // Invalid/unsupported ISO code — show something truthful instead of crashing.
    return `${currency} ${n.toFixed(2)}`;
  }
}
