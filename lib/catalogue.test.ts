import { describe, it, expect } from 'vitest';
import products from '@/data/products.json';
import type { Product } from '@/lib/types';

/**
 * Data invariants for the committed catalogue.
 *
 * Motivation: an accidental `npm run build:data` once rewrote data/products.json
 * (24k lines) inside an unrelated commit, and every existing test stayed green.
 * lib/nonApparel.test.ts's catalogue check is `it.skipIf(!hasRaw)`, so it never
 * runs in CI at all. These invariants run against the COMMITTED file and would
 * have caught it.
 *
 * The image-host assertion doubles as a guard on the CSP `img-src` allowlist in
 * next.config.ts: if a new CDN ever appears in the catalogue, this fails rather
 * than the images silently breaking on the day the CSP is flipped to enforcing.
 */

const rows = products as unknown as Product[];

// Keep in sync with the img-src directive in next.config.ts.
// WooCommerce brands serve images from their own domain (or Jetpack's Photon
// CDN, i0.wp.com) rather than a shared Shopify CDN, so each one needs adding
// here AND to img-src in next.config.ts. Keep the two lists in step.
const ALLOWED_IMAGE_HOSTS = new Set([
  'cdn.shopify.com',
  'lafemmecollectie.nl',
  'kimodesty.com',
  'chador.nl',
  'i0.wp.com',
]);

// Deliberately a floor, not an exact count — the catalogue grows on every
// refresh. It exists to catch a truncation (an empty or half-written file),
// not to pin the number.
const MIN_ROWS = 5000;

describe('data/products.json invariants', () => {
  it('is a non-trivially-sized array', () => {
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBeGreaterThanOrEqual(MIN_ROWS);
  });

  it('has unique ids', () => {
    const ids = new Set(rows.map((r) => r.id));
    expect(ids.size).toBe(rows.length);
  });

  it('has every required field populated on every row', () => {
    const bad = rows.filter(
      (r) =>
        !r.id ||
        !r.title ||
        !r.url ||
        !r.image ||
        !r.brandSlug ||
        !r.brandName ||
        typeof r.price !== 'number' ||
        !(r.price > 0),
    );
    expect(bad.slice(0, 5)).toEqual([]);
    expect(bad).toHaveLength(0);
  });

  it('serves every image from a host allowlisted in the CSP img-src', () => {
    const hosts = new Map<string, number>();
    for (const r of rows) {
      let host: string;
      try {
        host = new URL(r.image).host;
      } catch {
        host = `INVALID_URL:${r.image}`;
      }
      hosts.set(host, (hosts.get(host) ?? 0) + 1);
    }
    const disallowed = [...hosts.keys()].filter(
      (h) => !ALLOWED_IMAGE_HOSTS.has(h),
    );
    expect(
      disallowed,
      `New image host(s) found. Add them to img-src in next.config.ts AND to ` +
        `ALLOWED_IMAGE_HOSTS here, or the images will break when the CSP is enforced.`,
    ).toEqual([]);
  });

  it('has an https url for every product', () => {
    const bad = rows.filter((r) => !/^https:\/\//.test(r.url));
    expect(bad.map((r) => r.url).slice(0, 5)).toEqual([]);
  });
});
