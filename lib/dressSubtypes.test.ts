import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { DRESS_SUBTYPE_LABELS } from './specialty';
import type { DressSubtype, Product } from '@/lib/types';

/**
 * Integrity of data/dress-subtypes.json — Tina's hand-curated Everyday /
 * Occasion / Slip assignments for the Modest Dresses lane.
 *
 * This file is the ONLY record of those judgements. There is no classifier
 * underneath it to regenerate them from (see lib/specialty.ts::dressSubtype),
 * so a typo'd key is a silently lost decision: the product simply never
 * acquires a subtype and quietly falls into the unclassified majority. Nothing
 * else in the pipeline would notice.
 *
 * The catalogue-dependent half is SKIPPED IN CI, deliberately — §10.19. The
 * nightly refresh delists products on its own schedule, so an id that is valid
 * today can vanish tomorrow through no code change at all, and left as a CI
 * gate this would go red over ordinary data movement. Locally, where a stale
 * or mistyped entry is worth knowing about, it runs.
 */
describe('data/dress-subtypes.json', () => {
  const p = path.join(process.cwd(), 'data', 'dress-subtypes.json');
  const map = JSON.parse(readFileSync(p, 'utf8')) as Record<string, string>;
  const VALUES = new Set(Object.keys(DRESS_SUBTYPE_LABELS));

  it('is non-empty and uses only real DressSubtype values', () => {
    expect(Object.keys(map).length).toBeGreaterThan(0);
    const bad = Object.entries(map).filter(([, v]) => !VALUES.has(v));
    expect(bad).toEqual([]);
  });

  it('uses well-formed product ids (brandSlug:shopifyId — Invariant 1)', () => {
    const bad = Object.keys(map).filter((k) => !/^[a-z0-9-]+:[A-Za-z0-9-]+$/.test(k));
    expect(bad).toEqual([]);
  });

  it('offers a label for every subtype value in use', () => {
    for (const v of new Set(Object.values(map))) {
      expect(DRESS_SUBTYPE_LABELS[v as DressSubtype]).toBeTruthy();
    }
  });

  const catPath = path.join(process.cwd(), 'data', 'products.json');
  const inCI = !!process.env.CI;
  const hasCatalogue = existsSync(catPath);

  /**
   * "Unknown id", not "not currently published" — corrected 2026-08-28.
   *
   * The check used to require every curated id to be in products.json, which
   * conflates a typo (the thing it exists to catch, and unrecoverable) with a
   * product that is merely not published TODAY (routine, and reversible). Three
   * ordinary mechanisms unpublish a real dress without invalidating Tina's
   * subtype judgement about it: the brand delists it, it sells out, or its
   * smallest in-stock size reaches XL and lib/sizeAvailability.ts drops it. All
   * three come back on a restock, and the subtype has to still be here when
   * they do — pruning on absence would quietly discard hand-curated decisions
   * every time a brand ran low, which is the same "a default is what you write
   * when there is no value" error as §10.13.
   *
   * So the id is checked against RAW, which keeps every row it has ever seen
   * (Invariant 12), and against the curation decision. An id that raw has never
   * heard of is a typo; an id deliberately CUT is a decision the subtype should
   * not outlive.
   */
  const rawPath = path.join(process.cwd(), 'data', 'raw-products.json');
  const decPath = path.join(process.cwd(), 'data', 'decisions.json');
  const hasRaw = existsSync(rawPath) && existsSync(decPath);

  it.skipIf(inCI || !hasCatalogue || !hasRaw)('every curated id is a real, uncut dress', () => {
    const products = JSON.parse(readFileSync(catPath, 'utf8')) as Product[];
    const raw = JSON.parse(readFileSync(rawPath, 'utf8')) as Product[];
    const decisions = JSON.parse(readFileSync(decPath, 'utf8')) as Record<string, string>;
    const rawIds = new Set(raw.map((x) => x.id));
    const byId = new Map(products.map((x) => [x.id, x]));

    // A typo, or an id from a brand that has been removed entirely.
    const unknown = Object.keys(map).filter((id) => !rawIds.has(id));
    // Deliberately cut: the subtype is dead data and should be pruned.
    const cut = Object.keys(map).filter((id) => decisions[id] === 'cut');
    // Still published, but not actually a dress — a real misfiling.
    const notDresses = Object.keys(map)
      .map((id) => byId.get(id))
      .filter((x): x is Product => !!x && x.garment !== 'dress')
      .map((x) => `${x.id} (${x.garment}) ${x.title}`);
    expect({ unknown, cut, notDresses }).toEqual({ unknown: [], cut: [], notDresses: [] });
  });
});
