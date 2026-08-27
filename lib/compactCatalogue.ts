import type { Brand, Garment, Product } from '@/lib/types';
import {
  layeringSubtype, LAYERING_SUBTYPE_LABELS, type LayeringSubtype,
  outerwearSubtype, OUTERWEAR_SUBTYPE_LABELS, type OuterwearSubtype,
  hijabSubtype, HIJAB_SUBTYPE_LABELS, type HijabSubtype,
  dressSubtype, DRESS_SUBTYPE_LABELS, type DressSubtype,
} from '@/lib/specialty';
import { hijabTypeFilter, HIJAB_TYPE_FILTER_LABELS, type HijabTypeFilter } from '@/lib/hijabTypeFilter';

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
  /** See Product.altUrl. Absent on every row except the small Touché Privé
   *  dual-region subset. */
  altUrl?: string;
  /** How many colourways this card stands for, including itself. Only ever
   *  present when > 1, so the card can treat it as "has siblings". */
  variantCount?: number;
}

interface CompactBrand {
  slug: string;
  name: string;
  homepage: string;
  currency: string;
}

export interface CompactCatalogue {
  brands: CompactBrand[];
  garments: Garment[];
  occasions: string[];
  /** Only ever non-empty for a catalogue containing layering pieces (in
   *  practice: only /layering-basics) — see rows.layeringSubtypeIdx. A lane
   *  page with no layering items gets an empty array here, which is what
   *  FilterableGrid uses to decide whether to render the "Type" filter at
   *  all, the same pattern already used for `occasions`. */
  layeringSubtypes: LayeringSubtype[];
  /** Same shape as layeringSubtypes, for the Outerwear lane's Type filter. */
  outerwearSubtypes: OuterwearSubtype[];
  /** Same shape as layeringSubtypes, for the Hijabs & Scarves lane's Type
   *  filter (added 2026-08-15 evening — see rows.hijabSubtypeIdx). */
  hijabSubtypes: HijabSubtype[];
  /** A SEPARATE, independent classification from hijabSubtypes above — which
   *  of 15 fabric/style groups (Jersey, Chiffon, Instant, ...) a product is,
   *  for the in-page Type filter dropdown (components/FilterableGrid.tsx),
   *  not the header nav flyout. A row can have a real index in both this and
   *  hijabSubtypeIdx at once — see rows.hijabTypeFilterIdx. */
  hijabTypeFilters: HijabTypeFilter[];
  /** Same shape as layeringSubtypes, for the Modest Dresses lane's Type filter
   *  (added 2026-08-26 — see rows.dressSubtypeIdx).
   *
   *  Unlike the other three, this one is PARTIAL by design: most rows on
   *  /modest-dresses have no subtype at all, so this array being non-empty
   *  means "some dresses here are classified", not "every dress here is". See
   *  lib/specialty.ts::dressSubtype for why. */
  dressSubtypes: DressSubtype[];
  /** How many rows this catalogue describes.
   *
   *  `rows.title.length` equals it, but a CLIENT holding row indices needs a
   *  value it can hand back to the server to assert the catalogue has not been
   *  rebuilt underneath it. The nightly refresh pushes a new catalogue to main
   *  on its own schedule (CLAUDE.md §10.35), so "these row indices still mean
   *  the same products" is not something an open tab may assume. */
  rowCount: number;
  /** Card data for the rows embedded in THIS payload — see EncodeOptions.
   *  Rows outside it are fetched from /api/catalogue/cards on demand. */
  cards: CardSlice;
  rows: {
    title: string[];
    brandIdx: number[];
    price: number[];
    garmentIdx: number[];
    /** Bit i set iff `occasions[i]` is in the product's occasion list. */
    occasionMask: number[];
    /** Index into layeringSubtypes, or -1 for a non-layering product (the
     *  overwhelming majority, on every lane except layering-basics). Not a
     *  bitmask like occasionMask — layeringSubtype() returns exactly one
     *  type or null, never several, by construction. */
    layeringSubtypeIdx?: number[];
    /** Same shape as layeringSubtypeIdx, for outerwearSubtypes. */
    outerwearSubtypeIdx?: number[];
    /** Same shape as layeringSubtypeIdx, for hijabSubtypes. */
    hijabSubtypeIdx?: number[];
    /** Same shape as hijabSubtypeIdx, but for hijabTypeFilters — a
     *  DIFFERENT, independent fact about the row (see the field comment
     *  above). Not mutually exclusive with hijabSubtypeIdx: a jersey khimar
     *  has a real value in both. */
    hijabTypeFilterIdx?: number[];
    /** Same shape as layeringSubtypeIdx, for dressSubtypes. -1 is the MAJORITY
     *  value here, not a rarity — 2,013 of the 2,521 rows on /modest-dresses
     *  are unclassified and filter out of every chip except "All". */
    dressSubtypeIdx?: number[];
    /** How many colourways each row stands for, including itself. Present only
     *  when at least one row on this surface has siblings; dropped as an
     *  all-sentinel column otherwise (see SENTINEL_COLUMNS). The sentinel here
     *  is 1, not -1, because "one colourway" is the honest default rather than
     *  an absence. See lib/colorVariants.ts. */
    variantCount?: number[];
    /** Days since FIRST_SEEN_EPOCH, or -1 if unknown. Sort-only — never
     *  decoded into CardProduct, same treatment as occasionMask. */
    firstSeenDay: number[];
  };
}

