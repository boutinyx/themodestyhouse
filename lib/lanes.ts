import type { Product } from '@/lib/types';
import {
  isSwim, isActivewear, isLayering, isJilbab, isOuterwear, isKhimarAbaya, isUndercap, isSpecialty,
  layeringSubtype, outerwearSubtype, LAYERING_SUBTYPE_LABELS, OUTERWEAR_SUBTYPE_LABELS,
  isPrayer,
} from '@/lib/specialty';

// The three nav-facing lane slugs the single isOuterwear() family now splits
// across — see lib/specialty.ts's isOuterwear doc comment for why the
// classifier itself still models ONE family of five subtypes rather than
// three separate ones. Named here once so currentCategoryLabel below and any
// future consumer don't re-type the list.
const OUTERWEAR_FAMILY_SLUGS = ['blazers-vests', 'cardigans-sweaters', 'jackets-coats'] as const;

export type LaneKind = 'category' | 'community' | 'occasion' | 'season';

export interface Lane {
  slug: string;
  title: string;
  nav: string; // short label
  intro: string;
  kind: LaneKind;
  match: (p: Product) => boolean;
  // Swim/activewear lanes: the ONLY place specialty items show, so
  // productsForLane must not strip specialty items out of them.
  specialty?: boolean;
}

export const LANES: Lane[] = [
  // — garment categories (the Directory dropdown) —
  {
    slug: 'modest-dresses',
    title: 'Modest Dresses',
    nav: 'Dresses',
    intro: 'Long-sleeve, high-neck and maxi dresses — styled for every occasion.',
    kind: 'category',
    match: (p) => p.garment === 'dress',
  },
  {
    slug: 'modest-abayas',
    title: 'Abayas',
    nav: 'Abayas',
    intro: 'Open, closed, kimono and butterfly abayas — from plain-sharp to embellished-flowing.',
    kind: 'category',
    match: (p) => p.garment === 'abaya',
  },
  {
    slug: 'modest-hijabs',
    title: 'Hijabs & Scarves',
    nav: 'Hijabs',
    intro: 'Chiffon, jersey, satin and crinkle hijabs, shawls and underscarves.',
    kind: 'category',
    // Jilbab-titled products (fashion abayas AND prayer sets, garment field
    // varies) route here too, per Tina's 2026-08-12 call — see isJilbab().
    // Abaya-length prayer khimaars (isKhimarAbaya) and undercaps (isUndercap)
    // route here too, per Tina's 2026-08-15 evening call — she wants them
    // grouped with jilbabs as one "khimars and jilbabs" concept rather than
    // sitting in Layering Basics, where they'd briefly landed that same
    // morning. `specialty: true` because isJilbab()/isKhimarAbaya() are
    // folded into isSpecialty(), which productsForLane would otherwise use
    // to strip these back out — same mechanism modest-swimwear/modest-
    // activewear/layering-basics use to be the one lane specialty items ARE
    // allowed to appear on.
    // `&& !isLayering(p)` stays: prayer wear generally (garment-agnostic
    // PRAYER_RE, not just khimars/undercaps) still belongs to Layering
    // Basics — some jilbab/khimar titles ALSO say "prayer" (prayer-set
    // dresses are commonly listed as both), so without this guard they'd
    // show on both lanes at once. isOuterwear() already excludes isLayering()
    // the same way, for the same reason.
    // isPrayer added 2026-08-26 — Tina: "put prayer sets under hijabs",
    // confirmed as moving the products, not just the menu link. It is a
    // separate route-in because most prayer wear is NOT a jilbab/khimar/
    // undercap by title: of the 184 published prayer rows, 113 are abayas and
    // 25 skirts. `&& !isLayering(p)` stays and is now a no-op for prayer
    // (isLayering returns false for prayer titles), but still does its
    // original job for everything else.
    match: (p) => (p.garment === 'hijab' || isJilbab(p) || isKhimarAbaya(p) || isUndercap(p) || isPrayer(p)) && !isLayering(p),
    specialty: true,
  },
  {
    slug: 'modest-skirts',
    title: 'Skirts',
    nav: 'Skirts',
    intro: 'Maxi, pleated and A-line skirts with full coverage.',
    kind: 'category',
    match: (p) => p.garment === 'skirt',
  },
  {
    slug: 'modest-tops',
    title: 'Tops',
    nav: 'Tops',
    intro: 'Tunics, blouses, shirts and layering tops.',
    kind: 'category',
    // isOuterwear() items (blazers/vests/cardigans/sweaters/coats) moved out
    // to their own lanes 2026-08-13, split three ways 2026-08-21 — see the
    // OUTERWEAR_FAMILY_SLUGS lanes below. Same exclusion shape isActivewear()
    // already uses against isSwim()/isLayering().
    match: (p) => p.garment === 'top' && !isOuterwear(p),
  },
  {
    slug: 'modest-trousers',
    title: 'Trousers',
    nav: 'Trousers',
    intro: 'Wide-leg, tailored and relaxed trousers.',
    kind: 'category',
    match: (p) => p.garment === 'trousers',
  },
  {
    slug: 'modest-sets',
    title: 'Co-ord Sets',
    nav: 'Sets',
    intro: 'Matching two-piece sets and co-ords, styled to go.',
    kind: 'category',
    match: (p) => p.garment === 'set',
  },
  {
    slug: 'modest-swimwear',
    title: 'Modest Swimwear',
    nav: 'Swim',
    intro: 'Full-coverage swimsuits and burkinis for the beach and pool.',
    kind: 'category',
    match: (p) => isSwim(p),
    specialty: true,
  },
  {
    slug: 'modest-activewear',
    title: 'Modest Activewear',
    nav: 'Activewear',
    intro: 'Sports dresses, leggings and covered athleisure for training and everyday movement.',
    kind: 'category',
    match: (p) => isActivewear(p),
    specialty: true,
  },
  {
    slug: 'layering-basics',
    title: 'Layering Basics',
    nav: 'Layering',
    intro: 'Base layers, neck covers and inner tops — coverage essentials worn under everything else.',
    kind: 'category',
    match: (p) => isLayering(p),
    specialty: true,
  },
  // The single 'outerwear' lane was replaced with these three 2026-08-21 —
  // Tina, comparing H&M's category names: "i want outerwear gone and i want
  // you to add those new ones," confirmed via clarifying question as H&M's
  // literal split (Blazers & Vests / Cardigans & Sweaters / Jackets & Coats)
  // rather than a simpler 2-way grouping. All three match off the SAME
  // isOuterwear()/outerwearSubtype() classifier (lib/specialty.ts) — only
  // which subtypes route to which lane changed, not the underlying
  // classification. "Sweaters" here means garment:'top' items whose title
  // says "sweater" — see that file's isOuterwear comment for the same
  // false-positive guard "Sweater Dress"/"Sweater Skirt" needed as
  // "Vest"/"Coat" already had.
  {
    slug: 'blazers-vests',
    title: 'Blazers & Vests',
    nav: 'Blazers & Vests',
    intro: 'Tailored blazers and vests to layer over everything else.',
    kind: 'category',
    match: (p) => isOuterwear(p) && (outerwearSubtype(p) === 'blazer' || outerwearSubtype(p) === 'vest'),
    specialty: true,
  },
  {
    slug: 'cardigans-sweaters',
    title: 'Cardigans & Sweaters',
    nav: 'Cardigans & Sweaters',
    intro: 'Cardigans and sweaters for easy, everyday layering.',
    kind: 'category',
    match: (p) => isOuterwear(p) && (outerwearSubtype(p) === 'cardigan' || outerwearSubtype(p) === 'sweater'),
    specialty: true,
  },
  {
    slug: 'jackets-coats',
    title: 'Jackets & Coats',
    nav: 'Jackets & Coats',
    intro: 'Coats and jackets for cooler days.',
    kind: 'category',
    match: (p) => isOuterwear(p) && outerwearSubtype(p) === 'coat',
    specialty: true,
  },

  // — other discovery lanes —
  {
    slug: 'modest-wedding-guest',
    title: 'Modest Wedding Guest',
    nav: 'Wedding',
    intro: 'Covered, elegant looks for weddings and formal occasions.',
    kind: 'occasion',
    match: (p) => p.occasion.includes('wedding') || p.occasion.includes('formal'),
  },
  {
    slug: 'modest-summer-outfits',
    title: 'Modest Summer Outfits',
    nav: 'Summer',
    intro: 'Lightweight, breathable modest pieces for warm days.',
    kind: 'season',
    match: (p) => p.season.includes('summer'),
  },
];

