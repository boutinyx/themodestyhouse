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
  // Aab's scored pick was a black abaya, then a black crossover abaya. Asked for
  // colour: this is the most saturated full-length look in its 442 candidates,
  // measured on the centre of each photograph rather than guessed from the
  // colour word in the title.
  aab: 'capri-dress-butter-yellow',
  // Owner-chosen, 2026-08-07. These outrank the scoring on purpose: two of them
  // are SKIRTS, which the ranking demotes below full-length looks — a sensible
  // default that is simply wrong for these three houses.
  inayah: 'maariyyah-falling-petal-dress-original',
  veiled: 'textured-maxi-skirt-stone',
  'summer-evenings': 'orchid-chiffon-low-waisted-set',
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

/**
 * How EDITORIAL a garment photograph tends to be, lower is better.
 *
 * A house's card is a portrait of the house, so it wants a full-length look. The
 * card used to be a pure hash over every product, which is stable but blind: on
 * Dignitii it landed on a headless crop of tracksuit bottoms and trainers. Full-
 * length garments are shot head-to-toe on a model; trousers and tops are shot
 * cropped; a hijab is a head-and-shoulders shot; swim is both a crop and rarely
 * the face a brand leads with.
 */
const GARMENT_RANK: Record<string, number> = {
  abaya: 0,
  dress: 0,
  set: 1,
  skirt: 2,
  top: 3,
  trousers: 4,
  hijab: 5,
  swim: 6,
};

/** A .png in these feeds is almost always a flat cutout or packshot; a
 *  .jpg/.webp is a photograph. Same signal pickImage uses (lib/normalize.ts). */
const isCutout = (src: string) => /\.png(\?|$)/i.test(src);

/**
 * Layering pieces — slips, underdresses, inner tops. `garment` calls these
 * dresses, and correctly: they ARE dresses. But they are worn UNDER something,
 * so they are photographed plainly and make a poor portrait of a house. Aab's
 * card was "Full Slip Rose" for exactly this reason.
 *
 * Word boundaries throughout: an unanchored `slip` also matches "slipper" and
 * "slip-on", which is the §10.5/§10.10 mistake in a new place.
 */
const LAYERING = /\b(slip|underdress|under[- ]?dress|underskirt|inner|layering|layer|cami|camisole|bodysuit|shapewear)\b/i;

function score(garment: string, image: string, title: string): number {
  return (
    (GARMENT_RANK[garment] ?? 4) * 4 +
    (LAYERING.test(title) ? 2 : 0) +
    (isCutout(image) ? 1 : 0)
  );
}

function imagesByBrand(): { pool: Record<string, string[]>; override: Record<string, string> } {
  const scored: Record<string, { image: string; score: number }[]> = {};
  const override: Record<string, string> = {};
  for (const p of getProducts()) {
    if (!p.image) continue;
    (scored[p.brandSlug] ??= []).push({ image: p.image, score: score(p.garment, p.image, p.title) });
    const handle = HERO_OVERRIDE[p.brandSlug];
    if (handle && p.url.endsWith(`/products/${handle}`)) override[p.brandSlug] = p.image;
  }
  // Keep only the best-scoring tier per house, then let the existing hash choose
  // within it — so the pick stays deterministic and still varies per surface,
  // but chooses among the brand's most editorial photographs rather than all of
  // them. Brands that only shoot one kind of thing are unaffected: their whole
  // pool shares a score and the tier is the pool.
  const pool: Record<string, string[]> = {};
  for (const [slug, list] of Object.entries(scored)) {
    const best = Math.min(...list.map((x) => x.score));
    pool[slug] = list.filter((x) => x.score === best).map((x) => x.image);
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
