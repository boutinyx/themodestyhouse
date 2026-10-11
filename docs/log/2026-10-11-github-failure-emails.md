# The daily GitHub failure emails: three workflows red, and why
**Date:** 2026-10-11 · **Status:** done on main (CI build still needs the GHOST_CONTENT_KEY secret)

## Goal
Tina gets "Run failed" emails every day and after every code push. Find every cause.

## Findings (public Actions API, run jobs + check-run annotations)
| workflow | red since | cause |
|---|---|---|
| Catalogue refresh (daily) | 2026-10-04 | sold-out file vs products.json, fixed earlier today (`717f711`) |
| Catalogue watchdog (daily) | 2026-10-05 | working as designed: "has not published for 177h". Clears once the refresh publishes |
| Ghost backup (daily) | **every run since it was created, 2026-09-21** | `GET db/` -> 403 "You do not have permission to exportContent db": integration keys cannot export |
| CI (every push to main) | **last success 2026-08-20** | build: `GHOST_URL is not set` (editorial pages prerender from Ghost, CI has no Ghost env); lint: one unused `e` in `scripts/gsc-report.mjs` under `--max-warnings 0` |

## What changed
- `scripts/ghost-export.mjs`: reads `posts/?filter=status:published+visibility:public&include=tags` instead of
  `db/`, reshapes into the layout `publicExport()` already filters. Authors are never requested.
- `.github/workflows/ci.yml`: Build step gets `GHOST_URL` (repo variable, already exists) and
  `GHOST_CONTENT_KEY` (**repo secret, must be added by Tina** in GitHub > Settings > Secrets > Actions).
- `scripts/gsc-report.mjs`: `catch (e)` -> `catch`.

## Verification
- Export run locally with the real keys: `wrote data/ghost-export.json: 8 posts, 2 tags`; no draft, no email
  address, no `primary_tag`. File deleted afterwards (the workflow writes it).
- `npm run build` on main: fails with `GHOST_URL is not set` without env, 147/147 pages with it.
- `npm run lint` exit 0, `npx tsc --noEmit` exit 0, `lib/ghostExportScript.test.ts` 4/4.

## Notes / follow-ups
- Until `GHOST_CONTENT_KEY` exists as a secret, CI's build stays red.

## Update: Ghost backup removed
Tina, same day: "we dont need a backup for ghost". Deleted `.github/workflows/ghost-backup.yml`,
`scripts/ghost-export.mjs`, `scripts/lib/ghostExport.mjs` and `lib/ghostExportScript.test.ts`; nothing else
referenced them (`git grep` outside docs/), and `data/ghost-export.json` never existed because no run succeeded.

## Shipped
Tina approved 2026-10-11. Cherry-picked onto main as `1dd07ad` + `3f5e33c`. On main: lint 0, tsc 0, 84 files / 1325 tests passed.
