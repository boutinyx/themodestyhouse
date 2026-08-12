# Cut off-brand/non-apparel items, move ilovemodesty crop tops into Layering Basics
**Date:** 2026-08-12 · **Status:** done

## Goal
Tina sent 8 screenshots of products that don't belong in a curated modest
directory and asked to "get rid of these, put the crop tops in layering
basics." Identified exactly which products each screenshot showed by
cross-referencing titles against `data/raw-products.json`, then confirmed two
ambiguous cases with her before cutting anything (see below).

## What was cut (permanent, `data/exclusions.json`)
- **mukistore's entire "Dutch Angels" sub-line** (7 published SKUs — 5
  graphic t-shirts + 2 tracksuit sets) via a new `\bdutch angels\b` title
  pattern, checked against the whole raw catalogue first: matches exactly 26
  mukistore rows (7 published, 19 already out of stock/unpublished) and
  nothing from any other brand. Off-brand fast-fashion streetwear collab
  (car-and-logo graphic tees, one shown on a male model) with no place in
  "aspirational and well-designed, women's only" curation. Confirmed with
  Tina to cut the whole line, not just the 5 t-shirts she screenshotted —
  the 2 tracksuits she hadn't seen are the same problem.
- **kamin's "DOT | LID"** (id-pinned) — a single non-apparel item (a
  bottle/canister product with a ball-shaped lid) misfiled as `garment: top`
  in an otherwise clean, entirely-abaya catalogue (308 published items, 307
  of them real garments).
- **4 mariams graphic tee/hoodie/sweatshirt items** (id-pinned, not a text
  pattern): "MS034 Free Palestine Printed Casual T-shirt", "Free Palestine
  Hoodie", "Ramadan Keffiyeh Customizable Sweatshirt" (shown on a male
  model — also a women's-only violation) and "...Hoodie t-shirt" (same
  product family, MTC002). Deliberately NOT a `free palestine`/`keffiyeh`
  text pattern — mariams also sells several legitimate keffiyeh-PRINT hijabs
  and a keffiyeh-inspired abaya (real modest womenswear with a statement
  print, not political streetwear), and a bare pattern would have caught
  those too. Checked: none of the 7 remaining keffiyeh/Palestine hijab/abaya
  items match any new pattern or id.
- **mukistore's "3 Ties Basic Cardigan 6072" and "Waistcoat Must-have
  Pockets"** (id-pinned) — confirmed with Tina before cutting: these read as
  real, on-brand modest pieces (a cardigan and a long vest), flagged for a
  visible "Mukistore.nl" Instagram watermark in the product photo rather
  than an editorial problem with the garment itself. Her call was to cut
  them anyway.

14 ids/pattern-matches total. See `git diff` on `data/exclusions.json` for
the exact list.

## What was recategorized (`lib/specialty.ts`)
ilovemodesty's 13 "[Color] Cropped Long Sleeve Body Shirt" items are
midriff-baring crop tops — not modest as standalone pieces, but exactly the
kind of thing meant to be worn UNDER a high-waisted skirt or trouser, same
family as everything else in Layering Basics. Added
`\bcropped .{0,20}body shirt\b` to `LAYERING_RE`, scoped tightly: checked the
product photo for ilovemodesty's OTHER "Full Body Shirt" line (no "Cropped")
first — that one is a plain, full-length, high-neck top, a real standalone
garment — and confirmed the pattern does not match it. 13/13 cropped items
now route to `/layering-basics`; 0 leak into the regular grid; the 18
uncropped "Full Body Shirt" items are untouched.

## Verification
```
npx tsc --noEmit          # clean
npm test                  # 33 files, 562 tests passed (2 new)
npm run lint               # 0 errors (2 pre-existing unrelated warnings)
npm run build               # 33 routes, clean
npm run build:data          # published 22880 -> 22866 (-14, exact match)
```
Programmatic checks after republish:
- All 14 excluded ids confirmed absent from the new `data/products.json`.
- All 13 crop-top ids confirmed still published (recategorized, not cut).
- `productsForLane('layering-basics')`: 91 → 104 (+13, exact match).
- `browseProducts()` filtered for the crop-top pattern: 0 matches — nothing
  leaks into the mixed grid.

## Notes / follow-ups
- The "Mukistore.nl" Instagram-watermark issue that got the cardigan/
  waistcoat cut is likely broader than these 2 items — not investigated
  further this session since Tina's answer was scoped to those two. If she
  wants a full sweep for watermarked product photos across mukistore (or
  other brands), that needs a visual pass, not a text search.
