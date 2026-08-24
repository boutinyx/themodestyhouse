import {
  LAYERING_SUBTYPE_LABELS,
  OUTERWEAR_SUBTYPE_LABELS,
  HIJAB_SUBTYPE_LABELS,
} from '@/lib/specialty';

/**
 * The `?type=` subtypes each lane offers, in ONE place.
 *
 * Three consumers need this and none of them can share the encoded catalogue:
 *   - app/[lane]/page.tsx generateMetadata (must not call productsForLane —
 *     it re-parses 10.9 MB uncached, CLAUDE.md §8)
 *   - app/[lane]/page.tsx itself, to render the chips as real <a> links
 *   - app/sitemap.ts, which has no request context at all
 * Deriving all three from the label maps in lib/specialty.ts means a new
 * subtype appears everywhere at once, the same property app/sitemap.ts already
 * relies on for LANES.
 *
 * Before 2026-08-19 these 14 URLs were built, server-rendered, and completely
 * undiscoverable: no page emitted an href containing `type=` (the nav flyout
 * that builds them is a client-side portalled menu), generateMetadata ignored
 * searchParams so every one canonicalised to its bare parent lane, and the
 * JSON-LD actively contradicted the page — /outerwear?type=blazer emitted
 * CollectionPage{name:"Outerwear"} whose ItemList opened with a vest.
 */

export type SubtypeDomain = 'layering' | 'outerwear' | 'hijab';

export interface LaneSubtype {
  /** the `?type=` value */
  type: string;
  /** human label, straight from lib/specialty.ts */
  label: string;
}

/**
 * Subtypes too thin to deserve a sitemap entry, measured 2026-08-19:
 * neck-cover 21 products, sleeve-extender 16, cropped-body-shirt 13,
 * shirt-extender 9. They stay LINKED (a visitor filtering to them is a real
 * use) but submitting a 9-product page to Google invites a
 * "Discovered - currently not indexed" verdict at best, and on a domain that
 * already has five lanes in exactly that state (see
 * docs/log/2026-08-19-gsc-api-access-and-index-coverage.md) it is a bad trade.
 */
const TOO_THIN_FOR_SITEMAP = new Set(['neck-cover', 'sleeve-extender', 'shirt-extender', 'cropped-body-shirt']);

const toList = (labels: Record<string, string>): LaneSubtype[] =>
  Object.entries(labels).map(([type, label]) => ({ type, label }));

// blazers-vests and cardigans-sweaters each read the SAME 'outerwear' domain
// (lib/compactCatalogue.ts encodes it per-lane already, only from whichever
// products that lane's own match() predicate included — see lib/lanes.ts —
// so /blazers-vests never sees a 'coat' index at runtime regardless of this
// list) but each is filtered here to just its own two subtypes, because THIS
// list feeds generateMetadata/sitemap, which have no encoded catalogue to
// read and would otherwise validate e.g. /blazers-vests?type=coat as if it
// were a real page. jackets-coats has only one subtype (coat) — no entry
// here at all, same as Co-ord Sets: a single-subtype lane gets no chip row.
const OUTERWEAR_TYPES = toList(OUTERWEAR_SUBTYPE_LABELS);
const blazerVestTypes = OUTERWEAR_TYPES.filter((s) => s.type === 'blazer' || s.type === 'vest');
const cardiganSweaterTypes = OUTERWEAR_TYPES.filter((s) => s.type === 'cardigan' || s.type === 'sweater');

export const LANE_SUBTYPES: Record<string, { domain: SubtypeDomain; subtypes: LaneSubtype[] }> = {
  'layering-basics': { domain: 'layering', subtypes: toList(LAYERING_SUBTYPE_LABELS) },
  'blazers-vests': { domain: 'outerwear', subtypes: blazerVestTypes },
  'cardigans-sweaters': { domain: 'outerwear', subtypes: cardiganSweaterTypes },
  'modest-hijabs': { domain: 'hijab', subtypes: toList(HIJAB_SUBTYPE_LABELS) },
};

/** Every subtype for a lane, or [] for a lane that has none. */
export function subtypesForLane(laneSlug: string): LaneSubtype[] {
  return LANE_SUBTYPES[laneSlug]?.subtypes ?? [];
}

/**
 * Resolve a raw `?type=` query value against a lane. Returns null for an
 * unknown value — `type` is user input and an invalid one must fall back to
 * the plain lane, never print raw garbage or mint a junk canonical.
 */
export function resolveSubtype(laneSlug: string, type: string | undefined): LaneSubtype | null {
  if (!type) return null;
  return subtypesForLane(laneSlug).find((s) => s.type === type) ?? null;
}

/** The subset worth submitting to Google. See TOO_THIN_FOR_SITEMAP. */
export function sitemapSubtypesForLane(laneSlug: string): LaneSubtype[] {
  return subtypesForLane(laneSlug).filter((s) => !TOO_THIN_FOR_SITEMAP.has(s.type));
}

/**
 * Title/description for a subtype page.
 *
 * DELIBERATELY TEMPLATED, not written. These are 14 SERP-facing strings and
 * CLAUDE.md §10.18 is explicit that brand copy is Tina's — so rather than
 * invent 14 voices, this derives a plain, factual, keyword-bearing pair from
 * the label that lib/specialty.ts already defines. If she wants real copy for
 * the big ones (hijab 4,644 products, coat 321, undercap 311), it belongs in
 * lib/seoCopy.ts keyed by `/${lane}?type=${type}` and should override this.
 */
export function subtypeSeo(sub: LaneSubtype, laneIntro: string): { title: string; description: string } {
  return {
    // No "| The Modesty House" suffix here — app/layout.tsx already applies
    // `template: '%s | The Modesty House'`, and including it produced
    // "Blazers — Modest Fashion | The Modesty House | The Modesty House".
    title: `Modest ${sub.label}`,
    description: `Browse ${sub.label.toLowerCase()} from independent modest fashion brands, curated by The Modesty House. ${laneIntro}`.slice(0, 158),
  };
}
