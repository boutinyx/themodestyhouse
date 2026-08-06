# Push abayas lower in the mixed catalogue
**Date:** 2026-08-06 · **Status:** done

## Goal
Owner request: "I want all the abayas a little lower in the catalogue — not completely down
but lower."

Abayas are **37.1% of the browsable catalogue** (the largest garment by a wide margin), so
they dominated the scroll. Target agreed with Tina: roughly halved over the opening,
blending back to their natural share by ~position 300. Nothing hidden, nothing removed.

## What changed
- **`lib/ordering.ts`** (new) — `demoteGarment(items, garment, isVisible?)`, pure and
  unit-tested. Applied in `scripts/build-data.mjs` after `interleaveByBrand`.
- **`lib/ordering.test.ts`** (new) — 14 tests.

## Design

Two mechanisms, both of which I got wrong first and had to be driven by measurement.

**1. The cap applies to the VISIBLE subsequence, not the published list.**
`/directory` calls `browseProducts()`, which strips hijabs and swim/activewear *before*
rendering. Capping across the raw published list therefore measures a sequence nobody looks
at — and because removing those rows re-concentrates abayas, the first version pushed abayas
**from 12% UP to 21%** in the first screenful. The exact opposite of the request. The
predicate in `build-data.mjs` now mirrors `browseProducts()` and is commented as having to
stay in sync with it.

**2. The schedule tracks the LOCAL rate, not the running average.**
Comparing cumulative share against the cap makes the early deficit repayable, so every abaya
held back had to be crammed in immediately after the ramp: **59% abayas across positions
200–300**, which is worse than not demoting at all. The rate curve (15% flat to position
100, ramping to the natural share by 300) is now *integrated* to give a due-count per
position, so it only ever describes local density. The held-back remainder lands in the deep
tail instead.

**The abaya lane is unaffected**, and that is a structural property rather than a
coincidence: `demoteGarment` only reorders items *between* groups, so abayas keep their order
relative to each other. `/modest-abayas` filters the published list down to abayas, so it
sees an identical sequence. `lib/ordering.test.ts` asserts the abaya subsequence is exactly
equal before and after.

## Verification

```
$ npx vitest run     320 passed (13 files)   — was 301
$ npm run typecheck  clean
$ npm run build      Compiled successfully
$ npm run build:data Published 10139 products (mixed across 55 brands)
```

Measured on the real catalogue (6,535 browsable rows, 37.1% abaya):

| Positions | Before | After |
|---|---|---|
| 1–24 | 12% | 17% |
| 1–100 | ~30% | **15%** |
| 100–200 | 32% | 21% |
| 200–300 | 30% | 31% |
| 300–500 | 30% | 37% |
| 500–2000 | ~29% | 37% |
| deep tail (last 500) | ~36% | 46% |

Abayas still appear 4 times in the first 24, so the catalogue does not read as if it excludes
them — the "not completely down" half of the request.

## Notes / follow-ups
- The deep tail sits at 46% against a natural 37%. That is the ~45 held-back items landing at
  the end; it is mild and well past where anyone scrolls, but it is the one place the
  demotion is visible as an accumulation.
- The tuning constants (`OPENING_SHARE = 0.15`, `RAMP_FROM = 100`, `RAMP_TO = 300`) are at the
  top of `lib/ordering.ts`. Changing the strength is a one-line edit plus `npm run build:data`.
- `inMixedGrid` in `build-data.mjs` duplicates the predicate in `browseProducts()`. If the
  editorial rule about what appears in mixed grids changes, both must change — the same
  duplication hazard §8 flags between `build-data.mjs` and `lib/exclude.test.ts`.
