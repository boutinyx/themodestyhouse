import { describe, it, expect } from 'vitest';
import { subtypesForLane, sitemapSubtypesForLane, subtypeCanonical, subtypeSeo, resolveSubtype } from './laneSubtypes';
import { SEO_COPY } from './seoCopy';
import { LANES } from './lanes';

describe('subtype canonicals', () => {
  it('consolidates /modest-sets?type=co-ord into the lane and keeps it out of the sitemap', () => {
    const coord = resolveSubtype('modest-sets', 'co-ord');
    expect(coord).not.toBeNull();
    expect(subtypeCanonical('modest-sets', coord!)).toBe('/modest-sets');
    expect(sitemapSubtypesForLane('modest-sets').map((s) => s.type)).not.toContain('co-ord');
  });

  it('gives every other subtype its own canonical', () => {
    const twoPiece = resolveSubtype('modest-sets', 'two-piece')!;
    expect(subtypeCanonical('modest-sets', twoPiece)).toBe('/modest-sets?type=two-piece');
  });
});

describe('subtype SEO copy', () => {
  it('uses the written copy in SEO_COPY when one exists', () => {
    const blouse = resolveSubtype('modest-tops', 'blouse')!;
    expect(subtypeSeo('modest-tops', blouse, 'intro')).toEqual(SEO_COPY['/modest-tops?type=blouse']);
  });

  // Every real subtype has written copy since 2026-10-13, so the template is
  // exercised with a subtype that has none.
  it('falls back to the template for a subtype with no written copy', () => {
    const fake = { type: 'no-such-subtype', label: 'Test Pieces' };
    expect(subtypeSeo('modest-abayas', fake, 'intro').title).toBe('Modest Test Pieces');
  });

  // The template copies the PARENT lane's intro into the description, which is
  // how /modest-hijabs?type=prayer-set ended up describing chiffon hijabs.
  it('has written copy for every subtype, so none falls back to the template', () => {
    const missing = LANES.flatMap((l) => subtypesForLane(l.slug).map((s) => `/${l.slug}?type=${s.type}`))
      .filter((k) => !SEO_COPY[k]);
    expect(missing).toEqual([]);
  });

  // A `/lane?type=x` key that matches no real subtype is copy nobody will ever see.
  it('has no SEO_COPY subtype key that points at a missing subtype', () => {
    const real = new Set(LANES.flatMap((l) => subtypesForLane(l.slug).map((s) => `/${l.slug}?type=${s.type}`)));
    const orphans = Object.keys(SEO_COPY).filter((k) => k.includes('?type=') && !real.has(k));
    expect(orphans).toEqual([]);
  });
});
