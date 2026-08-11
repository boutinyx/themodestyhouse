import type { Brand, Garment, Product } from '@/lib/types';

/** Reference point for the compact day-index — see rows.firstSeenDay below. */
export const FIRST_SEEN_EPOCH = Date.parse('2026-01-01T00:00:00.000Z');

/** A product with no firstSeen (pre-dates lifecycle tracking, ~36% of raw rows
 *  as of 2026-08-11) sorts as older than every dated row — a true statement,
 *  since 2026-08-05 is the earliest date tracking can produce. */
const FIRST_SEEN_UNKNOWN = -1;

function encodeFirstSeenDay(firstSeen: string | null | undefined): number {
  if (!firstSeen) return FIRST_SEEN_UNKNOWN;
  const ms = Date.parse(firstSeen);
  if (Number.isNaN(ms)) return FIRST_SEEN_UNKNOWN;
  return Math.floor((ms - FIRST_SEEN_EPOCH) / 86_400_000);
}

/**
 * The subset of a Product the UI actually renders — ProductCard and
 * QuickView between them read exactly these seven fields. Deliberately NOT
 * `Product`: a decoded row has no season/activity/community/inStock/brandSlug,
 * and inventing them (e.g. `inStock: true`) would be a value nothing verified.
 */
export interface CardProduct {
  id: string;
  /** Both of these are DERIVED from data the encoding already carries
   *  (brandIdx, garmentIdx), so exposing them costs no extra payload bytes.
   *  Needed by the outbound-click tracking — see lib/pulse.ts. */
  brandSlug: string;
  garment: Garment;
  title: string;
  brandName: string;
  price: number;
  currency: string;
  image: string;
  url: string;
}

interface CompactBrand {
  slug: string;
  name: string;
  homepage: string;
  currency: string;
}

export interface CompactCatalogue {
  brands: CompactBrand[];
  imagePrefixes: string[];
  garments: Garment[];
  occasions: string[];
  rows: {
    title: string[];
    shopifyId: string[];
    brandIdx: number[];
    imagePrefixIdx: number[];
    imageFile: string[];
    /** Either a bare product handle, or (if the url doesn't fit
     *  `${homepage}/products/${handle}`) the full url, verbatim. Handles never
     *  start with "http" — encodeCatalogue throws if one ever would — so that
     *  prefix alone tells decodeCard which case it is. */
    urlTail: string[];
    price: number[];
    garmentIdx: number[];
    /** Bit i set iff `occasions[i]` is in the product's occasion list. */
    occasionMask: number[];
    /** Days since FIRST_SEEN_EPOCH, or -1 if unknown. Sort-only — never
     *  decoded into CardProduct, same treatment as occasionMask. */
    firstSeenDay: number[];
  };
}

function splitImage(image: string): { prefix: string; file: string } {
  const i = image.lastIndexOf('/');
  if (i === -1) {
    throw new Error(`compactCatalogue: image URL has no "/": ${image}`);
  }
  return { prefix: image.slice(0, i + 1), file: image.slice(i + 1) };
}

