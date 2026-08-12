# Merge and publish Tina's first live-curate export
**Date:** 2026-08-13 · **Status:** done

## Goal

Tina used the inline staff-editing controls on the real site and pasted
the resulting export from `/staff/curate`'s "Copy for Claude" button — the
first real use of the workflow built in `docs/log/2026-08-12-inline-staff-editing.md`.
50 deletes, 3 garment corrections, 0 lane moves.

## What changed

- Ran `node scripts/merge-live-edits.mjs` against the pasted export
  (saved to a scratch file first, not committed).
- `data/decisions.json`: 50 ids written `cut`.
- `data/garment-overrides.json`: 3 ids corrected (`set` → `hijab` — an
  undercap and two "Mini Instant Jersey Wrap Set" items that were
  misclassified as co-ord sets rather than hijabs).
- `npm run build:data` republished `data/products.json` — 22,695 products
  published, 0 guard trips.

## Verification

- Confirmed all 50 delete ids present as `cut` in `decisions.json` before
  publishing, and confirmed absent from `products.json` after.
- Confirmed all 3 garment-corrected ids read `garment: 'hijab'` in the
  republished catalogue (one of the three — `nour-al-houda:7781655806000`
  — was both corrected and deleted; correctly absent from the published
  set, since delete wins for publish, and the garment correction still
  stands recorded for consistency even though the item isn't live).
- `rm -f tsconfig.tsbuildinfo && npx tsc --noEmit` — clean.
- `npx eslint --max-warnings 0 lib components app scripts` — clean.
- `npx vitest run` — 1214/1215 passing; the 1 failure is the known stale
  duplicate test file inside `.claude/worktrees/jiggly-hugging-honey/`
  (unrelated tooling artifact, documented in the previous log entry).
- `rm -rf .next && npm run build` — clean, 32 routes.
- `data/products.json`'s diff is ~301k lines (`interleaveByBrand()`
  re-interleaving the whole catalogue on any change, per CLAUDE.md §8) —
  expected for a 50-row removal, verified by id/count rather than reading
  the diff line by line.
