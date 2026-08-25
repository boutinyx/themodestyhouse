import { BRANDS } from '@/data/brands';
import type { Brand } from '@/lib/types';

/**
 * Where the houses are — the data behind the homepage's Designer Discovery band.
 *
 * `Brand.city` is the only geography the catalogue has, and it mixes granularity
 * badly: 'London' and 'UK' and 'United Kingdom' are all in there, as are bare
 * 'Europe' and 'USA'. lib/aboutStats.ts already flags this. So every distinct
 * value is mapped by hand below rather than parsed, because there is no rule
 * that turns 'Clichy' into Europe without a lookup.
 *
 * TWO HONESTY NOTES, both surfaced in the UI rather than hidden here:
 *  - `approx: true` marks a pin plotted at a country/continent centroid because
 *    the record names no city. That is 69 of 113 brands. The dots are texture,
 *    not survey data, and the band says so.
 *  - AFRICA IS EMPTY. Not an oversight and not a bug — no house in the index is
 *    based there. `REGION_ORDER` therefore lists only regions that have houses;
 *    rendering a row reading "Africa 0" would be a statement about the catalogue
 *    that Tina has not made.
 */

export type RegionName = 'Europe' | 'North America' | 'Middle East' | 'Asia' | 'Oceania' | 'Africa';

/** [lon, lat, region, isApproximate] for every distinct `city` in data/brands.ts. */
const PLACE: Record<string, [number, number, RegionName, boolean?]> = {
  // — North America —
  'New York': [-74.0, 40.7, 'North America'],
  'Los Angeles': [-118.2, 34.1, 'North America'],
  'Dearborn, Michigan': [-83.2, 42.3, 'North America'],
  'Mississauga, Ontario': [-79.6, 43.6, 'North America'],
  'USA': [-98.6, 39.8, 'North America', true],
  'United States': [-98.6, 39.8, 'North America', true],
  'Canada': [-96.8, 56.1, 'North America', true],
  // — Europe —
  'London': [-0.13, 51.5, 'Europe'],
  'Birmingham, United Kingdom': [-1.9, 52.5, 'Europe'],
  'UK': [-2.0, 54.0, 'Europe', true],
  'United Kingdom': [-2.0, 54.0, 'Europe', true],
  'Amsterdam': [4.9, 52.4, 'Europe'],
  'Arnhem': [5.9, 52.0, 'Europe'],
  'Nijmegen': [5.9, 51.8, 'Europe'],
  'Rotterdam': [4.5, 51.9, 'Europe'],
  'Netherlands': [5.3, 52.1, 'Europe', true],
  'Antwerp': [4.4, 51.2, 'Europe'],
  'Belgium': [4.5, 50.5, 'Europe', true],
  'Paris': [2.35, 48.9, 'Europe'],
  'Clichy': [2.3, 48.9, 'Europe'],
  'France': [2.2, 46.6, 'Europe', true],
  'Bochum': [7.2, 51.5, 'Europe'],
  'Germany': [10.4, 51.2, 'Europe', true],
  'Sweden': [15.0, 60.1, 'Europe', true],
  'Norway': [8.5, 60.5, 'Europe', true],
  'Holbæk': [11.7, 55.7, 'Europe'],
  'Europe': [10.0, 50.0, 'Europe', true],
  // — Middle East. Turkey sits here rather than Europe because both Turkish
  //   houses are Istanbul/Anatolia-based and read as Gulf-adjacent in this
  //   index; it is a judgement call, not a fact, and is the one line here
  //   worth revisiting if it ever looks wrong.
  'Dubai': [55.3, 25.2, 'Middle East'],
  'Doha': [51.5, 25.3, 'Middle East'],
  'Riyadh': [46.7, 24.7, 'Middle East'],
  'Kuwait City': [47.98, 29.4, 'Middle East'],
  'Istanbul': [29.0, 41.0, 'Middle East'],
  'Turkey': [35.2, 39.0, 'Middle East', true],
  // — Asia —
  'Jakarta': [106.8, -6.2, 'Asia'],
  'Malaysia': [101.98, 4.2, 'Asia', true],
  'Singapore': [103.8, 1.35, 'Asia'],
  'India': [78.96, 20.6, 'Asia', true],
  // — Oceania —
  'Sydney': [151.2, -33.9, 'Oceania'],
  'Australia': [133.8, -25.3, 'Oceania', true],
};

/** Every `city` value with no entry above. MUST be empty — see the test. A brand
 *  added with an unmapped city would otherwise silently vanish from the band,
 *  which is the §10.33 failure mode (a field accepted and never used). */
export function unmappedCities(brands: Brand[] = BRANDS): string[] {
  return [...new Set(brands.map((b) => b.city).filter((c) => c && !PLACE[c]))] as string[];
}

export function regionOf(city: string): RegionName | null {
  return PLACE[city]?.[2] ?? null;
}

export type RegionSummary = { name: RegionName; count: number };

/** Regions that actually have houses, most first. */
export function regionsWithCounts(brands: Brand[] = BRANDS): RegionSummary[] {
  const counts = new Map<RegionName, number>();
  for (const b of brands) {
    const r = regionOf(b.city);
    if (r) counts.set(r, (counts.get(r) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function brandsInRegion(region: RegionName, brands: Brand[] = BRANDS): Brand[] {
  return brands
    .filter((b) => regionOf(b.city) === region)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/* ---------- map projection ---------- */

/** Must match scripts/gen-world-dots.mjs, or the pins land in the wrong places.
 *  Changing either without the other is silent — the map still renders. */
export const MAP = { W: 1000, H: 386, LAT_TOP: 83, LAT_BOTTOM: -56 } as const;

export const lonToX = (lon: number) => ((lon + 180) / 360) * MAP.W;
export const latToY = (lat: number) => ((MAP.LAT_TOP - lat) / (MAP.LAT_TOP - MAP.LAT_BOTTOM)) * MAP.H;

export type Pin = { city: string; region: RegionName; n: number; x: number; y: number; approx: boolean };

/** One pin per distinct `city` string, sized by how many houses share it.
 *  Note this means Britain is FOUR overlapping pins (UK / United Kingdom /
 *  London / Birmingham) — see the module docstring. Merging them would need a
 *  place-normalisation pass over data/brands.ts, which is a data fix, not a
 *  rendering one. */
export function pins(brands: Brand[] = BRANDS): Pin[] {
  const byCity = new Map<string, number>();
  for (const b of brands) if (PLACE[b.city]) byCity.set(b.city, (byCity.get(b.city) ?? 0) + 1);
  return [...byCity.entries()]
    .map(([city, n]) => {
      const [lon, lat, region, approx] = PLACE[city];
      return { city, region, n, x: lonToX(lon), y: latToY(lat), approx: !!approx };
    })
    .sort((a, b) => b.n - a.n);
}

/** How many houses are plotted at a centroid rather than a real city. */
export function approxBrandCount(brands: Brand[] = BRANDS): number {
  return brands.filter((b) => PLACE[b.city]?.[3]).length;
}
