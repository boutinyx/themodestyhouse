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
  { slug: 'mehijabi', name: 'MeHijabi', homepage: 'https://mehijabi.com', feedUrl: 'https://mehijabi.com/products.json', community: 'hijabi', currency: 'USD', category: 'Luxury hijab', city: 'USA', vibe: 'elegant' },
  { slug: 'voile-chic', name: 'Voile Chic', homepage: 'https://voilechic.com', feedUrl: 'https://voilechic.com/products.json', community: 'hijabi', currency: 'USD', category: 'Hijabs & modest', city: 'Canada', vibe: 'elegant' },

  // — modest & abayas —
  { slug: 'aab', name: 'Aab', homepage: 'https://us.aabcollection.com', feedUrl: 'https://us.aabcollection.com/products.json', community: 'hijabi', currency: 'USD', category: 'Modest & abayas', city: 'London', vibe: 'elegant', badge: 'verified' },
  { slug: 'inayah', name: 'Inayah', homepage: 'https://inayahc.com', feedUrl: 'https://inayahc.com/products.json', community: 'hijabi', currency: 'GBP', category: 'Modest & abayas', city: 'London', vibe: 'elegant' },
  { slug: 'eastessence', name: 'EastEssence', homepage: 'https://eastessence.com', feedUrl: 'https://eastessence.com/products.json', community: 'hijabi', currency: 'USD', category: 'Modest & abayas', city: 'USA', vibe: 'streetwear' },
  { slug: 'urban-modesty', name: 'Urban Modesty', homepage: 'https://urbanmodesty.com', feedUrl: 'https://urbanmodesty.com/products.json', community: 'hijabi', currency: 'USD', category: 'Modest & abayas', city: 'USA', vibe: 'streetwear' },
  { slug: 'shukr', name: 'Shukr', homepage: 'https://shukronline.com', feedUrl: 'https://shukronline.com/products.json', community: 'hijabi', currency: 'USD', category: 'Islamic clothing', city: 'USA', vibe: 'elegant' },
  { slug: 'hawaa', name: 'Hawaa Clothing', homepage: 'https://hawaaclothing.com', feedUrl: 'https://hawaaclothing.com/products.json', community: 'hijabi', currency: 'GBP', category: 'Modest', city: 'UK', vibe: 'streetwear' },
  { slug: 'klay', name: 'KlayTheLabel', homepage: 'https://klaythelabel.com', feedUrl: 'https://klaythelabel.com/products.json', community: 'hijabi', currency: 'GBP', category: 'Modest', city: 'UK', vibe: 'streetwear' },

  // — abaya specialists —
  { slug: 'mariams', name: "Mariam's Collection", homepage: 'https://mariam-col.com', feedUrl: 'https://mariam-col.com/products.json', community: 'hijabi', currency: 'USD', category: 'Abayas', city: 'USA', vibe: 'maximalist', badge: 'verified' },
  { slug: 'lumos', name: 'LumosModesty', homepage: 'https://lumosmodesty.com', feedUrl: 'https://lumosmodesty.com/products.json', community: 'hijabi', currency: 'USD', category: 'Abayas & hijabs', city: 'USA', vibe: 'elegant' },
  { slug: 'kabayare', name: 'Kabayare', homepage: 'https://kabayarefashion.com', feedUrl: 'https://kabayarefashion.com/products.json', community: 'hijabi', currency: 'USD', category: 'Abayas', city: 'USA', vibe: 'elegant' },
  { slug: 'glow-modesty', name: 'Glow Modesty', homepage: 'https://glowmodesty.com', feedUrl: 'https://glowmodesty.com/products.json', community: 'hijabi', currency: 'USD', category: 'Abayas', city: 'USA', vibe: 'elegant' },
  { slug: 'abayatopia', name: 'AbayaTopia', homepage: 'https://abayatopia.com', feedUrl: 'https://abayatopia.com/products.json', community: 'hijabi', currency: 'USD', category: 'Abayas', city: 'USA', vibe: 'elegant' },
  { slug: 'bazar-al-haya', name: 'Bazar Al Haya', homepage: 'https://bazaralhaya.com', feedUrl: 'https://bazaralhaya.com/products.json', community: 'hijabi', currency: 'USD', category: 'Abayas & jilbabs', city: 'USA', vibe: 'elegant' },

  // — swimwear & active —
  { slug: 'lanuuk', name: 'Lanuuk', homepage: 'https://lanuuk.com', feedUrl: 'https://lanuuk.com/products.json', community: 'hijabi', currency: 'GBP', category: 'Modest swimwear', city: 'UK', vibe: 'elegant', badge: 'editors-pick' },
  { slug: 'sei-sorelle', name: 'Sei Sorelle', homepage: 'https://seisorelle.com', feedUrl: 'https://seisorelle.com/products.json', community: 'hijabi', currency: 'USD', category: 'Modest swimwear', city: 'USA', vibe: 'elegant' },
  { slug: 'mayovera', name: 'Mayovera', homepage: 'https://mayovera.com', feedUrl: 'https://mayovera.com/products.json', community: 'hijabi', currency: 'TRY', category: 'Swimwear & turbans', city: 'Turkey', vibe: 'maximalist' },
  { slug: 'dignitii', name: 'Dignitii', homepage: 'https://dignitii.com', feedUrl: 'https://dignitii.com/products.json', community: 'hijabi', currency: 'USD', category: 'Modest activewear', city: 'USA', vibe: 'streetwear' },
];
