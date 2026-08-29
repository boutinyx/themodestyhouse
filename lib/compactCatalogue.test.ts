import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { encodeCatalogue, decodeCard } from './compactCatalogue';
import type { Product, Brand } from './types';
import { BRANDS } from '@/data/brands';

// A literal product/brand pair, not invented — the URL structure (handle
// derivable from homepage) mirrors real catalogue rows. NOTE: a row's currency
// is the one its FEED served, which need not equal data/brands.ts (Invariant 15).
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
  // ---- the index/card tier split (2026-08-26) -------------------------------
  // /directory shipped 2,564,326 bytes of document, 92% of it this payload, to
  // render 24 cards. The columns only decodeCard reads — shopifyId,
  // imagePrefixIdx, imageFile, urlTail, altUrl — were 69% of those bytes and are
  // never touched by a filter or a sort, so they no longer travel for every row.
  // → docs/superpowers/plans/2026-08-26-split-catalogue-payload.md
  const manyProducts = (n: number): Product[] =>
    Array.from({ length: n }, (_, i) => ({
      ...PRODUCT,
      id: `aab:${1000 + i}`,
      title: `Elowen Wrap Dress ${i}`,
      url: `https://us.aabcollection.com/products/elowen-wrap-dress-${i}`,
    }));

  it('describes every row in the index tier but only the embedded window in the card tier', () => {
    const products = manyProducts(100);
    const full = encodeCatalogue(products, [BRAND]);
    const split = encodeCatalogue(products, [BRAND], { embedCards: 24 });

    // The index tier must still cover every row — filtering and sorting depend on it.
    expect(split.rows.title).toHaveLength(100);
    expect(split.rows.price).toHaveLength(100);
    expect(split.rows.brandIdx).toHaveLength(100);
    expect(split.rowCount).toBe(100);

    // The card tier carries only what the first screenful needs.
    expect(Object.keys(split.cards.rows)).toHaveLength(24);
    expect(split.cards.rows[0].imageFile).toBe(full.cards.rows[0].imageFile);
    expect(split.cards.rows[23]).toBeDefined();
    expect(split.cards.rows[24]).toBeUndefined();
  });

  it('is substantially smaller than the un-split encoding', () => {
    const products = manyProducts(100);
    const size = (o: unknown) => Buffer.byteLength(JSON.stringify(o));
    const full = size(encodeCatalogue(products, [BRAND]));
    const split = size(encodeCatalogue(products, [BRAND], { embedCards: 24 }));
    expect(split).toBeLessThan(full * 0.6);
  });

  it('embeds every row when embedCards is not given, so existing callers are unchanged', () => {
    const products = manyProducts(100);
    const cat = encodeCatalogue(products, [BRAND]);
    expect(Object.keys(cat.cards.rows)).toHaveLength(100);
    expect(decodeCard(cat, 99)).not.toBeNull();
  });

  it('returns null for a row whose card data has not been fetched', () => {
    const split = encodeCatalogue(manyProducts(100), [BRAND], { embedCards: 24 });
    expect(decodeCard(split, 0)).not.toBeNull();
    expect(decodeCard(split, 50)).toBeNull();
  });

  it('decodes a row once its card data is supplied out of band', () => {
    const products = manyProducts(100);
    const split = encodeCatalogue(products, [BRAND], { embedCards: 24 });
    const full = encodeCatalogue(products, [BRAND]);
    const extra = { rows: { 50: full.cards.rows[50] } };
    const card = decodeCard(split, 50, extra);
    expect(card).not.toBeNull();
    expect(card!.title).toBe('Elowen Wrap Dress 50');
    expect(card!.url).toBe('https://us.aabcollection.com/products/elowen-wrap-dress-50');
    // Identical to what the un-split encoding produces for the same row —
    // the split must not change a single decoded value (Invariant 1: the id is
    // the join key, and the url is what a visitor is actually sent to).
    expect(card).toEqual(decodeCard(full, 50));
  });

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
    const card = decodeCard(cat, 0)!;
    expect(card.url).toBe(WOO_PRODUCT.url);
    expect(card.image).toBe(WOO_PRODUCT.image);
    expect(card.currency).toBe(WOO_PRODUCT.currency);
  });

  // Explicit timeout, not the 5,000 ms default: this encodes and decodes all
  // ~18,900 published rows and has been measured close enough to the default
  // that the catalogue growing overnight (§10.35) could turn it red on a commit
  // that has nothing to do with it — which is the expensive kind of failure,
  // because it gets misattributed before it gets diagnosed.
  //
  // Options go SECOND, before the body: `it(name, fn, {timeout})` was removed
  // in Vitest 4 and throws at collection time, taking the whole FILE down
  // rather than the one test.
  it('round-trips every published product exactly', { timeout: 15000 }, () => {
    const f = path.join(process.cwd(), 'data', 'products.json');
    const products = JSON.parse(readFileSync(f, 'utf8')) as Product[];
    const cat = encodeCatalogue(products, BRANDS);
    for (let i = 0; i < products.length; i++) {
      const card = decodeCard(cat, i)!;
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

  // CHANGED 2026-08-26. This used to assert the opposite — that a row must match
  // `data/brands.ts`. That rule is what put a wrong price on 24% of the catalogue:
  // Shopify Markets serves a per-requester currency, so the FEED is right and the
  // config is only an expectation. → docs/log/2026-08-26-currency-mislabelling.md
  it('takes the currency from the ROW, not from the brand record', () => {
    const served: Product = { ...PRODUCT, currency: 'EUR' };
    const cat = encodeCatalogue([served], [BRAND]);
    expect(BRAND.currency).not.toBe('EUR'); // the config still says something else
    expect(cat.brands[0].currency).toBe('EUR');
    expect(decodeCard(cat, 0)!.currency).toBe('EUR');
  });

  // Decode reads one currency per brand, so rows that disagree cannot all be
  // rendered correctly. The real cause is a partial refresh: unseen rows stay
  // published at the old currency while refetched ones carry the new one.
  it('throws when one brand has published rows in two currencies', () => {
    const a: Product = { ...PRODUCT, id: `${PRODUCT.brandSlug}:1`, currency: 'EUR' };
    const b: Product = { ...PRODUCT, id: `${PRODUCT.brandSlug}:2`, currency: 'GBP' };
    expect(() => encodeCatalogue([a, b], [BRAND])).toThrow(/two currencies/);
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

describe('layering subtype encoding', () => {
  const NECK_COVER: Product = { ...PRODUCT, id: 'aab:1', title: 'Black Neck Cover', garment: 'dress' };
  const UNDER_DRESS: Product = { ...PRODUCT, id: 'aab:2', title: 'Long Sleeve Satin Inner Dress' };

  it('gives a non-layering product the -1 sentinel and an empty dictionary', () => {
    const cat = encodeCatalogue([PRODUCT], [BRAND]);
    expect(cat.layeringSubtypes).toEqual([]);
    // Whole column is -1 here, so it is omitted rather than shipped as a
    // run of sentinels (2026-08-19). Absent == -1 for every row.
    expect(cat.rows.layeringSubtypeIdx).toBeUndefined();
    expect(cat.rows.layeringSubtypeIdx?.[0] ?? -1).toBe(-1);
  });

  it('assigns a real index for a layering product, and only lists subtypes actually present', () => {
    const cat = encodeCatalogue([NECK_COVER], [BRAND]);
    expect(cat.layeringSubtypes).toEqual(['neck-cover']);
    expect(cat.rows.layeringSubtypeIdx![0]).toBe(0);
  });

  it('orders present subtypes canonically, not by first appearance in the input', () => {
    // UNDER_DRESS ('under-dress') is listed BEFORE NECK_COVER ('neck-cover')
    // in the input array, but neck-cover sorts first in LAYERING_SUBTYPE_LABELS.
    const cat = encodeCatalogue([UNDER_DRESS, NECK_COVER], [BRAND]);
    expect(cat.layeringSubtypes).toEqual(['neck-cover', 'under-dress']);
    expect(cat.rows.layeringSubtypeIdx![0]).toBe(cat.layeringSubtypes.indexOf('under-dress'));
    expect(cat.rows.layeringSubtypeIdx![1]).toBe(cat.layeringSubtypes.indexOf('neck-cover'));
  });

  it('a mixed catalogue keeps the -1 sentinel for non-layering rows alongside real indices', () => {
    const cat = encodeCatalogue([PRODUCT, NECK_COVER], [BRAND]);
    expect(cat.rows.layeringSubtypeIdx![0]).toBe(-1);
    expect(cat.rows.layeringSubtypeIdx![1]).toBe(0);
  });
});

describe('outerwear subtype encoding', () => {
  const VEST: Product = { ...PRODUCT, id: 'aab:3', title: 'Maren Vest', garment: 'top' };
  const COAT: Product = { ...PRODUCT, id: 'aab:4', title: 'Classic Wool Coat', garment: 'top' };

  it('gives a non-outerwear product the -1 sentinel and an empty dictionary', () => {
    const cat = encodeCatalogue([PRODUCT], [BRAND]);
    expect(cat.outerwearSubtypes).toEqual([]);
    // Whole column is -1 here, so it is omitted rather than shipped as a
    // run of sentinels (2026-08-19). Absent == -1 for every row.
    expect(cat.rows.outerwearSubtypeIdx).toBeUndefined();
    expect(cat.rows.outerwearSubtypeIdx?.[0] ?? -1).toBe(-1);
  });

  it('assigns a real index for an outerwear product, and only lists subtypes actually present', () => {
    const cat = encodeCatalogue([VEST], [BRAND]);
    expect(cat.outerwearSubtypes).toEqual(['vest']);
    expect(cat.rows.outerwearSubtypeIdx![0]).toBe(0);
  });

  it('orders present subtypes canonically, not by first appearance in the input', () => {
    // COAT is listed BEFORE VEST in the input array, but vest sorts first
    // in OUTERWEAR_SUBTYPE_LABELS (blazer, vest, cardigan, coat).
    const cat = encodeCatalogue([COAT, VEST], [BRAND]);
    expect(cat.outerwearSubtypes).toEqual(['vest', 'coat']);
    expect(cat.rows.outerwearSubtypeIdx![0]).toBe(cat.outerwearSubtypes.indexOf('coat'));
    expect(cat.rows.outerwearSubtypeIdx![1]).toBe(cat.outerwearSubtypes.indexOf('vest'));
  });

  it('a mixed catalogue keeps the -1 sentinel for non-outerwear rows alongside real indices', () => {
    const cat = encodeCatalogue([PRODUCT, VEST], [BRAND]);
    expect(cat.rows.outerwearSubtypeIdx![0]).toBe(-1);
    expect(cat.rows.outerwearSubtypeIdx![1]).toBe(0);
  });
});

describe('hijab subtype encoding', () => {
  const HIJAB: Product = { ...PRODUCT, id: 'aab:5', title: 'Plain Everyday Hijab', garment: 'hijab' };
  const JILBAB: Product = { ...PRODUCT, id: 'aab:6', title: 'Black Corduroy Jilbab', garment: 'abaya' };
  const UNDERCAP: Product = { ...PRODUCT, id: 'aab:7', title: 'Full Coverage Undercap - Walnut', garment: 'hijab' };

  it('gives a non-hijab product the -1 sentinel and an empty dictionary', () => {
    const cat = encodeCatalogue([PRODUCT], [BRAND]);
    expect(cat.hijabSubtypes).toEqual([]);
    // Whole column is -1 here, so it is omitted rather than shipped as a
    // run of sentinels (2026-08-19). Absent == -1 for every row.
    expect(cat.rows.hijabSubtypeIdx).toBeUndefined();
    expect(cat.rows.hijabSubtypeIdx?.[0] ?? -1).toBe(-1);
  });

  it('assigns a real index for a plain hijab', () => {
    const cat = encodeCatalogue([HIJAB], [BRAND]);
    expect(cat.hijabSubtypes).toEqual(['hijab']);
    expect(cat.rows.hijabSubtypeIdx![0]).toBe(0);
  });

  it('orders present subtypes canonically (hijab, khimar-jilbab, undercap), not by first appearance', () => {
    // UNDERCAP is listed BEFORE JILBAB in the input, but khimar-jilbab sorts
    // first in HIJAB_SUBTYPE_LABELS (hijab, khimar-jilbab, undercap).
    const cat = encodeCatalogue([UNDERCAP, JILBAB], [BRAND]);
    expect(cat.hijabSubtypes).toEqual(['khimar-jilbab', 'undercap']);
    expect(cat.rows.hijabSubtypeIdx![0]).toBe(cat.hijabSubtypes.indexOf('undercap'));
    expect(cat.rows.hijabSubtypeIdx![1]).toBe(cat.hijabSubtypes.indexOf('khimar-jilbab'));
  });

  it('a mixed catalogue keeps the -1 sentinel for non-hijab rows alongside real indices', () => {
    const cat = encodeCatalogue([PRODUCT, HIJAB], [BRAND]);
    expect(cat.rows.hijabSubtypeIdx![0]).toBe(-1);
    expect(cat.rows.hijabSubtypeIdx![1]).toBe(0);
  });
});

describe('hijab type-filter encoding', () => {
  // Distinct ids from the "hijab subtype encoding" block above's fixtures —
  // this is a SEPARATE, independent column, not a replacement for it.
  const JERSEY_HIJAB: Product = { ...PRODUCT, id: 'aab:10', title: 'Airy Jersey Scarf Mocha Brown', garment: 'hijab' };
  const CHIFFON_HIJAB: Product = { ...PRODUCT, id: 'aab:11', title: 'Small Premium Chiffon Hijab', garment: 'hijab' };
  const JERSEY_KHIMAR: Product = { ...PRODUCT, id: 'aab:12', title: 'Jersey Khimar Medina', garment: 'hijab' };

  it('gives a non-hijab product no type at all, and an empty dictionary', () => {
    const cat = encodeCatalogue([PRODUCT], [BRAND]);
    expect(cat.hijabTypeFilters).toEqual([]);
    // Every row here would be -1, so the column is omitted entirely rather
    // than shipped as a run of sentinels (2026-08-19). "Absent" and "-1 for
    // every row" are the same statement; readers must treat them alike.
    expect(cat.rows.hijabTypeFilterIdx).toBeUndefined();
    expect(cat.rows.hijabTypeFilterIdx?.[0] ?? -1).toBe(-1);
  });

  it('assigns a real index for a hijab product, and only lists types actually present', () => {
    const cat = encodeCatalogue([JERSEY_HIJAB], [BRAND]);
    expect(cat.hijabTypeFilters).toEqual(['jersey']);
    expect(cat.rows.hijabTypeFilterIdx![0]).toBe(0);
  });

  it('orders present types canonically, not by first appearance in the input', () => {
    // CHIFFON_HIJAB ('chiffon') is listed BEFORE JERSEY_HIJAB ('jersey') in
    // the input array, but jersey sorts first in HIJAB_TYPE_FILTER_LABELS.
    const cat = encodeCatalogue([CHIFFON_HIJAB, JERSEY_HIJAB], [BRAND]);
    expect(cat.hijabTypeFilters).toEqual(['jersey', 'chiffon']);
    expect(cat.rows.hijabTypeFilterIdx![0]).toBe(cat.hijabTypeFilters.indexOf('chiffon'));
    expect(cat.rows.hijabTypeFilterIdx![1]).toBe(cat.hijabTypeFilters.indexOf('jersey'));
  });

  it('a mixed catalogue keeps the -1 sentinel for non-hijab rows alongside real indices', () => {
    const cat = encodeCatalogue([PRODUCT, JERSEY_HIJAB], [BRAND]);
    // A MIXED catalogue keeps the column — it carries real information now.
    expect(cat.rows.hijabTypeFilterIdx).toBeDefined();
    expect(cat.rows.hijabTypeFilterIdx![0]).toBe(-1);
    expect(cat.rows.hijabTypeFilterIdx![1]).toBe(0);
  });

  it('a row can carry a real index in BOTH hijabSubtypeIdx and hijabTypeFilterIdx at once — the two columns are independent', () => {
    // JERSEY_KHIMAR is both a structural khimar (034a985's hijabSubtype:
    // 'khimar-jilbab', via isKhimarAbaya/isJilbab — wait, plain garment:
    // 'hijab' khimar wording alone does NOT satisfy isKhimarAbaya (abaya-
    // garment only) or isJilbab, so hijabSubtype() resolves this one to
    // plain 'hijab' — and separately, via THIS design's own classifier, a
    // fine-grained 'khimar' type. Both non-null, on the same row, is the
    // point: this proves the two columns don't clobber each other.
    const cat = encodeCatalogue([JERSEY_KHIMAR], [BRAND]);
    // Present here precisely because this row HAS both values — an all--1
    // column is dropped by encodeCatalogue, so the assertion that these exist
    // is itself part of what is being tested.
    expect(cat.rows.hijabSubtypeIdx?.[0]).not.toBe(-1);
    expect(cat.rows.hijabTypeFilterIdx?.[0]).not.toBe(-1);
    expect(cat.hijabTypeFilters[cat.rows.hijabTypeFilterIdx![0]]).toBe('khimar');
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
    const card = decodeCard(cat, 0)!;
    expect('firstSeen' in card).toBe(false);
    expect('firstSeenDay' in card).toBe(false);
  });
});

describe('payload: all-sentinel columns are omitted (2026-08-19)', () => {
  // Measured on the live RSC payload before this change: on /directory each of
  // layeringSubtypeIdx, outerwearSubtypeIdx, hijabSubtypeIdx and
  // hijabTypeFilterIdx was 39,767 bytes of 13,256 entries that were ALL -1.
  it('omits every subtype column for a plain non-layering, non-hijab product', () => {
    const cat = encodeCatalogue([PRODUCT], [BRAND]);
    expect(cat.rows.layeringSubtypeIdx).toBeUndefined();
    expect(cat.rows.outerwearSubtypeIdx).toBeUndefined();
    expect(cat.rows.hijabSubtypeIdx).toBeUndefined();
    expect(cat.rows.hijabTypeFilterIdx).toBeUndefined();
  });

  it('keeps the columns that carry a real value, so lane filters still work', () => {
    const cat = encodeCatalogue([{ ...PRODUCT, id: 'aab:90', title: 'Jersey Khimar Medina', garment: 'hijab' }], [BRAND]);
    expect(cat.rows.hijabTypeFilterIdx).toBeDefined();
    // The dead ones next to it still go.
    expect(cat.rows.layeringSubtypeIdx).toBeUndefined();
    expect(cat.rows.outerwearSubtypeIdx).toBeUndefined();
  });

  it('never omits a column merely because the FIRST row is -1', () => {
    const cat = encodeCatalogue(
      [PRODUCT, { ...PRODUCT, id: 'aab:91', title: 'Jersey Khimar Medina', garment: 'hijab' }],
      [BRAND],
    );
    expect(cat.rows.hijabTypeFilterIdx).toBeDefined();
    expect(cat.rows.hijabTypeFilterIdx![0]).toBe(-1);
  });
});

describe('payload: altUrl is sparse (2026-08-19)', () => {
  // Was a dense string[]: 79,222 bytes on /directory to express 209 real
  // values out of 13,256 rows, i.e. 13,047 empty strings each costing `,""`.
  it('stores nothing at all when no row has an altUrl', () => {
    const cat = encodeCatalogue([PRODUCT], [BRAND]);
    expect(Object.values(cat.cards.rows).every((c) => c.altUrl === undefined)).toBe(true);
  });

  it('keys a present altUrl by its row index, and decodes it back onto the card', () => {
    const withAlt: Product = { ...PRODUCT, id: 'aab:92', altUrl: 'https://example.com/x' };
    const cat = encodeCatalogue([PRODUCT, withAlt], [BRAND]);
    expect(cat.cards.rows[1].altUrl).toBe('https://example.com/x');
    expect(cat.cards.rows[0].altUrl).toBeUndefined();
    expect(decodeCard(cat, 1)!.altUrl).toBe('https://example.com/x');
    expect(decodeCard(cat, 0)!.altUrl).toBeUndefined();
  });
});

describe('colour column', () => {
  it('indexes each row into the colours dictionary', () => {
    const cat = encodeCatalogue(
      [
        { ...PRODUCT, id: 'aab:1', title: 'Amara Maxi Dress - Sage Green' },
        { ...PRODUCT, id: 'aab:2', title: 'Tala Ribbed Knit Abaya- Espresso' },
      ],
      [BRAND],
    );
    // Canonical order, not first-appearance: brown is 6th and green 9th in
    // COLOUR_FAMILY_LABELS, so the espresso row — encoded second — indexes 0.
    expect(cat.colours).toEqual(['brown', 'green']);
    expect(cat.rows.colourIdx).toEqual([1, 0]);
  });

  it('uses -1 for a row with no colour', () => {
    const cat = encodeCatalogue(
      [
        { ...PRODUCT, id: 'aab:1', title: 'Black Abaya' },
        { ...PRODUCT, id: 'aab:2', title: 'The Culture Starter Set' },
      ],
      [BRAND],
    );
    expect(cat.rows.colourIdx).toEqual([0, -1]);
  });

  // Same principle as the four subtype columns: a surface where nothing is
  // classified must not pay for 18,000 copies of -1.
  it('drops the column when no row has a colour', () => {
    const cat = encodeCatalogue(
      [{ ...PRODUCT, id: 'aab:1', title: 'The Culture Starter Set' }],
      [BRAND],
    );
    expect(cat.rows.colourIdx).toBeUndefined();
    expect('colourIdx' in cat.rows).toBe(false);   // deleted, not merely empty
    expect(cat.colours).toEqual([]);
  });

  // The one seam this feature was built around: data/colour-overrides.json is
  // hand-edited by someone who is not a programmer, and a misspelt family
  // ("burgandy" for "burgundy") type-checks, classifies, and then misses the
  // `colours` dictionary. Before the throw, `colourIndex.get()` returned
  // undefined, `push(undefined)` serialised to `null` in a column typed
  // `number[]`, `null !== -1` carried it past the SENTINEL_COLUMNS check, and
  // the client's `?? -1` dropped the product out of EVERY colour chip — the
  // exact opposite of what the edit intended, with nothing naming the file.
  //
  // The validator in lib/colour.test.ts catches the same edit, but only in CI,
  // and ci.yml runs on push/pull_request to `main` — after staging, which is
  // where the house protocol says the change is verified (CLAUDE.md §1).
  //
  // The map is mocked rather than the real file being edited, so the test
  // asserts the guard without putting a broken value in tracked data.
  it('throws on an override naming a family that is not a colour family', async () => {
    vi.resetModules();
    vi.doMock('@/data/colour-overrides.json', () => ({
      default: { terms: { pistachio: 'burgandy' }, weakWords: {} },
    }));
    try {
      const { encodeCatalogue: encode } = await import('./compactCatalogue');
      expect(() =>
        encode(
          [{ ...PRODUCT, id: 'aab:1', title: 'Gold Accent Half Zip Abaya - Pistachio' }],
          [BRAND],
        ),
      // `[\s\S]*` rather than `.*` with the `s` flag: tsconfig targets ES2017,
      // where `s` is a TS1501 compile error.
      ).toThrow(/unknown colour family "burgandy"[\s\S]*colour-overrides\.json/);
    } finally {
      vi.doUnmock('@/data/colour-overrides.json');
      vi.resetModules();
    }
  });
});
