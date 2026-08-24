# Category/sub-category move destinations: Modest Activewear, Layering Basics
**Date:** 2026-08-12 · **Status:** done

## Goal

Tina, after the inline-editing feature shipped: icon to the bottom-left
corner, don't disappear after an action, and — the substantive gap —
"i dont see move to layering basics or modest swimwear etc. i want the
specific catagories and also sub catagories like the laying basics like
underdresses etc."

## What was actually true

Investigated before touching anything (`lib/specialty.ts`, `lib/lanes.ts`,
`lib/types.ts`): 7 of the 10 category lanes are driven purely by
`p.garment` (Dresses, Abayas, Hijabs, Skirts, Tops, Trousers, Sets), and
the already-shipped garment-override mechanism fully covers them — Modest
Swimwear too, since `garment === 'swim'` already satisfies `isSwim()`. The
real gap was Modest Activewear and Layering Basics: `isActivewear()` and
`isLayering()` classify from **title text**, not `garment`, so a garment
override could never move something into either one. That's why Tina
never saw them as "Move to" options — they structurally couldn't exist
yet.

## What changed

**New override axis, parallel to garment overrides (previous commit):**
- `Product` gains `forcedLane?: 'modest-activewear' | 'layering-basics'`
  and `forcedLayeringSubtype?: LayeringSubtype` (`lib/types.ts`).
  `LayeringSubtype` moved here from `lib/specialty.ts` to avoid a circular
  import, re-exported for the one existing call site
  (`lib/compactCatalogue.ts`).
- `isSwim`/`isActivewear`/`isLayering`/`layeringSubtype`
  (`lib/specialty.ts`) check `forcedLane` first — authoritative and
  **exclusive**, so a corrected item can't match two lanes at once (a
  product forced into Activewear stops matching Layering even if its
  title would, and vice versa; forcing either stops `isSwim()` too).
- `lib/liveLaneOverrides.ts` (+test) — live runtime store, mirrors
  `lib/liveGarmentOverrides.ts` byte-for-byte:
  `data/.live-lane-overrides.json`, gitignored, atomic write.
- `lib/products.ts::getProducts()` applies it alongside the garment
  override, same choke point every lane already reads through.
- `data/lane-overrides.json` — new permanent, git-tracked store (parallel
  to `garment-overrides.json`), baked into `forcedLane`/
  `forcedLayeringSubtype` at publish time by `scripts/build-data.mjs`.

**Picker UI (`components/StaffEditControl.tsx`):**
- Garment submenu now shows lane titles ("Modest Swimwear", "Hijabs &
  Scarves") instead of the bare garment label — a small
  `GARMENT_LANE_SLUG` map resolves each of the 8 movable garments to its
  matching `lib/lanes.ts` entry.
- New top-level "Move to Modest Activewear" item.
- New "Layering Basics" submenu listing all 6 sub-types (Neck Covers &
  Dickeys, Sleeve Extenders, Shirt Extenders, Base-Layer Tops, Cropped
  Body Shirts, Under-Dresses) — the exact list Tina asked for by name.
- Icon repositioned to the image's bottom-left corner (was top-left,
  colliding conceptually with quick-view); quick-view moved back to a
  plain top-left position now that there's no overlap to avoid.
- The edit control no longer disappears after a move or delete — a
  mistaken action is immediately correctable, no reload needed.

**API / pipeline:**
- `POST /api/staff/live-edit/move-lane` (new) — validates `lane` against
  the 2 valid values and `subtype` against the 6 valid values.
- Both `move` and `move-lane` now also call `setLiveCut(id, 'keep')` — a
  move is an unambiguous "this belongs, visibly, right here," so it
  un-hides a previously-deleted item rather than leaving a corrected item
  invisible.
- `GET /api/staff/live-edit/list` now returns `laneMoves` alongside
  `deletes`/`moves`, surfaced in the `/staff/curate` tray and its
  "Copy for Claude" export.
- `scripts/merge-live-edits.mjs` folds pasted `laneMoves` into
  `data/lane-overrides.json` (pretty-printed, matching
  `garment-overrides.json`'s existing convention).

## Verification

```
$ rm -f tsconfig.tsbuildinfo && npx tsc --noEmit         clean
$ npx vitest run --exclude '.claude/**'                   38 files, 620 tests passed
$ npx eslint --max-warnings 0 lib components app scripts  clean
$ rm -rf .next && npm run build                            clean, 32 routes incl. move-lane
$ npm run verify:gate                                      GATE CHECK PASSED
```

Real end-to-end verification against a `next start` build (this session's
own standing preference — Playwright, not curl). The working directory
had heavy concurrent activity from another session throughout this piece
(shared `.next` build directory, shared gitignored
`data/.live-*-overrides.json` files) — several Playwright runs failed for
reasons traced to that contention, not the code: a build stomped mid-way
by a concurrent rebuild, a browser context closing under resource
pressure, and the live-store JSON files getting overwritten between two
test scripts by what looks like the other session's own testing of the
same feature. Rather than trust a flaky run, each finding was isolated
and re-checked with a minimal, targeted script until the cause was clear:

- Direct DOM dump of the open menu confirmed "Move to Modest Activewear",
  the "Layering Basics" trigger, and all 6 subtype items (including
  "Under-Dresses") render correctly — settled after two earlier scripts
  gave false failures from reopening a Base UI menu mid-script.
- A tight, single-page script (move → immediately `fetch()` this
  session's own `GET /api/staff/live-edit/list` in the same browser
  context) confirmed the click → API call → live store write → readback
  chain works end to end, with no window for another process to
  interleave: the moved product showed up with `to: 'layering-basics',
  subtype: 'under-dress'` immediately after the click.
- Pencil icon confirmed in the bottom-left quadrant of the image via
  bounding-box comparison, and confirmed still present and fully
  interactive (menu reopens) after an action.
- `lib/products.test.ts` and `lib/specialty.test.ts` cover the underlying
  logic deterministically (mocked/injected storePath, immune to the
  shared-file contention above) — 15 and 79 tests respectively, all
  passing.

## Notes

- Left the shared `data/.live-cuts.json` / `data/.live-lane-overrides.json`
  files as they were after verification (mixed test data from both this
  session and whatever the other session wrote) rather than risk deleting
  something it still needed — both are gitignored and never reach a
  commit either way.
- Left `.tmp-verify-category-editing.mjs` untouched at the repo root — not
  a file this session created; presumably the other session's own
  in-progress verification script.
