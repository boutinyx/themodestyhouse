# The nightly refresh published nothing for three weeks — fixed, plus a watchdog
**Date:** 2026-10-02 · **Status:** done

## Goal
Tina found a La Femme Collectie product on the site whose link returns 404
(`/product/premium-instant-hijab/`) and asked why dead products are still listed, and to make
sure it cannot happen again.

## What was actually wrong
Not La Femme specifically. **The whole catalogue has been frozen since 2026-09-11.**

- `data/products.json`'s last bot commit is `f45caa9`, 2026-09-11 09:24 UTC.
- GitHub Actions API: every scheduled `refresh.yml` run from 2026-09-12 to 2026-10-01 is
  `conclusion: cancelled` (19 runs); every run before that is `success`.
- Step timings (Actions jobs API):

  | run | Refresh catalogue | Translate new titles | Commit and push |
  |---|---|---|---|
  | 2026-09-10 | 24.9 min ✓ | 0.9 min ✓ | ✓ |
  | 2026-09-11 | 23.6 min ✓ | 7.2 min ✓ | ✓ |
  | 2026-09-12 | 24.3 min ✓ | 20.0 min **cancelled** | skipped |
  | 2026-10-01 | 24.1 min ✓ | 20.5 min **cancelled** | skipped |

  The job has `timeout-minutes: 45`. Refresh (~25 min) + translate hit it, GitHub cancelled the
  whole job, and the commit step never ran. `continue-on-error: true` on the translate step did not
  help: it only applies when the step *ends* — a step killed by the JOB timeout takes everything
  after it down too.
- Why translate got slow: Google is refusing every title (a local run printed
  `engines: google 0 | mymemory 1`), so each new title burns 3 Google attempts with back-off before
  MyMemory answers. And the script only wrote its cache at the very END, so a killed run saved
  nothing — the same backlog was re-sent every night and the step could never catch up.
- Why nobody noticed: a cancelled run is grey, not red, and nothing checked whether the catalogue
  was actually being published.

Confirmed for the reported product: La Femme's live Store API returns 64 products and
`premium-instant-hijab` (id 30955) is not among them, while 19 La Femme rows are still published,
several no longer in the feed — and ~45 current products in the feed were never added. Both are
exactly what a refresh would fix.

## What changed
- `scripts/translate_titles.py` — `--budget-seconds` / `TRANSLATE_BUDGET_SECONDS`: the loop stops
  on time, saves its cache, republishes, and leaves the rest for tomorrow. The cache is also
  checkpointed every 25 new translations, so even a run killed from outside keeps its progress.
- `.github/workflows/refresh.yml` — translate step gets `TRANSLATE_BUDGET_SECONDS=360`,
  `timeout 9m` and `timeout-minutes: 10` (three layers; the step always ends, so
  continue-on-error applies and the push still happens). Job timeout 45 → 60, with the reason.
- `.github/workflows/catalogue-watchdog.yml` (new) — daily at 16:20 UTC, asks the GitHub API when
  the BOT last committed `data/refresh-report.json` (the file only refresh writes). Over 36h →
  opens a `catalogue-stale` issue (GitHub emails the owner) or comments on the open one, and the run
  goes red. It checks the RESULT, not run status, so it catches any future way the refresh stops
  publishing. Filtered to the bot author because Tina's local Try Modest publish on 2026-10-01 also
  rewrote that file and would have reset the clock.
- `CLAUDE.md` §10.62.

## Verification
- `python3 -m py_compile scripts/translate_titles.py` — ok.
- Budget path: removed 60 cache entries from a copy, ran
  `translate_titles.py --dry --budget-seconds 3` → `attempted: 1 … TIME BUDGET of 3s reached —
  stopped early`; cache restored and confirmed byte-identical with `cmp`.
- Full dry run with the real cache: 4,676 titles, all cached, 0 attempted (the CI backlog is
  arrivals since 2026-09-11 that were never committed, so it only exists on the runner).
- Both workflow files parse (`ruby -ryaml`). `actionlint` is not installed, so not linted.
- Watchdog query checked live against the public API: with the bot-author filter it returns
  `f45caa9 2026-09-11T09:24:31Z modesty-house-bot` (without it, Tina's 2026-10-01 commit).
- **Not verified yet:** an actual CI run with the fix. Schedules only run from `main`, and
  `gh` is not authenticated on this machine, so a manual dispatch was not possible from here.

## Notes / follow-ups
- After the merge, run the refresh once by hand (Actions → Catalogue refresh → Run workflow) rather
  than waiting for tomorrow. The first run will be large (three weeks of delistings and arrivals);
  if the collapse guard trips, read the report before using `allow_large_diff`.
- The watchdog will open an issue on its first run if the refresh has not published by then. That
  is correct behaviour, not a false alarm.
- Worth considering: put MyMemory first while Google keeps refusing, which would make the step fast
  again. Not done here — the docstring explains why Google is first, and that is a separate call.
- The refresh step itself grew from ~6 min to ~25 min. Not urgent with a 60-minute budget, but it
  is the next thing that will hit a limit.

## Result (same day)
- Tina approved; `staging` fast-forwarded to `main` as `b142342` (with two Designers fixes that were
  already on staging). Refresh dispatched by API on `main` (run 37000057821).
- Run: Refresh catalogue 22.8 min ✓ · Translate **6.2 min ✓ (stopped on its budget)** · Summarise ✓ ·
  **Commit and push ✓** — the first successful run since 2026-09-11.
- Commit `8dcd4fe`: `+1427 new, 1361 delisted, 27256 updated, 42 filtered`. 20,579 rows published.
- La Femme: 47 published (was 19); `premium-instant-hijab` no longer published; `jersey-dress`,
  `classy-flow-set`, `woven-vest` (new in their feed) are.
- Production, `https://themodestyhouse.com/designers/lafemme`, canonical and cache-busted both
  `cf-cache-status: MISS`, both contain `classy-flow-set` (the positive control) and not
  `premium-instant-hijab`.
- Titles the translator did not reach within its budget publish untranslated tonight and are retried
  on the next runs; the step summary reports the count.
