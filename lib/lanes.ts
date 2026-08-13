import type { Product } from '@/lib/types';
import { isSwim, isActivewear, isLayering, isJilbab, isOuterwear } from '@/lib/specialty';

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
    match: (p) => p.garment === 'hijab' || isJilbab(p),
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
