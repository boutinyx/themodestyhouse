import { describe, it, expect } from 'vitest';
import { tagDiscovery, classifyFromType, GARMENT_VALUES, GARMENT_LABELS } from './tag';

describe('tagDiscovery', () => {
  it('detects a swim garment', () => {
    const r = tagDiscovery({ title: 'Long Sleeve Modest Swimsuit', productType: 'Swimwear', tags: [] });
    expect(r.garment).toBe('swim');
    expect(r.activity).toContain('swim');
  });
  it('detects a dress and wedding occasion', () => {
    const r = tagDiscovery({ title: 'Aurelia Wedding Guest Maxi Dress', productType: 'Dresses', tags: ['formal'] });
    expect(r.garment).toBe('dress');
    expect(r.occasion).toContain('wedding');
    expect(r.occasion).toContain('formal');
  });
  it('detects a hijab', () => {
    const r = tagDiscovery({ title: 'Chiffon Silk Hijab', productType: 'Hijabs', tags: [] });
    expect(r.garment).toBe('hijab');
  });
  it('tags a "Maxi Skirt" as a skirt, not a dress', () => {
    expect(tagDiscovery({ title: 'White Tiered Maxi Skirt', productType: '', tags: [] }).garment).toBe('skirt');
    expect(tagDiscovery({ title: 'Polka Dots Maxi Skirt', productType: '', tags: [] }).garment).toBe('skirt');
  });
  it('still tags a "Maxi Dress" as a dress', () => {
    expect(tagDiscovery({ title: 'Selena Long Sleeve Maxi Dress', productType: '', tags: [] }).garment).toBe('dress');
  });
  it('uses maxi/midi as a dress fallback when no garment word is present', () => {
    expect(tagDiscovery({ title: 'Azealia Flare Maxi - Grape', productType: '', tags: [] }).garment).toBe('dress');
  });
  it('falls back to other', () => {
    const r = tagDiscovery({ title: 'Gift Card', productType: '', tags: [] });
    expect(r.garment).toBe('other');
  });

  // ---------------------------------------------------------------------------
  // FRENCH-LANGUAGE FEEDS (White Icy, added 2026-08-06).
  //
  // The tagger was English-only, so a 29-product French catalogue produced 11
  // `other` drops AND 11 misclassifications — because /jean/ in the trousers
  // rule matches the FRENCH word for denim, which is a MATERIAL there, not a
  // garment. A denim skirt, a denim dress and a denim trench all published as
  // trousers. Same failure class as §10.10, across a language boundary.
  // Titles below are copied verbatim from the live feed.
  // ---------------------------------------------------------------------------
  const g = (title: string) => tagDiscovery({ title, productType: '', tags: [] }).garment;

  it('reads French garment nouns', () => {
    expect(g('Chemise popeline classique Irene')).toBe('top');
    expect(g('Jupe evasee Claire')).toBe('skirt');
    expect(g('Robe Abaya Nerissa')).toBe('abaya');
    expect(g('Pantalon Marie')).toBe('trousers');
    expect(g('ENSEMBLE NAYA')).toBe('set');
    expect(g('Haut Nour Style Boheme')).toBe('top');
    expect(g('Trench long MAEVA')).toBe('top');
  });

  it('does not let French "jean" (= denim, a material) override the real garment', () => {
    expect(g('Jupe en jean evase Safiya')).toBe('skirt');
    expect(g('JUPE EN JEAN CELIA')).toBe('skirt');
    // ACCEPTED WRONG: this is a denim DRESS but publishes as trousers. Making
    // French "Robe" mean dress requires a rule that, wherever it is placed,
    // either misclassifies four English products ("Robe Cardigan", "Robe Skirt
    // Set") or never fires. One French row wrong beats four English rows wrong.
    expect(g('Robe jean Mei col mao')).toBe('trousers');
    expect(g('Ensemble Jupe Jean Jeanne')).toBe('skirt');
    expect(g('Veste trench en Jean Louise')).toBe('top');
    // A jacket co-ord: 'set' would be ideal, but `veste` resolves before `set`.
    // Still an improvement on the old answer, which was trousers.
    expect(g('Ensemble avec veste en jean Nelia')).toBe('top');
  });

  it('still tags English denim as trousers', () => {
    expect(g('High Waisted Wide Leg Jeans')).toBe('trousers');
    expect(g('Straight Leg Jean')).toBe('trousers');
  });

  it('improves English outerwear that was previously unclassified', () => {
    expect(g('Longline Trench Coat')).toBe('top');
  });

  it('a French garment noun never outranks an earlier English rule', () => {
    // "Chemise Dress" must stay a dress: the dress rule precedes the top rule.
    expect(g('Chemise Dress')).toBe('dress');
    expect(g('Abaya en jean')).toBe('abaya');
  });

  // English "robe" is NOT a dress — it is a layering piece. French "Robe" is.
  // Adding /\brobe\b/ to the dress rule reclassified 4 real Mariam's products;
  // titles below are verbatim from the catalogue.
  it('does not treat English "robe" as a dress when a real garment word is present', () => {
    expect(g('Waffle Knit Robe Cardigan | Belted Oversized Sweater Coat(MS198)')).toBe('top');
    expect(g('Floral Print Muslim Trench Coat - Modest Commuter Jacket Cape Robe(MOA212)')).toBe('top');
    expect(g('Muslim Modest Fashion Wrinkle-Texture Robe Skirt Set(MS103)')).toBe('skirt');
  });

  it('classifies English outerwear that previously matched no rule', () => {
    expect(g('Lena Long Trench - Beige')).toBe('top');
    expect(g('Short Trench Jacket | Dark Brown')).toBe('top');
    expect(g('Alpaca Wool Winter Trench with Calligraphy')).toBe('top');
  });
});

