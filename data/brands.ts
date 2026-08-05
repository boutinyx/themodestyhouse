import type { Brand } from '@/lib/types';

// MUSLIM-FIRST catalogue. All feeds verified live (/products.json).
export const BRANDS: Brand[] = [
  // — established / hijab —
  { slug: 'haute-hijab', name: 'Haute Hijab', homepage: 'https://www.hautehijab.com', feedUrl: 'https://www.hautehijab.com/products.json', community: 'hijabi', currency: 'USD', category: 'Hijabs', city: 'New York', vibe: 'elegant', badge: 'editors-pick' },
  { slug: 'vela', name: 'Vela Scarves', homepage: 'https://velascarves.com', feedUrl: 'https://velascarves.com/products.json', community: 'hijabi', currency: 'USD', category: 'Hijabs', city: 'USA', vibe: 'maximalist' },
  { slug: 'veiled', name: 'Veiled', homepage: 'https://veiled.com', feedUrl: 'https://veiled.com/products.json', community: 'hijabi', currency: 'USD', category: 'Hijabs & modest', city: 'USA', vibe: 'elegant', badge: 'verified' },
  { slug: 'niswa', name: 'Niswa Fashion', homepage: 'https://niswafashion.com', feedUrl: 'https://niswafashion.com/products.json', community: 'hijabi', currency: 'USD', category: 'Hijabs & abayas', city: 'Los Angeles', vibe: 'elegant' },
  { slug: 'zahraa', name: 'Zahraa The Label', homepage: 'https://zahraathelabel.com', feedUrl: 'https://zahraathelabel.com/products.json', community: 'hijabi', currency: 'USD', category: 'Hijabs', city: 'USA', vibe: 'elegant' },
  { slug: 'modern-hijabi', name: 'Modern Hijabi', homepage: 'https://modernhijabi.com', feedUrl: 'https://modernhijabi.com/products.json', community: 'hijabi', currency: 'USD', category: 'Hijabs & modest', city: 'USA', vibe: 'maximalist' },
  { slug: 'voile-chic', name: 'Voile Chic', homepage: 'https://voilechic.com', feedUrl: 'https://voilechic.com/products.json', community: 'hijabi', currency: 'USD', category: 'Hijabs & modest', city: 'Canada', vibe: 'elegant' },
  { slug: 'jaida', name: 'Jaida', homepage: 'https://jaida.ca', feedUrl: 'https://jaida.ca/products.json', community: 'hijabi', currency: 'CAD', category: 'Luxury hijabs', city: 'Canada', vibe: 'elegant' },
  { slug: 'culture-hijab', name: 'Culture Hijab Co', homepage: 'https://culturehijab.com', feedUrl: 'https://culturehijab.com/products.json', community: 'hijabi', currency: 'USD', category: 'Hijabs', city: 'USA', vibe: 'streetwear' },

  // — modest & abayas —
  { slug: 'aab', name: 'Aab', homepage: 'https://us.aabcollection.com', feedUrl: 'https://us.aabcollection.com/products.json', community: 'hijabi', currency: 'USD', category: 'Modest & abayas', city: 'London', vibe: 'elegant', badge: 'verified' },
  { slug: 'inayah', name: 'Inayah', homepage: 'https://inayah.com', feedUrl: 'https://inayah.com/products.json', community: 'hijabi', currency: 'GBP', category: 'Modest & abayas', city: 'London', vibe: 'elegant' },
  { slug: 'nasiba', name: 'Nasiba', homepage: 'https://nasiba.com', feedUrl: 'https://nasiba.com/products.json', community: 'hijabi', currency: 'AUD', category: 'Modest & abayas', city: 'Australia', vibe: 'elegant' },
  { slug: 'urban-modesty', name: 'Urban Modesty', homepage: 'https://urbanmodesty.com', feedUrl: 'https://urbanmodesty.com/products.json', community: 'hijabi', currency: 'USD', category: 'Modest & abayas', city: 'USA', vibe: 'streetwear' },
  { slug: 'hawaa', name: 'Hawaa Clothing', homepage: 'https://hawaaclothing.com', feedUrl: 'https://hawaaclothing.com/products.json', community: 'hijabi', currency: 'GBP', category: 'Modest', city: 'UK', vibe: 'streetwear' },
  { slug: 'klay', name: 'KlayTheLabel', homepage: 'https://klaythelabel.com', feedUrl: 'https://klaythelabel.com/products.json', community: 'hijabi', currency: 'GBP', category: 'Modest', city: 'UK', vibe: 'streetwear' },

  // — abaya specialists —
  { slug: 'mariams', name: "Mariam's Collection", homepage: 'https://mariam-col.com', feedUrl: 'https://mariam-col.com/products.json', community: 'hijabi', currency: 'USD', category: 'Abayas', city: 'USA', vibe: 'maximalist', badge: 'verified' },
  { slug: 'lumos', name: 'LumosModesty', homepage: 'https://lumosmodesty.com', feedUrl: 'https://lumosmodesty.com/products.json', community: 'hijabi', currency: 'USD', category: 'Abayas & hijabs', city: 'USA', vibe: 'elegant' },
  { slug: 'glow-modesty', name: 'Glow Modesty', homepage: 'https://glowmodesty.com', feedUrl: 'https://glowmodesty.com/products.json', community: 'hijabi', currency: 'USD', category: 'Abayas', city: 'USA', vibe: 'elegant' },
  { slug: 'jawda', name: 'Jawda', homepage: 'https://jawda.co.uk', feedUrl: 'https://jawda.co.uk/products.json', community: 'hijabi', currency: 'GBP', category: 'Abayas', city: 'London', vibe: 'elegant' },
  // Feradje: curated to their BEST SELLERS collection only (per curation choice), not full catalogue.
  { slug: 'feradje', name: 'Feradje', homepage: 'https://feradje.com', feedUrl: 'https://feradje.com/collections/best-sellers/products.json', community: 'hijabi', currency: 'EUR', category: 'Modern abayas', city: 'Belgium', vibe: 'elegant' },

  // — swimwear & active —
  { slug: 'lanuuk', name: 'Lanuuk', homepage: 'https://lanuuk.com', feedUrl: 'https://lanuuk.com/products.json', community: 'hijabi', currency: 'GBP', category: 'Modest swimwear', city: 'UK', vibe: 'elegant', badge: 'editors-pick' },
  { slug: 'sei-sorelle', name: 'Sei Sorelle', homepage: 'https://seisorelle.com', feedUrl: 'https://seisorelle.com/products.json', community: 'hijabi', currency: 'USD', category: 'Modest swimwear', city: 'USA', vibe: 'elegant' },
  { slug: 'dignitii', name: 'Dignitii', homepage: 'https://dignitii.com', feedUrl: 'https://dignitii.com/products.json', community: 'hijabi', currency: 'USD', category: 'Modest activewear', city: 'USA', vibe: 'streetwear' },

  // — curated additions (user-selected) —
  { slug: 'qupid', name: 'Qupid', homepage: 'https://qupiduk.com', feedUrl: 'https://qupiduk.com/products.json', community: 'hijabi', currency: 'GBP', category: 'Modest', city: 'UK', vibe: 'elegant' },
  { slug: 'diversity-modest', name: 'Diversity Modest', homepage: 'https://diversitymodest.com', feedUrl: 'https://diversitymodest.com/products.json', community: 'hijabi', currency: 'EUR', category: 'Modest', city: 'Europe', vibe: 'elegant' },
  { slug: 'esme-ny', name: 'Esme New York', homepage: 'https://www.esmenewyork.com', feedUrl: 'https://www.esmenewyork.com/products.json', community: 'hijabi', currency: 'USD', category: 'Modest', city: 'New York', vibe: 'elegant' },
  { slug: 'arakai', name: 'Arakai Studio', homepage: 'https://www.arakaistudio.com', feedUrl: 'https://www.arakaistudio.com/products.json', community: 'hijabi', currency: 'GBP', category: 'Modest', city: 'UK', vibe: 'elegant' },
  { slug: 'emlavish', name: 'EM Lavish', homepage: 'https://www.emlavish.com', feedUrl: 'https://www.emlavish.com/products.json', community: 'hijabi', currency: 'GBP', category: 'Modest', city: 'UK', vibe: 'elegant' },
  { slug: 'sistrs', name: 'Sistrs The Label', homepage: 'https://sistrsthelabel.co.uk', feedUrl: 'https://sistrsthelabel.co.uk/products.json', community: 'hijabi', currency: 'GBP', category: 'Modest', city: 'UK', vibe: 'streetwear' },
  { slug: 'zora', name: 'Zora Designers', homepage: 'https://zoradesigners.com', feedUrl: 'https://zoradesigners.com/products.json', community: 'hijabi', currency: 'MYR', category: 'Modest', city: 'Malaysia', vibe: 'elegant' },
  { slug: 'bemu', name: 'Bemu', homepage: 'https://bemutr.com', feedUrl: 'https://bemutr.com/products.json', community: 'hijabi', currency: 'USD', category: 'Modest', city: 'Turkey', vibe: 'elegant' },
  { slug: 'summer-evenings', name: 'Summer Evenings', homepage: 'https://www.summerevenings.us', feedUrl: 'https://www.summerevenings.us/products.json', community: 'hijabi', currency: 'USD', category: 'Modest dresses', city: 'USA', vibe: 'elegant' },
];
