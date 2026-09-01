import { describe, it, expect } from 'vitest';
import {
  EVENT_PROPS,
  OUTBOUND_EVENT,
  FAVOURITE_EVENT,
  goalProps,
  outboundProps,
  productProps,
  trackGoal,
  track,
  type GoalEvent,
} from './pulse';

/** Stands in for an anchor. `outboundProps` reads nothing but getAttribute, so
 *  it is testable in vitest's node environment without a DOM. */
const el = (attrs: Record<string, string>) => ({
  getAttribute: (n: string) => (n in attrs ? attrs[n] : null),
});

/** A window stub that records what would have been sent. */
const spy = () => {
  const calls: unknown[][] = [];
  return { calls, w: { pulse: { track: (...a: unknown[]) => calls.push(a) } } };
};

describe('the event registry', () => {
  it('is the exact set of goals that must exist in the Pulse dashboard', () => {
    // If this list changes, the goal has to be created in Pulse (Settings ->
    // Goals) under the same name, or it is accepted and never displayed. Pinned
    // here so adding one is a deliberate act with a visible diff.
    expect(Object.keys(EVENT_PROPS).sort()).toEqual([
      'about_step_open',
      'contact_submit',
      'currency_change',
      'faq_open',
      'favourite_add',
      'filter_apply',
      'image_zoom',
      'load_more',
      'nav_open',
      'newsletter_signup',
      'outbound_click',
      'quick_view_open',
      'rail_scroll',
      'region_filter',
      'search_zero_results',
      'share_link_copy',
      'subtype_click',
    ]);
  });

  it('declares no property that could carry a person', () => {
    // Not a substitute for reading a diff — a guard against the obvious slip.
    const all = Object.values(EVENT_PROPS).flat();
    for (const key of ['email', 'name', 'message', 'address', 'url', 'href', 'price', 'id']) {
      expect(all, `"${key}" must not be a tracked property`).not.toContain(key);
    }
  });
});

describe('goalProps', () => {
  // THE PRIVACY GUARD, and it is now one guard for every goal rather than one
  // per call site. Pulse's own docs: "Do not include personally identifiable
  // information in event properties."
  it('drops every key the event does not declare', () => {
    const props = goalProps('newsletter_signup', {
      surface: 'footer',
      // All of this is deliberately passed and must not survive.
      email: 'someone@example.com',
      name: 'A Reader',
      message: 'hello',
      url: 'https://themodestyhouse.com/?utm_source=x',
    });
    expect(props).toEqual({ surface: 'footer' });
  });

  it('cannot leak the contact form beyond its topic', () => {
    const props = goalProps('contact_submit', {
      topic: 'seal',
      name: 'A Reader',
      email: 'someone@example.com',
      message: 'Please list my brand, my number is 06-12345678',
    });
    expect(props).toEqual({ topic: 'seal' });
    expect(JSON.stringify(props)).not.toMatch(/@|Reader|number/);
  });

  it('omits an absent or empty value rather than sending "undefined"', () => {
    // Pulse coerces values to strings, so an undefined would be stored as the
    // literal dimension value "undefined" and become a real, meaningless row.
    expect(goalProps('outbound_click', { brand: 'niswa', surface: '' })).toEqual({ brand: 'niswa' });
    expect(goalProps('currency_change', { currency: 'EUR', from: undefined })).toEqual({ currency: 'EUR' });
  });

  it('caps a value rather than sending an unbounded string', () => {
    const long = 'x'.repeat(5000);
    expect(goalProps('favourite_add', { product: 'x:1', title: long }).title.length).toBe(200);
  });

  it('caps a search query harder than anything else, because it is typed text', () => {
    const long = goalProps('search_zero_results', { query: 'a'.repeat(500) });
    expect(long.query.length).toBe(60);
  });
});