export const CATEGORY_LANES = LANES.filter((l) => l.kind === 'category');

/**
 * Human label for whichever CATEGORY_LANES entry a product currently
 * appears on — the SAME rule lib/products.ts::productsForLane uses, not
 * just the first lane.match() to return true: a non-specialty lane
 * (e.g. Tops) additionally requires !isSpecialty(p), because
 * productsForLane strips specialty items back out of every lane except the
 * one that declares `specialty: true`. Skipping that second check would
 * mislabel a layering/outerwear/activewear/swim/jilbab item that happens to
 * ALSO structurally match a plain garment lane (e.g. a neck-cover top
 * matches modest-tops's `garment === 'top'` just as much as it matches
 * layering-basics) as the wrong, non-specialty lane — caught by
 * lib/lanes.test.ts before this shipped.
 *
 * Used by the staff review tools to show "what category is this in right
 * now" without re-deriving the classification logic, so it can never drift
 * from what a shopper actually sees. Returns 'Uncategorized' only for a
 * garment: 'other' row, which normalizeProduct already drops before
 * publish (CLAUDE.md Invariant 9) — unreachable on any published product,
 * kept as a safe fallback rather than a non-null assertion.
 */
export function currentCategoryLabel(p: Product): string {
  const lane = CATEGORY_LANES.find((l) => l.match(p) && (l.specialty || !isSpecialty(p)));
  if (!lane) return 'Uncategorized';
  if ((OUTERWEAR_FAMILY_SLUGS as readonly string[]).includes(lane.slug)) {
    const sub = outerwearSubtype(p);
    return sub ? `${lane.title} — ${OUTERWEAR_SUBTYPE_LABELS[sub]}` : lane.title;
  }
  if (lane.slug === 'layering-basics') {
    const sub = layeringSubtype(p);
    return sub ? `${lane.title} — ${LAYERING_SUBTYPE_LABELS[sub]}` : lane.title;
  }
  return lane.title;
}
