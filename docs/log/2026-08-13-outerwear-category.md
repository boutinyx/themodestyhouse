# Outerwear category (Blazers, Vests, Cardigans, Coats)

**Date:** 2026-08-13 · **Status:** done

## Goal

New "Outerwear" lane, pulled out of Tops, with a hover-opened Type filter narrowing to
Blazers/Vests/Cardigans/Coats — mirroring the existing Layering Basics mechanism. Tina's call,
arrived at over conversation (one combined lane, not four separate ones; pulled out of Tops
entirely, not left in both places).

## What changed

- `lib/types.ts` — new `OuterwearSubtype` type; `ForcedLane` gained `'outerwear'`.
- `lib/specialty.ts` — new `isOuterwear()` (gated on `garment === 'top'`, plus a title regex
  and an `isLayering()` exclusion guard) and `outerwearSubtype()` (rightmost-match heuristic,
  checked before any `|` first). Added to `isSpecialty()`.
- `lib/lanes.ts` — new `outerwear` lane (`specialty: true`), picked up automatically by the
  existing data-driven nav/footer/sitemap. `modest-tops`'s match gained `&& !isOuterwear(p)`.
- `lib/compactCatalogue.ts` — parallel `outerwearSubtypes`/`rows.outerwearSubtypeIdx` column,
  same shape as the existing layering one.
- `components/FilterableGrid.tsx` — the Type filter now branches between layering and
  outerwear subtypes depending on which column is non-empty for the current lane.
- `lib/laneAnswers.ts`, `lib/seoCopy.ts` — added the required per-lane entries these two
  files' own tests demand for every `LANES` slug (a different session's GEO/SEO feature,
  landed while this branch was in progress — see Notes below).

## Root cause avoided (not a bug fixed, a bug avoided)

A naive title-only regex would have misclassified 190 real dresses/abayas/sets/skirts/trousers
as outerwear — "Capo Blazer Dress", "The Oversized Blazer Abaya In Sage Green", "Vest And Skirt
Set" all contain a matching whole word while being a completely different garment. Measured
against the real catalogue before writing any code, not discovered after shipping.

## Verification

- `npx vitest run --no-file-parallelism`:
  ```
  Test Files  2 failed | 72 passed (74)
       Tests  2 failed | 1230 passed (1232)
  ```
  Both failures are `.claude/worktrees/jiggly-hugging-honey/lib/{devOnly,aboutStats}.test.ts` —
  a DIFFERENT concurrent session's isolated worktree, nested inside this working directory and
  picked up by vitest's file discovery. Not this repo's own test files (confirmed: `lib/devOnly.test.ts`
  and `lib/aboutStats.test.ts` at the real repo root both pass). Not touched — it's another
  session's active workspace, not mine to remove.
- `npm run lint`:
  ```
  /Users/tina/modest-house/.fontprobe.tmp.mjs
    10:7  warning  'mk' is assigned a value but never used
  ✖ 1 problem (0 errors, 1 warning)
  ```
  Pre-existing, unrelated, another session's untracked scratch file (present since before this
  branch of work started).
- `npx tsc --noEmit` — silent, exit 0.
- `npm run build` — clean. Route table no longer enumerates `/[lane]`'s sub-paths (another
  session moved the whole site to fully dynamic rendering for its live-editing feature, mid-way
  through this work) — verified `/outerwear` actually works by request instead: `curl` returned
  `200`, and a full Playwright pass (below) confirmed real content renders.
- Re-measured classification against the real catalogue:
  ```
  Outerwear candidates (garment top, matches regex): 756
  Correctly excluded (non-top, would be false positives): 190
  ```
  Matches the plan's pre-implementation estimate exactly.
- Manual, via Playwright against a production build:
  - `/outerwear` loads (`h1` reads "Outerwear"), stylesheet confirmed loaded.
  - Type filter chip present, options exactly `["All type", "Blazers", "Vests", "Cardigans", "Coats"]`.
  - Selecting "Vests" filtered to vest-only titles (`Maren Vest`, `Laurel Vest`, `Celes Vest`, …) —
    0 of the shown titles lacked the word "vest".
  - `/layering-basics` unaffected: Type filter still shows its own six subtypes
    (`Neck Covers & Dickeys`, `Sleeve Extenders`, `Shirt Extenders`, `Base-Layer Tops`,
    `Cropped Body Shirts`, `Under-Dresses`) — no outerwear contamination.
  - `/modest-tops` searched for "Cardigan" and "Blazer": both `SHOWING 0 OF 0` — outerwear
    items genuinely left Tops (initial test run used the wrong input selector and read the
    unfiltered count; re-run with the correct `aria-label="Search houses and pieces"` selector
    confirmed the real result).
  - Header "Products" nav dropdown and footer both include "Outerwear" — confirmed live, not
    assumed from the data-driven routing claim.

## Notes / follow-ups

- English vocabulary only. Non-English blazer/vest/cardigan/coat terms are not covered —
  explicit gap, not a silent one, same as this catalogue's other specialty categories were
  built incrementally.
- No republish was needed or run — this is pure application code over titles already in
  `data/products.json`.
- Mid-implementation, two unrelated concurrent sessions landed real changes on `main`: one
  moved routing to fully dynamic rendering (a live-editing/staff feature), the other added a
  GEO/SEO layer (`lib/laneAnswers.ts`, `lib/seoCopy.ts`) with its own "every lane needs an
  entry" test gate. The second one is a genuine consequence of this branch's own change (adding
  a lane) breaking someone else's passing test, not scope creep — closed it by writing real,
  accurate copy for Outerwear matching the existing entries' voice and length constraints
  (159-word body, 48-char title, 105-char description), not placeholder text.
