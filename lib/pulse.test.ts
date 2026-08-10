import { describe, it, expect } from 'vitest';
import { OUTBOUND_EVENT, OUTBOUND_PROPS, outboundProps, track } from './pulse';

/** Stands in for an anchor. `outboundProps` reads nothing but getAttribute, so
 *  it is testable in vitest's node environment without a DOM. */
const el = (attrs: Record<string, string>) => ({
  getAttribute: (n: string) => (n in attrs ? attrs[n] : null),
});

describe('outboundProps', () => {
  it('reads the three dimensions off the anchor', () => {
    expect(outboundProps(el({ 'data-brand': 'aab', 'data-garment': 'abaya', 'data-surface': 'quickview' })))
      .toEqual({ brand: 'aab', garment: 'abaya', surface: 'quickview' });
  });

  it('omits a dimension that is absent rather than sending undefined', () => {
    // A brand link has no garment. `undefined` would be coerced to the STRING
    // "undefined" by Pulse and become a real, meaningless dimension value.
    expect(outboundProps(el({ 'data-brand': 'niswa', 'data-surface': 'designers' })))
      .toEqual({ brand: 'niswa', surface: 'designers' });
  });

  it('omits empty strings too', () => {
    expect(outboundProps(el({ 'data-brand': '', 'data-surface': 'marquee' }))).toEqual({ surface: 'marquee' });
  });

  it('returns nothing for an unannotated link', () => {
    expect(outboundProps(el({}))).toEqual({});
  });

  // THE PRIVACY GUARD. Pulse's own docs: "Do not include personally
  // identifiable information in event properties." The policy discloses three
  // low-cardinality dimensions and nothing else, so this asserts the shape of
  // what leaves the browser rather than trusting each new call site.
  it('can never emit anything outside the disclosed allowlist', () => {
    const props = outboundProps(el({
      'data-brand': 'aab',
      'data-garment': 'dress',
      'data-surface': 'quickview',
      // Everything below is deliberately present on the element and must be ignored.
      href: 'https://aab.co.uk/products/secret-thing?utm_source=x&email=a@b.com',
      'data-title': 'Some Product Title',
      'data-url': 'https://aab.co.uk/products/x',
      'data-id': 'aab:12345',
      'data-price': '49',
    }));
    expect(Object.keys(props).sort()).toEqual(['brand', 'garment', 'surface']);
    expect(OUTBOUND_PROPS).toEqual(['brand', 'garment', 'surface']);
    expect(JSON.stringify(props)).not.toMatch(/http|@|utm_|Product Title/);
  });

  it('caps a value rather than sending an unbounded string', () => {
    // Pulse's limit is 2000 chars per value; a mangled attribute should not
    // become a giant dimension.
    const long = 'x'.repeat(5000);
    expect((outboundProps(el({ 'data-brand': long })).brand as string).length).toBeLessThanOrEqual(200);
  });
});

describe('track', () => {
  it('calls pulse.track when the script has loaded', () => {
    const calls: unknown[][] = [];
    const w = { pulse: { track: (...a: unknown[]) => calls.push(a) } };
    track(OUTBOUND_EVENT, { brand: 'aab' }, w);
    expect(calls).toEqual([['outbound_click', { brand: 'aab' }]]);
  });

  it('queues when the script has not loaded yet', () => {
    // layout.tsx loads Pulse `defer` + afterInteractive, so a fast click on a
    // prerendered page genuinely can beat it. Documented queue shape.
    const w: { pulseQueue?: unknown[] } = {};
    track(OUTBOUND_EVENT, { brand: 'aab' }, w);
    expect(w.pulseQueue).toEqual([['track', 'outbound_click', { brand: 'aab' }]]);
  });

  it('appends to a queue the script already created', () => {
    const w = { pulseQueue: [['track', 'earlier']] as unknown[] };
    track(OUTBOUND_EVENT, {}, w);
    expect(w.pulseQueue).toHaveLength(2);
  });

  it('never throws, whatever the page state', () => {
    // A tracking failure must not break navigation to the brand — that click
    // is the entire revenue model.
    expect(() => track(OUTBOUND_EVENT, { brand: 'aab' }, undefined)).not.toThrow();
    expect(() => track(OUTBOUND_EVENT, { brand: 'aab' }, { pulse: { track: () => { throw new Error('boom'); } } })).not.toThrow();
  });
});
