import type { Product } from '@/lib/types';

export interface Lane {
  slug: string;
  title: string;
  nav: string; // short nav label
  intro: string;
  match: (p: Product) => boolean;
}

export const LANES: Lane[] = [
  {
    slug: 'modest-dresses',
    title: 'Modest Dresses',
    nav: 'Dresses',
    intro: 'Long-sleeve, high-neck and maxi dresses from modest brands — styled for every occasion.',
    match: (p) => p.garment === 'dress',
  },
  {
    slug: 'hijabi-outfits',
    title: 'Hijabi Outfits',
    nav: 'Hijab',
    intro: 'Hijabs, abayas and modest pieces from hijabi-owned brands.',
    match: (p) => p.community === 'hijabi',
  },
  {
    slug: 'modest-swimwear',
    title: 'Modest Swimwear',
    nav: 'Swim',
    intro: 'Full-coverage swimsuits and burkinis for the beach and pool.',
    match: (p) => p.garment === 'swim',
  },
  {
    slug: 'modest-church-outfits',
    title: 'Modest Church Outfits',
    nav: 'Church',
    intro: 'Elegant, covered dresses and skirts perfect for church and Sunday best.',
    match: (p) => p.community === 'general' && (p.garment === 'dress' || p.garment === 'skirt'),
  },
];
