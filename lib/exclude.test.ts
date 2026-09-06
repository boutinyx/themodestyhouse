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

// Editorial pins (`sizeFloorAllowIds`) exempt a product from the size floor so
// a link Tina has published cannot 404 when the last small sells. A pin is a
// bare string in a JSON file with no compiler behind it — §10.54's shape, where
// twenty hand-written ids silently stopped resolving after a brand moved
// domain and nothing anywhere said so. These assert the pin is well-formed and
// still points at something, so a typo or a renumbered brand fails loudly.
describe('editorial size-floor pins', () => {
  const root = process.cwd();
  const excl = JSON.parse(
    readFileSync(path.join(root, 'data', 'exclusions.json'), 'utf8'),
  ) as { sizeFloorAllowIds?: string[]; brands?: string[]; ids?: string[] };
  const pins = excl.sizeFloorAllowIds || [];
  const products = JSON.parse(
    readFileSync(path.join(root, 'data', 'products.json'), 'utf8'),
  ) as Product[];
  const published = new Set(products.map((p) => p.id));

  it('every pin is a well-formed `brandSlug:shopifyId` (Invariant 1)', () => {
    for (const id of pins) expect(id, `malformed pin: ${id}`).toMatch(/^[a-z0-9-]+:\d+$/);
  });

  it('no pin contradicts an exclusion — a pin must not resurrect a cut product', () => {
    const blockedBrands = new Set(excl.brands || []);
    const blockedIds = new Set(excl.ids || []);
    for (const id of pins) {
      expect(blockedIds.has(id), `${id} is pinned AND explicitly excluded`).toBe(false);
      expect(blockedBrands.has(id.split(':')[0]), `${id} is pinned but its brand is blocklisted`).toBe(false);
    }
  });

  // A pin exists to keep a product published; if it is not published the pin is
  // doing nothing and the link it protects is already broken. Skipped in CI for
  // the §10.19 reason: products.json is rewritten nightly by a bot, and a brand
  // genuinely delisting a pinned product is news for Tina, not a red build.
  it.skipIf(process.env.CI)('every pin is actually published', () => {
    const dead = pins.filter((id) => !published.has(id));
    expect(dead, `pinned but not published — the size floor is not why: ${dead.join(', ')}`).toEqual([]);
  });
});
