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

  it.skipIf(inCI || !hasCatalogue)('every curated id is a published dress', () => {
    const products = JSON.parse(readFileSync(catPath, 'utf8')) as Product[];
    const byId = new Map(products.map((x) => [x.id, x]));
    const missing = Object.keys(map).filter((id) => !byId.has(id));
    const notDresses = Object.keys(map)
      .map((id) => byId.get(id))
      .filter((x): x is Product => !!x && x.garment !== 'dress')
      .map((x) => `${x.id} (${x.garment}) ${x.title}`);
    expect({ missing, notDresses }).toEqual({ missing: [], notDresses: [] });
  });
});
