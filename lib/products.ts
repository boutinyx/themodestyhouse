import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import type { Product, Vibe } from '@/lib/types';
import { LANES } from '@/lib/lanes';
import { brandVibe } from '@/lib/vibes';
import { isSpecialty } from '@/lib/specialty';

export function getProducts(): Product[] {
  const f = path.join(process.cwd(), 'data', 'products.json');
  if (!existsSync(f)) return [];
  return JSON.parse(readFileSync(f, 'utf8')) as Product[];
}

// Products for the mixed "everything" browse (directory, home rails). Hijabs are
// a valid category but shouldn't intermix with clothing — they live on their own
// Hijabs & Scarves lane. Swim/activewear are also held back here — they only show
// on their own lanes (see isSpecialty).
export function browseProducts(): Product[] {
  return getProducts().filter((p) => p.garment !== 'hijab' && !isSpecialty(p));
}

export function productsForLane(slug: string): Product[] {
  const lane = LANES.find((l) => l.slug === slug);
  if (!lane) return [];
  const base = getProducts().filter(lane.match);
  // Everyday lanes (dresses, trousers, tops…) never show swim/activewear; only
  // the dedicated swim/activewear lanes do.
  return lane.specialty ? base : base.filter((p) => !isSpecialty(p));
}

export function productsForVibe(vibe: Vibe): Product[] {
  return browseProducts().filter((p) => brandVibe[p.brandSlug] === vibe);
}