// ---------------------------------------------------------------------------
// WORD BOUNDARIES on `set` and `trousers` (2026-08-10).
//
// §10.10 recorded the unanchored-substring bug class as fixed. These two rules
// were missed: `set` matched inside sunset / corset / rosette / Tesettür, and
// `pant` inside panties / Loujean. Every title below is verbatim from a live
// feed, and every one in the first block was PUBLISHED on the wrong lane.
// ---------------------------------------------------------------------------
describe('garment rules are word-bounded', () => {
  const g = (title: string) => tagDiscovery({ title, productType: '', tags: [] }).garment;

  it('does not read "set" inside sunset, corset or rosette', () => {
    expect(g('Cotton Top – Sunset')).toBe('top');              // kimodesty, was set
    expect(g('Summer Jersey Top | Sunset Yellow')).toBe('top'); // merrachi, was set
    expect(g('Lace-Up Corset Cotton Shirt in Butter Yellow')).toBe('top'); // esme-ny, was set
    expect(g('Rosette Top')).toBe('top');                       // ria-miranda, was set
    expect(g('Kaaba Coordinates Ring | Premium')).toBe('other');// lameera-moda, was set
  });

  it('does not read "pant" inside panties or a proper noun', () => {
    expect(g('Loujean Shirt - Off-White')).toBe('top');   // bouguessa, was trousers
    expect(g('Red Side Stripped Panties')).not.toBe('trousers');
    expect(g('Diamond Net Panty')).not.toBe('trousers');
  });

  it('still matches every real garment word the old rules caught', () => {
    expect(g('Twinset Linen/Cotton S26 – Stone')).toBe('set');        // noureen
    expect(g('Oversized 2-delig setje met wijde broek')).toBe('set'); // mukistore, nl
    expect(g('Premium Quality Thick Joggingset Zipper Detail')).toBe('set');
    expect(g('Sahara Co-Ord Set Butter Yellow')).toBe('set');
    expect(g('Wide Leg Utility Sweatpants - Cloud')).toBe('trousers');   // fares
    expect(g('Unisex Sweatpant - Cocoa')).toBe('trousers');              // zahraa
    expect(g('Ecru Front-Pleated Culotte Trousers')).toBe('trousers');   // arakai
    expect(g('Second Skin Leggings Ebony')).toBe('trousers');            // aab
    expect(g('Bol Paça Beyaz Pantolon')).toBe('trousers');               // baqa, tr
    expect(g('Modal Pantolonlu Takım GRİ')).toBe('trousers');            // ipekstil, tr
    expect(g('Pantalon Marie')).toBe('trousers');                        // whiteicy, fr
  });
});

