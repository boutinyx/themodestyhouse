import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { CREATORS, MOMENTS, LATEST, creatorsEnabled, creatorBySlug, collectionBySlug } from './creators';

// The creators below are fictional. The section must stay off the real domain
// until real creators replace them.
describe('/creators gate', () => {
  it('is off on the production domain', () => {
    expect(creatorsEnabled('themodestyhouse.com')).toBe(false);
    expect(creatorsEnabled('www.themodestyhouse.com')).toBe(false);
    expect(creatorsEnabled('THEMODESTYHOUSE.COM:443')).toBe(false);
  });
  it('is on for staging and local', () => {
    expect(creatorsEnabled('themodestyhouse-staging-production.up.railway.app')).toBe(true);
    expect(creatorsEnabled('localhost:3000')).toBe(true);
  });
});

describe('creator data', () => {
  // Known to raw, not "published today": a nightly delisting must shorten a
  // collection, not fail the build (§10.54). This catches typos and ids that
  // never existed.
  const raw = JSON.parse(readFileSync(path.join(process.cwd(), 'data', 'raw-products.json'), 'utf8'));
  const known = new Set((Array.isArray(raw) ? raw : raw.products).map((r: { id: string }) => r.id));

  it('every pick is a product the catalogue has seen', () => {
    const bad = CREATORS.flatMap((c) => c.collections.flatMap((k) => k.picks.map((p) => p.id))).filter((id) => !known.has(id));
    expect(bad).toEqual([]);
  });
  it('slugs are unique and every moment / latest entry resolves', () => {
    expect(new Set(CREATORS.map((c) => c.slug)).size).toBe(CREATORS.length);
    const all = CREATORS.flatMap((c) => c.collections.map((k) => k.slug));
    expect(new Set(all).size).toBe(all.length);
    for (const m of MOMENTS) for (const k of m.collections) expect(all).toContain(k);
    for (const [c, k] of LATEST) expect(collectionBySlug(creatorBySlug(c)!, k)).toBeTruthy();
  });
  it('no creator photo is served from public/', () => {
    for (const c of CREATORS) expect(c.photo.startsWith('/mockups/creator-shops/')).toBe(true);
  });
});