/**
 * The card tier — everything `decodeCard` needs and NOTHING a filter or a sort
 * reads, keyed by ABSOLUTE row index so a slice is self-describing.
 *
 * WHY THIS IS SEPARATE. Measured on /directory, 2026-08-26: the document was
 * 2,564,326 bytes decoded, 2,361,529 of them (92%) this payload, to render 24
 * cards. Column by column, imageFile 690KB + urlTail 442KB + shopifyId 208KB +
 * imagePrefixIdx 39KB + altUrl 15KB = 69% of it — and not one of those columns
 * is touched by the search box, a filter dropdown, or any sort. So they no
 * longer travel for every row; the index tier above still does, which is what
 * keeps filtering instant and entirely client-side.
 *
 * A Record rather than parallel arrays: a slice is inherently sparse (the rows
 * currently on screen after an arbitrary filter are scattered through the
 * catalogue), and a sparse array would serialise its holes.
 * → docs/superpowers/plans/2026-08-26-split-catalogue-payload.md
 */
export interface CardSlice {
  rows: Record<number, CardEntry>;
}

export interface CardEntry {
  shopifyId: string;
  /** The image URL's leading portion, VERBATIM — deliberately not an index into
   *  a dictionary.
   *
   *  It was an index until it was written. The bug that killed it: a slice
   *  fetched from /api/catalogue/cards is encoded over the SUBSET of products
   *  asked for, so its prefix dictionary is a different dictionary from the
   *  one that travelled with the page. Index 0 in the slice and index 0 on the
   *  client are unrelated strings, and the card renders another product's
   *  photograph — visible to nobody, since the card still looks like a card
   *  (CLAUDE.md §10.12). A fetched entry must be self-describing.
   *
   *  The dedup it gave up is worth nothing now: the card tier carries ~48 rows
   *  inline, not 13,226, so these strings cost ~2KB while the dictionary they
   *  replaced cost 10KB on every page. */
  imagePrefix: string;
  imageFile: string;
  /** Either a bare product handle, or (if the url doesn't fit
   *  `${homepage}/products/${handle}`) the full url, verbatim. Handles never
   *  start with "http" — encodeCatalogue throws if one ever would — so that
   *  prefix alone tells decodeCard which case it is. */
  urlTail: string;
  /** See Product.altUrl. Stored as a full URL, unlike urlTail — it's on a
   *  different domain than the row's own brand.homepage, so the
   *  handle-derivation trick urlTail uses doesn't apply. Absent means absent. */
  altUrl?: string;
}

