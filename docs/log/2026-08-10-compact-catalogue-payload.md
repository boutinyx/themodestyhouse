# Columnar-encode grid payloads so a device decodes only the cards it renders
**Date:** 2026-08-10 · **Status:** done

## Goal

Tina reported pictures on category pages taking 3-4 seconds to appear and asked
for a caching approach. Measured against production first (see the spec) and
found the real cause was upstream of images entirely: grid pages were
serialising every product in a lane into the client component's RSC payload —
`/modest-abayas` shipped 2,906,986 B uncompressed to render 25 photographs.
Design: `docs/superpowers/specs/2026-08-10-compact-catalogue-payload-design.md`
(approach A of three, chosen because it's the only one that doesn't trade away
instant local filtering).

## What changed

- **`lib/compactCatalogue.ts`** (new) — `encodeCatalogue(products, brands)`
  builds three dictionaries (brand, image-directory-prefix, garment/occasion)
  plus columnar per-row arrays. `decodeCard(cat, row)` materialises a
  `CardProduct` — the seven fields `ProductCard`/`QuickView` actually read —
  for one row. Two guards throw at encode time rather than silently drifting:
  out-of-stock products (the publish filter's job, not this module's) and a
  product whose currency disagrees with its brand record (currency comes from
  the brand, never the feed — `lib/normalize.ts:119`).
- **`lib/compactCatalogue.test.ts`** (new) — round-trips the entire real
  `data/products.json` (23,142 rows as of this commit), not a fixture, plus
  the two guard-throw cases and a WooCommerce-shaped url that isn't
  `homepage + /products/ + handle`.
- **`components/FilterableGrid.tsx`, `components/DirectoryBrowser.tsx`** —
  take `catalogue: CompactCatalogue` instead of `products: Product[]`.
  Filtering runs over integer row indices (`brandIdx`, `garmentIdx`,
  `occasionMask`) instead of decoded objects; only the ~24 visible rows get
  `decodeCard`'d.
- **`components/ProductCard.tsx`, `components/QuickView.tsx`,
  `app/favourites/page.tsx`** — typed against the narrower `CardProduct`
  instead of `Product`, so a decoded card can't be handed
  `season`/`activity`/`inStock` values nothing verified for it. Existing
  `tmh_favs` localStorage entries are full `Product` objects, a structural
  superset of `CardProduct` — no migration needed.
- **`app/[lane]/page.tsx`, `app/directory/page.tsx`** — call
  `encodeCatalogue(products, BRANDS)` before handing the result to the client
  component.

## Verification

`npm test`: 436/436 passed, including the full-catalogue round-trip.
`npx tsc --noEmit` (after `rm tsconfig.tsbuildinfo`): clean.
`npm run lint` on the 9 changed files: clean (an untracked, pre-existing
`.fontprobe.tmp.mjs` from another session fails the repo-wide lint; not part
of this change, not committed).

Byte sizes measured before/after on identical routes. "Before" = production
(`themodestyhouse.com`, current at time of measurement); "after" = an isolated
git worktree + real `npm ci` + `next build` + `next start`, built from this
commit's `data/products.json` (23,142 rows — larger than production's dataset
at measurement time because another session's tag-classifier fix landed in
between, so these ratios are if anything a *conservative* estimate of the win
on a matched dataset):

| Route | Uncompressed before | Uncompressed after | Reduction | Wire before | Wire after |
|---|---|---|---|---|---|
| `/modest-dresses` | 1,516,244 B | 637,202 B | 2.38x | 193,229 B | 178,060 B |
| `/modest-abayas` | 2,906,986 B | 1,031,052 B | 2.82x | 356,207 B | 283,213 B |
| `/directory` | 7,423,225 B | 2,892,490 B | 2.57x | 974,545 B | 834,386 B |

**The wire-byte win is much smaller than the uncompressed win — 8-20%, not
2.5x.** Brotli was already compressing away most of the redundancy this
change removes explicitly (repeated brand names, repeated URL prefixes), so
the download itself was never the main cost. What the uncompressed number
proxies for is what brotli *can't* remove: the CPU cost of parsing that much
JSON and reconciling that many React elements on the device's main thread
before hydration completes, which is what "pictures take 3-4 seconds to
appear" actually measures. That's the number this change targets, and it's
the one that moved 2.4-2.8x. This should be said plainly rather than leading
with the smaller wire figure.

`npm run audit:interaction` against the isolated build (both engines, all 4
widths): `filter-dropdown-after-tap` and `quickview-open` — the two surfaces
this change touches — both `ok`/"panel opened"/"modal ..." at every
width/engine combination, zero `PROBLEM` lines.

Sample HTML content-sanity check on the isolated build: 25 `<img>` tags and
232-276 `cdn.shopify.com` URL fragments per grid page (down from
3,026-14,704 before), confirming real cards rendered, not a blank/error page.

## Notes / follow-ups

- **Another session's `next start` on :3000 broke during this work.** My
  `npm run build` in the primary worktree overwrote the shared `.next`
  directory it was serving from (§10.28's exact failure mode). It stopped
  responding (`curl` timed out, then returned `000`) and has not been
  restarted — that's the owning session's process, not mine to touch. All
  verification in this entry was done in a separate git worktree
  (`git worktree add`) with its own `npm ci` and its own port (3555), and that
  worktree has since been removed. **Whoever owns the :3000 session likely
  needs to re-run `next start`.**
- Did not push to `origin/main` in the same action as building — see the
  follow-up commit/push, done separately once verification above passed.
- Everything the design doc flagged as explicitly out of scope remains open:
  `/directory`'s `searchParams`-driven dynamic rendering (spec's approach B),
  `/hijabi-outfits` still matching 97.5% of the catalogue, the 825 non-Shopify
  images with no `&width=`, and no `onError` fallback on product images.
