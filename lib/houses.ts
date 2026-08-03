import { BRANDS } from '@/data/brands';
import { getProducts } from '@/lib/products';
import { CATEGORY_LANES } from '@/lib/lanes';
import type { Brand } from '@/lib/types';

export type House = Brand & { image?: string };

function firstImageByBrand(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const p of getProducts()) {
    if (!map[p.brandSlug]) map[p.brandSlug] = p.image;
  }
  return map;
}

export function houses(): House[] {
  const img = firstImageByBrand();
  return BRANDS.map((b) => ({ ...b, image: img[b.slug] }));
}

// "Newly verified" rail — verified/editor's-pick houses first, then the rest.
export function newlyVerified(): House[] {
  return houses().sort((a, b) => (b.badge ? 1 : 0) - (a.badge ? 1 : 0));
}

export function trust() {
  const cities = new Set(BRANDS.map((b) => b.city)).size;
  return {
    houses: BRANDS.length,
    cities,
    categories: CATEGORY_LANES.length,
  };
}

export function categoryCards() {
  const prods = getProducts();
  return CATEGORY_LANES.map((l) => ({
    slug: l.slug,
    label: l.title,
    image: prods.find(l.match)?.image,
    count: prods.filter(l.match).length,
  }));
}
