import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import type { Product, Vibe } from '@/lib/types';
import { LANES } from '@/lib/lanes';
import { brandVibe } from '@/lib/vibes';
import { isSpecialty } from '@/lib/specialty';
import { getCutIds } from '@/lib/liveCuts';

// Filtered here, once, so every consumer of getProducts() — every lane, the
// directory, home rails, favourites — picks up a live /staff/curate cut
// immediately with no separate wiring. See docs/log/2026-08-12-staff-curate.md:
// this is the runtime layer; data/decisions.json (the git-tracked source of
// truth) only gets updated later, by scripts/merge-live-cuts.mjs.
export function getProducts(): Product[] {
  const f = path.join(process.cwd(), 'data', 'products.json');
  if (!existsSync(f)) return [];
  const all = JSON.parse(readFileSync(f, 'utf8')) as Product[];
  const cutIds = getCutIds();
  if (cutIds.size === 0) return all;
  return all.filter((p) => !cutIds.has(p.id));
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
