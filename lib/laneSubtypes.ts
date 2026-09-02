import type { Product } from '@/lib/types';
import {
  layeringSubtype, outerwearSubtype, hijabSubtype, swimSubtype, activeSubtype,
  dressSubtype, garmentSubtype,
  LAYERING_SUBTYPE_LABELS,
  OUTERWEAR_SUBTYPE_LABELS,
  HIJAB_SUBTYPE_LABELS,
  SWIM_SUBTYPE_LABELS,
  ACTIVE_SUBTYPE_LABELS,
  DRESS_SUBTYPE_LABELS,
  GARMENT_SUBTYPE_LABELS,
  type GarmentSubtype,
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

export type SubtypeDomain = 'layering' | 'outerwear' | 'hijab' | 'swim' | 'active' | 'dress' | 'garment';

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
/**
 * Measured 2026-08-19: neck-cover 21 products, sleeve-extender 16,
 * cropped-body-shirt 13, shirt-extender 9.
 * Extended 2026-09-02 with the two new subtypes below the same bar: slip
 * dresses 14 (a curated list Tina has barely populated) and A-line skirts 21.
 * Both stay LINKED and filterable; neither is submitted.
 */
const TOO_THIN_FOR_SITEMAP = new Set([
  'neck-cover', 'sleeve-extender', 'shirt-extender', 'cropped-body-shirt',
  'slip', 'a-line',
]);

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

/**
 * The five everyday lanes all read the SAME 'garment' domain — one column in
 * the encoded catalogue, because `garmentSubtype()` keys on `p.garment` and
 * those garments are disjoint (lib/specialty.ts). Each lane is filtered here
 * to just the values that lane can produce, for the same reason
 * blazers-vests is filtered out of the shared 'outerwear' list above: THIS
 * list feeds generateMetadata and the sitemap, neither of which has an
 * encoded catalogue to read, and both would otherwise validate
 * /modest-skirts?type=blouse as a real page.
 */
const GARMENT_TYPES = Object.keys(GARMENT_SUBTYPE_LABELS) as GarmentSubtype[];
const garmentTypes = (...only: GarmentSubtype[]): LaneSubtype[] =>
  GARMENT_TYPES.filter((t) => only.includes(t)).map((t) => ({ type: t as string, label: GARMENT_SUBTYPE_LABELS[t] }));

export const LANE_SUBTYPES: Record<string, { domain: SubtypeDomain; subtypes: LaneSubtype[] }> = {
  'layering-basics': { domain: 'layering', subtypes: toList(LAYERING_SUBTYPE_LABELS) },
  'blazers-vests': { domain: 'outerwear', subtypes: blazerVestTypes },
  'cardigans-sweaters': { domain: 'outerwear', subtypes: cardiganSweaterTypes },
  'modest-hijabs': { domain: 'hijab', subtypes: toList(HIJAB_SUBTYPE_LABELS) },
  // Added 2026-08-29. These two matter for a second reason the others do not:
  // a swim cap is `isSwim`, and it also appears on /modest-hijabs — so the
  // swim subtype COLUMN is non-empty on the hijabs lane too, and without an
  // explicit statement of which lane OWNS a domain, /modest-hijabs rendered
  // two "Type" chips, the second offering "Swim Hijabs & Caps". Ownership is
  // declared here and read by the lane page; presence in the encoded
  // catalogue is not evidence of ownership.
  'modest-swimwear': { domain: 'swim', subtypes: toList(SWIM_SUBTYPE_LABELS) },
  'modest-activewear': { domain: 'active', subtypes: toList(ACTIVE_SUBTYPE_LABELS) },
  // Added 2026-09-02. The classifier and the in-page Type filter for these
  // three have existed since 2026-08-26 — what did not exist was a PAGE:
  // /modest-dresses?type=occasion rendered a genuinely different grid and
  // then canonicalised to the bare lane and carried the lane's <title>,
  // which is precisely the defect the 2026-08-19 pass fixed for the
  // specialty lanes and never reached here. Verified live before the change.
  'modest-dresses': { domain: 'dress', subtypes: toList(DRESS_SUBTYPE_LABELS) },
  // Added 2026-09-02 with the classifier itself — see lib/specialty.ts for
  // where the labels come from (Tina's own lane intros) and the measured
  // coverage of each.
  'modest-abayas': { domain: 'garment', subtypes: garmentTypes('open', 'kimono', 'butterfly', 'closed') },
  'modest-tops': { domain: 'garment', subtypes: garmentTypes('shirt', 'tunic', 'blouse', 'tshirt') },
  'modest-skirts': { domain: 'garment', subtypes: garmentTypes('maxi', 'pleated', 'a-line') },
  'modest-trousers': { domain: 'garment', subtypes: garmentTypes('wide-leg', 'tailored') },
  'modest-sets': { domain: 'garment', subtypes: garmentTypes('two-piece', 'co-ord') },
};

/** Which subtype domain a lane OWNS, or null. Distinct from "which subtype
 *  columns happen to be non-empty in this lane's encoded catalogue". */
export function domainForLane(laneSlug: string): SubtypeDomain | null {
  return LANE_SUBTYPES[laneSlug]?.domain ?? null;
}

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

/**
 * Which subtype VALUE a product carries within a given domain, or null.
 *
 * One dispatch table over the seven classifiers in lib/specialty.ts, so a
 * caller that knows the lane's domain can ask "is this row this subtype?"
 * without an encoded catalogue.
 *
 * WHAT THIS FIXED, 2026-09-02. app/[lane]/page.tsx built its CollectionPage
 * ItemList by scanning the ENCODED catalogue for matching row indices and then
 * calling decodeCard on each. decodeCard returns null for any row outside the
 * `embedCards: 48` window, and a subtype's matches are spread across the whole
 * interleaved lane rather than clustered at the front — so the rows were found
 * and then silently dropped. Measured on PRODUCTION, before any change:
 * /modest-hijabs?type=undercap emitted an ItemList of **0** items and
 * ?type=khimar-jilbab emitted **1**, on pages whose entire machine-readable
 * claim about their own contents is that list. Not a regression introduced by
 * the six new lanes — it is older than them, and it would have applied to all
 * sixteen new pages.
 */
export function subtypeValueOf(domain: SubtypeDomain, p: Product): string | null {
  switch (domain) {
    case 'layering': return layeringSubtype(p);
    case 'outerwear': return outerwearSubtype(p);
    case 'hijab': return hijabSubtype(p);
    case 'swim': return swimSubtype(p);
    case 'active': return activeSubtype(p);
    case 'dress': return dressSubtype(p);
    case 'garment': return garmentSubtype(p);
  }
}
