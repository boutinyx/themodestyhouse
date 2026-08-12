# Cut Zaskia Sungkar — doesn't ship worldwide

**Date:** 2026-08-12 · **Status:** done

## Goal

Tina's instruction: "https://zaskiasungkar.com/ NEEDS TO go out this brand doest ship
worldwide." Permanent removal, per CLAUDE.md §7's editorial rule for cut brands.

## What changed

Two-edit cut, per the documented process (CLAUDE.md §7):

- `data/exclusions.json` — added `"zaskia-sungkar"` to `brands`. Re-applies on every future
  rebuild, so the brand can't come back via a stray `add-brands.mjs`/`refresh` run.
- `data/brands.ts` — removed the `zaskia-sungkar` record entirely, so its feed is never
  fetched again.
- `npm run build:data` refused once, as documented: `brandDropViolations` correctly could not
  tell this intended cut from a dead feed (`zaskia-sungkar: 118 -> 0 (-100%)`). Re-ran with
  `ALLOW_LARGE_DIFF=1` to publish through it.

## Verification

- Confirmed directly against the published file: `data/products.json` has 0 rows with
  `brandSlug === 'zaskia-sungkar'` (was 118). Total published 23,088 → 22,748 (106 brands,
  down from 107).
- `npx vitest run --no-file-parallelism` — 572/572 passing.
- `npx tsc --noEmit` — clean.
- `npm run lint` — clean (two pre-existing warnings present, both from other sessions'
  in-progress work: `.fontprobe.tmp.mjs`, `scripts/check-images.mjs` — neither touched here).
- `npm run build` — clean, 29 routes.
- `npm run verify:gate` — **GATE CHECK PASSED** (the `/staff/curate` naming-collision failure
  from earlier today is resolved on `main`).

## Notes / follow-ups

None. A straightforward cut, no unusual behavior.