// ---------------------------------------------------------------------------
// TURKISH-LANGUAGE FEEDS (baqa, beyza, ipekstil, nihan, zuhre).
//
// Anchoring the two rules above left ~296 published Turkish garments matching
// no rule at all — and `garment: 'other'` is DROPPED by normalizeProduct. The
// vocabulary below was derived from the 36,754-record corpus, driven mainly by
// each feed's own product_type, and every word was measured before being added.
//
// The boundaries here are NOT `\b`. JavaScript's `\b` is ASCII-only, so
// `ı ş ğ ü ö ç` count as non-word characters and `\bkap\b` happily matches
// "Kapüşonlu" (hooded) and "Kapitone" (quilted). See the last test.
// ---------------------------------------------------------------------------
describe('Turkish garment vocabulary (fallback only)', () => {
  const g = (title: string, productType = '') =>
    tagDiscovery({ title, productType, tags: [] }).garment;

  it('reads the common Turkish garment nouns', () => {
    expect(g('Taş Süslemeli Elbise 9315')).toBe('dress');
    expect(g('Krem İpek Etek')).toBe('skirt');
    expect(g('Krem Kuşaklı Kısa Bluz')).toBe('top');
    expect(g('Pilise Detaylı Koton Gömlek')).toBe('top');
    expect(g('Oversize Kazak HAKİ YEŞİL')).toBe('top');
    expect(g('Kaşmir Dokulu Uzun Hırka HAKİ YEŞİL')).toBe('top');
    expect(g('Çift Düğmeli Trenç LACİVERT')).toBe('top');
    expect(g('Fermuarlı Kapüşonlu Giyçık 9514')).toBe('top');
    expect(g('Kahverengi Uzun Kap')).toBe('top');
    expect(g('Aktif Fit Takım SİYAH')).toBe('set');
  });

  it('handles the Turkish dotted capital İ', () => {
    // 'İ'.toLowerCase() is 'i' + U+0307 COMBINING DOT ABOVE, which no /i/ regex
    // folds — /elbise/i does NOT match 'ELBİSE'. 37 catalogue rows depend on it.
    expect(g('5629 ELBİSE ZİNCİRLİ')).toBe('dress');
    expect(g('9412 ELBİSE DESENLİ QUPRA')).toBe('dress');
  });

  it('files a ferace as an abaya, not as outerwear', () => {
    // A ferace is a full-length loose overgarment — the same garment class this
    // catalogue already means by abaya|jilbab|kaftan. Confirmed by Tina.
    expect(g('Nervür Ve Etnik Detaylı Ferace 3427')).toBe('abaya');
    expect(g('Nakış Detaylı Su Geçirmez Spor Ferace 3835')).toBe('abaya');
  });

  it('keeps Turkish swimwear off the everyday lanes', () => {
    // `takım` means set, so without these a bikini publishes as a co-ord —
    // and §7 keeps swim on its own lane.
    expect(g('Büzgülü Bikini Takımı')).toBe('swim');
    expect(g('Moeva Siyah Asimetrik Mayo')).toBe('swim');
  });

  it('never lets a Turkish word beat an English classification', () => {
    // FOREIGN_RULES is fallback-only, so an English match always wins first.
    expect(g('Tunik Pantolon Takım 9240')).toBe('trousers');
    expect(g('Desenli Şifon Kimono Bluz')).toBe('abaya');
  });

  it('does not match a Turkish word inside a longer one', () => {
    // THE ASCII-BOUNDARY TEST. `\bkap\b` matches "Kapitone" (quilted) because ü
    // and ı are not \w characters — which published this handbag as a top.
    expect(g('Kapitone Puf Çanta VİZON')).toBe('other');
    // "Kapama" (fastening) must not make a dress into outerwear either.
    expect(g('Arduva Yapışkan Taş Detaylı Kruvaze Kapama Tesettür Elbise 5383')).toBe('dress');
    expect(g('Anvelop Kapama Yüksek Bel Modal Pantolon - Siyah')).toBe('trousers');
  });
});

