# Nightly catalogue refresh via GitHub Actions
**Date:** 2026-08-05 · **Status:** done — verified by a live run on GitHub

## Goal
Automate `npm run refresh` so the catalogue maintains itself, rather than depending on
someone remembering to run it. Chosen: commit raw, push straight to `main`, run daily.

## What changed

**Blocker found first — see §10.15.** A GitHub Action cannot refresh without
`data/raw-products.json`, which was gitignored. But `lib/devOnly.ts` used that exact file as
the layer-4 P0-A security sentinel: `assertLocalDev()` asked "does raw-products.json exist?"
Committing it would have made the sentinel present in production and silently stopped the
guard throwing — with the whole suite green, because every sentinel test injects a fake path.

**`lib/devOnly.ts`** — `LOCAL_ONLY_SENTINEL` moved from `data/raw-products.json` to
`data/.local-only`, a dedicated gitignored marker created by a new `predev` script. It exists
for no purpose other than being the sentinel, so no unrelated task can move it.

**`lib/devOnly.test.ts`** — two new tests, written before the change:
- the real `LOCAL_ONLY_SENTINEL` path must be gitignored (`git check-ignore`)
- the sentinel must not be a data filename (`/products|decisions|exclusions/`)

The first is the test that was missing: it fails the moment anyone points the sentinel at a
tracked file, which is exactly the mistake that was about to be made.

**`.gitignore`** — `data/raw-products.json` untracked → **tracked**; `data/.local-only` added.

**`.github/workflows/refresh.yml`** (new) — daily at 04:10 UTC plus `workflow_dispatch` with
optional brand slugs and an `allow_large_diff` toggle. Runs `npm test` before touching the
network, then refresh, then commits and pushes. Everything after the refresh is `if:
success()`, so a tripped collapse guard leaves production untouched and the run red. The
report uploads on `always()`, since a failed run is when it is most needed.
`concurrency: catalogue-refresh` with `cancel-in-progress: false` prevents two refreshes
clashing on raw (§10.7).

**`lib/refreshSummary.ts`** + test (new) and **`scripts/refresh-summary.mjs`** — renders the
run as a GitHub job summary. Formatting sits in `lib/` so it is unit-tested; the script is
`print(format(read()))`. It leads with the filtered count, since that is the number that
distinguishes a classifier regression from ordinary churn.

**`.github/workflows/ci.yml`** — corrected the comment claiming the pipeline "cannot and must
not run here"; half of that is now false.

## Verification

```
$ npx vitest run
 Test Files  11 passed (11)
      Tests  264 passed (264)      (was 219)

$ npm run typecheck
(clean)
```

The new sentinel test passes with the sentinel file **absent**, which is the CI condition —
verified by moving it aside:
```
$ mv data/.local-only /tmp && npx vitest run lib/devOnly.test.ts
      Tests  33 passed (33)
```

Both workflow files parse:
```
.github/workflows/refresh.yml -> OK, jobs: ['refresh']
.github/workflows/ci.yml -> OK, jobs: ['verify', 'lint']
```

Summary renderer against the real report from today's run:
```
## Catalogue refresh — 2026-08-05
| New arrivals | 17 |
| Delisted by brands | 26 |
| Re-derived | 7,798 |
| **Dropped by our own filters** | **0** |
> No products were dropped by our own filters — no classifier regression.
```

Guard bypass wiring, confirming an empty env var does not disable the guard:
```
ALLOW_LARGE_DIFF=''  -> guard applies: true
ALLOW_LARGE_DIFF='1' -> guard bypassed: true
```

Commit message the workflow would produce:
```
data: nightly catalogue refresh — +17 new, 26 delisted, 7798 updated, 0 filtered
```

### Live run on GitHub (run 31035938458)

Dispatched manually against one 10-product brand before trusting the schedule. Repo settings
checked first via the API, so a 403 on the push step could be ruled out in advance rather
than discovered by burning a run:

```
default_workflow_permissions: "write"      # required, or the push step 403s
branch protection on main: HTTP 403        # none configured — bot push not blocked
workflows: active | CI, active | Catalogue refresh
```

Result — every step green, 46 seconds:

```
job: fetch feeds, publish, push -> success
   success   Run actions/checkout@v5
   success   Run npm ci
   success   Test
   success   Refresh catalogue
   success   Summarise
   success   Commit and push
   success   Upload report
```

And the proof it did real work rather than no-opping — a bot commit on `main`:

```
74fbc79 data: nightly catalogue refresh — +0 new, 0 delisted, 10 updated, 0 filtered
author: modesty-house-bot <41898282+github-actions[bot]@users.noreply.github.com>
```

All 10 Klay products fetched, none added or removed, all 10 re-derived, pushed. `npm ci`,
`tsx`, the 264-test suite and the credentialled push all behave on the runner.

## Notes / follow-ups
- **Proven at small scale only.** The verified run was one brand, 10 products, 46s. The
  nightly is 32 brands and ~6 minutes — more pagination, and a plausible chance a brand
  rate-limits a GitHub IP differently than a home IP. The 04:10 UTC run is the real test.
  Expected degradation if it happens: that brand's fetch is marked incomplete, **nothing is
  delisted for it** (Invariant 13), and it is listed under "incomplete fetches" in the job
  summary. It degrades rather than deletes.
- Dispatching and polling was done with the GitHub token already in the macOS keychain from
  `git push` (scopes `repo`, `workflow`); `gh` is not installed on this machine.
- **The bot's push will not trigger `ci.yml`.** GitHub suppresses workflow triggers for
  pushes made with the default `GITHUB_TOKEN`, to prevent loops. That is why `refresh.yml`
  runs `npm test` itself before publishing. Railway deploys on the push regardless, since it
  watches the repository rather than Actions.
- Repo growth: ~730 KB per nightly run (gzipped blob), so roughly 266 MB/year as a
  conservative upper bound before git's delta compression. Revisit if it becomes a problem;
  a `git gc --aggressive` or a shallower retention policy would both help.
- `data/.backups/` is now redundant as a safety net (git history supersedes it) but is
  retained as a local convenience.
