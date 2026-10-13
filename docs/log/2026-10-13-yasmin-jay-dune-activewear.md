# Yasmin Jay Dune pieces moved to Modest Activewear
**Date:** 2026-10-13 · **Status:** on staging, awaiting Tina's approval for main

## Goal
Tina sent a screenshot of "Dune Splash Blouse Black / Fawn Beige" on the blouses page: "this is active wear."

## What changed
- `data/lane-overrides.json`: six Yasmin Jay Dune ids pinned to `modest-activewear` — Splash Blouse, Tank Top and
  Splash Pant, each in Black and Fawn Beige. The brand itself tags them `swim, swimwear, tracksuit`.
- `data/products.json`: `npm run build:data` on a fresh `origin/main` (76e11a0) worktree.

Note: `lib/specialty.ts`'s isActivewear comment (2026-08-29) names the Dune Splash Blouse as an example of a
tag-only false positive. Tina's call today reverses that for this collection; the override pins only these six.

## Verification
- Republish diff by id against origin/main: 20,743 → 20,743 rows, 0 added, 0 removed, **6 changed**, and each change
  is only `forcedLane: null → modest-activewear`.
- Staging (`themodestyhouse-staging-production.up.railway.app`), HTML parsed in python:
  Blouse / Tank / Pant Black are present on `/modest-activewear`, absent from `/modest-tops?type=blouse`; the
  blouses page still renders its grid (control).
