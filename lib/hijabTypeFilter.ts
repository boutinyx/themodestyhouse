import type { Product } from '@/lib/types';
import { isJilbab, isKhimarAbaya, isUndercap } from '@/lib/specialty';

/**
 * The Hijabs & Scarves lane's in-page "Type" filter (Brand/Sort's own
 * FilterDropdown, components/IndexPanel.tsx) — 14 fabric/style groups built
 * from the real modest-hijabs lane (5,146 products, measured 2026-08-15),
 * not guessed. Full taxonomy table, group-by-group counts, and the priority-
 * order rationale live in
 * docs/superpowers/specs/2026-08-15-hijab-type-filter-design.md.
 *
 * A 15th group, "Hijab Sets" (`\bsets?\b`), shipped originally and was
 * removed the same day — Tina: "hijab sets dont exsist they are just match
 * undercap and hijab get rid of that". Checked the real 252 items in it:
 * almost all plain jersey/modal/chiffon/bamboo hijabs sold as a matching
 * bundle ("Bamboo Jersey Hijab Set - Cedar", "Modal Hijab Set") or bare
 * bundles with no fabric named at all ("The Culture Starter Set",
 * "3-Piece Hijab Set"). Unlike every other group here, "set" describes how
 * an item is PACKAGED, not what it IS — it was stealing real fabric
 * classifications rather than adding one. Removed; those items now fall
 * through to their actual fabric group, or to null if none is named.
 *
 * Deliberately NOT named HijabSubtype/hijabSubtype()/HIJAB_SUBTYPE_LABELS —
 * lib/specialty.ts and lib/types.ts already export those, for a DIFFERENT,
 * independent concept: which structural sub-category a product is (plain
 * hijab / khimar-jilbab / undercap), added by a concurrent session the same
 * evening (commit 034a985) and reachable from the header nav flyout, not
 * this in-page dropdown. A jersey khimar has a real value in BOTH — see
 * lib/compactCatalogue.ts's hijabTypeFilters column, added alongside the
 * pre-existing hijabSubtypes one, not replacing it.
 *
 * `isHijabLaneItem` mirrors the modest-hijabs lane's own `match` in
 * lib/lanes.ts, MINUS its `&& !isLayering(p)` guard: that guard only matters
 * for LANE MEMBERSHIP (deciding whether a prayer-titled jilbab/khimar shows
 * on this lane at all, vs. Layering Basics), not for classifying an item
 * that a caller already knows is on the lane. In production this function is
 * only ever called on rows a page already fetched via
 * productsForLane('modest-hijabs') — which already applied that guard — so
 * omitting it here cannot misclassify anything actually rendered.
 */
function isHijabLaneItem(p: Product): boolean {
  return p.garment === 'hijab' || isJilbab(p) || isKhimarAbaya(p) || isUndercap(p);
}

export type HijabTypeFilter =
  | 'caps-underscarves'
  | 'khimar'
  | 'jilbab'
  | 'instant'
  | 'sport'
  | 'shawl'
  | 'printed'
  | 'crinkle'
  | 'jersey'
  | 'modal'
  | 'chiffon'
  | 'cotton'
  | 'satin'
  | 'silk-viscose';

export const HIJAB_TYPE_FILTER_LABELS: Record<HijabTypeFilter, string> = {
  'caps-underscarves': 'Caps & Underscarves',
  khimar: 'Khimars',
  jilbab: 'Jilbabs',
  instant: 'Instant Hijabs',
  sport: 'Sport Hijabs',
  shawl: 'Shawls & Pashminas',
  printed: 'Printed',
  crinkle: 'Crinkle',
  jersey: 'Jersey',
  modal: 'Modal',
  chiffon: 'Chiffon',
  cotton: 'Cotton & Bamboo',
  satin: 'Satin',
  'silk-viscose': 'Silk & Viscose',
};

// Priority order — most specific/functional groups first, generic fabric
// last, so a title matching more than one (e.g. "Liquid Jersey Instant
// Hijab") resolves to the narrower, more useful group. Same order as
// HIJAB_TYPE_FILTER_LABELS above, which is also the dropdown's display order.
const GROUPS: [HijabTypeFilter, RegExp][] = [
  ['caps-underscarves', /\bunderscarf|under.?cap|under.?scarf\b|\bbonnets?\b|\btube\b|\bninja\b|\bcaps?\b|\bturbans?\b|\bheadbands?\b/i],
  ['khimar', /\bkhimaa?rs?\b/i],
  ['jilbab', /\bjilbabs?\b/i],
  ['instant', /\binstant\b|\bone.?piece\b|\bno.?pin\b|\bready.?to.?wear\b|\bslip.?on\b/i],
  ['sport', /\bsports?\b|\bactive\b/i],
  ['shawl', /\bshawls?\b|\bpashmina\b/i],
  // \bprint(?:s|ed)?\b covers print/prints/printed — a first draft used
  // \bprints?\b alone and silently missed 134 real "Printed ..." titles,
  // caught and fixed before implementation (see the design doc's
  // Correction note).
  ['printed', /\bprint(?:s|ed)?\b|\bfloral\b|\bpolka\b|\banimal print\b|\bstripe[sd]?\b|\bplaid\b|\bcheck(?:ered)?\b/i],
  ['crinkle', /\bcrinkle[d]?\b/i],
  ['jersey', /\bjersey\b/i],
  ['modal', /\bmodal\b/i],
  ['chiffon', /\bchiffon\b/i],
  ['cotton', /\bcotton\b|\bbamboo\b/i],
  ['satin', /\bsatin\b/i],
  ['silk-viscose', /\bsilk\b|\bviscose\b|\brayon\b/i],
];

/** Returns null for anything not on the Hijabs & Scarves lane, and for the
 *  ~16.8% of real lane items with no fabric/style word in the title at all
 *  (plain color-named titles like "Riverwalk Blue Hijab", and fabric-less
 *  "set" bundle titles like "The Culture Starter Set") — both are expected,
 *  not errors; they're simply shown under the dropdown's default "All
 *  types" state, same as Brand's default. */
export function hijabTypeFilter(p: Product): HijabTypeFilter | null {
  if (!isHijabLaneItem(p)) return null;
  for (const [type, re] of GROUPS) {
    if (re.test(p.title)) return type;
  }
  return null;
}
