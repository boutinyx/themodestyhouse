# Republish: populate firstSeen for the Sort control's Newest/Oldest

**Date:** 2026-08-11 · **Status:** done

## Goal

Land real `firstSeen` values in `data/products.json` so the Sort control's Newest/Oldest
options actually reorder the grid, per Tina's request after reporting they "didn't work."

## What changed

Ran `npm run build:data` (which chains into `postbuild:data` → `scripts/translate_titles.py`
since `.venv-style` exists locally). No feed fetch — this only re-derives from data already on
disk (`data/raw-products.json`, `data/decisions.json`, `data/exclusions.json`).

- `data/products.json` — republished. `interleaveByBrand()` re-shuffles the whole catalogue on
  every publish, so this is necessarily a near-total-file diff (46,222 insertions / 23,134
  deletions), not a regression — see CLAUDE.md §8.
- `data/title-translations.json` — grew from the translate step (2,325 API calls attempted, 46
  titles actually changed, 0 failures, cache now holds 9,196 entries).

## Verification

- Publish output: `Published 23088 products (mixed across 107 brands) | rejected 3442 |
  review 48 | delisted-by-brand 127`. No `brandDropViolations` error — the guard passed
  cleanly, no `ALLOW_LARGE_DIFF` needed.
- `firstSeen` coverage measured directly on the new file: **16,994 of 23,088 published rows
  (73.6%)** now carry a real date; 6,094 stay `null` (pre-date lifecycle tracking,
  2026-08-05) — matches the 73.6% figure predicted in `docs/log/2026-08-11-sort-control.md`
  before this ran.
- `npm test` — 460/460 passing.
- `npx tsc --noEmit` — clean.
- `npm run build` — clean, 31 routes.
- Manual, via a throwaway Playwright script against a local `next start` build: "Newest"
  visibly reorders `/directory`'s first 5 cards versus Featured order. "Oldest" correctly
  shows the SAME first 5 as Featured — not a bug: the ~26% of still-undated rows sort first
  under "Oldest" (by design, §5's `Product.firstSeen` note), and a stable sort keeps them in
  their original Featured-order relative sequence, so the visible front of the list is
  identical until a dated row appears.

## Notes / follow-ups

- The published count moved from 23,142 to 23,088 (-54) versus the pre-republish figure quoted
  in the Sort control docs — expected churn from the nightly refresh that landed on `origin/main`
  earlier the same day (delisted-by-brand: 127), not caused by this publish.
- Coverage will keep improving as `npm run refresh` touches more brands over time; it never
  improves retroactively for rows that predate 2026-08-05.
