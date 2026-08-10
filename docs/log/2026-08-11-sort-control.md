# Sort control — Price low/high, Newest, Oldest

**Date:** 2026-08-11 · **Status:** done

## Goal

Add a Sort dropdown (Featured / Price Low→High / Price High→Low / Newest / Oldest) to
`/directory` and every lane page.

## What changed

- `lib/types.ts` — `Product` gains `firstSeen?: string | null`.
- `lib/lifecycle.ts` — `stripLifecycle()` no longer removes `firstSeen`; it's now a published
  field. `lastSeen`/`delistedAt`/`filteredAt`/`filterReason` are unaffected, still stripped.
- `lib/compactCatalogue.ts` — new `rows.firstSeenDay: number[]` column, a compact integer
  day-index (days since `FIRST_SEEN_EPOCH` = 2026-01-01), `-1` sentinel for unknown/never-tracked
  rows. Sort-only — not decoded into `CardProduct`.
- `lib/sortRows.ts` (new) — `sortRowIndices()`, the shared comparator for both grids.
  Price comparison reuses `lib/fx.ts`'s `convert()` with the same native-price fallback
  `displayPrice()` uses, so sort order can never disagree with what's rendered.
- `components/DirectoryBrowser.tsx`, `components/FilterableGrid.tsx` — new "Sort"
  `FilterDropdown` in the shared `IndexPanel`. Composes with existing filters; deliberately
  does NOT reset the "Load more" count when changed (unlike every other filter).
- `scripts/build-data.mjs` — stale comment corrected after `firstSeen` stopped being stripped.

## Verification

- `npm test` — **exit 0.**

  ```
  > modest-house@0.1.0 test
  > vitest run

   RUN  v4.1.10 /Users/tina/modest-house/.worktrees/feature-sort-control

   Test Files  24 passed (24)
        Tests  460 passed (460)
     Start at  01:24:51
     Duration  2.99s (transform 5.07s, setup 0ms, import 6.76s, tests 1.43s, environment 1ms)
  ```

  (Vitest also prints a pre-existing Vite `configLoader: 'native'` deprecation warning about
  `vitest.config.ts` using ESM syntax in a file loaded as CommonJS. Unrelated to this branch.)

- `npm run lint` — **exit 0**, no output beyond the npm banner:

  ```
  > modest-house@0.1.0 lint
  > eslint --max-warnings 0
  ```

- `rm -f tsconfig.tsbuildinfo && npx tsc --noEmit` — **exit 0, no output at all** (the
  `tsbuildinfo` was removed first so `incremental: true` could not mask a repeat run —
  CLAUDE.md §4).

- Manual: `/directory` and a lane page, Sort chip opens; Featured / Price: Low to High /
  Price: High to Low reorder the grid correctly; composes with Category/Occasion/Brand/search;
  survives a currency-preference switch; Load More count survives a sort change. Newest /
  Oldest select cleanly but are inert on current data — see limitation 4 below.

## Notes / follow-ups

- No re-publish (`npm run build:data`) was run — `products.json` at HEAD still has no
  `firstSeen` values (the field was always stripped before this change). Newest/Oldest will
  show every row as the `-1`/unknown bucket (in whatever stable order they arrive in) until a
  publish runs. This is expected, not a bug — see the design spec's "Out of scope" section.
- **What actually populates it is a plain `npm run build:data`, not `npm run refresh`.**
  `firstSeen` is already on the raw rows and `stripLifecycle` no longer removes it, so the
  publish needs no network and no feed fetch. Measured 2026-08-11 by joining
  `data/products.json` against `data/raw-products.json`: **17,033 of the 23,142 published rows
  (73.6%) would get a real date** from an offline republish; the remaining 6,109 pre-date
  lifecycle tracking (2026-08-05) and would publish `null`. So Newest/Oldest are one small,
  deliberate command away from working over three quarters of the catalogue — not waiting on
  an unowned refresh cadence. The republish is left to Tina on purpose: it rewrites most of
  `products.json` (CLAUDE.md §8, `interleaveByBrand`) and has to be reviewed on counts and the
  `brandDropViolations` guard.
