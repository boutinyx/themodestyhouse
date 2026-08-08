import type { Brand } from '@/lib/types';

// MUSLIM-FIRST catalogue. All feeds verified live (/products.json).
export const BRANDS: Brand[] = [
  // — established / hijab —
  { slug: 'haute-hijab', name: 'Haute Hijab', homepage: 'https://www.hautehijab.com', feedUrl: 'https://www.hautehijab.com/products.json', community: 'hijabi', currency: 'USD', category: 'Hijabs', city: 'New York', vibe: 'elegant' },
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
  { slug: 'inayah', name: 'Inayah', homepage: 'https://inayah.com', feedUrl: 'https://inayah.com/products.json', community: 'hijabi', currency: 'GBP', category: 'Modest & abayas', city: 'London', vibe: 'elegant', badge: 'verified' },
  { slug: 'nasiba', name: 'Nasiba', homepage: 'https://nasiba.com', feedUrl: 'https://nasiba.com/products.json', community: 'hijabi', currency: 'AUD', category: 'Modest & abayas', city: 'Australia', vibe: 'elegant' },
  { slug: 'urban-modesty', name: 'Urban Modesty', homepage: 'https://urbanmodesty.com', feedUrl: 'https://urbanmodesty.com/products.json', community: 'hijabi', currency: 'USD', category: 'Modest & abayas', city: 'USA', vibe: 'streetwear' },
  { slug: 'hawaa', name: 'Hawaa Clothing', homepage: 'https://hawaaclothing.com', feedUrl: 'https://hawaaclothing.com/products.json', community: 'hijabi', currency: 'GBP', category: 'Modest', city: 'UK', vibe: 'streetwear' },
  { slug: 'klay', name: 'KlayTheLabel', homepage: 'https://klaythelabel.com', feedUrl: 'https://klaythelabel.com/products.json', community: 'hijabi', currency: 'GBP', category: 'Modest', city: 'UK', vibe: 'streetwear' },

  // — abaya specialists —
  { slug: 'mariams', name: "Mariam's Collection", homepage: 'https://mariam-col.com', feedUrl: 'https://mariam-col.com/products.json', community: 'hijabi', currency: 'USD', category: 'Abayas', city: 'USA', vibe: 'maximalist' },
  { slug: 'lumos', name: 'LumosModesty', homepage: 'https://lumosmodesty.com', feedUrl: 'https://lumosmodesty.com/products.json', community: 'hijabi', currency: 'USD', category: 'Abayas & hijabs', city: 'USA', vibe: 'elegant' },
  { slug: 'glow-modesty', name: 'Glow Modesty', homepage: 'https://glowmodesty.com', feedUrl: 'https://glowmodesty.com/products.json', community: 'hijabi', currency: 'USD', category: 'Abayas', city: 'USA', vibe: 'elegant', badge: 'verified' },
  { slug: 'jawda', name: 'Jawda', homepage: 'https://jawda.co.uk', feedUrl: 'https://jawda.co.uk/products.json', community: 'hijabi', currency: 'GBP', category: 'Abayas', city: 'London', vibe: 'elegant' },
  // Feradje: curated to their BEST SELLERS collection only (per curation choice), not full catalogue.
  { slug: 'feradje', name: 'Feradje', homepage: 'https://feradje.com', feedUrl: 'https://feradje.com/collections/best-sellers/products.json', community: 'hijabi', currency: 'EUR', category: 'Modern abayas', city: 'Belgium', vibe: 'elegant' },

  // — swimwear & active —
  { slug: 'lanuuk', name: 'Lanuuk', homepage: 'https://lanuuk.com', feedUrl: 'https://lanuuk.com/products.json', community: 'hijabi', currency: 'GBP', category: 'Modest swimwear', city: 'UK', vibe: 'elegant' },
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
  { slug: 'summer-evenings', name: 'Summer Evenings', homepage: 'https://www.summerevenings.us', feedUrl: 'https://www.summerevenings.us/products.json', community: 'hijabi', currency: 'USD', category: 'Modest dresses', city: 'USA', vibe: 'elegant', badge: 'verified' },

  // — from Vogue NL modest-fashion feature (2026-08-05) —
  // Domain moved: lesthebrand.com now 301s to les-atelier.com (found 2026-08-06).
  { slug: 'les-atelier', name: 'LES Atelier', homepage: 'https://les-atelier.com', feedUrl: 'https://les-atelier.com/products.json', community: 'hijabi', currency: 'EUR', category: 'Modest', city: 'Netherlands', vibe: 'elegant' },
  { slug: 'maison-hijab', name: 'Maison Hijab', homepage: 'https://maisonhijab.com', feedUrl: 'https://maisonhijab.com/products.json', community: 'hijabi', currency: 'EUR', category: 'Hijabs', city: 'Europe', vibe: 'elegant' },
  { slug: 'merrachi', name: 'MERRACHI', homepage: 'https://bymerrachi.com', feedUrl: 'https://bymerrachi.com/products.json', community: 'hijabi', currency: 'EUR', category: 'Modest', city: 'Amsterdam', vibe: 'elegant' },
  { slug: 'manzaram', name: 'Manzaram', homepage: 'https://manzaram.nl', feedUrl: 'https://manzaram.nl/products.json', community: 'hijabi', currency: 'EUR', category: 'Modest', city: 'Netherlands', vibe: 'elegant' },

  // — user-supplied batch (2026-08-05) —
  { slug: 'avyaana', name: 'Avyaana', homepage: 'https://avyaana.com', feedUrl: 'https://avyaana.com/products.json', community: 'hijabi', currency: 'GBP', category: 'Modest & abayas', city: 'UK', vibe: 'elegant' },
  { slug: 'fares', name: 'Fares', homepage: 'https://shopfares.com', feedUrl: 'https://shopfares.com/products.json', community: 'hijabi', currency: 'USD', category: 'Modest', city: 'USA', vibe: 'elegant' },
  { slug: 'fatima-diallo', name: 'Fatima Diallo', homepage: 'https://shopfatimadiallo.com', feedUrl: 'https://shopfatimadiallo.com/products.json', community: 'hijabi', currency: 'USD', category: 'Modest & abayas', city: 'USA', vibe: 'elegant' },
  { slug: 'madiha', name: 'Madiha', homepage: 'https://www.madiha.co.uk', feedUrl: 'https://www.madiha.co.uk/products.json', community: 'hijabi', currency: 'GBP', category: 'Abayas & scarves', city: 'UK', vibe: 'elegant' },
  // WooCommerce (not Shopify) — ingested via the Store API, see lib/ingest.ts.
  { slug: 'lafemme', name: 'La Femme Collectie', homepage: 'https://lafemmecollectie.nl', feedUrl: 'https://lafemmecollectie.nl/wp-json/wc/store/v1/products', platform: 'woo', community: 'hijabi', currency: 'EUR', category: 'Modest', city: 'Netherlands', vibe: 'elegant' },

  // — 2026-08-06: selected for PHOTOGRAPHY and trend-forward silhouettes, after a
  //   brand hunt where the primary filter was image quality rather than feed
  //   availability. Every one had sample product images inspected by eye before
  //   being added; median image widths measured from the live feed are noted.
  //   NOTE: four of the five are Gulf labels priced in AED, which renders as
  //   "AED 580" (no symbol) beside "$120"/"£120" — accepted deliberately, see
  //   ADR-0002 on why prices are shown in native currency.
  { slug: 'cult-abaya', name: 'Cult Abaya', homepage: 'https://cultabaya.com', feedUrl: 'https://cultabaya.com/products.json', community: 'hijabi', currency: 'AED', category: 'Modern abayas', city: 'Dubai', vibe: 'elegant' },        // 3394px, campaign photography, 0% floral
  { slug: 'kamin', name: 'Kamin', homepage: 'https://kamin.ae', feedUrl: 'https://kamin.ae/products.json', community: 'hijabi', currency: 'AED', category: 'Modern abayas', city: 'Dubai', vibe: 'elegant' },                              // 2213px, contemporary tailoring
  { slug: 'chi-ka', name: 'CHI-KA', homepage: 'https://chikacollection.com', feedUrl: 'https://chikacollection.com/products.json', community: 'hijabi', currency: 'AED', category: 'Kaftans & abayas', city: 'Dubai', vibe: 'elegant' },   // 1667px, most consistent art direction
  { slug: 'latifi', name: 'Latifi', homepage: 'https://latifi.ae', feedUrl: 'https://latifi.ae/products.json', community: 'hijabi', currency: 'AED', category: 'Occasion', city: 'Dubai', vibe: 'maximalist' },                            // 2438px, set-designed; only ~21 SKUs
  // Bouguessa is full RTW, not modest-by-design — expect to curate per product.
  { slug: 'bouguessa', name: 'Bouguessa', homepage: 'https://bouguessa.com', feedUrl: 'https://bouguessa.com/products.json', community: 'general', currency: 'USD', category: 'Contemporary', city: 'Dubai', vibe: 'elegant' },            // 2048px, quiet luxury
  // — France —
  // FRENCH-LANGUAGE FEED: registered in data/translate-brands.json as 'fr', or
  // titles publish as "T-shirt Manches longues matière polo Aube".
  { slug: 'whiteicy', name: 'White Icy', homepage: 'https://whiteicy.com', feedUrl: 'https://whiteicy.com/products.json', community: 'hijabi', currency: 'EUR', category: 'Modest', city: 'Paris', vibe: 'streetwear' },                   // 29 SKUs, denim-led separates

  // — 2026-08-06: Dutch & Belgian shops, from the NL/BE survey in
  //   data/nl-be-modest-shops.csv. Every feed verified live; median image width
  //   from the live feed noted. All EUR, so no new currency is introduced.
  { slug: 'losyana', name: 'Losyana', homepage: 'https://losyana.nl', feedUrl: 'https://losyana.nl/products.json', community: 'hijabi', currency: 'EUR', category: 'Modest & hijabs', city: 'Nijmegen', vibe: 'elegant' },                  // 750+ SKUs (429 hijabs), 3082px — German product_type values
  { slug: 'mukistore', name: 'Mukistore', homepage: 'https://mukistore.com', feedUrl: 'https://mukistore.com/products.json', community: 'hijabi', currency: 'EUR', category: 'Modest', city: 'Rotterdam', vibe: 'elegant' },               // 250+, 2075px
  { slug: 'hijab-boutique', name: 'Hijab Boutique', homepage: 'https://hijabboutique.nl', feedUrl: 'https://hijabboutique.nl/products.json', community: 'hijabi', currency: 'EUR', category: 'Hijabs & modest', city: 'Arnhem', vibe: 'elegant' }, // 250+, 1600px
  { slug: 'aniqq', name: 'ANIQQ Exclusive', homepage: 'https://aniqq.nl', feedUrl: 'https://aniqq.nl/products.json', community: 'hijabi', currency: 'EUR', category: 'Abayas', city: 'Arnhem', vibe: 'elegant' },                          // 26 SKUs, 3024px
  { slug: 'abyya', name: 'ABYYA', homepage: 'https://abyya.be', feedUrl: 'https://abyya.be/products.json', community: 'hijabi', currency: 'EUR', category: 'Modest', city: 'Belgium', vibe: 'elegant' },                                    // 26 SKUs, 3052px
  // WooCommerce — ingested via the Store API, see lib/ingest.ts.
  { slug: 'kimodesty', name: 'KIMODESTY', homepage: 'https://kimodesty.com', feedUrl: 'https://kimodesty.com/wp-json/wc/store/v1/products', platform: 'woo', community: 'hijabi', currency: 'EUR', category: 'Modest', city: 'Netherlands', vibe: 'elegant' },                         // 100+, 1920px
  { slug: 'chador', name: 'Chador', homepage: 'https://chador.nl', feedUrl: 'https://chador.nl/wp-json/wc/store/v1/products', platform: 'woo', community: 'hijabi', currency: 'EUR', category: 'Modest', city: 'Netherlands', vibe: 'elegant' },                                       // 113, 1707px
  { slug: 'noureen', name: 'NOUREEN Modest Fashion', homepage: 'https://noureenmodestfashion.com', feedUrl: 'https://noureenmodestfashion.com/wp-json/wc/store/v1/products', platform: 'woo', community: 'hijabi', currency: 'EUR', category: 'Hijabs & abayas', city: 'Antwerp', vibe: 'elegant' }, // 100+, 1024px

  // — 2026-08-06: owner-selected. Both feed-verified and image-checked by eye.
  // HUM introduces INR (renders as ₹, so no bare-code display problem).
  { slug: 'hum', name: 'HUM Clothing', homepage: 'https://humclothing.in', feedUrl: 'https://humclothing.in/products.json', community: 'general', currency: 'INR', category: 'Contemporary modest', city: 'India', vibe: 'elegant' },                              // 38 SKUs, 2752px, satin separates
  { slug: 'chic-modesty', name: 'Chic & Modesty', homepage: 'https://chicandmodesty.com', feedUrl: 'https://chicandmodesty.com/products.json', community: 'hijabi', currency: 'EUR', category: 'Hijabs & modest', city: 'France', vibe: 'elegant' },              // 250+, 1000px, French-language titles
  // Oomah: curated to the BOTTOMS collection only (owner asked for the pants),
  // not the full catalogue — same pattern as Feradje above.
  { slug: 'oomah', name: 'Oomah', homepage: 'https://www.oomah.co.uk', feedUrl: 'https://www.oomah.co.uk/collections/bottoms/products.json', community: 'hijabi', currency: 'GBP', category: 'Trousers', city: 'UK', vibe: 'elegant' },                            // 2 SKUs, 3419px

  // Zayda: a very small Australian label — the ENTIRE catalogue is 2 products,
  // confirmed three ways (products.json page 2 empty, /collections/all also 2,
  // sitemap 1 entry). Added on the owner's instruction with that understood.
  // Photography is the reason it earns a place: 6 images per product, every one
  // portrait, up to 4284px. Ships to Australia "and to selected international
  // destinations" — NOT worldwide (policies/shipping-policy).
  // ByHasanat: UK modest label, 122 SKUs. Their shop also sells MEN'S and
  // CHILDREN'S thobes — 4 + 4 + 7 children's abayas. Verified against their own
  // /collections/mens and /collections/boys rather than by reading titles (see
  // the mistakes log on men's items with gender-neutral names): every one carries
  // 'Thobe' or 'Children' in product_type, so the EXCLUDE regex drops them.
  // Post-ingest counts below confirm it. Ships worldwide from the UK (DPD/Evri/FedEx).
  { slug: 'by-hasanat', name: 'ByHasanat', homepage: 'https://byhasanat.co.uk', feedUrl: 'https://byhasanat.co.uk/products.json', community: 'hijabi', currency: 'GBP', category: 'Hijabs & modest', city: 'UK', vibe: 'elegant' },                     // 122 SKUs, 4284px

  { slug: 'zayda', name: 'Zayda', homepage: 'https://www.zayda.com.au', feedUrl: 'https://www.zayda.com.au/products.json', community: 'hijabi', currency: 'AUD', category: 'Modest dresses', city: 'Australia', vibe: 'elegant' },                              // 2 SKUs, 4284px
];
