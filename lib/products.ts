import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import type { Product, Vibe } from '@/lib/types';
import { LANES } from '@/lib/lanes';
import { brandVibe } from '@/lib/vibes';
import { isSpecialty } from '@/lib/specialty';
import { getCutIds } from '@/lib/liveCuts';
import { getLiveGarmentOverrides } from '@/lib/liveGarmentOverrides';
import { getLiveLaneOverrides } from '@/lib/liveLaneOverrides';

// Filtered/overridden here, once, so every consumer of getProducts() —
// every lane, the directory, home rails, favourites — picks up a live
// /staff edit (cut, garment move, or lane move) immediately with no
// separate wiring. See docs/log/2026-08-12-inline-staff-editing.md and
// docs/log/2026-08-12-lane-overrides.md: this is the runtime layer;
// data/decisions.json, data/garment-overrides.json and
// data/lane-overrides.json (the git-tracked sources of truth) only get
// updated later, by scripts/merge-live-edits.mjs.
export function getProducts(): Product[] {
  const f = path.join(process.cwd(), 'data', 'products.json');
  if (!existsSync(f)) return [];
  const all = JSON.parse(readFileSync(f, 'utf8')) as Product[];
  const cutIds = getCutIds();
  const garmentOverrides = getLiveGarmentOverrides();
  const laneOverrides = getLiveLaneOverrides();
  const hasGarmentOverrides = Object.keys(garmentOverrides).length > 0;
  const hasLaneOverrides = Object.keys(laneOverrides).length > 0;
  const kept = cutIds.size === 0 ? all : all.filter((p) => !cutIds.has(p.id));
  if (!hasGarmentOverrides && !hasLaneOverrides) return kept;
  return kept.map((p) => {
    const g = garmentOverrides[p.id];
    const l = laneOverrides[p.id];
    if (!g && !l) return p;
    return {
      ...p,
      ...(g ? { garment: g.garment } : {}),
      ...(l ? {
        forcedLane: l.lane,
        ...(l.lane === 'layering-basics' ? { forcedLayeringSubtype: l.subtype as Product['forcedLayeringSubtype'] } : {}),
        ...(l.lane === 'outerwear' ? { forcedOuterwearSubtype: l.subtype as Product['forcedOuterwearSubtype'] } : {}),
      } : {}),
    };
  });
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
