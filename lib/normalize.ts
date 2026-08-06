import type { Brand, Product } from '@/lib/types';
import { tagDiscovery } from '@/lib/tag';

export interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  product_type: string;
  tags: string[] | string;
  variants: { price: string; available: boolean }[];
  images: { src: string; width?: number; height?: number }[];
  url?: string; // full product URL when the source isn't Shopify (e.g. WooCommerce permalink)
}

// Drop men's & children's products — this is a women's directory.
const EXCLUDE = /\bmen'?s\b|menswear|\bmens\b|\bthobe\b|\bkurta\b|\bkids?\b|children|\bchild\b|\bboys\b|\bgirls\b|\bbaby\b|toddler|\bjunior\b|\binfant\b|newborn/i;

// Prefer a MODEL / lifestyle photo over a flat product shot. This is an EDITORIAL
// RULE: where a product has a real on-body photo, show it.
// Two signals, both needed because either alone is fooled:
//   1. Portrait aspect (h/w >= 1.2) — model shots are taller. But only trust it
//      when portrait is the DOMINANT format: a LONE portrait among squares is a
//      SIZE CHART, not a model (Mariam's: 25 size-chart picks -> 0 with this guard).
//   2. Photographic format — a .png is almost always a flat product CUTOUT /
//      packshot, a .jpg/.webp is a photograph. When the flat-lay is a portrait
//      PNG that sorts first (e.g. Nasiba), aspect ratio alone still picks the
//      cutout; preferring the first non-PNG portrait lands on the model shot.
function isCutout(src: string): boolean {
  return /\.png(\?|$)/i.test(src);
}
function pickImage(images: ShopifyProduct['images']): string | undefined {
  if (!images?.length) return undefined;
  const sized = images.filter((i) => i.width && i.height);
  if (sized.length < 2) return images[0].src;
  const portrait = sized.filter((i) => (i.height as number) / (i.width as number) >= 1.2);
  if (portrait.length >= 2 && portrait.length * 2 >= sized.length) {
    // Prefer a photographic (non-PNG) portrait — a model shot — over a flat cutout.
    const model = portrait.find((i) => !isCutout(i.src));
    return (model ?? portrait[0]).src;
  }
  return images[0].src;
}

/** Why normalization rejected a product the brand still lists. */
export type RejectReason = 'no-image' | 'excluded-title' | 'unclassified';

/**
 * As `normalizeProduct`, but reports WHY it rejected a row.
 *
 * The refresh pipeline needs this to tell two very different events apart: a
 * product the merchant deleted (`delistedAt` — ordinary churn) versus one the
 * merchant still sells that OUR filters dropped (`filteredAt` — possibly a
 * classifier regression). Merged into one bucket, a broken regex in lib/tag.ts
 * would be indistinguishable from brands clearing stock.
 */
export function normalizeProductDetailed(
  sp: ShopifyProduct,
  brand: Brand,
): { product: Product | null; reason?: RejectReason } {
  const image = pickImage(sp.images);
  if (!image) return { product: null, reason: 'no-image' };
  // Some feeds embed HTML in titles (e.g. LES: "LAURA JEANS <span>BLACK</span>").
  // Strip tags + collapse whitespace so it never shows on the site or fools the tagger.
  const title = String(sp.title || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  const tags = Array.isArray(sp.tags) ? sp.tags : String(sp.tags || '').split(',').map((t) => t.trim());
  const excl = [title, sp.product_type || '', ...tags].join(' ');
  if (EXCLUDE.test(excl)) return { product: null, reason: 'excluded-title' };
  const disc = tagDiscovery({ title, productType: sp.product_type || '', tags });
  if (disc.garment === 'other') return { product: null, reason: 'unclassified' };
  const price = parseFloat(sp.variants?.[0]?.price ?? '0') || 0;
  return {
    product: {
      id: `${brand.slug}:${sp.id}`,
      brandSlug: brand.slug,
      brandName: brand.name,
      title,
      price,
      currency: brand.currency,
      image,
      url: sp.url ?? `${brand.homepage}/products/${sp.handle}`,
      inStock: (sp.variants || []).some((v) => v.available),
      garment: disc.garment,
      community: brand.community,
      occasion: disc.occasion,
      season: disc.season,
      activity: disc.activity,
    },
  };
}

export function normalizeProduct(sp: ShopifyProduct, brand: Brand): Product | null {
  return normalizeProductDetailed(sp, brand).product;
}
