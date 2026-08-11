import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { encodeCatalogue, decodeCard } from './compactCatalogue';
import type { Product, Brand } from './types';
import { BRANDS } from '@/data/brands';

// A literal product/brand pair, not invented — the URL structure (handle
// derivable from homepage) and currency-from-brand rule mirror real catalogue
// rows (lib/normalize.ts:119).
const BRAND: Brand = {
  slug: 'aab',
  name: 'Aab',
  homepage: 'https://us.aabcollection.com',
  feedUrl: 'https://us.aabcollection.com/products.json',
  community: 'hijabi',
  currency: 'USD',
  category: 'Modest & abayas',
  city: 'London',
  vibe: 'elegant',
};

const PRODUCT: Product = {
  id: 'aab:8675309',
  brandSlug: 'aab',
  brandName: 'Aab',
  title: 'Elowen Wrap Dress',
  price: 128,
  currency: 'USD',
  image: 'https://cdn.shopify.com/s/files/1/1249/2451/files/elowen-wrap_1.jpg?v=1785350116',
  url: 'https://us.aabcollection.com/products/elowen-wrap-dress',
  inStock: true,
  garment: 'dress',
  community: 'hijabi',
  occasion: ['formal', 'wedding'],
  season: [],
  activity: [],
};

// A WooCommerce-shaped row: url does NOT follow homepage + /products/ + handle.
const WOO_BRAND: Brand = {
  ...BRAND,
  slug: 'abayasboutique',
  name: 'Abayas Boutique',
  homepage: 'https://abayasboutique.com',
  currency: 'GBP',
};

const WOO_PRODUCT: Product = {
  ...PRODUCT,
  id: 'abayasboutique:555',
  brandSlug: 'abayasboutique',
  brandName: 'Abayas Boutique',
  currency: 'GBP',
  image: 'https://abayasboutique.com/wp-content/uploads/2026/08/occasion-abaya-1-of-1-5.jpg',
  url: 'https://abayasboutique.com/product/occasion-abaya/',
  occasion: [],
};

describe('encodeCatalogue / decodeCard', () => {
  it('round-trips every field a card needs', () => {
    const cat = encodeCatalogue([PRODUCT], [BRAND]);
    const card = decodeCard(cat, 0);
    expect(card).toEqual({
      id: PRODUCT.id,
      brandSlug: PRODUCT.brandSlug,
      garment: PRODUCT.garment,
      title: PRODUCT.title,
      brandName: PRODUCT.brandName,
      price: PRODUCT.price,
      currency: PRODUCT.currency,
      image: PRODUCT.image,
      url: PRODUCT.url,
    });
  });

  it('round-trips a product whose url is not homepage + /products/ + handle', () => {
    const cat = encodeCatalogue([WOO_PRODUCT], [WOO_BRAND]);
    const card = decodeCard(cat, 0);
    expect(card.url).toBe(WOO_PRODUCT.url);
    expect(card.image).toBe(WOO_PRODUCT.image);
    expect(card.currency).toBe(WOO_PRODUCT.currency);
  });

  it('round-trips every published product exactly', () => {
    const f = path.join(process.cwd(), 'data', 'products.json');
    const products = JSON.parse(readFileSync(f, 'utf8')) as Product[];
    const cat = encodeCatalogue(products, BRANDS);
    for (let i = 0; i < products.length; i++) {
      const card = decodeCard(cat, i);
      expect(card.id).toBe(products[i].id);
      expect(card.title).toBe(products[i].title);
      expect(card.brandName).toBe(products[i].brandName);
      expect(card.price).toBe(products[i].price);
      expect(card.currency).toBe(products[i].currency);
      expect(card.image).toBe(products[i].image);
      expect(card.url).toBe(products[i].url);
    }
  });

  it('throws when a product is out of stock', () => {
    const oos: Product = { ...PRODUCT, inStock: false };
    expect(() => encodeCatalogue([oos], [BRAND])).toThrow();
  });

  it('throws when a product currency disagrees with its brand record', () => {
    const wrongCurrency: Product = { ...PRODUCT, currency: 'EUR' };
    expect(() => encodeCatalogue([wrongCurrency], [BRAND])).toThrow();
  });

  it('throws when a product references a brand not in the dictionary', () => {
    const orphan: Product = { ...PRODUCT, brandSlug: 'nonexistent' };
    expect(() => encodeCatalogue([orphan], [BRAND])).toThrow();
  });

  it('exposes garment and occasion dictionaries for filter UI', () => {
    const cat = encodeCatalogue([PRODUCT, WOO_PRODUCT], [BRAND, WOO_BRAND]);
    expect(cat.garments).toContain('dress');
    expect(cat.occasions.sort()).toEqual(['formal', 'wedding']);
    expect(cat.rows.garmentIdx[0]).toBe(cat.garments.indexOf('dress'));
  });
});

describe('firstSeenDay encoding', () => {
  it('encodes a real firstSeen date as days since the epoch', () => {
    const cat = encodeCatalogue([{ ...PRODUCT, firstSeen: '2026-08-05' }], [BRAND]);
    // 2026-01-01 -> 2026-08-05 is 216 days (31+28+31+30+31+30+31+4).
    expect(cat.rows.firstSeenDay[0]).toBe(216);
  });

  it('encodes firstSeen: null as the -1 sentinel', () => {
    const cat = encodeCatalogue([{ ...PRODUCT, firstSeen: null }], [BRAND]);
    expect(cat.rows.firstSeenDay[0]).toBe(-1);
  });

  it('encodes a missing firstSeen (absent field) as the -1 sentinel', () => {
    // PRODUCT (defined above, shared by every test in this file) has no
    // firstSeen field at all — exactly the "never stamped" case.
    const cat = encodeCatalogue([PRODUCT], [BRAND]);
    expect(cat.rows.firstSeenDay[0]).toBe(-1);
  });

  it('does not add firstSeen to the decoded card', () => {
    const cat = encodeCatalogue([{ ...PRODUCT, firstSeen: '2026-08-05' }], [BRAND]);
    const card = decodeCard(cat, 0);
    expect('firstSeen' in card).toBe(false);
    expect('firstSeenDay' in card).toBe(false);
  });
});
