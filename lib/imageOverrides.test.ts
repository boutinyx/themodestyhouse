import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import type { Product } from '@/lib/types';

/**
 * Integrity of data/image-overrides.json — Tina's hand-picked card photograph
 * for a product whose own images give `pickImage()` nothing to choose between.
 *
 * WHY IT EXISTS AT PUBLISH TIME. `pickImage()` (lib/normalize.ts) runs at
 * SCRAPE time and raw rows are frozen (CLAUDE.md §8), so a photograph chosen by
 * hand and written onto the raw row would be silently reverted by the next
 * `npm run refresh`. scripts/build-data.mjs applies this map instead, in the
 * same pass that applies garment / lane / dress-subtype overrides, so it
 * survives every refresh — the same reasoning those three already rest on.
 *
 * WHAT IT CANNOT CHECK, and why that matters. Raw rows do not retain the
 * product's image ARRAY (only the one `image` pickImage settled on), so nothing
 * here can prove an override URL belongs to the product it is keyed to. That is
 * the §10.12 failure exactly — a card illustrated with a photo of a DIFFERENT
 * garment is invisible from the grid. The check available offline is that the
 * override comes from the same storefront's CDN path as the row's own image,
 * which is asserted below. The stronger check is manual and must be done when
 * an entry is ADDED: fetch `<homepage>/products/<handle>.json` and confirm the
 * URL appears in that product's own `images` array.
 */
describe('data/image-overrides.json', () => {
  const p = path.join(process.cwd(), 'data', 'image-overrides.json');
  const map = existsSync(p) ? (JSON.parse(readFileSync(p, 'utf8')) as Record<string, string>) : {};

  it('uses well-formed product ids (brandSlug:shopifyId — Invariant 1)', () => {
    const bad = Object.keys(map).filter((k) => !/^[a-z0-9-]+:[A-Za-z0-9-]+$/.test(k));
    expect(bad).toEqual([]);
  });

  it('points only at https Shopify CDN images', () => {
    for (const [id, url] of Object.entries(map)) {
      expect(url, id).toMatch(/^https:\/\/cdn\.shopify\.com\/s\/files\//);
    }
  });

  const rawPath = path.join(process.cwd(), 'data', 'raw-products.json');
  const catPath = path.join(process.cwd(), 'data', 'products.json');
  const inCI = !!process.env.CI;
  const hasData = existsSync(rawPath) && existsSync(catPath);

  it.skipIf(inCI || !hasData)('overrides a real row, with an image from the SAME storefront', () => {
    const raw = JSON.parse(readFileSync(rawPath, 'utf8')) as Product[];
    const byId = new Map(raw.map((x) => [x.id, x]));
    // /s/files/1/<a>/<b>/ — the shop's own CDN namespace.
    const shop = (u: string) => u.match(/^https:\/\/cdn\.shopify\.com\/s\/files\/\d+\/\d+\/\d+\//)?.[0];
    for (const [id, url] of Object.entries(map)) {
      const row = byId.get(id);
      expect(row, `${id} is not in raw-products.json`).toBeTruthy();
      expect(shop(url), `${id} override is not on the same storefront as its own photo`).toBe(
        shop(row!.image),
      );
    }
  });

  it.skipIf(inCI || !hasData)('actually reaches the published catalogue', () => {
    const published = JSON.parse(readFileSync(catPath, 'utf8')) as Product[];
    const byId = new Map(published.map((x) => [x.id, x]));
    for (const [id, url] of Object.entries(map)) {
      const row = byId.get(id);
      // An override for a product that is cut or out of stock is dead weight,
      // not a failure — it is only wrong if the row publishes and ignores it.
      if (!row) continue;
      expect(row.image, `${id} publishes but ignores its override`).toBe(url);
    }
  });
});
