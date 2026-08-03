import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import type { Product, Vibe } from '@/lib/types';
import { LANES } from '@/lib/lanes';
import { brandVibe } from '@/lib/vibes';

export function getProducts(): Product[] {
  const f = path.join(process.cwd(), 'data', 'products.json');
  if (!existsSync(f)) return [];
  return JSON.parse(readFileSync(f, 'utf8')) as Product[];
}

export function productsForLane(slug: string): Product[] {
  const lane = LANES.find((l) => l.slug === slug);
  if (!lane) return [];
  return getProducts().filter(lane.match);
}

export function productsForVibe(vibe: Vibe): Product[] {
  return getProducts().filter((p) => brandVibe[p.brandSlug] === vibe);
}
