import { describe, it, expect } from 'vitest';
import { isShopifyCdn, shopifyImage, shopifySrcSet, CARD_WIDTHS } from './shopifyImage';

// A literal URL from data/products.json, not an invented one — the query string
// already carries `?v=`, which is exactly the case a naive `url + '?width='`
// would corrupt.
const REAL =
  'https://cdn.shopify.com/s/files/1/1249/2451/files/CCB2A751-D231-47BC-ACFD-964BAB72B0E1_1_201_a.jpg?v=1785350116';

describe('isShopifyCdn', () => {
  it('recognises the CDN', () => {
    expect(isShopifyCdn(REAL)).toBe(true);
  });

  it('rejects local public assets', () => {
    expect(isShopifyCdn('/logo.png')).toBe(false);
    expect(isShopifyCdn('/hero-home.jpg?v=17d')).toBe(false);
  });

  it('rejects other hosts, including look-alikes', () => {
    expect(isShopifyCdn('https://example.com/a.jpg')).toBe(false);
    // Must match the host exactly — not merely contain the string.
    expect(isShopifyCdn('https://cdn.shopify.com.evil.test/a.jpg')).toBe(false);
  });
});

describe('shopifyImage', () => {
  it('adds width while PRESERVING the existing ?v= cache buster', () => {
    const out = shopifyImage(REAL, 400);
    expect(out).toContain('v=1785350116');
    expect(out).toContain('width=400');
    // one query separator, then ampersands — never a second '?'
    expect(out.match(/\?/g)).toHaveLength(1);
  });

  it('is idempotent — re-applying replaces rather than appends', () => {
    const once = shopifyImage(REAL, 400);
    const twice = shopifyImage(once, 800);
    expect(twice.match(/width=/g)).toHaveLength(1);
    expect(twice).toContain('width=800');
  });

  it('rounds fractional widths, so no float reaches the CDN', () => {
    expect(shopifyImage(REAL, 199.6)).toContain('width=200');
  });

  it('leaves non-Shopify URLs completely untouched', () => {
    expect(shopifyImage('/logo.png', 400)).toBe('/logo.png');
    expect(shopifyImage('https://example.com/a.jpg', 400)).toBe('https://example.com/a.jpg');
  });

  it('returns unparseable input unchanged rather than throwing in a render', () => {
    expect(shopifyImage('', 400)).toBe('');
    expect(shopifyImage('not a url', 400)).toBe('not a url');
  });

  it('passes undefined through — House.image is optional', () => {
    expect(shopifyImage(undefined, 400)).toBeUndefined();
    expect(shopifySrcSet(undefined)).toBeUndefined();
  });
});

describe('shopifySrcSet', () => {
  it('emits one candidate per width, each with its w descriptor', () => {
    const set = shopifySrcSet(REAL)!;
    const parts = set.split(', ');
    expect(parts).toHaveLength(CARD_WIDTHS.length);
    for (const w of CARD_WIDTHS) {
      expect(set).toContain(`width=${w} ${w}w`);
    }
  });

  it('is undefined off-CDN, so React omits the attribute entirely', () => {
    expect(shopifySrcSet('/logo.png')).toBeUndefined();
  });
});
