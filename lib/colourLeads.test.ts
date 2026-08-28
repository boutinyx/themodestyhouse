import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { splitColourSuffix } from './colorVariants';
import type { Product } from '@/lib/types';

/**
 * Integrity of data/colour-leads.json — Tina's choice of which colourway fronts
 * a collapsed colour group.
 *
 * Like data/dress-subtypes.json, this file is the ONLY record of those calls;
 * there is nothing underneath to regenerate them from. A typo'd id is a
 * silently lost decision — the group simply falls back to input order and shows
 * whatever colour sorted first, which looks exactly like a working card.
 *
 * The catalogue-dependent halves are SKIPPED IN CI, deliberately (§10.19 and
 * the same correction made to lib/dressSubtypes.test.ts on 2026-08-28). A
 * listed id can stop being published tonight through no code change at all —
 * the brand delists it, it sells out, or lib/sizeAvailability.ts drops it when
 * its smallest in-stock size reaches XL. All three are reversible, and the
 * preference has to still be here when the product comes back, so absence is
 * not evidence of a bad entry and must not be a build gate.
 */
describe('data/colour-leads.json', () => {
  const p = path.join(process.cwd(), 'data', 'colour-leads.json');
  const file = JSON.parse(readFileSync(p, 'utf8')) as {
    leads: Record<string, string>;
  };

  it('uses well-formed product ids (brandSlug:shopifyId — Invariant 1)', () => {
    const bad = Object.keys(file.leads).filter((k) => !/^[a-z0-9-]+:[A-Za-z0-9-]+$/.test(k));
    expect(bad).toEqual([]);
  });

  it('carries a human-readable title for every id', () => {
    const bare = Object.entries(file.leads).filter(([, v]) => !v || !v.trim());
    expect(bare).toEqual([]);
  });

  const catPath = path.join(process.cwd(), 'data', 'products.json');
  const skip = !!process.env.CI || !existsSync(catPath);

  it.skipIf(skip)('every listed id is one this catalogue has actually seen', () => {
    const rows = JSON.parse(readFileSync(catPath, 'utf8')) as Product[];
    const byId = new Map(rows.map((r) => [r.id, r]));
    // Absence is NOT a failure (see the note above) — only a title that
    // disagrees with the file would be, and an unknown id is worth surfacing
    // locally as a probable typo.
    const unknown = Object.keys(file.leads).filter((id) => !byId.has(id));
    expect(unknown).toEqual([]);
  });

  it.skipIf(skip)('every listed id is a title this module can actually split', () => {
    // A preference on a title with no colour suffix can never take effect:
    // splitColourSuffix returns null, the product is never grouped, and the
    // entry sits here looking applied while doing nothing.
    const rows = JSON.parse(readFileSync(catPath, 'utf8')) as Product[];
    const byId = new Map(rows.map((r) => [r.id, r]));
    const unsplittable = Object.keys(file.leads)
      .map((id) => byId.get(id))
      .filter((r): r is Product => !!r)
      .filter((r) => !splitColourSuffix(r.title))
      .map((r) => `${r.id} ${r.title}`);
    expect(unsplittable).toEqual([]);
  });

  it.skipIf(skip)('no two listed ids belong to the same colour group', () => {
    // Two preferences in one group is a contradiction. groupColourVariants
    // resolves it deterministically (earlier wins) rather than crashing, but
    // the file should not contain one.
    const rows = JSON.parse(readFileSync(catPath, 'utf8')) as Product[];
    const byId = new Map(rows.map((r) => [r.id, r]));
    const seen = new Map<string, string>();
    const clashes: string[] = [];
    for (const id of Object.keys(file.leads)) {
      const r = byId.get(id);
      if (!r) continue;
      const s = splitColourSuffix(r.title);
      if (!s) continue;
      const key = `${r.brandSlug} ${r.garment} ${s.base.toLowerCase()}`;
      const prev = seen.get(key);
      if (prev) clashes.push(`${prev} and ${id} both lead "${key}"`);
      else seen.set(key, id);
    }
    expect(clashes).toEqual([]);
  });
});
