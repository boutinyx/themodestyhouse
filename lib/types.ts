export type Community = 'hijabi' | 'general';
export type Garment =
  | 'dress' | 'skirt' | 'top' | 'trousers' | 'abaya' | 'hijab' | 'swim' | 'set' | 'other';

export type Badge = 'verified' | 'editors-pick';
export type Vibe = 'elegant' | 'streetwear' | 'maximalist';

export interface Brand {
  slug: string;
  name: string;
  homepage: string; // e.g. https://hautehijab.com
  feedUrl: string; // e.g. https://hautehijab.com/products.json
  community: Community;
  currency: string; // ISO, e.g. 'USD','GBP'
  category: string; // e.g. 'Hijabs', 'Abayas', 'Modest dresses'
  city: string; // e.g. 'London', 'New York'
  vibe: Vibe; // aesthetic: elegant | streetwear | maximalist
  badge?: Badge; // curation seal (owner-assigned)
  platform?: 'shopify' | 'woo'; // feed type; default 'shopify'. 'woo' = WooCommerce Store API.
}

export interface Product {
  id: string; // `${brandSlug}:${shopifyId}`
  brandSlug: string;
  brandName: string;
  title: string;
  price: number; // numeric, in brand currency
  currency: string;
  image: string; // primary image URL
  url: string; // product page on brand site
  inStock: boolean;
  garment: Garment;
  community: Community;
  occasion: string[];
  season: string[];
  activity: string[];
}
