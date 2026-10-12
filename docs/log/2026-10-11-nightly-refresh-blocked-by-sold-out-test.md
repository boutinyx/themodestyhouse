# Nightly refresh failing every day since 2026-10-04: a sold-out test blocked it
**Date:** 2026-10-11 · **Status:** done (on main)

## Goal
Tina kept getting GitHub's "Run failed: Catalogue refresh" email. Find why and unblock it.

## Cause
Every scheduled `refresh.yml` run from 2026-10-04 to 2026-10-11 failed in ~37 s at the **Test** step, before
the refresh ran (public API, `actions/runs/{id}/jobs` + check-run annotations):
```
AssertionError: expected [ 'aab:10019078111546', …(107) ] to deeply equal []
FAIL lib/unavailableProducts.test.ts > never holds a product that is published
```
Sequence:
1. `a8caabc` (2026-10-03 02:02) added `data/unavailable-products.json` (sold-out product pages) and the test that
   no id in it is published.
2. The 2026-10-03 nightly started at `8dcd4fe`, which did NOT contain `a8caabc`
   (`git merge-base --is-ancestor` false). It republished `products.json`, bringing 108 restocked products back,
   but its older `build-data.mjs` did not rewrite the sold-out file. Commit `6d7f434`.
3. From then on the two files disagree on 108 ids (aab 33, merrachi 27, nihan 21, veiled 12, 10 others). The test
   runs BEFORE the refresh, and only the refresh would rewrite the file, so the job could never heal itself.

Effect: the catalogue has been frozen at 2026-10-03 for 8 days. No new arrivals, sold-out and delisted
products stayed live.

## What changed
- `data/unavailable-products.json`: removed the 108 ids that are published. 7105 -> 6997 rows, 108 deletions,
  nothing else. `products.json` deliberately untouched; tonight's refresh regenerates both together.
  (A full `build:data` was tried first and rewrote `products.json` heavily because publish rules changed since
  2026-10-03 — too large a side effect for an unblock, reverted.)

## Verification
On origin/main + this change, `CI=true npx vitest run`:
```
before: Test Files 1 failed | 84 passed (85)  Tests 1 failed | 1328 passed
after:  Test Files 85 passed (85)             Tests 1329 passed | 18 skipped
```
`products.json` and `unavailable-products.json` are byte-identical on origin/main and origin/staging, so the same
edit applies to both.

## Notes / follow-ups
- Structural: a test over data that the refresh itself writes should not run before the refresh can rewrite it
  (§10.19's family). Options: run that test after `build:data` in `refresh.yml`, or skip it under `CI` in the
  pre-refresh test step. Not changed here.
- The watchdog (`catalogue-watchdog.yml`) should have opened an issue after 36 h; check why only the failure
  emails were seen.

## Shipped
Tina approved 2026-10-11. Cherry-picked onto main as `717f711` (staging and main have diverged by cherry-picks, so no ff). Full suite on main: 85 files passed, 1329 tests. The next scheduled refresh (or a manual "Run workflow" on Catalogue refresh) is the real proof.
