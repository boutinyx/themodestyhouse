// Pulse custom-event tracking (ciphera.net). Client-safe: no `fs`, no Node
// APIs, so it may be imported from a `'use client'` file — Invariant 10.
//
// Two events are emitted:
//
//   `outbound_click`  — a visitor leaves for a brand. That click is the entire
//                       revenue model (§11 P0-E) and until it existed nothing
//                       measured it: the site knew its traffic and nothing
//                       about which of the 107 houses it actually sends people
//                       to. Deliberately does NOT name the product.
//   `favourite_add`   — a visitor saves a piece. This one DOES name the
//                       product, because "which products get saved" is the
//                       whole question it exists to answer, and a favourite is
//                       an intent signal about the CATALOGUE that no other
//                       event on the site carries.
//
// Both are goals in Pulse's dashboard (Settings -> Goals) — an event whose
// name has not been created there is not displayed.
//
// The Pulse script is PRODUCTION-ONLY (see app/layout.tsx), so in dev these
// calls queue harmlessly and are never sent. That also means this code cannot
// be verified locally: the check is a real click on the deployed site.

/** Pulse lowercases and trims event names, so this is already canonical. */
export const OUTBOUND_EVENT = 'outbound_click';

/**
 * The ONLY property keys that may ever leave the browser on this event, and
 * the exact set content/legal/privacy.md §2 discloses.
 *
 * All three are low-cardinality and describe the SITE, not the visitor: brand
 * slug (~107 values), garment (8), and which surface the click came from (~6).
 * Pulse's own guidance is explicit — "Do not include personally identifiable
 * information in event properties" — and a product URL would additionally drag
 * in whatever query string a brand happens to append.
 */
export const OUTBOUND_PROPS = ['brand', 'garment', 'surface'] as const;

/** Pulse's documented per-value ceiling is 2000 characters; this is far below
 *  it, because every legitimate value here is a slug or a product title. */
const MAX_VALUE = 200;

/** Pulse lowercases and trims event names, so this is already canonical. */
export const FAVOURITE_EVENT = 'favourite_add';

/**
 * The ONLY property keys that may leave the browser when a piece is saved, and
 * the exact set content/legal/privacy.md §2 discloses.
 *
 * `product` (the `${brandSlug}:${shopifyId}` id, Invariant 1) and `title` are
 * here on purpose and are the one deliberate difference from OUTBOUND_PROPS,
 * which names no product at all. A saved piece is a statement about the
 * CATALOGUE — the id is what joins the answer back to `data/products.json`,
 * and the title is what makes the dashboard readable without a lookup. Both
 * describe our own inventory; neither says anything about the visitor, and
 * Pulse remains cookieless with no visitor id to attach them to.
 *
 * Everything else about a product stays out: no url (which would drag in
 * whatever query string a brand appends), no price, no image.
 */
export const FAVOURITE_PROPS = ['brand', 'garment', 'product', 'title'] as const;

/** Structurally a `CardProduct`, spelled out here so this file keeps importing
 *  nothing — same reasoning as `AttributeSource` below. */
interface FavouriteSource {
  id: string;
  brandSlug?: string;
  garment?: string;
  title?: string;
}

/**
 * Builds the saved-piece event's properties.
 *
 * An explicit allowlist rather than a spread of the product, for the reason
 * `outboundProps` is attribute-driven: a `CardProduct` carries a url and a
 * price, and the day someone passes the whole object is the day the policy
 * becomes false. Only these four keys can ever come out of here.
 */
export function favouriteProps(p: FavouriteSource): Record<string, string> {
  const source: Record<(typeof FAVOURITE_PROPS)[number], string | undefined> = {
    brand: p.brandSlug,
    garment: p.garment,
    product: p.id,
    title: p.title,
  };
  const props: Record<string, string> = {};
  for (const key of FAVOURITE_PROPS) {
    const value = source[key];
    // Absent AND empty are both dropped, for the same reason as outboundProps:
    // Pulse coerces to string, so `undefined` becomes the literal "undefined".
    if (value) props[key] = String(value).slice(0, MAX_VALUE);
  }
  return props;
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
  const props: Record<string, string> = {};
  for (const key of OUTBOUND_PROPS) {
    const value = el.getAttribute(`data-${key}`);
    // Absent AND empty are both dropped: Pulse coerces values to strings, so an
    // `undefined` would be stored as the literal dimension value "undefined".
    if (value) props[key] = value.slice(0, MAX_VALUE);
  }
  return props;
}

/**
 * Sends an event, or queues it if the script has not initialised yet — Pulse is
 * loaded `defer` + `afterInteractive`, so a fast click on a prerendered page can
 * genuinely arrive first.
 *
 * Never throws. This runs on the click that earns the commission, and a
 * measurement failure must never be able to interfere with the navigation.
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
