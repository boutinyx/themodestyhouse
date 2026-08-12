# Split "Shirt Extenders" out of Sleeve Extenders
**Date:** 2026-08-12 · **Status:** done

## Goal
Tina flagged two screenshots — ria-miranda's "Fleurel Shirt Extender" and
"Elva Shirt Extender" — as not belonging under "Sleeve Extenders" in the new
Layering Basics Type filter. Checked the photos: these (and jaida's "Modest
Shirt Extender Slip") are a waist-tied wrap panel that hangs down to extend
a top's HEM length — a mini apron-skirt tied at the waist, nothing to do
with arm/sleeve coverage. They'd been grouped under `sleeve-extender` purely
because the word "extender" also appears in the sleeve-extender vocabulary
(`\bsleeve (?:cover|extender)s?\b`) — a false-friend match on one shared
word, not a real functional overlap.

## What changed
- **`lib/specialty.ts`** — new `LayeringSubtype` value `'shirt-extender'`,
  label "Shirt Extenders", inserted right after `sleeve-extender` in the
  canonical order (conceptually related — both "extend" something — but now
  correctly split by WHAT they extend). New `SHIRT_EXTENDER_RE =
  /\bshirt extenders?\b/i`, removed from `SLEEVE_EXTENDER_RE` (which no
  longer contains the term at all) and checked ahead of it in
  `layeringSubtype()`. `LAYERING_RE` itself (the top-level "is this layering
  at all" gate) is untouched — `shirt extenders?` still lives there; only
  the SUBTYPE grouping changed, not membership in Layering Basics.
- **`lib/specialty.test.ts`** — fixed the one stale assertion
  (`'Fleurel Shirt Extender'` no longer expected to be `sleeve-extender`)
  and added a dedicated test for all 5 real catalogue items landing in
  `shirt-extender`.

## Verification
```
npx tsc --noEmit          # clean
npm test                   # 33 files, 576 tests passed (net +1: fixed 1, added 2)
npm run lint                # 0 errors (1 pre-existing unrelated warning)
npm run build                # 38 routes, clean
```
Checked against the currently-published catalogue: `shirt-extender` count
5/5 (Jaida's slip + ria-miranda's Fleurel/Elva/Lisa/Linaya), `sleeve-extender`
dropped from 20 → 15 (exactly the 5 that moved), 0 items left with a null
subtype.

Verified live in a real browser against a production build: opened the Type
dropdown on `/layering-basics`, confirmed "Shirt Extenders" renders as its
own option between Sleeve Extenders and Base-Layer Tops, selected it, got
"Showing 5 of 5" — the exact confirmed count.

## Notes / follow-ups
None — this was a narrow, well-scoped correction to a mis-grouping, not a
new investigation.
