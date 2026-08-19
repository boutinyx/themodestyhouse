import { describe, it, expect } from 'vitest';
import { BRANDS } from '../data/brands';

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
