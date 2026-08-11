# Garment classification confidence, cross-checking, and a review queue
**Date:** 2026-08-12 · **Status:** done (code); cleanup pass (`npm run refresh`) tracked separately

## Goal
Fix the class of bug behind "trousers in dresses" and a hijab neck-cover showing up as a
top (reported via Reddit screenshots), and fix why it keeps recurring instead of getting
fixed once — a `lib/tag.ts` fix has never reached already-published rows without a full
re-scrape (CLAUDE.md §10.12). Full design: `docs/superpowers/specs/2026-08-12-garment-classification-design.md`.
Full plan: `docs/superpowers/plans/2026-08-12-garment-classification.md` (10 tasks, executed
inline this session per Tina's direction — "go on with the implementation itself").

## What changed

- **`lib/tag.ts`** — anchored the `top`/`dress`/`skirt` rules to word boundaries (same bug
  class §10.10 fixed for `set`/`pant`, missed here: `vest` matched inside Spanish "Vestido",
  `dress` inside "Headdress"). Measured against the full 37,963-row corpus before shipping
  (§10.11 discipline) — naive anchoring regressed 92 real products
  (sweatshirt/tshirt/overshirt, overcoat/waistcoat/trenchcoat, sundress/underdress — all
  real no-space compounds) from correct to unclassified; added them as explicit
  alternatives. Re-measured: 54 remaining changes, all confirmed as bugs being fixed, not
  regressions (Turkish "Toprak" colourway false-matching "top", home-decor items matching
  "Tabletop"/"Desktop", etc.) — see commit `705d76d` for the full list.
  Also added: `classifyFromType()` (independent second opinion from `product_type` alone),
  `tagDiscovery()` now reports `source` (which of its 4 passes matched), `GARMENT_VALUES`/
  `GARMENT_LABELS` for the review UI.
- **`lib/types.ts` / `lib/normalize.ts`** — `Product` gains an optional `raw` field
  (`productType`, `tags`, `classifiedFrom`) so classification can be re-derived later without
  a re-fetch. `stripRawSignals()` removes it before publish (Invariant 15 — never reaches
  the public payload), same delete-from-shallow-copy pattern as `stripLifecycle`.
- **`lib/garmentReview.ts`** (new) — `resolveGarment()`, the pure publish-time decision:
  manual override > confident title match > held-back (signal-conflict / weak-signal /
  unclassified) > frozen fallback when no `raw` signals exist yet (pre-migration rows).
- **`scripts/build-data.mjs`** — wires `resolveGarment` into the `kept` filter; held-back
  rows go to `review.json` with both guesses instead of publishing a guess. Verified as a
  true no-op against the live dataset: `products.json`/`review.json`/`rejected.json` came
  out byte-identical before and after, since no existing raw row carries `.raw` yet.
- **`data/garment-overrides.json`** (new, tracked, starts `{}`) — manual corrections, same
  role as `decisions.json`, never written by any automated path (§10.13).
- **`lib/rawData.ts`** — `loadGarmentOverrides`/`saveGarmentOverride`/`loadReview`, same
  sentinel-guarded pattern as `loadDecisions`/`saveDecision`. No new test file — matches the
  existing (also untested) precedent for this file; verified via manual smoke test instead.
- **`app/api/admin/garment-review/{list/,}route.dev.ts`** (new) — dev-only GET/POST, under
  `/api/admin/*` specifically so `proxy.ts`'s existing matcher and `scripts/verify-gate.mjs`'s
  leak checks cover it with zero changes to either (deliberately avoided inventing a new
  top-level `/api/*` prefix that would need its own security review).
- **`app/admin/review/{page,ReviewClient}.dev.tsx`** (new) — lists held-back items with both
  guesses, a dropdown writes the override.
- **`scripts/verify-gate.mjs`** — added `ReviewClient`/`Garment review —`/`saveGarmentOverride`
  to the leak-check `NEEDLES`, same as the existing `CurateClient`/`saveDecision` entries.

## Verification

```
$ rm tsconfig.tsbuildinfo && npx tsc --noEmit
(clean)
$ npm run lint
(clean, aside from a pre-existing warning in the untracked .fontprobe.tmp.mjs scratch file —
 not mine, not tracked, will never reach CI)
$ npx vitest run
Test Files  29 passed (29)
     Tests  514 passed (514)
$ npm run build
33 routes — no /admin or /api/admin/* leaked
$ npm run verify:gate
GATE CHECK PASSED (all 5 checks ok)
```

Each task's own commit (`705d76d` through `ed5fe3e`) carries its own specific verification
evidence — corpus diffs for the regex hardening, a real `next dev` smoke test for the API
routes and review page. The review page's actual dropdown click-through was **not** visually
confirmed this session — the browser automation tool was unavailable (extension not
connected). What WAS verified: the exact API contract the component depends on, end-to-end
via curl against a real running dev server with a seeded `review.json` entry (GET → POST →
re-GET reflects the override). Flagging this rather than claiming full UI verification.

## Notes / follow-ups

- **`npm run refresh` was NOT run this session** — that's the "clean up now" half of the
  spec's two-part goal, deliberately separate (network-touching, ~108 brands, can take a
  long time) and tracked as its own step (Task 10 in the plan).
- **Found and fixed two unrelated things while reviewing `git log` before this entry**: an
  earlier same-session fix to `lib/sortRows.ts` (cross-currency price sort) and this
  session's GEO/AEO investigation log had both been completed and described to Tina as done,
  but never actually committed. Committed separately (`18f5562`) once confirmed via
  `git diff --cached` that no other session's concurrent uncommitted work (an in-progress
  currency-defaults change touching `lib/fx.ts`, `components/CurrencyFlag.tsx`,
  `data/fx-rates.json`, `scripts/fetch-rates.mjs` — left uncommitted by that session,
  confirmed via its own commit message which explicitly avoided `lib/fx.ts` to not collide
  with this session's then-uncommitted `sortRows.ts`) got swept in. This is the repo's
  documented concurrent-session risk (§10.17, §10.30) — handled by staging only the exact
  files confirmed as this session's own, not `git add -A`.