describe('pass 3 — description lead (last resort only)', () => {
  const HIJAB_BODY = '<p>Bamboo jersey hijab. Gentle on sensitive skin and versatile in styling.</p>';

  it('rescues a product whose title is only a colourway', () => {
    // Real ABYYA products: the title is the colour, product_type is empty, and
    // the garment is named only in the description.
    expect(tagDiscovery({ title: 'Hazelnut', productType: '', tags: [] }).garment).toBe('other');
    expect(tagDiscovery({ title: 'Hazelnut', productType: '', tags: [], bodyHtml: HIJAB_BODY }).garment).toBe('hijab');
  });

  it('never overrides a garment the title already established', () => {
    // Cross-sell copy in the body must not beat the title.
    const g = tagDiscovery({
      title: 'Linen Maxi Skirt',
      productType: '',
      tags: [],
      bodyHtml: '<p>Our bestselling abaya pairs beautifully with this piece.</p>',
    }).garment;
    expect(g).toBe('skirt');
  });

  it('never overrides a garment product_type already established', () => {
    const g = tagDiscovery({
      title: 'Tenerife',
      productType: 'Abaya',
      tags: [],
      bodyHtml: '<p>Wear it with our hijab collection.</p>',
    }).garment;
    expect(g).toBe('abaya');
  });

  it('only reads the opening of the description', () => {
    // A garment word far into the marketing copy must not classify the product.
    const far = '<p>' + 'x'.repeat(400) + ' hijab</p>';
    expect(tagDiscovery({ title: 'Mystery', productType: '', tags: [], bodyHtml: far }).garment).toBe('other');
  });

  it('is inert when there is no description', () => {
    expect(tagDiscovery({ title: 'Mystery', productType: '', tags: [] }).garment).toBe('other');
  });
});

describe('non-English garment vocabulary (fallback only)', () => {
  const g = (title: string, productType = '') =>
    tagDiscovery({ title, productType, tags: [] }).garment;

  it('classifies French, German and Dutch garment names', () => {
    expect(g('Robe évasée Lilas Pastel')).toBe('dress');       // fr
    expect(g('Tenerife', 'Kleid')).toBe('dress');              // de, via product_type
    expect(g('La Palma', 'Zweiteiler')).toBe('set');           // de
    expect(g('Jupe été froncée sauge')).toBe('skirt');         // fr
    expect(g('Pantalon ample coton blanc')).toBe('trousers');  // fr
  });

  it('never lets a foreign word beat an English classification', () => {
    // These are the cases that made `robe` unsafe inside GARMENT_RULES. Because
    // FOREIGN_RULES runs only after that list fails, they resolve correctly.
    expect(g('Waffle Knit Robe Cardigan')).toBe('top');
    expect(g('Cape Robe trench')).toBe('top');
  });

  it('keeps abaya distinct from dress', () => {
    // Some feeds set product_type "Robe" on what this catalogue calls an abaya.
    // Measured: as an equal-priority rule this flipped 201 products.
    expect(g('Abaya Essential - Soft Green')).toBe('abaya');
    expect(g('Abaya - Grey', 'Robe')).toBe('abaya');
  });

  it('omits foreign words that collide with English', () => {
    // German "rock" (skirt) vs rock/rocky, "Hose" (trousers) vs hose/hosiery.
    expect(g('Sample', 'rock')).toBe('other');
    expect(g('Rocky Ridge Bag Charm')).not.toBe('skirt');
  });
});

describe('German/French garment vocabulary added for new brands (2026-08-13)', () => {
  const g = (title: string, productType = '') =>
    tagDiscovery({ title, productType, tags: [] }).garment;

  it('reads German compounds that "kleid"-style open-left matching did not cover', () => {
    // Glamberry Shop — real live-feed titles.
    expect(g('Hemdbluse mit Taillengürtel aus Baumwolle-Viskose-Mischung')).toBe('top');
    expect(g('Unterrock aus Viskose')).toBe('skirt');
    // Golden Dune — "Mäntel" (coats) carried no English match at all before this.
    expect(g('OVERSIZED MÄNTEL')).toBe('top');
    expect(g('KIAH MANTEL')).toBe('top');
  });

  it('reads French garment nouns missing from the original French pass (La Petite Parisienne)', () => {
    expect(g('Chemise LINA bleue (26CY633)')).toBe('top');
    expect(g('Veste LEANE courte kaki (w25218)')).toBe('top');
    expect(g('Haut bustier satiné noir (L2120)')).toBe('top');
    expect(g('Trench long SARA kaki (W25259)')).toBe('top');
    expect(g('Bermuda ASIAN beige (MA6815)')).toBe('trousers');
  });

  it('reads Moroccan robe words with no product_type/tags to fall back on (So Classy)', () => {
    expect(g('Gandoura Lazraq')).toBe('abaya');
    expect(g('Jellaba Mahra')).toBe('abaya');
  });

  it('still lets an English match win first', () => {
    // "veste" must not fire inside "invested"/"divested"; "mantel" is a real
    // English word (fireplace mantel) but never appears in this catalogue.
    expect(g('Invested Interest Tote')).not.toBe('top');
    expect(g('Bridesmaid Sundress')).toBe('dress');
  });

  it('reads a few more real gaps found while measuring the new brands (2026-08-13)', () => {
    expect(g('Snatched Lycra Shayla')).toBe('hijab');          // hijabipop
    expect(g('Carré de soie Foulard 14')).toBe('hijab');       // la-petite-parisienne
    expect(g('Teeshirt épaulette blanc')).toBe('top');         // la-petite-parisienne
    expect(g('LANGE ANZUGWESTE')).toBe('top');                 // golden-dune
    // "Western Style Abaya" must not become `top` via the open-left "weste" match.
    expect(g('Cardigan Abaya, Western Style Abaya')).not.toBe('top');
  });
});

