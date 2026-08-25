import { describe, it, expect } from 'vitest';
import { BRANDS } from '../data/brands';
import type { Brand } from '@/lib/types';
import {
  unmappedCities, regionOf, regionsWithCounts, brandsInRegion,
  pins, approxBrandCount, lonToX, latToY, MAP,
} from './brandRegions';

const fake = (city: string, slug = city): Brand => ({
  slug, name: slug, homepage: 'https://x.test', feedUrl: 'https://x.test/products.json',
  community: 'hijabi', currency: 'USD', category: 'Modest', city, vibe: 'elegant',
} as Brand);

describe('brandRegions', () => {
  // THE load-bearing test. A brand added with a city nobody mapped would
  // silently drop out of the band — no error, no zero, just a smaller number.
  it('maps every city in the real catalogue', () => {
    expect(unmappedCities()).toEqual([]);
  });

  it('counts every brand exactly once across the regions', () => {
    const total = regionsWithCounts().reduce((s, r) => s + r.count, 0);
    expect(total).toBe(BRANDS.length);
  });

  it('omits regions with no houses rather than showing a zero', () => {
    const names = regionsWithCounts().map((r) => r.name);
    expect(names).not.toContain('Africa');
    expect(names.every((n) => regionsWithCounts().find((r) => r.name === n)!.count > 0)).toBe(true);
  });

  it('orders regions by count, largest first', () => {
    const counts = regionsWithCounts().map((r) => r.count);
    expect([...counts].sort((a, b) => b - a)).toEqual(counts);
  });

  it('treats the four British spellings as one region', () => {
    for (const c of ['UK', 'United Kingdom', 'London', 'Birmingham, United Kingdom']) {
      expect(regionOf(c)).toBe('Europe');
    }
  });

  it('splits North America from Europe on the two USA spellings', () => {
    expect(regionOf('USA')).toBe('North America');
    expect(regionOf('United States')).toBe('North America');
  });

  it('returns null for an unknown city rather than guessing a region', () => {
    expect(regionOf('Atlantis')).toBeNull();
    expect(unmappedCities([fake('Atlantis')])).toEqual(['Atlantis']);
  });

  it('lists a region\'s brands alphabetically and completely', () => {
    const oceania = brandsInRegion('Oceania');
    expect(oceania.length).toBe(regionsWithCounts().find((r) => r.name === 'Oceania')!.count);
    expect(oceania.map((b) => b.name)).toEqual([...oceania.map((b) => b.name)].sort());
  });

  it('gives one pin per distinct city, sized by how many share it', () => {
    const p = pins([fake('London', 'a'), fake('London', 'b'), fake('Dubai', 'c')]);
    expect(p.map((x) => [x.city, x.n])).toEqual([['London', 2], ['Dubai', 1]]);
  });

  it('flags centroid pins as approximate', () => {
    expect(pins([fake('UK')])[0].approx).toBe(true);
    expect(pins([fake('London')])[0].approx).toBe(false);
    expect(approxBrandCount()).toBeGreaterThan(0);
  });

  // The projection has to agree with scripts/gen-world-dots.mjs. If someone
  // changes the clip band in one place, these fail rather than the pins
  // quietly sliding off their continents.
  it('projects the corners of the clip band to the corners of the viewBox', () => {
    expect(lonToX(-180)).toBeCloseTo(0);
    expect(lonToX(180)).toBeCloseTo(MAP.W);
    expect(latToY(MAP.LAT_TOP)).toBeCloseTo(0);
    expect(latToY(MAP.LAT_BOTTOM)).toBeCloseTo(MAP.H);
  });

  it('puts known cities on the correct side of the map', () => {
    const nyc = lonToX(-74), dxb = lonToX(55.3);
    expect(nyc).toBeLessThan(MAP.W / 2);      // western hemisphere
    expect(dxb).toBeGreaterThan(MAP.W / 2);   // eastern
    expect(latToY(51.5)).toBeLessThan(latToY(-33.9));  // London above Sydney
  });
});
