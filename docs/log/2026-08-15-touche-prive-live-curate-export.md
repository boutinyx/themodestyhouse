# Merge Touché Privé live-curate export

**Date:** 2026-08-15 · **Status:** done

## Goal

Tina pasted the "Copy for Claude" export from `/staff/curate` — 11 deletes on
touche-prive, 0 moves, 0 laneMoves.

## What changed

- Saved the pasted JSON to a scratch file, ran
  `node scripts/merge-live-edits.mjs <scratch-file>`.
- `data/decisions.json`: 11 touche-prive ids written `cut`.
- `npm run build:data`: republished `data/products.json` — 20,947 products
  published across 109 brands, 0 guard trips.

## Verification

- Script output confirmed all 11 ids changed to `cut` (0 already matched).
- `grep` for each of the 11 ids in the republished `data/products.json`:
  all 11 absent.

## Notes / follow-ups

None — moves/laneMoves were empty in this export, so `garment-overrides.json`
and `lane-overrides.json` were untouched.
