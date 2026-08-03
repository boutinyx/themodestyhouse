import type { Product } from '@/lib/types';

export type LaneKind = 'category' | 'community' | 'occasion' | 'season';

export interface Lane {
  slug: string;
  title: string;
  nav: string; // short label
  intro: string;
  kind: LaneKind;
  match: (p: Product) => boolean;
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
    match: (p) => p.garment === 'hijab',
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
    match: (p) => p.garment === 'top',
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
    match: (p) => p.garment === 'swim',
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
