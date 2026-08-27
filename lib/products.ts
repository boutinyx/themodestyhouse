import { readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import type { Product, Vibe } from '@/lib/types';
import type { Edit } from '@/lib/edits';
import { LANES } from '@/lib/lanes';
import { groupColourVariants } from '@/lib/colorVariants';
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
/**
 * Cache of the last fully-derived catalogue, keyed on the mtimes of every file
 * that can change it.
 *
 * getProducts() re-read and re-parsed 11.2 MB on EVERY call — 14 ms read +
 * 19 ms parse on an M-series Mac, more on Railway's shared CPU — and the
 * homepage calls it more than once per render. Since the index/card split,
 * /api/catalogue/cards calls it per request too.
 *
 * Keyed on MTIMES rather than a simple "already loaded" flag, and this is the
 * load-bearing detail: /staff/curate writes .live-cuts.json (and the two
 * override stores) inside the RUNNING production container, and Tina's edits
 * must still take effect immediately — that is the whole design of
 * docs/log/2026-08-12-staff-curate.md. A boolean would silently freeze them.
 *
 * If a FOURTH live-override store is ever added, it must be added to
 * cacheKey() in the same commit, or edits through it will appear to do nothing.
 */
let cache: { key: string; value: Product[] } | null = null;

function cacheKey(): string {
  const stamp = (p: string) => {
    try { return String(statSync(p).mtimeMs); } catch { return '0'; }
  };
  const d = (name: string) => path.join(process.cwd(), 'data', name);
  return [
    stamp(d('products.json')),
    // Verified against each module's own STORE_PATH, not assumed from the
    // naming pattern: lib/liveCuts.ts:31, lib/liveGarmentOverrides.ts:27,
    // lib/liveLaneOverrides.ts:26.
    stamp(d('.live-cuts.json')),
    stamp(d('.live-garment-overrides.json')),
    stamp(d('.live-lane-overrides.json')),
  ].join(':');
}

export function getProducts(): Product[] {
  const key = cacheKey();
  if (cache && cache.key === key) return cache.value;
  const f = path.join(process.cwd(), 'data', 'products.json');
  if (!existsSync(f)) return [];
  const all = JSON.parse(readFileSync(f, 'utf8')) as Product[];
  const cutIds = getCutIds();
  const garmentOverrides = getLiveGarmentOverrides();
  const laneOverrides = getLiveLaneOverrides();
  const hasGarmentOverrides = Object.keys(garmentOverrides).length > 0;
  const hasLaneOverrides = Object.keys(laneOverrides).length > 0;
  const kept = cutIds.size === 0 ? all : all.filter((p) => !cutIds.has(p.id));
  if (!hasGarmentOverrides && !hasLaneOverrides) {
    cache = { key, value: kept };
    return kept;
  }
  const overridden = kept.map((p) => {
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
  cache = { key, value: overridden };
  return overridden;
}

// Products for the mixed "everything" browse (directory, home rails). Hijabs are
// a valid category but shouldn't intermix with clothing — they live on their own
// Hijabs & Scarves lane. Swim/activewear are also held back here — they only show
// on their own lanes (see isSpecialty).
export function browseProducts(): Product[] {
  return groupColourVariants(getProducts().filter((p) => p.garment !== 'hijab' && !isSpecialty(p)));
}

export function productsForLane(slug: string): Product[] {
  const lane = LANES.find((l) => l.slug === slug);
  if (!lane) return [];
  const base = getProducts().filter(lane.match);
  // Everyday lanes (dresses, trousers, tops…) never show swim/activewear; only
  // the dedicated swim/activewear lanes do.
  const visible = lane.specialty ? base : base.filter((p) => !isSpecialty(p));
  // Colour runs collapse to one card LAST, after every other filter, so the
  // count a card advertises only ever counts siblings this surface is actually
  // showing. Grouping earlier would let a card say "+5 colours" when four of
  // them had been filtered off the lane. Same reasoning in the two accessors
  // either side of this one. See lib/colorVariants.ts.
  return groupColourVariants(visible);
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
  return groupColourVariants(getProducts().filter((p) => p.brandSlug === slug));
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
  const live = getProducts().filter((p) => p.inStock !== false);
  if (edit.productIds?.length) {
    // Hand-picked: return them in the ORDER given, which is the point of
    // picking. A Map lookup rather than `find` per id — an edit can be a few
    // hundred picks against a 20k-row catalogue.
    //
    // `includeHijabs` is deliberately NOT applied here. If someone explicitly
    // chose a hijab for this edit, that is the choice; the flag exists to
    // decide what an automatic `match` sweeps in, not to overrule a human.
    const byId = new Map(live.map((p) => [p.id, p]));
    return edit.productIds.map((id) => byId.get(id)).filter((p): p is Product => !!p);
  }
  return live.filter((p) => edit.match(p) && (edit.includeHijabs ? true : p.garment !== 'hijab'));
}

/** Picked ids that no longer resolve to a live product — for lib/edits.test.ts
 *  and for anyone debugging an edit that has quietly lost pieces. */
export function missingEditPicks(edit: Edit): string[] {
  if (!edit.productIds?.length) return [];
  const live = new Set(getProducts().filter((p) => p.inStock !== false).map((p) => p.id));
  return edit.productIds.filter((id) => !live.has(id));
}

export function productsForVibe(vibe: Vibe): Product[] {
  return browseProducts().filter((p) => brandVibe[p.brandSlug] === vibe);
}