describe('word-boundary hardening (2026-08-12)', () => {
  it('does not classify a Spanish dress ("Vestido") as a top via the unanchored "vest" match', () => {
    expect(tagDiscovery({ title: 'Vestido Largo Azul', productType: '', tags: [] }).garment).not.toBe('top');
  });
  it('does not classify a petticoat as a top via the unanchored "coat" match', () => {
    expect(tagDiscovery({ title: 'Cotton Petticoat Underskirt', productType: '', tags: [] }).garment).not.toBe('top');
  });
  it('does not classify a headdress as a dress via the unanchored "dress" match', () => {
    expect(tagDiscovery({ title: 'Beaded Headdress', productType: '', tags: [] }).garment).not.toBe('dress');
  });
  it('still classifies real tops/dresses containing these substrings as themselves', () => {
    expect(tagDiscovery({ title: 'Wool Overcoat', productType: '', tags: [] }).garment).toBe('top');
    expect(tagDiscovery({ title: 'Quilted Vest', productType: '', tags: [] }).garment).toBe('top');
    expect(tagDiscovery({ title: 'Bridesmaid Sundress', productType: '', tags: [] }).garment).toBe('dress');
  });
});

describe('classification source', () => {
  it('reports "title" when the title itself matched', () => {
    expect(tagDiscovery({ title: 'Chiffon Silk Hijab', productType: 'Hijabs', tags: [] }).source).toBe('title');
  });
  it('reports "meta" when only product_type/tags matched, not the title', () => {
    const r = tagDiscovery({ title: 'The Boa Label', productType: 'Tops', tags: [] });
    expect(r.garment).toBe('top');
    expect(r.source).toBe('meta');
  });
  it('reports "foreign" when a foreign-vocabulary rule matched', () => {
    const r = tagDiscovery({ title: 'Robe évasée Lilas Pastel', productType: '', tags: [] });
    expect(r.garment).toBe('dress');
    expect(r.source).toBe('foreign');
  });
  it('reports "description" when only the description lead matched', () => {
    const r = tagDiscovery({
      title: 'Hazelnut', productType: '', tags: [],
      bodyHtml: '<p>A bamboo jersey hijab in a warm hazelnut tone.</p>',
    });
    expect(r.garment).toBe('hijab');
    expect(r.source).toBe('description');
  });
});

describe('classifyFromType', () => {
  it('classifies from product_type alone', () => {
    expect(classifyFromType('Dresses')).toBe('dress');
    expect(classifyFromType('Trousers')).toBe('trousers');
  });
  it('returns "other" for an empty or non-matching type', () => {
    expect(classifyFromType('')).toBe('other');
    expect(classifyFromType('Accessories')).toBe('other');
  });
});

describe('GARMENT_VALUES / GARMENT_LABELS', () => {
  it('has a label for every garment value, and only those values', () => {
    for (const g of GARMENT_VALUES) expect(GARMENT_LABELS[g]).toBeTruthy();
    expect(GARMENT_VALUES).toContain('other');
  });
});

