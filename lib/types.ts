export type Community = 'hijabi' | 'general';
export type Garment =
  | 'dress' | 'skirt' | 'top' | 'trousers' | 'abaya' | 'hijab' | 'swim' | 'set' | 'other';

export type Badge = 'verified' | 'editors-pick';
export type Vibe = 'elegant' | 'streetwear' | 'maximalist';

/** Sub-categories WITHIN Layering Basics — see lib/specialty.ts for the
 *  classification logic. Declared here (not in lib/specialty.ts, which
 *  imports Product from this file) to avoid a circular import now that
 *  Product carries a `forcedLayeringSubtype` of this type. Re-exported from
 *  lib/specialty.ts for existing call sites. */
export type LayeringSubtype =
  | 'neck-cover'
  | 'sleeve-extender'
  | 'shirt-extender'
  | 'cropped-body-shirt'
  | 'under-dress'
  | 'base-layer-top'
  | 'prayer-set';

/** The four sub-categories of the Outerwear lane (lib/lanes.ts) — see
 *  lib/specialty.ts for the classification logic. Declared here for the
 *  same reason as LayeringSubtype: avoids a circular import, since a
 *  future forced-subtype field on Product would need this type and
 *  lib/specialty.ts imports Product from here. */
export type OuterwearSubtype = 'blazer' | 'vest' | 'cardigan' | 'coat';

/** The specialty lanes (lib/lanes.ts) whose membership is NOT derived
 *  from `garment` alone — Modest Swimwear is (garment === 'swim' already
 *  satisfies isSwim()), so it never needed this. A staff override here is
 *  authoritative and exclusive: see lib/specialty.ts's isActivewear/
 *  isLayering/isOuterwear. */
export type ForcedLane = 'modest-activewear' | 'layering-basics' | 'outerwear';

export interface Brand {
  slug: string;
  name: string;
  homepage: string; // e.g. https://hautehijab.com
  feedUrl: string; // e.g. https://hautehijab.com/products.json
  community: Community;
  currency: string; // ISO, e.g. 'USD','GBP'
  category: string; // e.g. 'Hijabs', 'Abayas', 'Modest dresses'
  city: string; // e.g. 'London', 'New York'
  vibe: Vibe; // aesthetic: elegant | streetwear | maximalist
  badge?: Badge; // curation seal (owner-assigned)
  platform?: 'shopify' | 'woo'; // feed type; default 'shopify'. 'woo' = WooCommerce Store API.
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
  /** ISO date first ingested by the refresh pipeline. `null` = confirmed
   *  present but pre-dates lifecycle tracking (before 2026-08-05); absent on
   *  any row a script constructs without lifecycle data (e.g. most test
   *  fixtures) — treat both as "unknown, at least as old as tracking start."
   *  Powers the Newest/Oldest sort (lib/sortRows.ts). Never stripped before
   *  publish as of 2026-08-11 — see lib/lifecycle.ts. */
  firstSeen?: string | null;
  garment: Garment;
  community: Community;
  occasion: string[];
  season: string[];
  activity: string[];
  /** Classification signals, RAW-ONLY — never survives to products.json (see
   *  lib/normalize.ts::stripRawSignals, called at publish time). Lets
   *  build-data.mjs re-derive `garment` from the current lib/tag.ts logic
   *  without a re-scrape. Absent on rows scraped before 2026-08-12; absent on
   *  most test fixtures. */
  raw?: {
    productType: string;
    tags: string[];
    classifiedFrom: 'title' | 'meta' | 'foreign' | 'description';
  };
  /** Staff override forcing lane placement for the two specialty lanes
   *  title/garment-based classification can't reach directly. Baked into
   *  data/products.json at publish time from data/lane-overrides.json
   *  (permanent), and applied live on top of that by
   *  lib/products.ts::getProducts() from the gitignored
   *  data/.live-lane-overrides.json (immediate, pre-republish). See
   *  docs/log/2026-08-12-lane-overrides.md. */
  forcedLane?: ForcedLane;
  /** Only meaningful alongside forcedLane === 'layering-basics'. Absent
   *  means "let layeringSubtype() guess from the title", same fallback a
   *  naturally-classified layering item already uses. */
  forcedLayeringSubtype?: LayeringSubtype;
  /** Only meaningful alongside forcedLane === 'outerwear'. Same fallback
   *  reasoning as forcedLayeringSubtype, for outerwearSubtype(). Deliberately
   *  a separate field rather than reusing forcedLayeringSubtype — a shared
   *  field would let a subtype from one lane leak onto the other if the lane
   *  were ever changed without clearing it. */
  forcedOuterwearSubtype?: OuterwearSubtype;
  /** A second, equally-valid product URL on a DIFFERENT regional storefront of
   *  the same brand — e.g. Touché Privé runs a Shopify geo-redirect app that
   *  silently sends EU-geolocated visitors from `int.toucheprive.com` to
   *  `eu.toucheprive.com`, a materially different catalog (own ids, own
   *  currency) that doesn't carry every `int` handle. `url` stays the
   *  SSR/crawler default; `altUrl`, when present, is what a European-timezone
   *  visitor is routed to client-side — see lib/regionalLink.ts. No cookies,
   *  no IP lookup: picked from `Intl.DateTimeFormat().resolvedOptions().timeZone`
   *  at click time. See docs/log/2026-08-15-touche-prive-dual-region-links.md. */
  altUrl?: string;
}
