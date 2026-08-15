import type { Product } from '@/lib/types';
import {
  isSwim, isActivewear, isLayering, isJilbab, isOuterwear, isSpecialty,
  layeringSubtype, outerwearSubtype, LAYERING_SUBTYPE_LABELS, OUTERWEAR_SUBTYPE_LABELS,
} from '@/lib/specialty';

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
    // `specialty: true` because isJilbab() is folded into isSpecialty(),
    // which productsForLane would otherwise use to strip these back out —
    // same mechanism modest-swimwear/modest-activewear/layering-basics use
    // to be the one lane specialty items ARE allowed to appear on.
    // `&& !isLayering(p)` added 2026-08-15: undercaps, prayer khimaars and
    // prayer wear generally now belong to Layering Basics instead (Tina's
    // call) — some of those titles ALSO say "jilbab" (prayer-set dresses
    // are commonly listed as both), so without this guard they'd show on
    // both lanes at once. isOuterwear() already excludes isLayering() the
    // same way, for the same reason.
    match: (p) => (p.garment === 'hijab' || isJilbab(p)) && !isLayering(p),
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
    // isOuterwear() items (blazers/vests/cardigans/coats) moved to their own
    // lane 2026-08-13 — see the 'outerwear' entry below. Same exclusion
    // shape isActivewear() already uses against isSwim()/isLayering().
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
  {
    slug: 'outerwear',
    title: 'Outerwear',
    nav: 'Outerwear',
    intro: 'Blazers, vests, cardigans and coats to layer over everything else.',
    kind: 'category',
    match: (p) => isOuterwear(p),
    specialty: true,
  },

  // — other discovery lanes —
  {
    slug: 'hijabi-outfits',
    title: 'Hijabi Outfits',
    nav: 'Hijabi',
    intro: 'Hijabs, abayas and modest pieces from hijabi-owned brands.',
    kind: 'community',
    match: (p) => p.community === 'hijabi',
  },
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
  if (lane.slug === 'outerwear') {
    const sub = outerwearSubtype(p);
    return sub ? `${lane.title} — ${OUTERWEAR_SUBTYPE_LABELS[sub]}` : lane.title;
  }
  if (lane.slug === 'layering-basics') {
    const sub = layeringSubtype(p);
    return sub ? `${lane.title} — ${LAYERING_SUBTYPE_LABELS[sub]}` : lane.title;
  }
  return lane.title;
}
