// Pulse custom-event tracking (ciphera.net). Client-safe: no `fs`, no Node
// APIs, so it may be imported from a `'use client'` file — Invariant 10.
//
// Only ONE event is emitted today: `outbound_click`, when a visitor leaves for
// a brand. That click is the entire revenue model (§11 P0-E) and until now
// nothing measured it — the site knew its traffic and nothing about which of
// the 107 houses it actually sends people to.
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
 *  it, because every legitimate value here is a slug. */
const MAX_VALUE = 200;

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