describe('top vocabulary: tee/hoodie/cape/crewneck/button-up (2026-08-12)', () => {
  // Found via the overnight review-queue audit: real titles with a real top
  // word that matched no GARMENT_RULES rule at all, so they either fell to
  // 'other' or landed on a noisy hay match. Measured against the full
  // 38,074-row corpus before adding: 161 rows changed, all but 2 confirmed
  // correct fixes — see the GARMENT_RULES comment for the 2 accepted
  // tradeoffs (German "Zweiteiler mit Cape" losing its FOREIGN_RULES 'set'
  // match once 'cape' matches first in English).
  it('classifies real corpus titles that previously matched nothing', () => {
    expect(tagDiscovery({ title: 'High Neck Tee | Dark Cherry', productType: '', tags: [] }).garment).toBe('top');
    expect(tagDiscovery({ title: 'Comfy Hoodie | White Honey', productType: '', tags: [] }).garment).toBe('top');
    expect(tagDiscovery({ title: 'Fluid Cape | Taupe Rose', productType: '', tags: [] }).garment).toBe('top');
    expect(tagDiscovery({ title: 'Colour Block Buttery Crewneck - Toasted Marshmallo', productType: '', tags: [] }).garment).toBe('top');
    expect(tagDiscovery({ title: 'Lace Trim Longline Button Up - Haze', productType: '', tags: [] }).garment).toBe('top');
  });
});

describe('jumpsuit/romper/gilet/parka + German "bluse" + Turkish "tulum" (2026-08-12)', () => {
  // More gaps found the same audit pass: one-piece garments (jumpsuit/romper)
  // and outerwear (gilet/parka) matched no rule at all. Measured against the
  // full corpus before adding: 47 changed, all confirmed correct — including
  // a jumpsuit correctly beating its own "wide leg" trouser-like description,
  // since a jumpsuit is fundamentally one-piece, not simply trousers.
  it('maps one-piece garments to dress', () => {
    expect(tagDiscovery({ title: 'Striped V-Neck Jumpsuit', productType: '', tags: [] }).garment).toBe('dress');
    expect(tagDiscovery({ title: 'Cotton Jersey Romper', productType: '', tags: [] }).garment).toBe('dress');
    expect(tagDiscovery({ title: 'Wide Leg Utility Corduroy Jumpsuit', productType: '', tags: [] }).garment).toBe('dress');
  });
  it('maps gilet/parka to top', () => {
    expect(tagDiscovery({ title: 'Gathered Shoulder Cupra Gilet', productType: '', tags: [] }).garment).toBe('top');
    expect(tagDiscovery({ title: 'Parka à capuche burgundy', productType: '', tags: [] }).garment).toBe('top');
  });
  it('reads German "Bluse" and Turkish "Tulum" as fallbacks', () => {
    expect(tagDiscovery({ title: 'Chiffon-dot Bluse', productType: '', tags: [] }).garment).toBe('top');
    expect(tagDiscovery({ title: 'Kemer Detaylı Kahverengi Tulum', productType: '', tags: [] }).garment).toBe('dress');
  });
});

describe('"neck cover" classifies as hijab, not a fallback guess (2026-08-12)', () => {
  // The exact case that started the whole garment-classification project (a
  // Reddit screenshot of an iLoveModesty "Neck Cover" showing as a "dress").
  // Root cause: no product_type, tags "Cover-Ups"/"Neck Covers", so it fell
  // through title/meta/foreign to the description pass, which parsed
  // unrelated cross-sell prose. Fixed at the source instead of papering over
  // it in confidence scoring — see lib/garmentReview.ts's doc comment for why
  // that path can never re-verify a description-sourced guess.
  it('classifies from the title directly', () => {
    expect(tagDiscovery({ title: 'Navy Blue Square Neck Cover', productType: '', tags: [] }).garment).toBe('hijab');
    expect(tagDiscovery({ title: 'Black Neck Cover', productType: '', tags: [] }).garment).toBe('hijab');
  });
  it('beats an unanchored "set" match (nasiba: "Long Neck Cover" was landing as set)', () => {
    expect(tagDiscovery({ title: 'Long Neck Cover - Port Royale', productType: '', tags: [] }).garment).toBe('hijab');
  });
});

describe('"pull maille" classifies at ingest time, not via override (2026-08-12)', () => {
  // French "pull" (sweater) stays deliberately excluded bare — collides with
  // English "pull-on" — but "maille" (knit) never appears anywhere else in
  // the whole corpus, so this specific two-word phrase is zero-risk. Found
  // when a garment-override for these 2 ids turned out to be structurally
  // powerless: an item that fails classification at INGEST time never gets
  // added to raw-products.json at all, so a publish-time override has
  // nothing to attach to. Fixed at the source instead.
  it('classifies from the title directly', () => {
    expect(tagDiscovery({ title: 'Pull maille dark brown', productType: '', tags: [] }).garment).toBe('top');
    expect(tagDiscovery({ title: 'Pull maille beige', productType: '', tags: [] }).garment).toBe('top');
  });
});
