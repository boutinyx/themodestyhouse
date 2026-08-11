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

## Addendum — ilovemodesty "One Piece Sleeves"
Tina flagged a third screenshot: ilovemodesty's "[Color] One Piece Sleeves" —
a shrug-shaped sleeve extender (shoulder cap + sleeves only, no torso),
published as `top` x10. Added `\bone.?piece sleeves?\b` to `LAYERING_RE`
(requires "sleeves" immediately after "one piece" so it can never match a
"one piece swimsuit"). Regression test added. Republished: same 23,088 ids,
`layering-basics` published count 49 → 59. `tsc`/491 tests/lint/build all
clean before republish.

## Addendum 2 (2026-08-12) — broader vocabulary sweep
Tina asked to find and add others. Swept a wider set of candidate terms
against the raw corpus (shrug, capelet, cover-up, second skin, extender,
under shirt, half sleeve, sleeve slip, cami, thumb hole…) and manually
reviewed every hit before deciding what to add — most were rejected as real
standalone garments:
- **Added:** `shirt extender` (ria-miranda x5 + jaida x1, e.g. "Fleurel
  Shirt Extender" — a piece worn under a shirt to extend its hem/coverage),
  `second skin top` (aab x7 — narrowed to the top variant only, since aab
  also sells "Second Skin Leggings"/"Second Skin (Full) Slip", both complete
  standalone garments), `under shirt`/`undershirt` (touche-prive x2).
- **Rejected — shrug (44 hits, eastessence):** "shrug" here names a complete
  2-piece abaya silhouette (an open cardigan-style outer piece bundled with
  its own inner dress), not a standalone accessory. Moving it would have
  pulled real abayas out of /modest-abayas.
- **Rejected — cover-up (28 hits):** real name for cardigans ("Cardigan
  Cover Up", veiled), full abayas, and swim/sun-protection cover-ups — all
  complete garments already correctly laned. Too ambiguous to use as a signal.
- **Rejected — capelet, half sleeve, sleeve slip:** each hit was a complete
  standalone dress describing its own silhouette/sleeve length ("Capelet
  Dress", "Long Sleeve Slip Dress"), not an accessory worn under something
  else.
- **Rejected — bare "cami" (1 hit):** too ambiguous on its own (a cami can be
  a standalone strappy top) to generalize from a single example.

Regression tests added for every accept/reject decision above. Republished:
same 23,088 ids, `layering-basics` published count 59 → 73. `tsc`/493
tests/lint/build all clean before republish.

## Addendum 3 (2026-08-12) — visual sweep with Playwright, per Tina's request
Tina asked to "use playwright in the directory to find more." Text-grep alone
can't find a layering piece with a generic title (BNAH's own "Core Cotton
Body Top" was only ever confirmed by looking at the photo, back in the first
pass) — so this pass drove the live `/directory` search with Playwright,
screenshotted every ambiguous "basics"-sounding title, and judged each one on
the actual product photo, price tier and styling, the same way the original
two BNAH screenshots were judged.

**Added** (6 rows, all visually confirmed):
- BNAH **"Core Top"** ($23, plain unbranded long-sleeve crew) — same family
  as "Core Cotton Body Top", already included.
- BNAH **"Luxe Basic Top"** ($8, photographed peeking out from under a hijab
  cap — the classic underlayer merchandising shot).
- ria-miranda **"Comfy Sleeveless/Long Sleeve/Short Sleeve Top"** (3 rows) —
  their "ri-flex" base-layer sub-line (own logo/tagline on the product
  photo), flat-lay shots, no branding. Brand-scoped in code (`\bcomfy ...
  top\b` only applied when `brandSlug === 'ria-miranda'`) since the phrase
  itself is generic.

**Checked and rejected** (real, standalone garments, confirmed by photo):
BNAH's "Core Ribbed Tank" (branded, $40, styled as a going-out tank),
"Comfort Top"/"Comfort High Neck Top" ($28-66, styled as complete outfits),
"Modal Ruched Top"/"Modal Turtleneck Top" ($25-61, fashion pieces),
"Everyday Crew Neck Top"/"Everyday Relaxed Top" (styled as complete
outfits), "Tencel Tank Top" (tunic-length, worn over other clothing),
"Cotton Contour Top" (tailored, styled as a complete outfit); aab's
"Cropped Cotton Top" ($47-55, real premium cropped top, price alone ruled
it out); ria-miranda's "Shera Inner Tee" (its name suggested a base layer,
but the photo shows a zip-collar, RIAMIRANDA-logo-printed top styled as a
complete athletic outfit — correctly activewear, not layering).

**Bug found and fixed along the way:** all four of the ria-miranda items
above (the 3 added + Shera Inner Tee) carry a noisy `activity: ["gym"]` tag
on the feed. `isActivewear()` was treating that as sufficient (garment
`top` + `activity: gym` → activewear) with no override, which hid the three
real layering pieces from both `/directory` search and `/layering-basics`
entirely — they were silently in `/modest-activewear` instead. Added the
same precedence `isActivewear()` already gives `isSwim()` — a confirmed
`isLayering()` piece is never also counted as activewear — while leaving
"Shera Inner Tee" (a genuine gym top) untouched.

**Publish deferred.** `npm run build:data` was NOT run this pass. Another
session is concurrently working in this same working tree on a garment
classification/refresh feature (`lib/garmentReview.ts`,
`app/api/admin/garment-review/`, 15 commits already on `origin/main` ahead
of where this branch of work left off) and has an uncommitted, in-progress
`data/raw-products.json`/`decisions.json` refresh sitting in the working
tree. Running `build:data` against it tripped the brand-collapse guard hard
(`amariah` 44→30, `feeya` 16→0, `ahlam-collections` 38→0, etc. — real drops
in THEIR in-progress data, nothing to do with this change). Publishing
through that with `ALLOW_LARGE_DIFF=1` would have baked their unfinished
work into this commit under this message, which is exactly the mistake
CLAUDE.md §10.30 already logged once. Committed only `lib/specialty.ts` +
`lib/specialty.test.ts` (verified via `tsc`/520 tests/lint, all clean) and
left every file that session touched — `data/*.json`,
`app/api/admin/garment-review/list/route.dev.ts`, `lib/garmentReview.*` —
untouched. **Follow-up: once that session's work lands, run `npm run
build:data` again** to actually publish these 6 new rows into
`data/products.json` — until then the code is correct but not live.

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
