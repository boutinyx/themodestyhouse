// Pulse custom-event tracking (ciphera.net). Client-safe: no `fs`, no Node
// APIs, so it may be imported from a `'use client'` file — Invariant 10.
//
// Every goal the site emits is declared in EVENT_PROPS below, with the exact
// property keys it may carry. That map is the single source of truth: it is
// what `trackGoal()` filters against, what `lib/pulse.test.ts` asserts, and
// what `lib/legal.test.ts` requires content/legal/privacy.md §2 to disclose.
// Adding an event without disclosing it fails the build.
//
// Each goal must ALSO be created in Pulse (Settings -> Goals) under exactly the
// name used here — an event whose name does not exist there is accepted and
// then not displayed.
//
// The Pulse script is PRODUCTION-ONLY (see app/layout.tsx), so in dev these
// calls queue harmlessly and are never sent. That also means this code cannot
// be verified locally by watching Pulse: the check is `npm run audit:outbound`,
// which reads back what WOULD have been sent.

/**
 * Every goal, and the only properties it may carry.
 *
 * Pulse's own guidance is explicit — "Do not include personally identifiable
 * information in event properties" — so the rule here is that a property
 * describes THE SITE (a brand slug, a garment, a filter name, a currency code),
 * never the visitor. Two carry more than a slug and are called out:
 *
 * - `product` / `title` on the product events. These name a piece from OUR
 *   catalogue: the id joins back to `data/products.json`, the title makes the
 *   dashboard readable. `outbound_click` deliberately does NOT carry them —
 *   see the §2 disclosure, which draws the same line.
 * - `query` on `search_zero_results`. The one property that is free text the
 *   visitor typed. It is sent ONLY when the search found nothing (which is the
 *   entire point: a list of things readers expect us to have), only once per
 *   query, and capped hard by MAX_QUERY.
 *
 * Never on any event: an email address, a message body, a url, a price.
 */
export const EVENT_PROPS = {
  /** A visitor leaves for a brand. The revenue event (§11 P0-E). */
  outbound_click: ['brand', 'garment', 'surface'],
  /** A piece is saved to favourites. */
  favourite_add: ['brand', 'garment', 'product', 'title'],
  /** The quick-view modal is opened — interest short of a click-through. */
  quick_view_open: ['brand', 'garment', 'product', 'title'],
  /** Quick view's "Copy share link". Rare, and a strong intent signal. */
  share_link_copy: ['brand', 'garment', 'product', 'title'],
  /** A display-currency choice. `from` is the previous one. */
  currency_change: ['currency', 'from'],
  /** Any grid filter or sort: Brand, Colour, Category, Type, Sort. */
  filter_apply: ['filter', 'value', 'lane'],
  /** A search that returned nothing. */
  search_zero_results: ['query'],
  /** The footer newsletter form was accepted. Never the address. */
  newsletter_signup: ['surface'],
  /** The contact form was accepted. The TOPIC only — never name, address or
   *  message, which are the one genuinely personal payload on this site. */
  contact_submit: ['topic'],
  /** An FAQ question was opened. Which questions readers actually have. */
  faq_open: ['question'],
} as const;

export type GoalEvent = keyof typeof EVENT_PROPS;

/** Pulse lowercases and trims event names, so these are already canonical. */
export const OUTBOUND_EVENT = 'outbound_click';
export const FAVOURITE_EVENT = 'favourite_add';

/** Pulse's documented per-value ceiling is 2000 characters; this is far below
 *  it, because every legitimate value here is a slug or a product title. */
const MAX_VALUE = 200;
/** Shorter still for the one free-text property. A real search is a few words;
 *  anything longer is a paste, and a paste is the shape of an accident. */
const MAX_QUERY = 60;

/**
 * Filters a property bag down to what the event is allowed to carry.
 *
 * The allowlist is applied HERE rather than at each call site, so a component
 * that hands over a whole product — or an input value — cannot widen what
 * leaves the browser. Keys outside the list are dropped silently; that is the
 * safe direction, and `lib/pulse.test.ts` asserts it.
 */
export function goalProps(event: GoalEvent, props: Record<string, unknown>): Record<string, string> {
  const allowed = EVENT_PROPS[event] as readonly string[];
  const cap = event === 'search_zero_results' ? MAX_QUERY : MAX_VALUE;
  const out: Record<string, string> = {};
  for (const key of allowed) {
    const value = props[key];
    // Absent AND empty are both dropped: Pulse coerces values to strings, so an
    // `undefined` would be stored as the literal dimension value "undefined".
    if (value === undefined || value === null || value === '') continue;
    out[key] = String(value).slice(0, cap);
  }
  return out;
}

/** Anything with getAttribute — a real anchor, or a stub in a test. */
interface AttributeSource {
  getAttribute(name: string): string | null;
}

interface PulseWindow {
  pulse?: { track: (event: string, props?: Record<string, string>) => void };
  pulseQueue?: unknown[];
}

/**
 * Reads the disclosed dimensions off an outbound anchor's `data-*` attributes.
 *
 * Attribute-driven ON PURPOSE. Three of the six components that render an
 * outbound link (`BrandCard`, `BrandMarquee`, `VerifiedSpotlight`) are SERVER
 * components; giving them an onClick would force them all `'use client'` and
 * push their data back into the RSC payload the columnar encoding just removed
 * (§8). A plain `data-` attribute costs nothing and works in both.
 */
export function outboundProps(el: AttributeSource): Record<string, string> {
  const raw: Record<string, string> = {};
  for (const key of EVENT_PROPS.outbound_click) {
    const value = el.getAttribute(`data-${key}`);
    if (value) raw[key] = value;
  }
  return goalProps('outbound_click', raw);
}

/** Structurally a `CardProduct`, spelled out here so this file keeps importing
 *  nothing — same reasoning as `AttributeSource` above. */
interface ProductSource {
  id: string;
  brandSlug?: string;
  garment?: string;
  title?: string;
}

/**
 * The four properties the product events share.
 *
 * Takes the product and picks, rather than being handed a bag: a `CardProduct`
 * also carries a url and a price, and the day someone spreads the whole object
 * is the day the policy becomes false.
 */
export function productProps(p: ProductSource): Record<string, string> {
  return {
    brand: p.brandSlug ?? '',
    garment: p.garment ?? '',
    product: p.id,
    title: p.title ?? '',
  };
}

/**
 * Sends a goal, filtered through its allowlist. THE ONLY WAY TO EMIT ANYTHING.
 *
 * Never throws. One of these runs on the click that earns the commission, and a
 * measurement failure must never be able to interfere with the navigation.
 */
export function trackGoal(
  event: GoalEvent,
  props: Record<string, unknown> = {},
  w?: PulseWindow,
): void {
  track(event, goalProps(event, props), w);
}

/**
 * Raw send, or queue if the script has not initialised yet — Pulse is loaded
 * `defer` + `afterInteractive`, so a fast click on a prerendered page can
 * genuinely arrive first.
 *
 * Prefer `trackGoal`, which applies the allowlist. This stays exported because
 * `OutboundTracking` already has a filtered bag from `outboundProps`.
 */
export function track(
  event: string,
  props: Record<string, string>,
  w: PulseWindow | undefined = typeof window === 'undefined' ? undefined : (window as unknown as PulseWindow),
): void {
  if (!w) return;
  try {
    if (typeof w.pulse?.track === 'function') {
      w.pulse.track(event, props);
      return;
    }
    (w.pulseQueue = w.pulseQueue || []).push(['track', event, props]);
  } catch {
    // Deliberately silent: see above.
  }
}
