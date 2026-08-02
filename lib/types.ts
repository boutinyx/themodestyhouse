export type Community = 'hijabi' | 'general';
export type Garment =
  | 'dress' | 'skirt' | 'top' | 'trousers' | 'abaya' | 'hijab' | 'swim' | 'set' | 'other';

export interface Brand {
  slug: string;
  name: string;
  homepage: string; // e.g. https://ivycityco.com
  feedUrl: string; // e.g. https://ivycityco.com/products.json
  community: Community;
  currency: string; // ISO, e.g. 'USD','GBP'
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
