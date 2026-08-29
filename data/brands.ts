import type { Brand } from '@/lib/types';

// MUSLIM-FIRST catalogue. All feeds verified live (/products.json).
export const BRANDS: Brand[] = [
  // — established / hijab —
  { slug: 'haute-hijab', name: 'Haute Hijab', homepage: 'https://www.hautehijab.com', feedUrl: 'https://www.hautehijab.com/products.json', community: 'hijabi', currency: 'USD', category: 'Hijabs', city: 'New York', vibe: 'elegant' },
  { slug: 'vela', name: 'Vela Scarves', homepage: 'https://velascarves.com', feedUrl: 'https://velascarves.com/products.json', community: 'hijabi', currency: 'USD', category: 'Hijabs', city: 'USA', vibe: 'maximalist' },
  { slug: 'veiled', name: 'Veiled', homepage: 'https://veiled.com', feedUrl: 'https://veiled.com/products.json', community: 'hijabi', currency: 'USD', category: 'Hijabs & modest', city: 'USA', vibe: 'elegant', badge: 'verified', description: 'The broadest wardrobe of any house in the index: 782 pieces spanning hijabs, dresses, tops, trousers, skirts and swim. Prices sit low and close together, with most of the range under $95 — one of the few houses that can dress someone end to end without leaving it. The seal here is for range held at one standard: 782 pieces across eight categories without the quality drifting between them, which is rarer than breadth alone suggests.' },
  { slug: 'niswa', name: 'Niswa Fashion', homepage: 'https://niswafashion.com', feedUrl: 'https://niswafashion.com/products.json', community: 'hijabi', currency: 'USD', category: 'Hijabs & abayas', city: 'Los Angeles', vibe: 'elegant' },
  { slug: 'zahraa', name: 'Zahraa The Label', homepage: 'https://zahraathelabel.com', feedUrl: 'https://zahraathelabel.com/products.json', community: 'hijabi', currency: 'USD', category: 'Hijabs', city: 'USA', vibe: 'elegant' },
  { slug: 'modern-hijabi', name: 'Modern Hijabi', homepage: 'https://modernhijabi.com', feedUrl: 'https://modernhijabi.com/products.json', community: 'hijabi', currency: 'USD', category: 'Hijabs & modest', city: 'USA', vibe: 'maximalist' },
  { slug: 'voile-chic', name: 'Voile Chic', homepage: 'https://voilechic.com', feedUrl: 'https://voilechic.com/products.json', community: 'hijabi', currency: 'USD', category: 'Hijabs & modest', city: 'Canada', vibe: 'elegant' },
  { slug: 'jaida', name: 'Jaida', homepage: 'https://jaida.ca', feedUrl: 'https://jaida.ca/products.json', community: 'hijabi', currency: 'CAD', category: 'Luxury hijabs', city: 'Canada', vibe: 'elegant' },
  { slug: 'culture-hijab', name: 'Culture Hijab Co', homepage: 'https://culturehijab.com', feedUrl: 'https://culturehijab.com/products.json', community: 'hijabi', currency: 'USD', category: 'Hijabs', city: 'USA', vibe: 'streetwear' },

  // — modest & abayas —
  { slug: 'aab', name: 'Aab', homepage: 'https://us.aabcollection.com', feedUrl: 'https://us.aabcollection.com/products.json', community: 'hijabi', currency: 'USD', category: 'Modest & abayas', city: 'London', vibe: 'elegant', badge: 'verified', description: 'A London house built on abayas — 271 of them — with a full dress collection behind it, 678 pieces in all. Priced deliberately above the high street without reaching Gulf pricing, with most of the range between $37 and $150. Sealed for holding a middle that most houses abandon — priced above the high street and below the Gulf houses, and consistent enough across 678 pieces that the position reads as deliberate rather than accidental.' },
  { slug: 'inayah', name: 'Inayah', homepage: 'https://inayah.com', feedUrl: 'https://inayah.com/products.json', community: 'hijabi', currency: 'GBP', category: 'Modest & abayas', city: 'London', vibe: 'elegant', badge: 'verified', description: 'The smallest and most expensive of the sealed houses: 24 published pieces, almost all dresses and co-ord sets, most of the range between £79 and £189. A short, occasion-weighted collection rather than an everyday wardrobe. Sealed for restraint: 24 pieces is a decision, not a limitation, and a collection this short only works if each piece earns its place.' },
  { slug: 'nasiba', name: 'Nasiba', homepage: 'https://nasiba.com', feedUrl: 'https://nasiba.com/products.json', community: 'hijabi', currency: 'AUD', category: 'Modest & abayas', city: 'Australia', vibe: 'elegant' },
  { slug: 'urban-modesty', name: 'Urban Modesty', homepage: 'https://urbanmodesty.com', feedUrl: 'https://urbanmodesty.com/products.json', community: 'hijabi', currency: 'USD', category: 'Modest & abayas', city: 'USA', vibe: 'streetwear' },
  { slug: 'hawaa', name: 'Hawaa Clothing', homepage: 'https://hawaaclothing.com', feedUrl: 'https://hawaaclothing.com/products.json', community: 'hijabi', currency: 'GBP', category: 'Modest', city: 'UK', vibe: 'streetwear' },
  { slug: 'klay', name: 'KlayTheLabel', homepage: 'https://klaythelabel.com', feedUrl: 'https://klaythelabel.com/products.json', community: 'hijabi', currency: 'GBP', category: 'Modest', city: 'UK', vibe: 'streetwear' },

  // — abaya specialists —
  { slug: 'glow-modesty', name: 'Glow Modesty', homepage: 'https://glowmodesty.com', feedUrl: 'https://glowmodesty.com/products.json', community: 'hijabi', currency: 'USD', category: 'Abayas', city: 'USA', vibe: 'elegant', badge: 'verified', description: 'A dress specialist rather than a general wardrobe: 110 of its 161 pieces are dresses, with a small run of abayas alongside. Sits at the upper-middle of the index, most of the range between $78 and $172. Sealed for doing one thing properly — two thirds of the range is dresses, and the focus shows in the cut rather than in the breadth of the catalogue.' },
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
  { slug: 'summer-evenings', name: 'Summer Evenings', homepage: 'https://www.summerevenings.us', feedUrl: 'https://www.summerevenings.us/products.json', community: 'hijabi', currency: 'USD', category: 'Modest dresses', city: 'USA', vibe: 'elegant', badge: 'verified', description: 'Separates-led — tops outnumber dresses here, with hijabs and skirts behind them. 158 pieces carrying the widest price spread of the sealed houses, from around $15 to $200. Sealed for the least glamorous reason: it makes the separates that everything else layers over, and gets the fit of them right.' },

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
  // — France —
  // FRENCH-LANGUAGE FEED: registered in data/translate-brands.json as 'fr', or
  // titles publish as "T-shirt Manches longues matière polo Aube".
  { slug: 'whiteicy', name: 'White Icy', homepage: 'https://whiteicy.com', feedUrl: 'https://whiteicy.com/products.json', community: 'hijabi', currency: 'EUR', category: 'Modest', city: 'Paris', vibe: 'streetwear' },                   // 29 SKUs, denim-led separates

  // — 2026-08-06: Dutch & Belgian shops, from the NL/BE survey in
  //   data/nl-be-modest-shops.csv. Every feed verified live; median image width
  //   from the live feed noted. All EUR, so no new currency is introduced.
  // MOVED from losyana.nl to losyana.shop, 2026-08-28, at Tina's instruction.
  // They are two SEPARATE Shopify stores, not two domains for one shop —
  // losyana.myshopify.com vs losyana-shop.myshopify.com, sharing zero Shopify
  // ids. Measured that day: .nl 807 products, .shop 1001, 444 titles in common.
  // Of the 622 we published from .nl, 398 exist on .shop as the same item, 175
  // more as the same range in a different colourway, and 49 have no counterpart.
  // The move is what makes the affiliate code work: Tina's GoAffPro ref is
  // issued on .shop and sets NOTHING on .nl (lib/affiliates.ts).
  // Because the ids all change, every old losyana decision is orphaned and the
  // new ones default to 'keep' — which is deliberate here, since /staff/curate
  // lists PUBLISHED products and she is reviewing the arrivals herself.
  // → docs/log/2026-08-28-losyana-move-to-shop.md
  { slug: 'losyana', name: 'Losyana', homepage: 'https://losyana.shop', feedUrl: 'https://losyana.shop/products.json', community: 'hijabi', currency: 'EUR', category: 'Modest & hijabs', city: 'Nijmegen', vibe: 'elegant' },                  // 1001 SKUs. EUR confirmed from the storefront's own priceCurrency, 2026-08-28.
  // — 2026-08-29: modest ACTIVEWEAR houses, added at Tina's request ("we need
  //   more active wear. modest ones"). Every feed verified live before adding:
  //   fetched /products.json, parsed as JSON, confirmed a products array with
  //   plausible titles (§10.3 — a 200 proves nothing). Product counts, in-stock
  //   counts and median image widths measured the same day and noted per line.
  //   `currency` here is the EXPECTED value only (Invariant 15) — several of
  //   these served EUR to a probe run from the Netherlands, which is Shopify
  //   Markets doing its job, and the real one is detected per fetch at ingest.
  //   Two more were found and deliberately NOT added: glowco.shop (44 products
  //   but only 3 titles read as activewear — its range is tie-back inners and
  //   ninja caps, i.e. layering and hijabs) and veilgarments.com (15 products,
  //   all multi-item BUNDLE SKUs). kadyluxe.com was rejected outright: 187
  //   products of US college sports fan apparel.
  { slug: 'haya-active', name: 'Haya Active', homepage: 'https://haya-active.com', feedUrl: 'https://haya-active.com/products.json', community: 'hijabi', currency: 'GBP', category: 'Activewear', city: 'United Kingdom', vibe: 'streetwear' }, // 58 SKUs, 47 in stock, 3192px — 45/58 titles read as activewear
  { slug: 'fith', name: 'FITH', homepage: 'https://getfith.co', feedUrl: 'https://getfith.co/products.json', community: 'hijabi', currency: 'USD', category: 'Activewear', city: 'USA', vibe: 'streetwear' }, // 45 SKUs, 44 in stock, 1584px — incl. "ACTV Abaya", a modest workout abaya
  { slug: 'nemah', name: 'Nemah', homepage: 'https://nemahwear.com', feedUrl: 'https://nemahwear.com/products.json', community: 'hijabi', currency: 'INR', category: 'Activewear & swim', city: 'India', vibe: 'elegant' }, // 29 SKUs, 27 in stock, 1068px. INR already has an fx rate
  { slug: 'reclaim-active', name: 'Reclaim Active', homepage: 'https://reclaimactive.com', feedUrl: 'https://reclaimactive.com/products.json', community: 'hijabi', currency: 'EUR', category: 'Modest', city: 'Denmark', vibe: 'elegant' }, // 15 SKUs, 14 in stock, 1536px. NOT an activewear house despite the name — Tina, 2026-08-29: skirts, blouses and trousers. Category corrected from 'Activewear'.
  { slug: 'sukoon-active', name: 'Sukoon Active', homepage: 'https://www.sukoonactive.com', feedUrl: 'https://www.sukoonactive.com/products.json', community: 'hijabi', currency: 'USD', category: 'Activewear', city: 'USA', vibe: 'elegant' }, // 12 SKUs, 8 in stock, 3000px — thinnest of the five
  { slug: 'mukistore', name: 'Mukistore', homepage: 'https://mukistore.com', feedUrl: 'https://mukistore.com/products.json', community: 'hijabi', currency: 'EUR', category: 'Modest', city: 'Rotterdam', vibe: 'elegant' },               // 250+, 2075px
  { slug: 'hijab-boutique', name: 'Hijab Boutique', homepage: 'https://hijabboutique.nl', feedUrl: 'https://hijabboutique.nl/products.json', community: 'hijabi', currency: 'EUR', category: 'Hijabs & modest', city: 'Arnhem', vibe: 'elegant' }, // 250+, 1600px
  { slug: 'aniqq', name: 'ANIQQ Exclusive', homepage: 'https://aniqq.nl', feedUrl: 'https://aniqq.nl/products.json', community: 'hijabi', currency: 'EUR', category: 'Abayas', city: 'Arnhem', vibe: 'elegant' },                          // 26 SKUs, 3024px
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

  // Khair Archives: a very small Dutch label — the ENTIRE catalogue is 7
  // products, confirmed three ways (products.json page 2 empty, /collections/all
  // also 7, and the feed's own length). Beldi co-ords and linen maxi dresses;
  // women's only, no menswear, no non-apparel, so nothing here needs an
  // exclusion.
  //
  // CURRENCY IS EUR, and it was verified rather than inferred from the price
  // numbers (139.99 reads equally as GBP or USD): the storefront reports
  // "currency":"EUR", moneyFormat "€{{amount_with_comma_separator}}", and
  // cart.js returns EUR. Shopify's own payload gives "countryCode":"NL" and
  // merchantName "Khair Archives". Per §3 the currency comes from THIS record
  // and never from the feed, so getting it wrong would misprice every row.
  //
  // NL-based but the titles are ENGLISH ("The Sayf Dress", "Diva Beldi Co-Ord"),
  // so it does NOT go in data/translate-brands.json. That check exists because
  // of §10.16 — the French feed whose "jean" meant denim, not trousers — and it
  // is the reason a Dutch store is not assumed to need translating.
  //
  // Classification verified by running the real normalizeProduct over the live
  // feed before adding it: 7 kept, 0 dropped, 4 `set` and 3 `dress`. Photography
  // is strong — 34 images, 4.9 per product, EVERY ONE portrait JPG up to 5760px,
  // so pickImage's portrait-dominant test picks a model shot rather than a
  // flat-lay (§7, §10.11).
  { slug: 'khair-archives', name: 'Khair Archives', homepage: 'https://khairarchives.com', feedUrl: 'https://khairarchives.com/products.json', community: 'hijabi', currency: 'EUR', category: 'Modest dresses', city: 'Netherlands', vibe: 'elegant' },      // 7 SKUs, 5760px

  // — 2026-08-10, Tina's pick from data/brand-candidates-2026-08-07.csv (48 of 54).
  //   Every feed re-probed on the day of adding, not trusted from the CSV: JSON
  //   parsed and a products array confirmed (§10.3 — HTTP 200 proves nothing).
  //   `modesque` is deliberately absent: its Woo Store API returns 403.
  //   Four rows carried prose in the CSV's currency column instead of an ISO
  //   code (ayaana, lameera-moda, modista, ilovemodesty); all four are recorded
  //   as USD, which is what their feeds actually serve — flagged to Tina.
  { slug: 'feeya', name: 'Feeya', homepage: 'https://feeya.ae', feedUrl: 'https://feeya.ae/products.json', community: 'hijabi', currency: 'AED', category: 'Abayas & kaftans', city: 'Dubai', vibe: 'elegant' },
  { slug: 'illi-studio', name: 'Illi Studio', homepage: 'https://illistudio.com', feedUrl: 'https://illistudio.com/products.json', community: 'hijabi', currency: 'AED', category: 'Abayas', city: 'Dubai', vibe: 'maximalist' },
  { slug: 'headed-somewear', name: 'Headed Somewear', homepage: 'https://headedsomewear.com', feedUrl: 'https://headedsomewear.com/products.json', community: 'hijabi', currency: 'USD', category: 'Hijabs', city: 'United States', vibe: 'elegant' },
  { slug: 'amariah', name: 'Amariah', homepage: 'https://amariah.co.uk', feedUrl: 'https://amariah.co.uk/products.json', community: 'hijabi', currency: 'GBP', category: 'Modest dresses & abaya sets', city: 'United Kingdom', vibe: 'elegant' },
  { slug: 'ellem-atelier', name: 'Ellem Atelier', homepage: 'https://www.ellematelier.com', feedUrl: 'https://www.ellematelier.com/products.json', community: 'hijabi', currency: 'SEK', category: 'Abayas', city: 'Sweden', vibe: 'elegant' },
  { slug: 'almotahajiba', name: 'Almotahajiba', homepage: 'https://www.almotahajiba.com', feedUrl: 'https://www.almotahajiba.com/products.json', community: 'hijabi', currency: 'QAR', category: 'Abayas & jalabiyas', city: 'Doha', vibe: 'elegant' },
  { slug: 'nihan', name: 'Nihan', homepage: 'https://nihan.com.tr', feedUrl: 'https://nihan.com.tr/products.json', community: 'hijabi', currency: 'TRY', category: 'Modest', city: 'Turkey', vibe: 'elegant' },
  { slug: 'baqa', name: 'BAQA', homepage: 'https://baqaofficial.com', feedUrl: 'https://baqaofficial.com/products.json', community: 'hijabi', currency: 'TRY', category: 'Modest dresses', city: 'Istanbul', vibe: 'elegant' },
  { slug: 'abaya-lounge', name: 'Abaya Lounge', homepage: 'https://abayalounge.com', feedUrl: 'https://abayalounge.com/products.json', community: 'hijabi', currency: 'GBP', category: 'Abayas', city: 'United Kingdom', vibe: 'elegant' },
  // Touché Privé (int) AND touche-prive-eu below are BOTH custom-managed —
  // see scripts/refresh.mjs's CUSTOM_MANAGED set. int.toucheprive.com (USD)
  // and eu.toucheprive.com (EUR) are two materially different Shopify
  // stores, own ids, ~75% non-overlapping catalog. Tina's policy
  // (2026-08-15, after first trying "keep both fully, route by timezone"):
  // publish ONLY an item that exists on BOTH stores — a single-store item
  // always fails checkout for someone (eu has no US market at all; an
  // EU visitor hitting an int-only item can still hit Touché Privé's own
  // geo-redirect dead end). scripts/touche-prive-dual-region.mjs is the
  // ONLY thing that ever writes either brand's raw rows: it re-verifies
  // dual-store presence on every run and sets `altUrl` (int -> eu) on the
  // survivors — never a bare `npm run refresh`, which has no way to know
  // this rule and would republish every single-store item again. See
  // docs/log/2026-08-15-touche-prive-dual-only-policy.md.
  { slug: 'touche-prive', name: 'Touché Privé', homepage: 'https://int.toucheprive.com', feedUrl: 'https://int.toucheprive.com/products.json', community: 'hijabi', currency: 'USD', category: 'Modest', city: 'Istanbul', vibe: 'elegant' },
  { slug: 'touche-prive-eu', name: 'Touché Privé', homepage: 'https://eu.toucheprive.com', feedUrl: 'https://eu.toucheprive.com/products.json', community: 'hijabi', currency: 'EUR', category: 'Modest', city: 'Istanbul', vibe: 'elegant' },
  { slug: 'daska-fashion', name: 'Daska Fashion', homepage: 'https://daskafashion.com', feedUrl: 'https://daskafashion.com/products.json', community: 'hijabi', currency: 'GBP', category: 'Modest dresses', city: 'United Kingdom', vibe: 'elegant' },
  { slug: 'jennah-boutique', name: 'Jennah Boutique', homepage: 'https://jennah-boutique.com', feedUrl: 'https://jennah-boutique.com/products.json', community: 'hijabi', currency: 'EUR', category: 'Modest ready-to-wear', city: 'France', vibe: 'streetwear' },
  { slug: 'yasmin-jay', name: 'Yasmin Jay', homepage: 'https://www.yasminjay.com.au', feedUrl: 'https://www.yasminjay.com.au/products.json', community: 'hijabi', currency: 'AUD', category: 'Modest dresses & swim', city: 'Sydney', vibe: 'elegant' },
  { slug: 'alia-anggun', name: 'Alia Anggun', homepage: 'https://www.aliaanggun.com', feedUrl: 'https://www.aliaanggun.com/products.json', community: 'hijabi', currency: 'SGD', category: 'Modest dresses', city: 'Singapore', vibe: 'elegant' },
  { slug: 'ayaana', name: 'Ayaana', homepage: 'https://ayaana.ca', feedUrl: 'https://ayaana.ca/products.json', community: 'hijabi', currency: 'USD', category: 'Abayas', city: 'Canada', vibe: 'elegant' },
  { slug: 'bait-hanayen', name: 'Bait Hanayen', homepage: 'https://bait-hanayen.com', feedUrl: 'https://bait-hanayen.com/products.json', community: 'hijabi', currency: 'KWD', category: 'Abayas', city: 'Kuwait City', vibe: 'elegant' },
  { slug: 'elaa-the-label', name: 'ELAA The Label', homepage: 'https://elaathelabel.com', feedUrl: 'https://elaathelabel.com/products.json', community: 'hijabi', currency: 'USD', category: 'Modest dresses', city: 'United States', vibe: 'elegant' },
  { slug: 'eynaa-paris', name: 'Eynaa Paris', homepage: 'https://eynaaparis.fr', feedUrl: 'https://eynaaparis.fr/products.json', community: 'hijabi', currency: 'EUR', category: 'Modest ready-to-wear', city: 'Clichy', vibe: 'elegant' },
  { slug: 'malikaat', name: 'Malikaat', homepage: 'https://malikaat.com', feedUrl: 'https://malikaat.com/products.json', community: 'hijabi', currency: 'GBP', category: 'Abayas & occasion dresses', city: 'Birmingham, United Kingdom', vibe: 'elegant' },
  { slug: 'modesty-in-style', name: 'Modesty in Style', homepage: 'https://modestyinstyle.com.au', feedUrl: 'https://modestyinstyle.com.au/products.json', community: 'hijabi', currency: 'AUD', category: 'Modest sets & knits', city: 'Australia', vibe: 'elegant' },
  { slug: 'labayah', name: 'LABAYAH DESIGN', homepage: 'https://www.labayah.com', feedUrl: 'https://www.labayah.com/products.json', community: 'hijabi', currency: 'EUR', category: 'Abayas', city: 'Antwerp', vibe: 'elegant' },
  { slug: 'vivi-zubedi', name: 'Vivi Zubedi', homepage: 'https://vivizubedi.com', feedUrl: 'https://vivizubedi.com/wp-json/wc/store/v1/products', community: 'hijabi', currency: 'IDR', category: 'Abayas & scarves', city: 'Jakarta', vibe: 'elegant', platform: 'woo' },
  { slug: 'we-are-elegance', name: 'We Are Elegance', homepage: 'https://weareelegance.co.uk', feedUrl: 'https://weareelegance.co.uk/products.json', community: 'hijabi', currency: 'GBP', category: 'Occasion abayas', city: 'United Kingdom', vibe: 'maximalist' },
  { slug: 'beyond-label', name: 'Beyond Label', homepage: 'https://beyond-label.com', feedUrl: 'https://beyond-label.com/products.json', community: 'hijabi', currency: 'AED', category: 'Abayas & kaftans', city: 'Dubai', vibe: 'elegant' },
  { slug: 'lameera-moda', name: 'LaMeera Moda', homepage: 'https://lameeramoda.com', feedUrl: 'https://lameeramoda.com/products.json', community: 'hijabi', currency: 'USD', category: 'Modest dresses & abayas', city: 'Dearborn, Michigan', vibe: 'elegant' },
  { slug: 'meriam-abdulaziz', name: 'Meriam Abdulaziz', homepage: 'https://bymeriamabdulaziz.com', feedUrl: 'https://bymeriamabdulaziz.com/products.json', community: 'hijabi', currency: 'AED', category: 'Abayas', city: 'Dubai', vibe: 'elegant' },
  { slug: 'beyza', name: 'Beyza', homepage: 'https://beyzaonline.com', feedUrl: 'https://beyzaonline.com/products.json', community: 'hijabi', currency: 'TRY', category: 'Abayas', city: 'Istanbul', vibe: 'elegant' },
  { slug: 'store-wf', name: 'Store WF', homepage: 'https://storewf.com', feedUrl: 'https://storewf.com/products.json', community: 'hijabi', currency: 'GBP', category: 'Modest sets & separates', city: 'London', vibe: 'elegant' },
  { slug: 'abayabuth', name: 'AbayaButh', homepage: 'https://abayabuth.com', feedUrl: 'https://abayabuth.com/products.json', community: 'hijabi', currency: 'GBP', category: 'Abayas', city: 'United Kingdom', vibe: 'elegant' },
  { slug: 'abadia', name: 'Abadia', homepage: 'https://shop.abadia.me', feedUrl: 'https://shop.abadia.me/products.json', community: 'hijabi', currency: 'AED', category: 'Modest dresses & ready-to-wear', city: 'Riyadh', vibe: 'elegant' },
  { slug: 'ahlam-collections', name: 'Ahlam Collections', homepage: 'https://ahlamcollections.com', feedUrl: 'https://ahlamcollections.com/products.json', community: 'hijabi', currency: 'CAD', category: 'Abayas', city: 'Canada', vibe: 'elegant' },
  { slug: 'aurora-abaya', name: 'Aurora Abaya', homepage: 'https://www.aurorabaya.de', feedUrl: 'https://www.aurorabaya.de/products.json', community: 'hijabi', currency: 'EUR', category: 'Abayas', city: 'Bochum', vibe: 'elegant' },
  { slug: 'modista', name: 'Modista', homepage: 'https://modistaapparel.com', feedUrl: 'https://modistaapparel.com/products.json', community: 'hijabi', currency: 'USD', category: 'Abayas & hijabs', city: 'Canada', vibe: 'elegant' },
  { slug: 'awrah-abayas', name: 'Awrah Abayas', homepage: 'https://awrahabayas.com', feedUrl: 'https://awrahabayas.com/products.json', community: 'hijabi', currency: 'GBP', category: 'Abayas', city: 'United Kingdom', vibe: 'elegant' },
  { slug: 'ilovemodesty', name: 'iLoveModesty', homepage: 'https://ilovemodesty.com', feedUrl: 'https://ilovemodesty.com/products.json', community: 'hijabi', currency: 'USD', category: 'Modest dresses', city: 'Mississauga, Ontario', vibe: 'elegant' },
  { slug: 'rutba-abaya', name: 'Rutba Fashion Abaya', homepage: 'https://rutbafashionabaya.com', feedUrl: 'https://rutbafashionabaya.com/products.json', community: 'hijabi', currency: 'AED', category: 'Abayas', city: 'Dubai', vibe: 'elegant' },
  { slug: 'zuhre', name: 'Zühre', homepage: 'https://zuhre.com.tr', feedUrl: 'https://zuhre.com.tr/products.json', community: 'hijabi', currency: 'TRY', category: 'Modest', city: 'Istanbul', vibe: 'elegant' },
  { slug: 'ria-miranda', name: 'Ria Miranda', homepage: 'https://riamiranda.com', feedUrl: 'https://riamiranda.com/products.json', community: 'hijabi', currency: 'IDR', category: 'Modest ready-to-wear', city: 'Jakarta', vibe: 'elegant' },
  { slug: 'nurmire', name: 'Nurmirè', homepage: 'https://www.nurmire.se', feedUrl: 'https://www.nurmire.se/products.json', community: 'hijabi', currency: 'SEK', category: 'Hijabs', city: 'Sweden', vibe: 'elegant' },
  { slug: 'hidayah', name: 'Hidayah', homepage: 'https://hidayah.dk', feedUrl: 'https://hidayah.dk/products.json', community: 'hijabi', currency: 'DKK', category: 'Hijabs', city: 'Holbæk', vibe: 'elegant' },
  { slug: 'modest-timeless', name: 'Modest & Timeless', homepage: 'https://modesttimeless.com', feedUrl: 'https://modesttimeless.com/products.json', community: 'hijabi', currency: 'NOK', category: 'Modest dresses', city: 'Norway', vibe: 'elegant' },
  { slug: 'aeon-abaya', name: 'Aeon Abaya', homepage: 'https://aeonabaya.net', feedUrl: 'https://aeonabaya.net/products.json', community: 'hijabi', currency: 'KWD', category: 'Abayas & modest separates', city: 'Kuwait City', vibe: 'elegant' },
  { slug: 'nour-al-houda', name: 'Nour Al Houda (BNAH)', homepage: 'https://nouralhouda.com.au', feedUrl: 'https://nouralhouda.com.au/products.json', community: 'hijabi', currency: 'AUD', category: 'Modest & abayas', city: 'Sydney', vibe: 'elegant' },
  { slug: 'abayas-boutique', name: 'Abayas Boutique', homepage: 'https://abayasboutique.com', feedUrl: 'https://abayasboutique.com/wp-json/wc/store/v1/products', community: 'hijabi', currency: 'GBP', category: 'Abayas', city: 'United Kingdom', vibe: 'elegant', platform: 'woo' },

  // — 2026-08-13: Tina's pick from the affordability-ranked candidate list.
  //   Every feed re-probed live (currency via Shopify.currency.active, not
  //   guessed from price numbers — §3). Two feeds are non-English and were NOT
  //   in data/translate-brands.json's language set before today: German
  //   (golden-dune, glamberry) and French (la-petite-parisienne) needed real
  //   vocabulary added to lib/tag.ts's FOREIGN_RULES first (chemise/veste/haut/
  //   trench/bermuda/mantel/unterrock/open-left "bluse"/gandoura/jellaba) —
  //   measured against each live feed before adding, with regression tests in
  //   lib/tag.test.ts. So Classy's 'jellaba'/'gandoura' words were already
  //   needed for a DIFFERENT reason: its entire 26-item feed is 0% in stock as
  //   of today (verified via variants[].available), so it will publish ZERO
  //   products until it restocks — added anyway since Tina asked for it and
  //   `npm run refresh` will pick up stock the moment it returns.
  { slug: 'golden-dune', name: 'The Golden Dune', homepage: 'https://thegoldendune.com', feedUrl: 'https://thegoldendune.com/products.json', community: 'hijabi', currency: 'EUR', category: 'Modest', city: 'Germany', vibe: 'elegant' },
  { slug: 'la-petite-parisienne', name: 'La Petite Parisienne', homepage: 'https://lapetiteparisienne.co', feedUrl: 'https://lapetiteparisienne.co/products.json', community: 'hijabi', currency: 'EUR', category: 'Modest', city: 'France', vibe: 'elegant' },
  { slug: 'hijabipop', name: 'Hijabi Pop', homepage: 'https://hijabipop.com', feedUrl: 'https://hijabipop.com/products.json', community: 'hijabi', currency: 'USD', category: 'Hijabs & modest', city: 'USA', vibe: 'elegant' },
  { slug: 'bayt-el-hayat', name: 'Bayt El Hayat', homepage: 'https://baytelhayat.co.uk', feedUrl: 'https://baytelhayat.co.uk/products.json', community: 'hijabi', currency: 'GBP', category: 'Hijabs & abayas', city: 'United Kingdom', vibe: 'elegant' },
  { slug: 'mondo-the-label', name: 'Mondo The Label', homepage: 'https://mondothelabel.com', feedUrl: 'https://mondothelabel.com/products.json', community: 'hijabi', currency: 'CAD', category: 'Modest', city: 'Canada', vibe: 'elegant' },
  { slug: 'glamberry', name: 'Glamberry Shop', homepage: 'https://www.glamberryshop.com', feedUrl: 'https://www.glamberryshop.com/products.json', community: 'hijabi', currency: 'EUR', category: 'Hijabs & modest', city: 'Germany', vibe: 'elegant' },
  // Entire catalogue is 3 abayas, same pattern as Zayda/Khair Archives above.
  { slug: 'ay-collection', name: 'AY Collection', homepage: 'https://ay-collection.com', feedUrl: 'https://ay-collection.com/products.json', community: 'hijabi', currency: 'EUR', category: 'Abayas', city: 'Europe', vibe: 'elegant' },
  { slug: 'so-classy', name: 'So Classy', homepage: 'https://soclassyfr.com', feedUrl: 'https://soclassyfr.com/products.json', community: 'hijabi', currency: 'EUR', category: 'Modern abayas', city: 'France', vibe: 'elegant' },
  { slug: 'bybdsha', name: 'BYBDSHA', homepage: 'https://bybdsha.com', feedUrl: 'https://bybdsha.com/products.json', community: 'hijabi', currency: 'GBP', category: 'Modest', city: 'United Kingdom', vibe: 'elegant' },
  // German-language feed (lang="de", Shopify.currency EUR verified live) — added to
  // data/translate-brands.json as 'de'. Dresses/sets/tops/abayas/kimonos, no
  // product_type or tags on any sampled row, so classification relies on title alone
  // (already-supported German vocabulary: kleid/oberteil/zweiteiler/abaya/kimono).
  { slug: 'parladusa', name: 'Parladusa', homepage: 'https://parladusa.com', feedUrl: 'https://parladusa.com/products.json', community: 'hijabi', currency: 'EUR', category: 'Modest', city: 'Germany', vibe: 'elegant' },
];
