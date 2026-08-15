# Touché Privé 240-item review — first pass

**Date:** 2026-08-15 · **Status:** done

## Goal

Tina's manual review of the 240 dual-store-verified Touché Privé products,
using the new `/staff/curate` "Review a brand" tool
(`docs/log/2026-08-15-staff-curate-brand-review.md`).

## What changed

Pasted export from the "Copy for Claude" button, merged via
`node scripts/merge-live-edits.mjs <export>`, republished with
`npm run build:data`:

- **20 deletes** — mostly shirts/skirts she judged not to belong, cut in
  `data/decisions.json`.
- **3 garment moves** (`dress`→`set`, `skirt`→`set` ×2) — co-ord sets that
  had been classified as their individual pieces, corrected in
  `data/garment-overrides.json`.
- **4 lane moves** — denim/gabardine jackets moved to Outerwear → Coats, in
  `data/lane-overrides.json`.

## Verification

- Structurally diffed each of the three override files against their `HEAD`
  version before staging (not just `git diff` — this repo has concurrent
  sessions touching shared JSON files, see CLAUDE.md §10.30): confirmed
  exactly 20/3/4 changed keys in each file, nothing else, nothing entangled
  from other in-flight work.
- Published touche-prive count: 240 → 220 (240 − 20 cuts, exact).
- Confirmed all 20 cut ids absent from the republished catalogue.
- Confirmed all 3 garment-moved ids read `garment: 'set'`.
- Confirmed all 4 lane-moved ids read `forcedLane: 'outerwear',
  forcedOuterwearSubtype: 'coat'`.
- `rm -f tsconfig.tsbuildinfo && npx tsc --noEmit` — clean.
- `npx vitest run` — 41 files, 681 passed.

## Notes / follow-ups

- 220 of 240 remain after this first pass — Tina may still be reviewing the
  rest; further exports should follow the same merge process.
- Once she's done, the live-edit queue should be cleared via "Clear list" in
  `/staff/curate` (gitignored container state, no recovery — only after
  merging, per `docs/log/2026-08-15-clear-live-edits-button.md`).
