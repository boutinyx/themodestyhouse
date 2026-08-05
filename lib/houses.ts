import { BRANDS } from '@/data/brands';
import { getProducts } from '@/lib/products';
import { CATEGORY_LANES } from '@/lib/lanes';
import { isSpecialty } from '@/lib/specialty';
import type { Brand } from '@/lib/types';

export type House = Brand & { image?: string };

// Hand-picked hero product per brand (by product handle). Overrides the default
// "first product" image for the brand's card. The picked product's own image is
// used, so it still benefits from the model-photo preference in normalize.
const HERO_OVERRIDE: Record<string, string> = {
  nasiba: 'solace-versatile-shirt-charcoal',
};

function firstImageByBrand(): Record<string, string> {
  const first: Record<string, string> = {};
  const override: Record<string, string> = {};
  for (const p of getProducts()) {
    if (!first[p.brandSlug]) first[p.brandSlug] = p.image;
    const handle = HERO_OVERRIDE[p.brandSlug];
    if (handle && p.url.endsWith(`/products/${handle}`)) override[p.brandSlug] = p.image;
  }
  // Override wins where it resolved; otherwise fall back to the first product.
  return { ...first, ...override };
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
  return CATEGORY_LANES.map((l) => {
    // Non-specialty lanes hide swim/activewear (see productsForLane), so count/
    // image should reflect what's actually shown.
    const items = prods.filter((p) => l.match(p) && (l.specialty || !isSpecialty(p)));
    return {
      slug: l.slug,
      label: l.title,
      image: items.find((p) => p.image)?.image,
      count: items.length,
    };
  });
}
