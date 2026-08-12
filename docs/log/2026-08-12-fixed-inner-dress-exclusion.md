# Exclude "Fixed Inner Dress" — a sewn-in lining, not a separate accessory
**Date:** 2026-08-12 · **Status:** done

## Goal
Tina flagged mukistore's "Maxi Dress with Floral Print and Fixed Inner
Dress" as a real dress, not an under-dress. The raw feed title is Dutch
("Maxi Jurk met Bloemenprint en Vaste Binnenjurk"), translated to English at
publish time by `build-data.mjs` before it reaches `data/products.json` —
`isLayering()`/`isJilbab()`/etc. all run on that PUBLISHED title (`getProducts()`
reads `data/products.json`), which is how "inner dress" ended up matching
`UNDER_DRESS_RE` at all despite the source being a different language. "Vast"
= fixed/attached: the inner lining is sewn INTO this one garment as a
construction detail, not a separate accessory sold alongside it — the same
situation the existing `garment !== 'abaya'` guard already handles for
bundled abaya/kimono set listings, just on a `garment: 'dress'` that guard
doesn't cover.

## What changed
- **`lib/specialty.ts`** — new `FIXED_INNER_RE = /\bfixed\b.{0,20}(?:\binner
  dress\b|\bunder.?dress\b)/i`, checked in `isLayering()` before the
  positive `UNDER_DRESS_RE` match (same pattern as `RUCHED_BODY_TOP_RE`
  earlier today). Checked scope first: the only title in the whole
  published catalogue combining "fixed" with "inner dress"/"under dress",
  so this stays narrow.

## Verification
```
npx tsc --noEmit    # clean for my change (2 pre-existing errors in
                     # app/api/staff/live-edit/*.test.ts from a concurrent
                     # session's in-progress work — confirmed via git status
                     # that lib/specialty.ts + its test are the only files
                     # I touched)
npm test              # 36 files, 595 tests passed (1 new)
npm run lint            # 0 errors (1 pre-existing unrelated warning)
```
Checked against the currently-published catalogue: `isLayering()` now
returns `false` for this item; `layering-basics` lane count dropped by
exactly 1 (139 → 138); the other 41 under/inner-dress items are still
present and correctly classified.

## Notes / follow-ups
Same as the previous two log entries today — `npm run build` was not run,
the shared `.next` directory was mid-collision from a concurrent session.
Narrow single-regex text-classification change with full existing test
coverage; worth a normal build sanity check once that session's work
settles.
