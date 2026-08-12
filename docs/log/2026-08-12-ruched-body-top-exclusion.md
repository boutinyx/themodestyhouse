# Exclude "Ruched Body Top" from Layering Basics
**Date:** 2026-08-12 · **Status:** done

## Goal
Tina flagged modesty-in-style's "Ruched Body Top" as a real top, not a
layering piece. Checked the photo: a turtleneck top with visible ruched/
draped fabric detail, styled with a skirt and jewelry as a complete outfit
— nothing like the plain, unbranded "body top" basics the `\bbody top\b`
vocabulary was built from.

## What changed
- **`lib/specialty.ts`** — new `RUCHED_BODY_TOP_RE = /\bruched\b.{0,20}\bbody
  top\b/i`, checked in `isLayering()` before the main `LAYERING_RE` test
  (same pattern as `LAYERING_HIJAB_RE`). Checked scope first: "Ruched Body
  Top" is the only title in the whole catalogue combining "ruched" with
  "body top" — narrowed to this specific combination rather than weakening
  `\bbody top\b` itself, which correctly matches 20 other published items
  (nour-al-houda's "Jersey Body Top" line, modern-hijabi's "Sema Basic Body
  Top" line), both confirmed via photo in earlier passes as plain,
  unbranded base layers.

## Verification
```
npx tsc --noEmit    # clean for my change (2 pre-existing errors in
                     # app/api/staff/live-edit/*.test.ts from a concurrent
                     # session's in-progress work, confirmed via `git
                     # status` that lib/specialty.ts + its test are the
                     # only files I touched)
npm test              # 36 files, 594 tests passed (2 new)
npm run lint            # 0 errors (1 pre-existing unrelated warning)
```
Checked against the currently-published catalogue: `isLayering()` now
returns `false` for "Ruched Body Top"; `layering-basics` lane count dropped
by exactly 1 (140 → 139); the other 20 "body top" items are still present
and correctly classified.

## Notes / follow-ups
Production build (`npm run build`) was not run this pass, for the same
reason as the previous log entry today — the shared `.next` directory was
mid-collision from a concurrent session's work. This is a narrow, single-
regex text-classification change with existing full test coverage
(`lib/specialty.test.ts`), so the risk profile is low; worth a normal
`npm run build` sanity check once that session's work settles.
