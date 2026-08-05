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
}

// Drop men's & children's products — this is a women's directory.
const EXCLUDE = /\bmen'?s\b|menswear|\bmens\b|\bthobe\b|\bkurta\b|\bkids?\b|children|\bchild\b|\bboys\b|\bgirls\b|\bbaby\b|toddler|\bjunior\b|\binfant\b|newborn/i;

// Prefer a MODEL / lifestyle photo over a flat product shot — but only when
// portrait is the product's DOMINANT format.
//
// WHY THE EXTRA CONDITION: "first portrait image = model shot" is false for
// brands that shoot square. On Mariam's, 10% of products had all photos at
// 1000x1000 and a single portrait image at the end — the SIZE CHART. The naive
// rule skipped every real photo and published the chart as the product image.
// A lone portrait among squares is an anomaly, not a model shot.
// Measured: this takes size-chart picks from 25 -> 0 across Mariam's catalogue.
function pickImage(images: ShopifyProduct['images']): string | undefined {
  if (!images?.length) return undefined;
  const sized = images.filter((i) => i.width && i.height);
  if (sized.length < 2) return images[0].src;
  const portrait = sized.filter((i) => (i.height as number) / (i.width as number) >= 1.2);
  if (portrait.length >= 2 && portrait.length * 2 >= sized.length) return portrait[0].src;
  return images[0].src;
}

export function normalizeProduct(sp: ShopifyProduct, brand: Brand): Product | null {
  const image = pickImage(sp.images);
  if (!image) return null;
  const tags = Array.isArray(sp.tags) ? sp.tags : String(sp.tags || '').split(',').map((t) => t.trim());
  const excl = [sp.title, sp.product_type || '', ...tags].join(' ');
  if (EXCLUDE.test(excl)) return null;
  const disc = tagDiscovery({ title: sp.title, productType: sp.product_type || '', tags });
  if (disc.garment === 'other') return null;
  const price = parseFloat(sp.variants?.[0]?.price ?? '0') || 0;
  return {
    id: `${brand.slug}:${sp.id}`,
    brandSlug: brand.slug,
    brandName: brand.name,
    title: sp.title,
    price,
    currency: brand.currency,
    image,
    url: `${brand.homepage}/products/${sp.handle}`,
    inStock: (sp.variants || []).some((v) => v.available),
    garment: disc.garment,
    community: brand.community,
    occasion: disc.occasion,
    season: disc.season,
    activity: disc.activity,
  };
}
