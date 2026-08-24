import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import type { Product, Vibe } from '@/lib/types';
import type { Edit } from '@/lib/edits';
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

/**
 * Every published product from one house, in catalogue order.
 *
 * Uses getProducts(), NOT browseProducts(), and that is the correct reading of
 * Invariant 5 rather than an exception to it. That invariant governs MIXED
 * grids: hijabs and swim/activewear are held out of "everything" views because
 * they have their own lanes. A house page is not a mixed grid — it is one
 * house's own range, and hiding part of it would misrepresent the house.
 * Concretely: Veiled has 274 hijabs of 782 pieces and Haute Hijab is a hijab
 * house outright, so browseProducts() would render a Veiled page missing a
 * third of its catalogue and a Haute Hijab page that was nearly empty.
 */
export function productsForBrand(slug: string): Product[] {
  return getProducts().filter((p) => p.brandSlug === slug);
}

/**
 * Pieces in an edit (/edits/[slug] — see lib/edits.ts).
 *
 * Lives here rather than beside the edit definitions so that lib/edits.ts stays
 * free of any runtime import from this module: Footer imports the edit list,
 * and this file reaches `node:fs` (Invariant 10).
 *
 * Reads `getProducts()` — everything published — rather than `browseProducts()`.
 * That is a deliberate, per-edit exception to Invariant 5, gated on the edit's
 * own `includeHijabs` flag, which defaults to off; when it is off the hijab
 * exclusion is re-applied here so the default matches the invariant. See the
 * flag's own comment in lib/edits.ts for why an edit is the case that rule did
 * not anticipate.
 */
export function productsForEdit(edit: Edit): Product[] {
  return getProducts().filter(
    (p) => p.inStock !== false && edit.match(p) && (edit.includeHijabs ? true : p.garment !== 'hijab'),
  );
}

export function productsForVibe(vibe: Vibe): Product[] {
  return browseProducts().filter((p) => brandVibe[p.brandSlug] === vibe);
}
