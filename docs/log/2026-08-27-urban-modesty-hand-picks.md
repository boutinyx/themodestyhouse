# Urban Modesty: Tina's 20 hand-picked pieces back in

**Date:** 2026-08-27 · **Status:** done

## Goal
Following `2026-08-27-empty-urban-modesty.md`, Tina sent 20 product URLs grouped under
the category she wants each in: Dress ×7, Blazers ×1, Co-ord ×2, Abayas ×3, Skirts ×1,
Tops ×1, Hijabs ×4, Sweater ×1 — plus, for the sweater, *"put the version of the
picture that is long"*.

## What changed
- **`npm run refresh -- urban-modesty` first**, before touching anything. The rows had
  been frozen since the last ingest and I was about to publish 20 of them on the
  strength of their stored titles, stock and images. Complete fetch: `263 fetched,
  +0 new, 263 updated, -0 delisted`.
- **`data/decisions.json`** — the 20 ids flipped `cut` -> `keep` (20 flipped, 0 already).
- **`data/garment-overrides.json`** — 5 entries, only where the tagger disagreed with
  her heading. The other 15 were already classified as she wanted and got no override,
  deliberately: an override PINS a value forever, so writing one that changes nothing
  is a silent commitment.
- **`data/lane-overrides.json`** — 2 entries, both `outerwear`: the vest suit set
  (`vest`, so it lands on Blazers & Vests) and the Knit Sweater (`sweater`, Cardigans
  & Sweaters).
- **`data/image-overrides.json` — a new mechanism**, see below.
- **`data/products.json`** — 18,889 -> **18,907 (+18)**, 108 -> 109 brands.
- `data/raw-products.json` — 263 rows updated by the refresh.

## The sweater's photograph, and why a new file
`pickImage()` chose the CROPPED version. It had nothing to go on: all six of that
product's images are 1086×1448 PNGs, so portrait-dominance ties, the JPG-over-PNG
photographic signal ties, and it takes the first. Looked at all six as a contact sheet:
index 0 is the short/hip-length cut; 1–5 are the long tunic length. Took index 1, the
first long one and the same taupe colourway as the current pick.

The fix could not go on the raw row. `pickImage()` runs at SCRAPE time and raw rows are
frozen (§8), so a hand-chosen photograph written there is silently reverted by the next
`npm run refresh` — which is precisely what I had just run. So
`data/image-overrides.json` is applied by `scripts/build-data.mjs` at PUBLISH time, in
the same pass as garment / lane / dress-subtype overrides, and survives every refresh.

`lib/imageOverrides.test.ts` guards it, and is explicit about what it CANNOT check:
raw rows keep only the one image `pickImage` settled on, never the array, so nothing
offline can prove an override URL belongs to the product it is keyed to. That is the
§10.12 failure exactly — a card illustrated with a photo of a different garment is
invisible from the grid. Offline it asserts the override is on the same storefront's
CDN namespace as the row's own photo, and that the published row really carries it.
The strong check is manual and was done here: fetched
`urbanmodesty.com/products/knit-sweater-1.json` and confirmed the URL is in that
product's own `images` array.

## Verification
`git fetch` first (§10.35): `HEAD..origin/main` empty.

All 20 handles resolved to a raw row — 0 missing. Each was confirmed present with its
decision, garment, stock and lifecycle state BEFORE anything was written.

After the publish, checked through the real lane accessors rather than the JSON fields:

| she asked for | lands on | n |
|---|---|---|
| Dress | `modest-dresses` | 7/7 |
| Co-ord | `modest-sets` | 2/2 |
| Abayas | `modest-abayas` | 3/3 |
| Skirts | `modest-skirts` | 1/1 |
| Tops | `modest-tops` | 1/1 |
| Hijabs | `modest-hijabs` | 3/4 |
| Sweater | `cardigans-sweaters` (subtype `sweater`) | 1/1 |
| Blazers | — | 0/1 |

`urban-modesty published total: 18`. Every one appears on exactly the lane she named
and no other.

Sweater image override applied: `p.image` ends `B2D883A7-…`, i.e. the long version.

**Negative control before trusting the new guard** (§10.28 rule 1): pointed the
override at a same-storefront URL that is not what the catalogue carries; "actually
reaches the published catalogue" failed, then passed again when restored.

`npm test` — `Test Files 54 passed (54) · Tests 879 passed (879)`.
`npx tsc --noEmit` clean. `npm run lint` exit 0.

## Two of the 20 did not publish — both genuinely out of stock
Not a pipeline problem; verified against the live storefront, which returns
`schema.org/OutOfStock` for both:

- **Gray Vest and Pants Suit Set** (`gray-vest-and-pants-suit-set`) — the only Blazers
  pick. Marked CLEARANCE.
- **Brown Lace Trim Modal Hijab** (`brown-lace-trim-modal-hijab`).

Their decisions ARE `keep` and their overrides are in place, so both appear on their
own the moment Urban Modesty restocks them — no further action needed.

## Three URLs point at products the brand has since renamed
Worth knowing, because the slug and the title disagree and the TITLE is right. Each
confirmed by fetching the live product JSON and matching the Shopify product id:

| URL slug | actual product (live) | id |
|---|---|---|
| `asymmetrical-linen-skirt-set` | Black Asymmetrical Shirt | 7709178232907 |
| `purple-gray-floral-tie-maxi-dress-copy` | Beige Floral Maxi Dress | 8053124563019 |
| `beige-striped-button-down-maxi-shirt-dress-copy` | Pink Striped Button Down Tunic | 8066558689355 |

Shopify keeps the original handle when a product is renamed. Since Tina was browsing
the site and clicking the photographs, these are the pieces she saw — but flagging it
in case a slug, not a photo, is what she went by.

## Notes / follow-ups
- **All 18 rows now carry EUR, not USD.** The refresh ran from this machine, and
  Shopify Markets serves `/products.json` in the requester's currency (Invariant 15) —
  the feed served EUR and `refresh.mjs` said so out loud: `CURRENCY: urban-modesty:
  feed served EUR, data/brands.ts declares USD — using EUR`. That is correct, not a
  defect: the price and its label agree, which is the whole point of §10.44. The
  nightly CI refresh runs on a US runner and will re-stamp them USD with USD prices,
  equally correct. Nothing to fix; noted because a currency flip in the diff looks
  alarming if you do not know why.
- The house is back on `/designers` (109 brands publishing), but at 18 pieces it is
  still under `MIN_PRODUCTS = 24`, so `/designers/urban-modesty` stays a 404 until it
  has 24. Six more pieces would bring the page back.
- `data/default-cut-brands.json` still lists the house, so any NEW Urban Modesty
  arrival keeps defaulting to `cut`. These 20 `keep`s are decisions and are never
  touched by it.