/**
 * Which product set a row index is an index INTO. A row index means nothing
 * without it — row 40 of /modest-dresses and row 40 of /directory are
 * different products.
 *
 * Declared HERE rather than in lib/catalogueCards.ts, where it is used,
 * because the client components need the type and lib/catalogueCards.ts
 * imports lib/products.ts — a node:fs module that Invariant 10 forbids a
 * 'use client' file from pulling in.
 */
export type CardSource = 'browse' | { lane: string } | { brand: string };

export interface EncodeOptions {
  /** How many LEADING rows get their card data embedded inline. Rows beyond it
   *  are fetched on demand.
   *
   *  Omitted means every row, which reproduces the pre-split behaviour exactly
   *  — that is what the pages which render everything they hold (an edit, a
   *  designer page) pass, and it is why this is opt-in rather than opt-out: a
   *  page that forgets the option is slow, not broken. */
  embedCards?: number;
}

function splitImage(image: string): { prefix: string; file: string } {
  const i = image.lastIndexOf('/');
  if (i === -1) {
    throw new Error(`compactCatalogue: image URL has no "/": ${image}`);
  }
  return { prefix: image.slice(0, i + 1), file: image.slice(i + 1) };
}

export function encodeCatalogue(
  products: Product[],
  brands: Brand[],
  opts: EncodeOptions = {},
): CompactCatalogue {
  const embedCards = opts.embedCards ?? Infinity;
  const brandBySlug = new Map(brands.map((b) => [b.slug, b]));

  const brandIndex = new Map<string, number>();
  const compactBrands: CompactBrand[] = [];
  const garmentIndex = new Map<Garment, number>();
  const garments: Garment[] = [];
  const occasionIndex = new Map<string, number>();
  const occasions: string[] = [];
  // Fixed canonical order, not first-appearance — the filter dropdown must
  // not reshuffle depending on which brand's rows happen to interleave
  // first. Only entries actually present in this catalogue's products end
  // up in the array, so this needs a cheap pre-pass (unlike garments/
  // occasions, which build their dictionary lazily during the main loop —
  // there's no "canonical order" to preserve for those, so first-appearance
  // is fine and a pre-pass would be pure overhead).
  const layeringSubtypeOrder = Object.keys(LAYERING_SUBTYPE_LABELS) as LayeringSubtype[];
  const presentSubtypes = new Set(products.map((p) => layeringSubtype(p)).filter((t): t is LayeringSubtype => t !== null));
  const layeringSubtypes = layeringSubtypeOrder.filter((t) => presentSubtypes.has(t));
  const layeringSubtypeIndex = new Map(layeringSubtypes.map((t, i) => [t, i]));
  const outerwearSubtypeOrder = Object.keys(OUTERWEAR_SUBTYPE_LABELS) as OuterwearSubtype[];
  const presentOuterwearSubtypes = new Set(products.map((p) => outerwearSubtype(p)).filter((t): t is OuterwearSubtype => t !== null));
  const outerwearSubtypes = outerwearSubtypeOrder.filter((t) => presentOuterwearSubtypes.has(t));
  const outerwearSubtypeIndex = new Map(outerwearSubtypes.map((t, i) => [t, i]));
  const hijabSubtypeOrder = Object.keys(HIJAB_SUBTYPE_LABELS) as HijabSubtype[];
  const presentHijabSubtypes = new Set(products.map((p) => hijabSubtype(p)).filter((t): t is HijabSubtype => t !== null));
  const hijabSubtypes = hijabSubtypeOrder.filter((t) => presentHijabSubtypes.has(t));
  const hijabSubtypeIndex = new Map(hijabSubtypes.map((t, i) => [t, i]));
  const dressSubtypeOrder = Object.keys(DRESS_SUBTYPE_LABELS) as DressSubtype[];
  const presentDressSubtypes = new Set(products.map((p) => dressSubtype(p)).filter((t): t is DressSubtype => t !== null));
  const dressSubtypes = dressSubtypeOrder.filter((t) => presentDressSubtypes.has(t));
  const dressSubtypeIndex = new Map(dressSubtypes.map((t, i) => [t, i]));
  const hijabTypeFilterOrder = Object.keys(HIJAB_TYPE_FILTER_LABELS) as HijabTypeFilter[];
  const presentHijabTypeFilters = new Set(products.map((p) => hijabTypeFilter(p)).filter((t): t is HijabTypeFilter => t !== null));
  const hijabTypeFilters = hijabTypeFilterOrder.filter((t) => presentHijabTypeFilters.has(t));
  const hijabTypeFilterIndex = new Map(hijabTypeFilters.map((t, i) => [t, i]));

  const rows: CompactCatalogue['rows'] = {
    title: [],
    brandIdx: [],
    price: [],
    garmentIdx: [],
    occasionMask: [],
    layeringSubtypeIdx: [],
    outerwearSubtypeIdx: [],
    hijabSubtypeIdx: [],
    dressSubtypeIdx: [],
    variantCount: [],
    hijabTypeFilterIdx: [],
    firstSeenDay: [],
  };
  const cards: CardSlice = { rows: {} };

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
      // Currency comes from the ROWS, not from data/brands.ts. Every row of one
      // fetch carries the currency that fetch was served (Invariant 15), and
      // `brand.currency` is only the EXPECTED value — it was the source of truth
      // here until 2026-08-26 and that is what put a wrong price on 24% of the
      // catalogue. → docs/log/2026-08-26-currency-mislabelling.md
      compactBrands.push({ slug: brand.slug, name: brand.name, homepage: brand.homepage, currency: p.currency });
    } else if (compactBrands[bIdx].currency !== p.currency) {
      // Decode derives each card's currency from this one dictionary entry, so a
      // brand whose published rows disagree cannot be encoded without mislabelling
      // some of them. In practice this means a PARTIAL refresh: an incomplete
      // fetch leaves unseen rows published at the previous currency while the rows
      // it did see carry the new one. Fail loudly; the repair is to re-run
      // `npm run refresh -- <slug>` until that brand fetches completely.
      throw new Error(
        `compactCatalogue: brand "${brand.slug}" has published rows in two currencies ` +
        `("${compactBrands[bIdx].currency}" and "${p.currency}", at ${p.id}) — re-run the refresh for this brand`,
      );
    }

    const { prefix, file } = splitImage(p.image);

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
    rows.brandIdx.push(bIdx);
    rows.price.push(p.price);
    rows.garmentIdx.push(gIdx);
    rows.occasionMask.push(mask);
    // `!` on the four subtype columns: they are always present while building
    // and are only deleted after this loop, once we know a column is entirely
    // -1. See the SENTINEL_COLUMNS block below.
    const subtype = layeringSubtype(p);
    rows.layeringSubtypeIdx!.push(subtype === null ? -1 : layeringSubtypeIndex.get(subtype)!);
    const outerwearSub = outerwearSubtype(p);
    rows.outerwearSubtypeIdx!.push(outerwearSub === null ? -1 : outerwearSubtypeIndex.get(outerwearSub)!);
    const hijabSub = hijabSubtype(p);
    rows.hijabSubtypeIdx!.push(hijabSub === null ? -1 : hijabSubtypeIndex.get(hijabSub)!);
    const dressSub = dressSubtype(p);
    rows.dressSubtypeIdx!.push(dressSub === null ? -1 : dressSubtypeIndex.get(dressSub)!);
    rows.variantCount!.push(p.variantCount ?? 1);
    const hijabType = hijabTypeFilter(p);
    rows.hijabTypeFilterIdx!.push(hijabType === null ? -1 : hijabTypeFilterIndex.get(hijabType)!);
    rows.firstSeenDay.push(encodeFirstSeenDay(p.firstSeen));

    // The card tier. Built inside the same loop so every derivation
    // (shopifyId, the image split, the urlTail handle trick) stays in one
    // place and cannot drift between the embedded rows and the ones
    // lib/catalogueCards.ts serves later — they come from this same function.
    const row = rows.title.length - 1;
    if (row < embedCards) {
      cards.rows[row] = {
        shopifyId,
        imagePrefix: prefix,
        imageFile: file,
        urlTail,
        ...(p.altUrl ? { altUrl: p.altUrl } : {}),
      };
    }
  }

  // Drop any subtype column that carries no information on THIS page.
  //
  // These five (four until 2026-08-26, when dressSubtypeIdx joined them) are
  // per-lane facts: layeringSubtypeIdx is -1 for everything
  // that isn't a layering piece, and so on. On a mixed page there is nothing
  // to say — measured on /directory, each of the four was 39,767 bytes of
  // 13,256 entries that were ALL -1, and on the since-retired /hijabi-outfits the first three
  // were 53,498 + 53,498 + 48,887 B, likewise all -1. That is ~160 KB of RSC
  // payload per page spent transmitting "no" 53,000 times.
  //
  // They are NOT deleted from the format — FilterableGrid genuinely reads all
  // of them on the lanes that have subtype filters, and there the columns are
  // real. Absent simply means "every row is -1", which is what readers must
  // treat a missing column as. See the ?? -1 fallbacks in FilterableGrid.
  const SENTINEL_COLUMNS = ['layeringSubtypeIdx', 'outerwearSubtypeIdx', 'hijabSubtypeIdx', 'hijabTypeFilterIdx', 'dressSubtypeIdx'] as const;
  for (const col of SENTINEL_COLUMNS) {
    const v = rows[col];
    if (v && v.every((x) => x === -1)) delete rows[col];
  }
  // variantCount is dropped on the same principle but against a DIFFERENT
  // sentinel: 1, not -1. A surface where no product has colour siblings is the
  // common case (every /edits/[slug], and any lane after heavy filtering), and
  // there it is 23,000 copies of the number 1. Readers must treat an absent
  // column as "every row is 1" — see decodeCard's `?? 1`.
  if (rows.variantCount && rows.variantCount.every((x) => x === 1)) delete rows.variantCount;

  return {
    brands: compactBrands, garments, occasions,
    layeringSubtypes, outerwearSubtypes, hijabSubtypes, hijabTypeFilters, dressSubtypes,
    rows, cards, rowCount: products.length,
  };
}

