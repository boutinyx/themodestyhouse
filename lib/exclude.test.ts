import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Product } from '@/lib/types';

// Guard: the published catalogue must never contain excluded items (men's wear,
// fragrance/non-apparel, or explicitly-listed IDs). If this fails after a rebuild,
// something leaked — add a pattern or ID to data/exclusions.json and rebuild.
describe('published catalogue excludes men\'s + non-apparel', () => {
  const root = process.cwd();
  const products = JSON.parse(
    readFileSync(path.join(root, 'data', 'products.json'), 'utf8'),
  ) as Product[];
  const excl = JSON.parse(
    readFileSync(path.join(root, 'data', 'exclusions.json'), 'utf8'),
  ) as { patterns?: string[]; urlPatterns?: string[]; ids?: string[]; brands?: string[] };

  const titleRes = (excl.patterns || []).map((s) => new RegExp(s, 'i'));
  const urlRes = (excl.urlPatterns || []).map((s) => new RegExp(s, 'i'));
  const excludedIds = new Set(excl.ids || []);
  const excludedBrands = new Set(excl.brands || []);

  it('has no product matching an exclusion pattern, ID, or brand', () => {
    const leaked = products.filter(
      (p) =>
        excludedBrands.has(p.brandSlug) ||
        excludedIds.has(p.id) ||
        titleRes.some((re) => re.test(p.title || '')) ||
        urlRes.some((re) => re.test((p as Product & { url?: string }).url || '')),
    );
    expect(
      leaked.map((p) => `${p.brandName} :: ${p.title}`),
    ).toEqual([]);
  });
});
