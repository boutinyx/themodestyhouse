import { readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import type { Garment } from '@/lib/types';
import { BRANDS } from '@/data/brands';
import { getCutIds } from '@/lib/liveCuts';

/**
 * Products we know and would show but can't right now, because they're sold
 * out (or only XL+ is left). Written by scripts/build-data.mjs as
 * data/unavailable-products.json — see the "Sold-out sidecar" block there for
 * exactly what goes in and what never does.
 *
 * Read ONLY by the product page, so a shared link to a sold-out piece shows a
 * "sold out right now" page instead of a 404. Never imported by a grid: these
 * rows are deliberately absent from products.json (Invariant 16, and the
 * catalogue only lists what can be bought).
 */
export type UnavailableProduct = {
  id: string;
  brandSlug: string;
  brandName: string;
  brandHomepage: string | null;
  title: string;
  image: string;
  url: string;
  garment: Garment;
  price: number;
  currency: string;
};

type Row = [string, string, string, Garment, number, string];
let cache: { mtime: number; rows: Record<string, Row> } | null = null;

function rows(): Record<string, Row> {
  const f = path.join(process.cwd(), 'data', 'unavailable-products.json');
  if (!existsSync(f)) return {};
  const mtime = statSync(f).mtimeMs;
  if (cache && cache.mtime === mtime) return cache.rows;
  cache = { mtime, rows: JSON.parse(readFileSync(f, 'utf8')) as Record<string, Row> };
  return cache.rows;
}

export function getUnavailableProduct(id: string): UnavailableProduct | undefined {
  const r = rows()[id];
  if (!r) return undefined;
  if (getCutIds().has(id)) return undefined;        // cut from /staff since the last publish
  const brandSlug = id.slice(0, id.indexOf(':'));
  const brand = BRANDS.find((b) => b.slug === brandSlug);
  if (!brand) return undefined;                     // brand removed from the directory
  const [title, image, url, garment, price, currency] = r;
  return { id, brandSlug, brandName: brand.name, brandHomepage: brand.homepage ?? null, title, image, url, garment, price, currency };
}
