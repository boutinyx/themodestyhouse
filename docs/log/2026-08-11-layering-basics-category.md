# Add a Layering Basics category
**Date:** 2026-08-11 · **Status:** done

## Goal
Tina flagged two screenshots of BNAH pieces (a long-sleeve base-layer top and a
sleeveless mock-neck "singlet") and asked for a category for "whatever this
type of garment is." These are coverage layers worn under another garment
(base layers, dickeys, standalone neck covers), not standalone outfits, and
they were scattered across `dress`/`set`/`top`/`hijab` in the data — e.g.
ilovemodesty's "Black Neck Cover" was published as a `dress`, Nasiba's 11
"Long Neck Cover" variants as a `set`.

Confirmed scope with Tina before touching anything: name = "Layering Basics",
hijab-adjacent pieces (tube bonnets, underscarf neck covers) stay in Hijabs,
full category lane (nav/footer/sitemap, same treatment as Tops/Dresses).

## What changed
- **`lib/specialty.ts`** — new `isLayering()`, folded into `isSpecialty()`
  alongside swim/activewear (same "held back from the mixed grid, own lane
  only" contract). Regex built entirely from vocabulary found in the real
  38k-row raw corpus (`neck cover`, `dickey`/`dickie`, `modesty panel`,
  `base layer`, `shoulder-cover`, `sleeve extender`/`arm sleeves`,
  `collar cover/insert`, `inner top`, `body top`, `singlet`) — not guessed.
  Verified against BNAH's live product photos (downloaded and viewed both
  screenshot items) before writing the regex: screenshot 1 is "Core Cotton
  Body Top", screenshot 2 is "Jersey High Neck Singlet Top" — confirming
  "body top" and "singlet" are real, generalizable vocabulary for this
  category (10 more hits on modern-hijabi's "Sema Basic Body Top" line alone).
  `\bbase layer\b` excludes a trailing "dress"/"abaya" — mariams sells a
  full-length "Base Layer Dress" and "Base Layer Abaya Dress" that are
  complete standalone garments, not accessories; only the accessory-scale
  pieces belong in this category. Explicitly excludes any title containing
  "hijab"/"underscarf"/"bonnet", per Tina's call.
- **`lib/lanes.ts`** — new `layering-basics` lane (`kind: 'category'`,
  `specialty: true`, same mechanism as swim/activewear). Nav/footer/sitemap
  pick it up automatically — nothing hand-wired, per the existing
  data-driven routing convention.
- **`lib/seoCopy.ts`**, **`lib/laneAnswers.ts`** — required entries (tests
  assert every lane has both). Real, specific copy — not filler.
- **`lib/specialty.test.ts`** (new) — regression tests using real catalogue
  titles: 9 positive matches across every brand the regex was built from, 2
  hijab/underscarf negatives, 2 standalone-top negatives (a "Turtleneck Top"
  or "High Neck Top" is not pulled out just for mentioning a neckline), and
  the base-layer-dress exclusion. Also backfilled missing coverage for
  `isSwim`/`isActivewear`, which had none.
- Republished `data/products.json` (`npm run build:data`) — same 23,088
  products / same ids, no garment reclassification. The diff is pure
  reordering: `inMixedGrid` in `scripts/build-data.mjs` must mirror
  `browseProducts()` (documented invariant in that file), and folding
  layering into `isSpecialty()` keeps them in sync automatically, but the 49
  items leaving the mixed-grid pool shifts the abaya-demotion interleave
  broadly — expected, matches the documented `interleaveByBrand` behavior.

## Verification
```
npx tsc --noEmit                    # clean
npm test                            # 28 files, 490 tests passed (23 new)
npm run lint                        # 0 errors (1 pre-existing warning in
                                     # untracked .fontprobe.tmp.mjs, not mine)
npm run build                       # 33 routes, /layering-basics in [+10 more paths]
npm run build:data                  # Published 23088 products; before/after id sets identical
```
Read-side check:
```
productsForLane('layering-basics').length  → 49  (in-stock)
browseProducts().filter(isLayering).length → 0   (nothing leaks into mixed grids)
productsForLane('modest-tops').filter(isLayering).length → 0
```
Rendered a production build on :4917 and fetched the real HTML:
title tag, h1, footer link, sitemap entry and 24 product cards all present,
including "Black Neck Cover" and "Long Neck Cover" titles in the grid.

## Notes / follow-ups
- 49 published items is a real but small category — reasonable for a v1.
  Deliberately did NOT chase every brand's own "basics" line-naming (e.g.
  BNAH's "Core Top", "Comfort Top" have no reliable generic signal beyond
  brand-specific naming) — that would need either brand-specific rules
  (fragile) or a description-based signal we don't retain (Invariant 15
  strips bulk text). If Tina wants those included, the honest fix is
  per-brand curation in a follow-up, not a broader regex.
- Two mariams items were candidates and excluded on purpose: "Sleeveless Slip
  Maxi Dress | Relaxed Fit Base Layer Abaya Dress(MS190)" and "Lazy Style...
  Base Layer Dress(MS157)" — both are full-length dresses, not accessories.
