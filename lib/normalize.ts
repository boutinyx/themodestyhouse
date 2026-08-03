import type { Brand, Product } from '@/lib/types';
import { tagDiscovery } from '@/lib/tag';

export interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  product_type: string;
  tags: string[] | string;
  variants: { price: string; available: boolean }[];
  images: { src: string }[];
}

// Drop men's & children's products — this is a women's directory.
const EXCLUDE = /\bmen'?s\b|menswear|\bmens\b|\bthobe\b|\bkurta\b|\bkids?\b|children|\bchild\b|\bboys\b|\bgirls\b|\bbaby\b|toddler|\bjunior\b|\binfant\b|newborn/i;

export function normalizeProduct(sp: ShopifyProduct, brand: Brand): Product | null {
  const image = sp.images?.[0]?.src;
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
