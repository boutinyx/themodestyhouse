# The daily GitHub failure emails: three workflows red, and why
**Date:** 2026-10-11 · **Status:** partial (on staging; needs one GitHub secret + Tina's approval for main)

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

## Update: CI builds without Ghost
GitHub's Settings show **no repository secrets and no variables** (checked in Tina's browser), so the
`vars.GHOST_URL` / `secrets.GHOST_CONTENT_KEY` approach still failed (`GHOST_URL is not set`, run 38134777529).
Tina asked for the emails to stop without more setup, so CI no longer needs Ghost at all:
- `lib/ghost.ts`: `GHOST_OFFLINE=1` makes `fetchAllPosts()` return `[]` and `fetchPostBySlug()` `undefined`.
- `app/editorial/[slug]/page.tsx`: the "refusing to build an empty /editorial" guard is skipped only under that flag.
- `ci.yml` Build step sets `GHOST_OFFLINE: "1"` instead of the two missing secrets.
Production (Railway) never sets the flag, so a missing Ghost there still fails the build loudly.

Verification: no Ghost env + flag -> 139/139 pages built; real Ghost env, no flag -> 147/147 (8 posts);
no env, no flag -> `GHOST_URL is not set` (unchanged). tsc 0, lint 0.
