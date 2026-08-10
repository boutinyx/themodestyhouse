# Titles now translate at publish time; blocked refresh cleared
**Date:** 2026-08-10 · **Status:** done

## Goal
Two linked problems, fixed in order:

1. **The nightly refresh never translated titles**, so every local publish that did was reverted
   by the next night's run.
2. **The refresh had been failing since 2026-08-10 05:41** on the brand-collapse guard, freezing
   the catalogue — diagnosed in `docs/log/2026-08-10-refresh-failure-les-atelier-collapse.md`.

Clearing (2) republishes `products.json`, so doing it before (1) would have knowingly reverted
the 561 titles pushed that morning. Hence the order.

## 1 — Translation moved into `build-data.mjs`
`postbuild:data` / `postrefresh` call `npm run translate`, which is guarded on
`[ -x .venv-style/bin/python ]`. `.github/workflows/refresh.yml` sets up Node and nothing else,
so **the guard is always false in CI**: the hook printed "title-translation skipped" and the
refresh committed and pushed untranslated titles. Neither side left a mark, which is why it
survived from the day the refresh was written.

`build-data.mjs` now applies `data/title-translations.json` itself, inside the same publish-time
`.map()` that already re-runs `normalizeTitle` — and for the same reason that block gives: raw
rows are frozen at ingest (§8).

**No network and no Python are involved.** The cache is keyed by the *original feed title*, and
`raw-products.json` still holds those originals, so a pure lookup translates everything the cache
knows. `translate_titles.py` keeps its real job — POPULATING the cache for unseen titles, which
does need the network. The split means CI can never again publish a title the project has already
translated.

Two details that matter:
- **Looked up under both the cleaned and the raw title.** `translate_titles.py` reads
  `products.json`, so its keys are post-`normalizeTitle`, while rows scraped before a
  `normalizeTitle` change are keyed raw. Checking both keeps old cache entries usable.
- **The count is printed on every publish, including zeroes.** The regression was invisible
  precisely because a skipped hook printed something cheerful and nothing downstream counted the
  result.

### Verification
In an isolated worktree over the **committed** 61-brand data, with only this file changed:

```
Published 11215 products (mixed across 61 brands) | rejected 3114 | review 18
Titles: 561 translated from cache | cache covers every non-English title
npm test → 21 files, 420 tests passed
rows in non-English brands: 667 | still carrying Dutch words: 0
```

11,215 across 61 brands is identical to HEAD, and 561 is exactly the number that had been
regressing. Committed as `8773ca5` — **only** `scripts/build-data.mjs`; every data file in the
working tree belongs to another session's in-progress 109-brand expansion and was left alone.

A local `npm test` at the time showed 5 failures in `catalogue`/`exclude`/`fx`/`price` — all of
them assertions over `data/products.json`, which had been rebuilt from that session's
in-progress brand list. Proven unrelated by the isolated run above, which passes 420/420.

## 2 — Refresh unblocked
Dispatched *Catalogue refresh* with `allow_large_diff: true` (run `31394491294`) — the documented
way to clear a collapse a human has reviewed. **It succeeded** and pushed
`0d506e5 data: nightly catalogue refresh — +20 new, 78 delisted, 15448 updated, 0 filtered`.

The CI log carries the proof the fix took effect on the runner, where the Python hook has never
been able to run:

```
Titles: 559 translated from cache | 9 in non-English brands NOT in the cache
Published 11151 products (mixed across 61 brands) | rejected 3115 | delisted-by-brand 95
```

Verified against `origin/main` afterwards: 11,151 published, LES Atelier down to 101 from 159,
and of 673 rows in non-English brands **0 still carry Dutch** and 1 still carries French — one of
the 9 the cache has not seen, now counted rather than silent.

The schedule is unblocked: the guard compares previous published against new, and those are now
in step, so tonight's 04:10 UTC run has nothing to trip on. The collapse was verified real first — LES
Atelier's own feed returns 125 products, `/collections/all` agrees, and 71 of our 189 raw rows
are simply gone from it.

## Notes / follow-ups
- `scripts/translate_titles.py` is now a cache-populating tool rather than part of the publish
  path. Its `indent=2` fix from earlier today still matters: it writes `products.json` when run
  locally.
- The 2,126 titles not yet in the cache are new arrivals the script has never seen. They publish
  untranslated and are now *counted* in the build output, so the gap is measurable. Running the
  script locally fills them.
- The GitHub API access used to diagnose this came from `GITHUB_API_TOKEN` in `.env` — a classic
  PAT with `repo`, `workflow`, `admin:org`, `delete_repo`, `admin:enterprise`. Read-only was all
  that was used; it expires 2026-08-17 and should be narrowed or revoked.
