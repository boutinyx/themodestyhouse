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

  it('falls back to the template for a subtype with no written copy', () => {
    const open = resolveSubtype('modest-abayas', 'open')!;
    expect(subtypeSeo('modest-abayas', open, 'intro').title).toBe('Modest Open Abayas');
  });

  // A `/lane?type=x` key that matches no real subtype is copy nobody will ever see.
  it('has no SEO_COPY subtype key that points at a missing subtype', () => {
    const real = new Set(LANES.flatMap((l) => subtypesForLane(l.slug).map((s) => `/${l.slug}?type=${s.type}`)));
    const orphans = Object.keys(SEO_COPY).filter((k) => k.includes('?type=') && !real.has(k));
    expect(orphans).toEqual([]);
  });
});