describe('outboundProps', () => {
  it('reads the three dimensions off the anchor', () => {
    expect(outboundProps(el({ 'data-brand': 'aab', 'data-garment': 'abaya', 'data-surface': 'quickview' })))
      .toEqual({ brand: 'aab', garment: 'abaya', surface: 'quickview' });
  });

  it('omits a dimension that is absent — a brand link has no garment', () => {
    expect(outboundProps(el({ 'data-brand': 'niswa', 'data-surface': 'designers' })))
      .toEqual({ brand: 'niswa', surface: 'designers' });
  });

  it('never names the product, unlike the product goals', () => {
    // The deliberate asymmetry the privacy policy also draws: a click-through
    // records the brand, a save records the piece.
    const props = outboundProps(el({
      'data-brand': 'aab',
      'data-garment': 'dress',
      'data-surface': 'quickview',
      href: 'https://aab.co.uk/products/secret-thing?utm_source=x&email=a@b.com',
      'data-title': 'Some Product Title',
      'data-product': 'aab:12345',
    }));
    expect(Object.keys(props).sort()).toEqual(['brand', 'garment', 'surface']);
    expect(JSON.stringify(props)).not.toMatch(/http|@|utm_|Product Title/);
  });
});

describe('productProps', () => {
  const card = {
    id: 'aab:12345',
    brandSlug: 'aab',
    garment: 'dress',
    title: 'Amara Pleated Dress',
    // Real fields on a CardProduct that must never be sent.
    brandName: 'Aab',
    price: 129,
    currency: 'GBP',
    image: 'https://cdn.shopify.com/s/files/1/x.jpg',
    url: 'https://aab.co.uk/products/amara?utm_source=themodestyhouse.com',
  };

  it('names the product, which is the point of the product goals', () => {
    expect(goalProps('favourite_add', productProps(card))).toEqual({
      brand: 'aab',
      garment: 'dress',
      product: 'aab:12345',
      title: 'Amara Pleated Dress',
    });
  });

  it('picks from the product rather than spreading it', () => {
    const props = goalProps('quick_view_open', productProps(card));
    expect(Object.keys(props).sort()).toEqual(['brand', 'garment', 'product', 'title']);
    expect(JSON.stringify(props)).not.toMatch(/http|utm_|129|GBP|cdn\./);
  });

  it('gives the four product goals identical shapes, so they compare', () => {
    // favourite_add / quick_view_open / share_link_copy are read against each
    // other — looked at, saved, shared — which only works if they carry the
    // same dimensions.
    expect(EVENT_PROPS.quick_view_open).toEqual(EVENT_PROPS.favourite_add);
    expect(EVENT_PROPS.share_link_copy).toEqual(EVENT_PROPS.favourite_add);
    expect(EVENT_PROPS.image_zoom).toEqual(EVENT_PROPS.favourite_add);
  });
});

describe('trackGoal', () => {
  it('sends the filtered bag under the event name', () => {
    const { calls, w } = spy();
    trackGoal('filter_apply', { filter: 'colour', value: 'olive', lane: '/new-in', secret: 'no' }, w);
    expect(calls).toEqual([['filter_apply', { filter: 'colour', value: 'olive', lane: '/new-in' }]]);
  });

  it('emits every declared goal without throwing, with nothing to send', () => {
    const { w } = spy();
    for (const event of Object.keys(EVENT_PROPS) as GoalEvent[]) {
      expect(() => trackGoal(event, {}, w)).not.toThrow();
    }
  });
});

describe('track', () => {
  it('calls pulse.track when the script has loaded', () => {
    const { calls, w } = spy();
    track(OUTBOUND_EVENT, { brand: 'aab' }, w);
    expect(calls).toEqual([['outbound_click', { brand: 'aab' }]]);
  });

  it('queues when the script has not loaded yet', () => {
    // layout.tsx loads Pulse `defer` + afterInteractive, so a fast click on a
    // prerendered page genuinely can beat it. Documented queue shape.
    const w: { pulseQueue?: unknown[] } = {};
    track(FAVOURITE_EVENT, { brand: 'aab' }, w);
    expect(w.pulseQueue).toEqual([['track', 'favourite_add', { brand: 'aab' }]]);
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
