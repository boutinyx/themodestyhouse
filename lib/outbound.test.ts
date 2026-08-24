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
