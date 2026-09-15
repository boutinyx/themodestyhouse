import { describe, it, expect } from 'vitest';
import { linkVerdict, productHandle, isBroken } from './deadLink';

const P = 'https://voilechic.com/products/ribbed-jersey-hijab-charcoal-grey';

describe('productHandle', () => {
  it('reads the handle out of a Shopify product URL', () => {
    expect(productHandle(P)).toBe('ribbed-jersey-hijab-charcoal-grey');
  });

  it('ignores query strings and fragments (our links carry UTM tags)', () => {
    expect(productHandle(`${P}?utm_source=themodestyhouse.com&ref=x#top`)).toBe('ribbed-jersey-hijab-charcoal-grey');
  });

  it('decodes and lower-cases, because some houses publish Turkish handles', () => {
    // NOTE the §10.31 trap, live in this assertion: 'İ'.toLowerCase() is 'i' +
    // U+0307 COMBINING DOT ABOVE, so the decoded handle gains a character. That
    // is harmless HERE and only because both sides of the comparison in
    // linkVerdict() go through this same function — it would be a bug the
    // moment one side were normalised differently.
    expect(productHandle('https://int.toucheprive.com/products/Kemerli%C4%B0-Elbise')).toBe('kemerlii̇-elbise');
  });

  it('matches a handle against itself whatever the casing', () => {
    const upper = 'https://int.toucheprive.com/products/Kemerli%C4%B0-Elbise';
    const lower = 'https://int.toucheprive.com/products/kemerli%C4%B0-elbise';
    expect(productHandle(upper)).toBe(productHandle(lower));
  });

  it('returns null for a non-product URL', () => {
    expect(productHandle('https://voilechic.com/collections/all')).toBeNull();
  });
});

describe('linkVerdict', () => {
  it('calls a product that answers on its own URL ok', () => {
    expect(linkVerdict({ url: P, status: 200, finalUrl: P })).toBe('ok');
  });

  it('calls a 404 dead', () => {
    expect(linkVerdict({ url: P, status: 404, finalUrl: P })).toBe('dead');
  });

  it('calls a 200 that landed on the shop homepage MOVED, not ok', () => {
    // The measured failure mode: with an Accept: header these storefronts 302 a
    // removed product to their front page, so status alone says everything is
    // fine. 44 of 50 dead products on 2026-09-15 looked exactly like this.
    expect(linkVerdict({ url: P, status: 200, finalUrl: 'https://voilechic.com/' })).toBe('moved');
  });

  it('calls a 200 that landed on a collection page moved', () => {
    expect(linkVerdict({ url: P, status: 200, finalUrl: 'https://jennah-boutique.com/collections/all' })).toBe('moved');
  });

  it('calls a 200 that landed on a DIFFERENT product moved', () => {
    expect(linkVerdict({ url: P, status: 200, finalUrl: 'https://voilechic.com/products/premium-chiffon-hijab-tan' })).toBe('moved');
  });

  it('accepts a redirect that keeps the handle (http→https, www, locale prefix)', () => {
    expect(linkVerdict({ url: P, status: 200, finalUrl: 'https://www.voilechic.com/en/products/ribbed-jersey-hijab-charcoal-grey' })).toBe('ok');
  });

  it('never calls a failed check dead', () => {
    expect(linkVerdict({ url: P, status: null, finalUrl: null, error: 'getaddrinfo ENOTFOUND' })).toBe('unknown');
    expect(linkVerdict({ url: P, status: 429, finalUrl: null })).toBe('unknown');
    expect(linkVerdict({ url: P, status: 503, finalUrl: null })).toBe('unknown');
    expect(linkVerdict({ url: P, status: 403, finalUrl: null })).toBe('unknown');
  });

  it('treats a non-product URL as ok on any 2xx', () => {
    expect(linkVerdict({ url: 'https://voilechic.com/', status: 200, finalUrl: 'https://voilechic.com/' })).toBe('ok');
  });
});

describe('isBroken', () => {
  it('is true for dead and moved, false for ok and unknown', () => {
    expect(['dead', 'moved'].every((v) => isBroken(v as never))).toBe(true);
    expect(['ok', 'unknown'].some((v) => isBroken(v as never))).toBe(false);
  });
});