export function encodeCatalogue(products: Product[], brands: Brand[]): CompactCatalogue {
  const brandBySlug = new Map(brands.map((b) => [b.slug, b]));

  const brandIndex = new Map<string, number>();
  const compactBrands: CompactBrand[] = [];
  const prefixIndex = new Map<string, number>();
  const imagePrefixes: string[] = [];
  const garmentIndex = new Map<Garment, number>();
  const garments: Garment[] = [];
  const occasionIndex = new Map<string, number>();
  const occasions: string[] = [];

  const rows: CompactCatalogue['rows'] = {
    title: [],
    shopifyId: [],
    brandIdx: [],
    imagePrefixIdx: [],
    imageFile: [],
    urlTail: [],
    price: [],
    garmentIdx: [],
    occasionMask: [],
    firstSeenDay: [],
  };

  for (const p of products) {
    const brand = brandBySlug.get(p.brandSlug);
    if (!brand) {
      throw new Error(`compactCatalogue: product ${p.id} references unknown brand "${p.brandSlug}"`);
    }
    if (!p.inStock) {
      // The pipeline only ever publishes in-stock rows (build-data.mjs), and
      // decode derives no `inStock` field at all — a false here would be
      // silently dropped rather than mislabelled. Fail loudly instead.
      throw new Error(`compactCatalogue: product ${p.id} is out of stock; the publish filter should have dropped it`);
    }
    if (p.currency !== brand.currency) {
      // decode reads currency from the brand dictionary (Invariant: currency
      // comes from the brand record, never the feed — lib/normalize.ts:119).
      throw new Error(
        `compactCatalogue: product ${p.id} currency "${p.currency}" disagrees with brand "${brand.slug}" currency "${brand.currency}"`,
      );
    }

    const expectedPrefix = `${p.brandSlug}:`;
    if (!p.id.startsWith(expectedPrefix)) {
      throw new Error(`compactCatalogue: product id "${p.id}" does not start with brandSlug "${p.brandSlug}:"`);
    }
    const shopifyId = p.id.slice(expectedPrefix.length);
    if (shopifyId.includes(':')) {
      throw new Error(`compactCatalogue: product id "${p.id}" has more than one ":" segment`);
    }

    let bIdx = brandIndex.get(p.brandSlug);
    if (bIdx === undefined) {
      bIdx = compactBrands.length;
      brandIndex.set(p.brandSlug, bIdx);
      compactBrands.push({ slug: brand.slug, name: brand.name, homepage: brand.homepage, currency: brand.currency });
    }

    const { prefix, file } = splitImage(p.image);
    let prefixIdx = prefixIndex.get(prefix);
    if (prefixIdx === undefined) {
      prefixIdx = imagePrefixes.length;
      prefixIndex.set(prefix, prefixIdx);
      imagePrefixes.push(prefix);
    }

    const derivablePrefix = `${brand.homepage}/products/`;
    let urlTail: string;
    if (p.url.startsWith(derivablePrefix)) {
      const handle = p.url.slice(derivablePrefix.length);
      if (handle.startsWith('http')) {
        // Would be indistinguishable from a verbatim URL at decode time.
        throw new Error(`compactCatalogue: product ${p.id} has a handle starting with "http": ${handle}`);
      }
      urlTail = handle;
    } else {
      urlTail = p.url;
    }

    let gIdx = garmentIndex.get(p.garment);
    if (gIdx === undefined) {
      gIdx = garments.length;
      garmentIndex.set(p.garment, gIdx);
      garments.push(p.garment);
    }

    let mask = 0;
    for (const o of p.occasion) {
      let oIdx = occasionIndex.get(o);
      if (oIdx === undefined) {
        oIdx = occasions.length;
        if (oIdx >= 31) {
          throw new Error(`compactCatalogue: more than 31 distinct occasion values; occasionMask can no longer fit in a bitmask`);
        }
        occasionIndex.set(o, oIdx);
        occasions.push(o);
      }
      mask |= 1 << oIdx;
    }

    rows.title.push(p.title);
    rows.shopifyId.push(shopifyId);
    rows.brandIdx.push(bIdx);
    rows.imagePrefixIdx.push(prefixIdx);
    rows.imageFile.push(file);
    rows.urlTail.push(urlTail);
    rows.price.push(p.price);
    rows.garmentIdx.push(gIdx);
    rows.occasionMask.push(mask);
    rows.firstSeenDay.push(encodeFirstSeenDay(p.firstSeen));
  }

  return { brands: compactBrands, imagePrefixes, garments, occasions, rows };
}

export function decodeCard(cat: CompactCatalogue, row: number): CardProduct {
  const brand = cat.brands[cat.rows.brandIdx[row]];
  const urlTail = cat.rows.urlTail[row];
  const url = urlTail.startsWith('http') ? urlTail : `${brand.homepage}/products/${urlTail}`;
  const image = cat.imagePrefixes[cat.rows.imagePrefixIdx[row]] + cat.rows.imageFile[row];
  return {
    id: `${brand.slug}:${cat.rows.shopifyId[row]}`,
    brandSlug: brand.slug,
    garment: cat.garments[cat.rows.garmentIdx[row]],
    title: cat.rows.title[row],
    brandName: brand.name,
    price: cat.rows.price[row],
    currency: brand.currency,
    image,
    url,
  };
}

export function decodeOccasions(cat: CompactCatalogue, row: number): string[] {
  const mask = cat.rows.occasionMask[row];
  const out: string[] = [];
  for (let i = 0; i < cat.occasions.length; i++) {
    if (mask & (1 << i)) out.push(cat.occasions[i]);
  }
  return out;
}
