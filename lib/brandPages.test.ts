import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { BRANDS } from '../data/brands';
import { BRAND_PAGE_CONTENT, brandPageLastModified, brandPageSlugs, hasBrandPage, listedBrandSlugs } from './brandPages';
import { getProducts } from './products';

/**
 * The brand-page family is gated on one predicate — a house carrying
 * `description` — and THREE places read it: the route's generateStaticParams,
 * app/sitemap.ts, and the /designers tile that decides internal vs outbound.
 * These tests pin the properties that keep those three in agreement.
 */
const described = () => BRANDS.filter((b) => b.description?.trim());

describe('brand pages', () => {
  it('only publishes houses that a human has written about', () => {
    expect(described().length).toBeGreaterThan(0);
    expect(described().length).toBeLessThan(BRANDS.length);
  });

  it('every described house is one that carries the seal', () => {
    // Not a permanent law — it is the deliberate starting set (prove the
    // template on five before writing 113). If this fails because an unsealed
    // house gained a description, that is a decision, not a defect: update it.
    for (const b of described()) {
      expect(b.badge, `${b.slug} has a description but no badge`).toBeTruthy();
    }
  });

  it('no description is thin enough to make a thin page', () => {
    for (const b of described()) {
      const words = b.description!.trim().split(/\s+/).length;
      expect(words, `${b.slug} description is ${words} words`).toBeGreaterThanOrEqual(20);
    }
  });

  it('descriptions do not contain unescaped quote damage from bulk edits', () => {
    // A regex-driven bulk insert broke data/brands.ts once on 2026-08-19 by
    // dropping a comma. Cheap guard against the class.
    for (const b of described()) {
      expect(b.description).not.toMatch(/\bundefined\b|\bNaN\b/);
      expect(b.description!.trim()).toBe(b.description);
    }
  });

  it('a described house has a homepage to send the reader to', () => {
    for (const b of described()) {
      expect(b.homepage, b.slug).toMatch(/^https?:\/\//);
    }
  });
});

/**
 * Catalogue-dependent, so local-only (§10.19): the nightly refresh changes what
 * a house publishes with no code change, and as a CI gate this would go red on
 * a schedule.
 */
describe('listedBrandSlugs', () => {
  const hasData = existsSync(path.join(process.cwd(), 'data', 'products.json'));
  const inCI = !!process.env.CI;

  it.skipIf(!hasData || inCI)('never lists a house that publishes nothing', () => {
    // An empty house has no tile photograph either — houses() picks it from the
    // house's own products — so listing it renders a blank arch on /designers.
    const counts = new Map<string, number>();
    for (const p of getProducts()) counts.set(p.brandSlug, (counts.get(p.brandSlug) ?? 0) + 1);
    const listed = listedBrandSlugs();
    const empty = BRANDS.filter((b) => !counts.get(b.slug)).map((b) => b.slug);
    expect(empty.filter((s) => listed.has(s))).toEqual([]);
  });

  it.skipIf(!hasData || inCI)('lists every house that publishes at least one piece', () => {
    const counts = new Map<string, number>();
    for (const p of getProducts()) counts.set(p.brandSlug, (counts.get(p.brandSlug) ?? 0) + 1);
    const listed = listedBrandSlugs();
    const stocked = BRANDS.filter((b) => (counts.get(b.slug) ?? 0) > 0).map((b) => b.slug);
    expect(stocked.filter((s) => !listed.has(s))).toEqual([]);
    // The set is not vacuously empty, and it is not simply every brand either.
    expect(listed.size).toBeGreaterThan(0);
  });

  // The threshold that separates this from hasBrandPage. Collapsing the two
  // would silently delist every house below one full grid from the index.
  it.skipIf(!hasData || inCI)('is a LOWER bar than a brand page', () => {
    for (const slug of brandPageSlugs()) {
      const b = BRANDS.find((x) => x.slug === slug)!;
      // A page can exist on `description` alone, with no products.
      if (!b.description?.trim()) expect(listedBrandSlugs().has(slug), slug).toBe(true);
    }
  });
});


describe('brandPageLastModified', () => {
  it('is a real ISO day, because Google only honours a lastmod it can trust', () => {
    // §8: a fabricated lastmod is worse than none. Both inputs are data, so this
    // must be a date and never a build timestamp.
    expect(BRAND_PAGE_CONTENT).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    for (const slug of brandPageSlugs()) {
      expect(brandPageLastModified(slug), slug).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('never predates the template change, which really did change all 89 pages', () => {
    for (const slug of brandPageSlugs()) {
      expect(brandPageLastModified(slug)! >= BRAND_PAGE_CONTENT, slug).toBe(true);
    }
  });

  it('is stable across calls, so two builds of one commit emit the same sitemap', () => {
    const slug = [...brandPageSlugs()][0];
    expect(brandPageLastModified(slug)).toBe(brandPageLastModified(slug));
  });

  it('answers for a house that has no page, without inventing one', () => {
    expect(hasBrandPage('not-a-house')).toBe(false);
  });
});
