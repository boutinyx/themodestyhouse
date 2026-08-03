import type { Product } from '@/lib/types';

export interface Lane {
  slug: string;
  title: string;
  nav: string; // short label
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
    slug: 'modest-abayas',
    title: 'Abayas',
    nav: 'Abaya',
    intro: 'Open, closed, kimono and butterfly abayas — from plain-sharp to embellished-flowing.',
    match: (p) => p.garment === 'abaya',
  },
  {
    slug: 'modest-swimwear',
    title: 'Modest Swimwear',
    nav: 'Swim',
    intro: 'Full-coverage swimsuits and burkinis for the beach and pool.',
    match: (p) => p.garment === 'swim',
  },
  {
    slug: 'modest-wedding-guest',
    title: 'Modest Wedding Guest',
    nav: 'Wedding',
    intro: 'Covered, elegant looks for weddings and formal occasions.',
    match: (p) => p.occasion.includes('wedding') || p.occasion.includes('formal'),
  },
  {
    slug: 'modest-summer-outfits',
    title: 'Modest Summer Outfits',
    nav: 'Summer',
    intro: 'Lightweight, breathable modest pieces for warm days.',
    match: (p) => p.season.includes('summer'),
  },
  {
    slug: 'modest-church-outfits',
    title: 'Modest Church Outfits',
    nav: 'Church',
    intro: 'Elegant, covered dresses and skirts perfect for church and Sunday best.',
    match: (p) => p.community === 'general' && (p.garment === 'dress' || p.garment === 'skirt'),
  },
];
