import { describe, it, expect } from 'vitest';
import { tagDiscovery } from './tag';

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
