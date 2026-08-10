# Compact catalogue payload — design

**Date:** 2026-08-10 · **Status:** design approved, not implemented

## Goal

Cut the bytes a grid page ships to the browser by roughly 3x, without changing
anything a visitor can see or do. Filtering, search and "Load more" must stay
instant and offline, exactly as they are today.

## The problem, measured

Measured against `https://themodestyhouse.com` on 2026-08-10.

Server response time is not the issue on lane pages — they are prerendered and
fast:

| Route | TTFB | Wire (compressed) | Cache header |
|---|---|---|---|
| `/modest-dresses` | 0.29s | 193 KB | `s-maxage=31536000` · `x-nextjs-cache: HIT` |
| `/about` | 0.50s | 12 KB | `s-maxage=31536000` · HIT |
| `/directory` | 1.49s | 974 KB | `private, no-cache, no-store, max-age=0` |
| `/designers` | 0.43s | 14 KB | `no-store` |

The cost lands on the device, after the bytes arrive:

| Route | Uncompressed | Image URLs in payload | `<img>` actually rendered |
|---|---|---|---|
| `/modest-dresses` | 1,516,244 B | 3,026 | 25 |
| `/modest-abayas` | 2,906,986 B | 5,588 | 25 |
| `/directory` | 7,423,225 B | 14,704 | 25 |

`app/[lane]/page.tsx` passes the whole lane array into `FilterableGrid`, a
`'use client'` component, so every record is serialised into the RSC flight
payload (`self.__next_f`). `/modest-abayas` ships 2.9 MB to display 25
photographs. The phone must download, decompress and parse all of it on the main
thread before React hydrates — which is also the thread that would otherwise be
starting image requests. This is the reported "3–4 seconds before the pictures
appear", and it explains why lane pages feel slow despite a 0.29s TTFB.

This is Landmine §8 ("Server pages pass full arrays into client components")
quantified, and it is the real scaling ceiling — not the size of `products.json`.

### Where the bytes are

Per-field cost across all 20,622 published rows (8.20 MB serialised total):

| Field | B/row | % |
|---|---|---|
| `image` | 113 | 27.0% |
| `url` | 69 | 16.6% |
| `title` | 39 | 9.4% |
| `id` | 30 | 7.1% |
| `brandName` | 25 | 5.9% |
| `brandSlug` | 23 | 5.5% |
| `community` | 20 | 4.8% |
| `garment` | 17 | 4.1% |
| `currency` | 16 | 3.8% |
| `inStock` | 14 | 3.4% |
| `occasion` | 14 | 3.3% |
| `activity` | 13 | 3.2% |
| `season` | 13 | 3.1% |
| `price` | 12 | 2.8% |

Three facts follow, each verified rather than assumed:

1. **`season`, `activity` and `community` are read by no client component.**
   `grep` over `components/` and `app/` for `.season` / `.activity` /
   `.community` returns hits only in `app/page.tsx`, which is a server
   component. Together they are 46 B/row.
2. **`inStock` is `true` for all 20,622 published rows** — `build-data.mjs`
   filters on it, so the field encodes a constant 20,622 times.
3. **`image` and `url` are 43.6% of every record and both compress heavily.**
   The image directory prefix (everything up to the last `/`) takes 227 distinct
   values across the entire catalogue, ~55 B each — a 12 KB dictionary. Storing
   the filename alone takes `image` from 103 B/row to 48 B/row. `url` is
   `homepage + "/products/" + handle` for 19,797 of 20,622 rows, taking it from
   61 B/row to 28 B/row.

### What the UI actually needs

`components/ProductCard.tsx` and `components/QuickView.tsx` between them read
exactly seven fields: `id`, `title`, `brandName`, `price`, `currency`, `image`,
`url`. `garment` and `occasion` are needed for filtering only, never for
rendering a card.

`QuickView.tsx:44` persists product objects to `localStorage` under `tmh_favs`,
so whatever the client materialises has to be a complete, self-sufficient
object — a favourite is re-rendered later with no catalogue in scope.

## Approaches considered

Three were costed against `/modest-abayas` (5,706 products, 2.91 MB today):

**A. Compact encoding, everything local — ~138 B/row → ~790 KB.** Every card
renderable without the network. Filtering, search and paging stay instant. No
behaviour change.

**B. Filter index plus on-demand card fetch — ~57 B/row → ~330 KB.** Titles stay
local so typing is instant, but the *results* of a filter change need a
round-trip (~150ms) before cards paint.

**C. Server-side search as well — ~18 B/row → ~105 KB.** Largest reduction;
search becomes a debounced network request per query.

**Chosen: A.** B and C are meaningfully smaller but both trade away a property
the site has today — filtering that never waits. A removes the bottleneck with
no user-visible change and no new failure mode, which is the right first move.
B remains available afterwards if the measured result is not enough.

## Design

### Module boundary

One new client-safe module, `lib/compactCatalogue.ts`. It must not import `fs`,
so it can be imported from a `'use client'` file — Invariant 10.

```ts
encodeCatalogue(products: Product[]): CompactCatalogue   // server / build time
decodeCard(cat: CompactCatalogue, row: number): CardProduct   // client, per rendered card
```

