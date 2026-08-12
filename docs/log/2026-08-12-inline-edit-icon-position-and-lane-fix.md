# Inline edit icon: bottom-left, persistent, un-hide-on-move, and the tray's missing lane moves
**Date:** 2026-08-12 · **Status:** done

## Goal

Three requests from Tina about the just-shipped inline staff-editing
feature: (1) move the edit pencil from the top-left to the bottom-left
corner of the product image, (2) stop the control from disappearing the
instant she moves or deletes a product, (3) make the "Move to" menu offer
the specific categories she was missing — Modest Swimwear, Modest
Activewear, Layering Basics — and Layering Basics' own sub-types
(Under-Dresses, Neck Covers & Dickeys, etc).

The data-layer/API/menu work for (3) landed via `docs/log/2026-08-12-lane-overrides.md`
(the `forcedLane`/`forcedLayeringSubtype` mechanism, `lib/liveLaneOverrides.ts`,
`/api/staff/live-edit/move-lane`, the expanded `StaffEditControl` menu). This
entry covers what I built on top of and around that: the two UI fixes, the
un-hide-on-move behaviour, and a real gap the fuller mechanism left behind.

## What changed

- **`components/StaffEditControl.tsx`** — trigger repositioned
  `top-2 left-2` → `bottom-2 left-2`.
- **`components/ProductCard.tsx`** — the control no longer conditionally
  unmounts after an action (`isStaff && !staffState` → `isStaff`); the
  quick-view eye button's position is no longer staff-conditional now that
  it doesn't share a corner with the pencil.
- **`app/api/staff/live-edit/move/route.ts`** and **`move-lane/route.ts`** —
  both now call `setLiveCut(id, 'keep')` after recording the move. A move
  is an unambiguous "this belongs, visibly, here" — without this, moving a
  previously-deleted item left it recategorised but still hidden, and
  "don't let it disappear" was only half true. Covered by new test cases in
  both route test files (mocking `@/lib/liveCuts`).
- **`app/staff/curate/ReviewTray.tsx`** — **real bug, found via end-to-end
  verification, not assumed fixed**: `GET /api/staff/live-edit/list`
  already returned a correct `laneMoves` array, but the tray component only
  ever read `data.moves` (garment moves) and `data.deletes`. A lane move —
  the exact class of edit this session's main ask was about — accumulated
  correctly in the live store and the API response, and was completely
  invisible in the tray's pending count, its list, and therefore the "Copy
  for Claude" export too. Fixed: `total` now includes `laneMoves.length`,
  a "Lane moves" section renders each with its friendly label
  (`laneLabel()`, reused from `StaffEditControl.tsx`) and subtype label
  where present.

## Verification

```
$ rm -f tsconfig.tsbuildinfo && npx tsc --noEmit          clean
$ npx eslint --max-warnings 0 lib components app scripts  clean
$ npx vitest run                                          1214/1215 passing;
   the 1 failure is a stale duplicate test file inside
   .claude/worktrees/jiggly-hugging-honey/ (a leftover linked worktree —
   vitest has no exclude for it, so it double-runs devOnly.test.ts from a
   nested checkout whose relative git-command path resolution breaks. Not
   this repo's real test suite, not a regression — flagging as a minor
   tooling-hygiene gap, not fixed here since it's unrelated to this task.)
$ rm -rf .next && npm run build                            clean, 32 routes
$ npm run verify:gate                                       GATE CHECK PASSED
```

Full Playwright pass against a real `next start` build, deliberately
structured as separate page-reload sequences (matching how a real user
actually works — open menu, act, move to the next thing) rather than one
long chained session, after discovering Base UI's nested submenu can get
into a confused state when many menu opens/closes are chained rapidly in
one continuous automated session (not reproducible under normal, human-
paced interaction — confirmed by isolating the exact same click in a fresh
page load, which worked immediately). 15/15 assertions passed:
- Pencil icon confirmed bottom-left of the image, not top-left.
- Menu confirmed to offer Modest Swimwear / Hijabs & Scarves (not bare
  "Swim"/"Hijab") in the garment submenu, and Modest Activewear /
  Layering Basics (with all 6 subtypes) at the top level.
- Moved one product to Layering Basics → Under-Dresses: card updates
  immediately, pencil icon stays present and clickable.
- Moved a different product to Modest Activewear: same.
- Deleted a third product: card fades and shows "Removed", pencil icon
  **still present** — the actual ask. Reload confirms it's gone from
  `/directory`.
- `/staff/curate` tray: "3 pending" (not 1 — confirms the fix), lists both
  lane moves with correct labels/subtype, lists the delete.
- "Copy for Claude" clipboard JSON verified to contain all 3 entries across
  the correct `deletes`/`laneMoves` arrays.
- Signed-out visitor: 0 pencil icons anywhere.

All test-server artifacts (credentials, live-store files, temp scripts)
removed after verification; none reached git.

## Notes

- This session's working tree had active, concurrent edits from another
  session throughout this piece of work (the lane-override data
  layer/API/menu itself). Nothing from that work was staged or committed
  under this session's commits — confirmed via `git diff --cached --stat`
  before every commit, matching the discipline in CLAUDE.md §10.30. One
  merge was required before pushing (`origin/main` had gained an unrelated
  docs commit); an untracked local file blocking that merge was confirmed
  byte-identical to the incoming committed version before removing it.
- `docs/log/2026-08-12-lane-overrides.md` exists on disk (written by the
  other session) but was uncommitted at the time of this entry — left
  untouched, not committed here, since it isn't this session's content to
  commit under its own name.
