import { describe, expect, it } from 'vitest';
import { OUTBOUND_UTM, withUtm } from './outbound';

describe('withUtm', () => {
  it('tags a clean product URL', () => {
    const out = new URL(withUtm('https://aab.co.uk/products/silk-abaya', 'product-card'));
    expect(out.searchParams.get('utm_source')).toBe('themodestyhouse.com');
    expect(out.searchParams.get('utm_medium')).toBe('referral');
    expect(out.searchParams.get('utm_campaign')).toBe('directory');
    expect(out.searchParams.get('utm_content')).toBe('product-card');
    expect(out.origin + out.pathname).toBe('https://aab.co.uk/products/silk-abaya');
  });

  it('preserves an existing query string', () => {
    const out = new URL(withUtm('https://x.com/products/a?variant=42', 'quickview'));
    expect(out.searchParams.get('variant')).toBe('42');
    expect(out.searchParams.get('utm_source')).toBe('themodestyhouse.com');
  });

  it('keeps a hash fragment after the query', () => {
    expect(withUtm('https://x.com/p/a#reviews', 'product-page')).toContain('#reviews');
    expect(withUtm('https://x.com/p/a#reviews', 'product-page').indexOf('utm_source'))
      .toBeLessThan(withUtm('https://x.com/p/a#reviews', 'product-page').indexOf('#'));
  });

  // A brand that already tags its own links owns that attribution. Overwriting
  // it would corrupt THEIR reporting, which is the opposite of the point.
  it('never overwrites a URL that already carries a utm_source', () => {
    const tagged = 'https://x.com/p/a?utm_source=newsletter&utm_medium=email';
    expect(withUtm(tagged, 'product-card')).toBe(tagged);
  });

  it('is idempotent — tagging twice changes nothing', () => {
    const once = withUtm('https://x.com/p/a', 'marquee');
    expect(withUtm(once, 'marquee')).toBe(once);
  });

  it('omits utm_content when no surface is given', () => {
    const out = withUtm('https://x.com/p/a');
    expect(out).not.toContain('utm_content');
    expect(out).toContain('utm_source=themodestyhouse.com');
  });

  // Never mangle a URL we do not understand — same contract as shopifyImage.
  it('returns an unparseable URL unchanged instead of throwing', () => {
    expect(withUtm('not a url', 'product-card')).toBe('not a url');
    expect(withUtm('', 'product-card')).toBe('');
  });

  it('leaves non-http schemes alone', () => {
    expect(withUtm('mailto:hello@aab.co.uk')).toBe('mailto:hello@aab.co.uk');
  });

  it('does not encode the parameters in a way a merchant cannot read', () => {
    expect(withUtm('https://x.com/p/a', 'popular-showcase'))
      .toBe('https://x.com/p/a?utm_source=themodestyhouse.com&utm_medium=referral&utm_campaign=directory&utm_content=popular-showcase');
  });

  it('exposes the canonical source for anyone auditing the tag', () => {
    expect(OUTBOUND_UTM.utm_source).toBe('themodestyhouse.com');
  });
});

describe('affiliate parameters', () => {
  // The whole point of the feature: a Losyana product link must carry the
  // GoAffPro ref, or the click earns nothing. Measured in a real browser on
  // 2026-08-28 — `?ref=dsgnnfgp` on losyana.shop sets the tracking cookie.
  it('adds the affiliate ref to a host we hold a code for', () => {
    const out = new URL(withUtm('https://losyana.shop/products/linen-corset-kimono-black', 'product-card'));
    expect(out.searchParams.get('ref')).toBe('dsgnnfgp');
    expect(out.searchParams.get('utm_source')).toBe('themodestyhouse.com');
  });

  it('matches the host with or without www.', () => {
    expect(new URL(withUtm('https://www.losyana.shop/products/x')).searchParams.get('ref')).toBe('dsgnnfgp');
  });

  // The negative control. losyana.nl is a DIFFERENT Shopify store with its own
  // GoAffPro install, and the code is dead there — tagging it would look like
  // it works and earn nothing (docs/log/2026-08-28-losyana-affiliate-wrong-store.md).
  it('does NOT tag a host we hold no code for, including the other Losyana store', () => {
    expect(new URL(withUtm('https://losyana.nl/products/x')).searchParams.has('ref')).toBe(false);
    expect(new URL(withUtm('https://veiled.com/products/x')).searchParams.has('ref')).toBe(false);
  });

  it('never overwrites a ref the URL already carries', () => {
    const out = new URL(withUtm('https://losyana.shop/products/x?ref=someoneelse'));
    expect(out.searchParams.get('ref')).toBe('someoneelse');
  });

  // A URL carrying a third party's campaign tag keeps it AND still earns.
  it('still adds the affiliate ref when the URL already has a utm_source', () => {
    const out = new URL(withUtm('https://losyana.shop/products/x?utm_source=instagram'));
    expect(out.searchParams.get('utm_source')).toBe('instagram');
    expect(out.searchParams.get('ref')).toBe('dsgnnfgp');
  });

  it('returns a utm-tagged URL for an untagged host byte-identical', () => {
    const url = 'https://veiled.com/products/x?utm_source=instagram';
    expect(withUtm(url)).toBe(url);
  });
});
