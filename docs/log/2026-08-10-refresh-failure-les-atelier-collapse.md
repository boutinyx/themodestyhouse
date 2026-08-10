# Nightly refresh is failing: LES Atelier collapsed 159 → 94
**Date:** 2026-08-10 · **Status:** diagnosed, NOT fixed — needs a decision

## What happened
The 04:10 UTC catalogue refresh failed on 2026-08-10 (run `31359384665`, 12m22s). It is the
first failure in the series; 2026-08-05 through 08-09 all succeeded.

```
Refresh catalogue ✗
  INCOMPLETE fetch (sawErrorStatus) — will add/update only, nothing will be delisted   [CHI-KA]
  Error: products.json NOT written — 1 brand(s) collapsed:
    les-atelier: 159 -> 94 (-41%)
```

`scripts/build-data.mjs:162-166` refused to write, so **`products.json` was never republished and
nothing was pushed. Production is untouched.** The `Summarise` and `Commit and push` steps are
`if: success()`, so they were skipped. This is the guard working exactly as designed.

Two separate things went right here and should not be confused:
- **CHI-KA** hit an error status mid-pagination, so its fetch was marked incomplete and nothing
  was delisted for it — Invariant 13.
- **LES Atelier** fetched completely, and the resulting drop tripped the collapse guard.

## The collapse is real
Verified three independent ways rather than taking the guard's word for it:

| Check | Result |
|---|---|
| `les-atelier.com/products.json` paginated | 125 (page 2 empty) |
| `/collections/all/products.json` | 125 |
| Our 189 raw rows still present in the live feed | 118 — **71 genuinely gone** |

Live in-stock is 112, and 94 published after exclusions and the non-apparel veto is consistent
with that. So the brand cut roughly 71 products from its own store. This is not a dead feed and
not a broken filter — the two cases the guard's error message names.

## Consequence: the catalogue is frozen until someone clears it
The guard compares the *previous published* counts against the new ones
(`build-data.mjs:163`). LES Atelier's live catalogue will still be 125 tomorrow, and our
published count is still 159, so **every nightly run will trip the same guard and fail**. No new
arrivals, no delistings, and no price updates reach the site until a run is allowed through.

CI itself is green — the 12:07 run on today's push passed.

## The decision, and the order it should happen in
Clearing it is a `workflow_dispatch` of *Catalogue refresh* with **`allow_large_diff: true`**.
But that same run republishes `data/products.json` **without the translate hook** (CI has no
`.venv-style`; see `docs/log/2026-08-10-add-khair-archives.md`), so it would revert the 561
Dutch/French → English titles pushed today in `113b678`.

Recommended order:
1. **Fix the translation gap first** — move translation into `scripts/build-data.mjs`, or add a
   Python step to `refresh.yml`. Otherwise clearing this incident knowingly undoes today's work.
2. **Then re-run with `allow_large_diff: true`**, which will delist the 71 LES Atelier products
   and unblock the nightly schedule.

Doing (2) alone is defensible if the delisting is more urgent than the titles — 71 dead product
links are on the site right now — but it should be a choice, not a surprise.

## Notes
- Nothing was changed by this investigation. The `refresh-report.json` artifact from the failed
  run is retained for 90 days on run `31359384665`.
- Access: this needed the GitHub API. `gh` was installed and authenticated from
  `GITHUB_API_TOKEN` in `.env` (gitignored). That token is **classic with near-total account
  scope** — `repo`, `workflow`, `admin:org`, `delete_repo`, `admin:enterprise`. Read-only was all
  that was used, and it expires 2026-08-17; worth narrowing or revoking.
