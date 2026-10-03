# README brought up to date
**Date:** 2026-10-03 · **Status:** done

## Goal
Tina asked for the GitHub repo and README to be updated. The README dated from 2026-08-05.

## What changed
- `staging` fast-forwarded to `origin/staging`, `origin/main` (nightly refresh `6d7f434`) merged in, pushed (`53bb49c`). Local `main` reset to `origin/main`. No merge to `main` — that needs Tina's approval; `a8caabc` (sold-out product pages) is waiting on staging.
- `README.md` rewritten: correct name (The Modesty House), staging protocol and URL, nightly refresh + watchdog, `/staff/curate` instead of the removed `/admin/curate`, warning off `npm run scrape`, current script list.

## Verification
- `git merge-base --is-ancestor origin/main origin/staging` → true.
- Every script named in the README exists in `package.json`; workflow schedules read from `.github/workflows/`.

## Merged to main (Tina approved)
- `main` fast-forwarded to `362e899` (README + sold-out product pages `a8caabc`).
- Waited until a cache-busted request to `/product/chic-modesty/10323092668754` returned 200 from the origin (`MISS`), then ran Cloudflare `purge_everything` (§10.47 order).
- After the purge, production: skirt page 200 `MISS` then 200 `HIT`, title "Chocolate flared satin skirt by Chic & Modesty". Controls: `/product/veiled/7653917589609` 200, `/product/chic-modesty/1` 404.