**The pipeline is untouched.** No change to `scripts/build-data.mjs`,
`data/products.json`, or the raw / decisions / exclusions layers. This is a
transport concern between the server page and the client grid, so it lives
entirely on the read side. `productsForLane()` and `browseProducts()` keep
returning `Product[]`; the page component encodes on the way out. For the eleven
statically prerendered lanes that happens once, at build time.

### Shape

Three dictionaries, hoisted out of the rows:

| Dictionary | Entries | Carries |
|---|---|---|
| brands | ≤107 | `name`, `homepage`, `currency`, `slug` |
| image prefixes | ≤227 | everything up to the last `/` |
| garments / occasions | 8 / 4 | filter values |

Then eight parallel arrays, one entry per row: `title`, image filename, url
handle, shopify id, price, brand index, garment index, occasion bitmask
(occasions take only four values — `formal`, `work`, `wedding`, `prom` — and the
average array length is 0.12, so 88% of rows encode as `0`).

The prefix dictionary is keyed on the URL, **not** on the brand: 43 of 107
brands use more than one prefix, one uses 25. A brand-keyed dictionary would be
wrong for those.

`url` and `image` both get a verbatim escape hatch: a stored value beginning
with `http` is returned unchanged. This covers the 825 WooCommerce rows whose
URLs do not match the Shopify shape.

### Derived, not dropped

`currency`, `brandSlug` and `community` are reconstructed from the brand
dictionary. This is the correct source, not a shortcut — CLAUDE.md §3 states
currency comes from the brand record and never from the feed.

### Client changes

`FilterableGrid` and `DirectoryBrowser` take `catalogue: CompactCatalogue`
instead of `products: Product[]`. Filtering runs over the numeric columns, so a
brand match becomes an integer comparison rather than a string comparison across
5,706 objects — filtering gets faster, not slower. Only the ~24 visible rows are
decoded into objects.

`decodeCard` returns a new `CardProduct` type — precisely the seven fields the UI
reads — rather than a `Product`. Returning `Product` would force it to invent
`season: []`, `activity: []` and `inStock: true`, and a later reader would trust
them. `ProductCard` and `QuickView` change their prop type to `CardProduct`;
neither reads anything outside the seven, so nothing else moves.

Existing `tmh_favs` entries in `localStorage` are full `Product` objects, which
are a structural superset of `CardProduct` — they continue to render, and no
migration is needed.

### Guards

The hazard is encoding an assumption that is true today and silently false
later — §10.15 and §10.19 are both that failure.

- `encodeCatalogue` **throws** if any product has `inStock === false`. The
  constant is a consequence of the build filter; if that changes, this fails
  loudly at build time instead of mislabelling stock.
- `encodeCatalogue` **throws** if a product's `currency` disagrees with its
  brand record, since the decode derives it from the brand.
- `lib/compactCatalogue.test.ts` round-trips the **real published catalogue**:
  encode all 20,622 rows, decode every one, assert all seven fields deep-equal
  the original. Not a fixture — a brand with an unusual URL shape must fail the
  test rather than the site.
- Per §10.19, that test reads `data/products.json` (deterministically
  regenerated) rather than `data/raw-products.json`, so the nightly refresh
  cannot turn it red for a cosmetic reason such as a brand re-casing a title.

## Verification

The claim is a byte reduction, so the evidence is measured page size against a
production build, before and after:

```
curl --compressed https://…/<route> | wc -c
```

for `/modest-dresses` (1,516,244 B today), `/modest-abayas` (2,906,986 B),
`/directory` (7,423,225 B) and `/hijabi-outfits`. Targets are roughly a 3x
reduction.

Plus `npm run typecheck`, `npm test`, and `npm run audit:interaction` — the
filter dropdowns and quick view are exactly what this change touches, and per
§10.25 no static render can see either.

Per §10.28, each new guard is run against deliberately broken input first, to
confirm it fails, before its passing result is trusted.

## Notes / follow-ups

- **`/hijabi-outfits` stays bad.** It carries 19,845 products and will still be
  ~2.5 MB after this change. CLAUDE.md §8 already records that its predicate
  matches 97.5% of the catalogue and that it should be fixed or retired. This
  change makes it survivable, not good.
- **`/directory` is dynamically rendered**, because `app/directory/page.tsx:11`
  reads `searchParams` for `?q=`. That is why it returns
  `no-store, must-revalidate`, costs 1.49s TTFB, and — a consequence worth
  recording — is **excluded from Chrome's back/forward cache**, since `no-store`
  disqualifies a page from bfcache. Moving `?q=` handling into the client
  component would let it prerender. Deliberately out of scope here; it is
  complementary, not dependent.
- **825 products (4%) are hosted off Shopify** (`abayasboutique.com`,
  `i0.wp.com`, `chador.nl`, `vivizubedi.com`, `lafemmecollectie.nl`,
  `kimodesty.com`, `www.aneesaitaly.com`). `lib/shopifyImage.ts` returns those
  untouched, so they get no `&width=` and no `srcset`. One measured at 133,246 B
  against 36,006 B for a comparable Shopify card image. Separate work.
- **No product image has an `onError` fallback** — `grep` finds none anywhere in
  `components/` or `app/`. A brand deleting a product between nightly refreshes
  renders the browser's broken-image glyph. 60 of 60 sampled images returned 200
  on 2026-08-10, so this is latent rather than active, but the refresh window is
  24 hours (`.github/workflows/refresh.yml`, `cron: "10 4 * * *"`). Separate
  work.
