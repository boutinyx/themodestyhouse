import { describe, it, expect } from 'vitest';
import { extractPriceCurrency, resolveFeedCurrency } from './presentmentCurrency';

// Fixtures are the real shapes seen on the storefronts this repo scrapes —
// captured 2026-08-26 while diagnosing the currency mislabelling
// (docs/log/2026-08-26-currency-mislabelling.md).
describe('extractPriceCurrency', () => {
  it('reads JSON-LD priceCurrency — the signal hidayah.dk publishes', () => {
    const html = `<script type="application/ld+json">
      {"@type":"Product","offers":{"@type":"Offer","price":"343.0","priceCurrency":"DKK"}}
    </script>`;
    expect(extractPriceCurrency(html)).toBe('DKK');
  });

  it('tolerates whitespace and single-line JSON-LD', () => {
    expect(extractPriceCurrency('{"priceCurrency"   :    "SEK"}')).toBe('SEK');
  });

  it('reads og:price:currency with property before content', () => {
    expect(
      extractPriceCurrency('<meta property="og:price:currency" content="USD">'),
    ).toBe('USD');
  });

  it('reads og:price:currency with content before property — the order Shopify emits', () => {
    expect(
      extractPriceCurrency('<meta content="EUR" property="og:price:currency" />'),
    ).toBe('EUR');
  });

  it("falls back to Shopify's inline currency object", () => {
    expect(
      extractPriceCurrency('Shopify.currency = {"active":"GBP","rate":"1.0"};'),
    ).toBe('GBP');
  });

  it('upper-cases a lower-cased code', () => {
    expect(extractPriceCurrency('"priceCurrency":"aud"')).toBe('AUD');
  });

  it('returns null when the page carries no currency at all', () => {
    expect(extractPriceCurrency('<html><body>no prices here</body></html>')).toBeNull();
  });

  it('returns null rather than guessing when the code is not ISO-4217-shaped', () => {
    expect(extractPriceCurrency('"priceCurrency":"DOLLARS"')).toBeNull();
    expect(extractPriceCurrency('"priceCurrency":"$$"')).toBeNull();
  });

  // THE POINT OF THE WHOLE MODULE: an ambiguous page must fail, never pick one.
  // Guessing here is exactly the bug this replaces — asserting a currency
  // nobody checked.
  it('returns null when a page declares two different currencies and nothing anchors it', () => {
    const html = '{"priceCurrency":"EUR"} ... {"priceCurrency":"GBP"}';
    expect(extractPriceCurrency(html)).toBeNull();
  });

  // Verbatim from jaida.ca's Syrian Full-Neck Underscarf page, 2026-08-26. The
  // offer is CAD; the two USD values are SHIPPING thresholds. The feed price for
  // this product is 21.21, and that is what makes it decidable.
  const JAIDA = `
    "offers": { "@type": "Offer",
      "url": "https://jaida.ca/products/syrian-full-neck-underscarf?variant=46750280941767",
      "priceCurrency": "CAD", "price": 21.21, "availability": "InStock" },
    "shippingRate": { "@type": "MonetaryAmount", "value": 0, "currency": "USD" },
    "eligibleTransactionVolume": { "@type": "PriceSpecification", "minPrice": 75, "priceCurrency": "USD" },
    "eligibleTransactionVolume2": { "@type": "PriceSpecification", "maxPrice": 74.99, "priceCurrency": "USD" }`;

  it('picks the currency sitting beside the FEED price, not the first one on the page', () => {
    expect(extractPriceCurrency(JAIDA, 21.21)).toBe('CAD');
  });

  it('is undecidable on that same page without the price anchor', () => {
    expect(extractPriceCurrency(JAIDA)).toBeNull();
  });

  it('tolerates the page rounding the price differently from the feed', () => {
    expect(extractPriceCurrency('{"priceCurrency":"CAD","price":21.2}', 21.21)).toBe('CAD');
  });

  it('does not match a currency whose price is merely close-ish', () => {
    expect(extractPriceCurrency('{"priceCurrency":"CAD","price":19.99}', 21.21)).toBe('CAD');
    // ...via the unanchored fallback, but never by pretending 19.99 anchored it:
    expect(extractPriceCurrency('{"priceCurrency":"CAD","price":19.99}{"priceCurrency":"USD","price":30}', 21.21)).toBeNull();
  });

  it('reads a price-before-currency pair too', () => {
    expect(extractPriceCurrency('{"price":"49.95","priceCurrency":"GBP"}', 49.95)).toBe('GBP');
  });

  it('falls back to Shopify.currency when the anchor finds nothing', () => {
    const html = 'Shopify.currency = {"active":"CAD","rate":"1.0"};';
    expect(extractPriceCurrency(html, 21.21)).toBe('CAD');
  });

  it('accepts a page that repeats the SAME currency across variants', () => {
    const html = '{"priceCurrency":"EUR"} {"priceCurrency":"EUR"} {"priceCurrency":"eur"}';
    expect(extractPriceCurrency(html)).toBe('EUR');
  });

  // Deliberate ordering. With no price to anchor it, Shopify's own `active`
  // currency beats a loose priceCurrency, because jaida.ca proves a page's
  // priceCurrency values include ones that price nothing on the page (shipping
  // thresholds) while `Shopify.currency.active` appears once and means one thing.
  it('trusts Shopify.currency over an unanchored JSON-LD currency', () => {
    const html = 'Shopify.currency = {"active":"USD"}; ... {"priceCurrency":"DKK"}';
    expect(extractPriceCurrency(html)).toBe('USD');
  });

  it('but the price anchor overrides Shopify.currency when it resolves', () => {
    const html = 'Shopify.currency = {"active":"USD"}; ... {"priceCurrency":"DKK","price":343}';
    expect(extractPriceCurrency(html, 343)).toBe('DKK');
  });
});

describe('resolveFeedCurrency', () => {
  it('uses the detected currency, not the declared one', () => {
    const r = resolveFeedCurrency({ detected: 'USD', declared: 'DKK', brandSlug: 'hidayah' });
    expect(r.currency).toBe('USD');
    expect(r.ok).toBe(true);
  });

  it('flags the mismatch so a publish can report it', () => {
    const r = resolveFeedCurrency({ detected: 'USD', declared: 'DKK', brandSlug: 'hidayah' });
    expect(r.mismatch).toBe(true);
    expect(r.message).toContain('hidayah');
    expect(r.message).toContain('DKK');
    expect(r.message).toContain('USD');
  });

  it('is silent when detected and declared agree', () => {
    const r = resolveFeedCurrency({ detected: 'EUR', declared: 'EUR', brandSlug: 'losyana' });
    expect(r).toMatchObject({ ok: true, currency: 'EUR', mismatch: false });
    expect(r.message).toBeUndefined();
  });

  // No silent fallback (CLAUDE.md §1). An undetectable currency must stop the
  // brand, because falling back to the declared value is precisely how 4,625
  // products came to carry a price in the wrong currency.
  it('refuses to fall back to the declared currency when nothing was detected', () => {
    const r = resolveFeedCurrency({ detected: null, declared: 'GBP', brandSlug: 'hijab-boutique' });
    expect(r.ok).toBe(false);
    expect(r.currency).toBeNull();
    expect(r.message).toContain('hijab-boutique');
  });
});