- `firstSeen` coverage is **24,327 of 37,954 raw rows (64.1%)** as measured 2026-08-11
  (tracking started 2026-08-05); it improves naturally as brands get refreshed, never
  retroactively.

### Known limitations / deferred items

Each of these was raised during the per-task reviews of Tasks 1–5, judged **Minor**, and
deliberately deferred to the whole-branch review rather than fixed inline. None is a
regression introduced by this branch except where stated.

1. ~~**The Sort chip always shows its current value, never a static "Sort" label.**~~
   **FIXED in the final review pass** — `FilterDropdown` now takes an optional `defaultValue`
   (default `'all'`, so Category/Occasion/Brand are untouched). See
   `docs/log/2026-08-11-sort-control-final-review-fixes.md`. Original text: Category /
   Occasion / Brand fall back to the dimension name until a non-default choice is made; Sort
   reads "Featured" from the start. This is an unavoidable consequence of `SORT_OPTIONS`
   including `'featured'` as a real, selectable option (an approved design choice) — the
   fallback in the shared `FilterDropdown` only fires when nothing is selected. Fixing it
   means changing `components/IndexPanel.tsx`, which is outside this plan's scope. Same root
   cause produces two more visible effects: the menu renders a literal "All sort" row above
   Featured (`IndexPanel.tsx` always injects one), and the Sort chip renders permanently in
   its active/highlighted state (`data-active={value !== 'all'}` is never false for Sort).

2. **Stale comment in `components/DirectoryBrowser.tsx` (lines 69–70).** It reads *"See the
   TODO in components/FilterableGrid.tsx — same pattern, same planned fix"*, but no such TODO
   exists in that file any more. Pre-existing, inherited from before this plan; worth a
   follow-up cleanup.

3. **`lib/fx.ts`'s `displayPrice()` rounds converted prices to whole units but prints exact
   native prices with decimals.** Pre-existing and unchanged here, but the Price sort now makes
   it visible: a converted `≈ $6` can sort above a native `$5.90`. The **sort key is correct** —
   it compares unrounded converted values — so this is a display-only quirk in already-shipped
   code, not a sort defect.

4. **Newest / Oldest are inert on the current `data/products.json`.** 0 of 23,142 published
   rows carry `firstSeen`, because no `npm run build:data` republish has happened on this
   branch. Stated again here, prominently, because it is the single most likely thing to look
   like a bug to anyone testing the live site today: two of the five options appear to do
   nothing. They are wired correctly; there is simply no data to sort on yet. **An offline
   `npm run build:data` is the trigger** — not a refresh — and it would give real dates to
   17,033 of the 23,142 rows (73.6%) today. See the Notes section above.

5. **Cross-currency price sort in "As listed" mode compares raw numbers across currencies with
   no conversion.** This is spec-correct — ADR-0002 is the site's standing no-conversion-by-
   default policy, and this feature's own design follows it — but the resulting order is not a
   meaningful "cheapest first" across a mixed-currency catalogue. A documented limitation, not
   a bug. Picking an explicit currency preference gives a fully converted, meaningful ordering.

6. **Minor test-coverage gaps**, none blocking:
   - `lib/lifecycle.test.ts` — the `stripLifecycle` tests assert the lifecycle fields are
     removed but do not assert that non-lifecycle fields survive the strip.
   - `lib/sortRows.ts` — no tie-stability test and no empty-array test. (The missing
     exhaustiveness guard on its `switch` was **fixed** in the final review pass.)
   - The missing-FX-rate cross-currency comparison path is untested.

These six are reserved for the final whole-branch review to triage; nothing here was fixed in
this task, which was verification and documentation only.