/**
 * Decode one row into a renderable card, or NULL if its card data has not
 * arrived yet.
 *
 * `null` rather than a throw: with the index/card split a missing card is a
 * normal transient state — the row is in the filtered set and its card data is
 * still in flight — not a defect. Callers render what they have and let the
 * rest appear. `extra` is a slice fetched from /api/catalogue/cards; it is
 * consulted BEFORE the embedded rows only because lookup order is free, the two
 * can never disagree (both come from encodeCatalogue over the same products).
 */
export function decodeCard(cat: CompactCatalogue, row: number, extra?: CardSlice): CardProduct | null {
  const card = extra?.rows[row] ?? cat.cards.rows[row];
  if (!card) return null;
  const brand = cat.brands[cat.rows.brandIdx[row]];
  const url = card.urlTail.startsWith('http') ? card.urlTail : `${brand.homepage}/products/${card.urlTail}`;
  const image = card.imagePrefix + card.imageFile;
  return {
    id: `${brand.slug}:${card.shopifyId}`,
    brandSlug: brand.slug,
    garment: cat.garments[cat.rows.garmentIdx[row]],
    title: cat.rows.title[row],
    brandName: brand.name,
    price: cat.rows.price[row],
    currency: brand.currency,
    image,
    url,
    ...(card.altUrl ? { altUrl: card.altUrl } : {}),
    // `?? 1` is load-bearing, exactly like the subtype columns' `?? -1`:
    // encodeCatalogue deletes this column when every row is 1, so an absent
    // column means "nothing here has colour siblings".
    ...((cat.rows.variantCount?.[row] ?? 1) > 1 ? { variantCount: cat.rows.variantCount![row] } : {}),
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
