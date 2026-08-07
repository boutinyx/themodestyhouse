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

/** FNV-1a. Any stable hash would do; the point is that a house's picture is
 *  decided by its slug and not by feed order, so it does not change under it. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function imagesByBrand(): { pool: Record<string, string[]>; override: Record<string, string> } {
  const pool: Record<string, string[]> = {};
  const override: Record<string, string> = {};
  for (const p of getProducts()) {
    if (!p.image) continue;
    (pool[p.brandSlug] ??= []).push(p.image);
    const handle = HERO_OVERRIDE[p.brandSlug];
    if (handle && p.url.endsWith(`/products/${handle}`)) override[p.brandSlug] = p.image;
  }
  return { pool, override };
}

/**
 * Every house, with a picture.
 *
 * `variant` picks a DIFFERENT product per house. The site used to show each
 * house's first product everywhere it appeared — the homepage rail and the
 * designers grid were always the same photograph, on catalogues with a median
 * of 111 products to choose from. Give each surface its own variant and they
 * stop echoing each other.
 *
 * The choice is deterministic — seeded on the slug — so a house's picture is
 * stable across builds and across a refresh. It is not random: a picture that
 * changed under the reader would make the page feel broken, and it would differ
 * between the server render and the client.
 */
export function houses(variant = 0): House[] {
  const { pool, override } = imagesByBrand();
  return BRANDS.map((b) => {
    const list = pool[b.slug] ?? [];
    // Seeded per variant rather than offset by a stride: an additive stride
    // collides whenever a house's product count divides it, and `sistrs` has
    // exactly 37 products, so `+37` landed straight back on the same picture.
    const picked = list.length ? list[hash(`${b.slug}:${variant}`) % list.length] : undefined;
    // The hand-picked hero is an explicit editorial choice, so it outranks the
    // variant everywhere.
    return { ...b, image: override[b.slug] ?? picked };
  });
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
