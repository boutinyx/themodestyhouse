# Touché Privé dead links, new arrivals, and a stale-local-checkout near miss

**Date:** 2026-08-15 · **Status:** done

## Goal

Tina reported that a number of Touché Privé product links had been returning
a 400-ish error since 2026-08-14, asked for the dead ones removed, for fresh
arrivals to be pulled in for her to review in `/staff/curate`, and for a
root-cause on why the pipeline hadn't already caught this.

## What changed

- **Discovered mid-task:** this local checkout was one commit behind
  `origin/main` — missing `478e6aa` (2026-08-15 05:07 UTC), that day's
  scheduled `refresh.yml` run (`+101 new, 56 delisted, 30595 updated,
  64 filtered` across all 108 brands, including a first-pass Touché Privé
  refresh that already delisted 14 dead products and added 42 new ones).
  Everything done earlier in this session (the 11-id manual cut from Tina's
  `/staff/curate` export, and a first `npm run refresh touche-prive`) had
  been built on the stale pre-478e6aa base — confirmed by checking the raw
  backup taken at the start of that refresh: none of the 11 cut ids existed
  in local raw yet, because they'd only ever existed in the deployed site's
  copy (which already had 478e6aa). Reset the speculative local edits to
  `data/{decisions,raw-products,products,refresh-report,review}.json` with
  `git checkout --`, then `git pull --ff-only origin main` to land on
  478e6aa before redoing any of the real work. See §10.35 in CLAUDE.md.
- Reapplied Tina's 11-id cut (`node scripts/merge-live-edits.mjs
  <scratch export>`) on the correct base — all 11 ids exist there now,
  confirmed real editorial cuts, not phantom ids.
- `npm run refresh -- touche-prive` on top of 478e6aa: `complete: true`,
  fetched 1073, **4 more delisted** (drift since the 04:10 UTC run), 3 new
  arrivals, 1 returned. Republished via the refresh's own `build:data` step.

## Verification

- Cross-checked the live `int.toucheprive.com/products.json` feed (fully
  paginated, 1088 rows at first check) against published rows: 0 published
  Touché Privé products absent from the live feed after the refresh (was 12
  before any of today's fixes, based on the stale/pre-478e6aa local state —
  not a real prior count, see root cause below).
- Confirmed dead-URL behavior directly: the 12 stale-published ids I first
  found each returned `302` to the storefront root when curled with
  `redirect: manual` — consistent with a genuinely removed Shopify product,
  matching Tina's "400 something" report.
- Confirmed the 11 Tina-cut ids are still `cut` in `decisions.json` after
  the refresh (`nextDecisions` only defaults absent ids — Invariant 14).
- `rm -f tsconfig.tsbuildinfo && npx tsc --noEmit` — clean.
- `npx vitest run --exclude '.claude/**'` — 40 files, 653 passed.
- Recomputed the max `firstSeen` in the republished catalogue: `2026-08-15`,
  86 rows total, 32 of them Touché Privé — these are what `/staff/curate`'s
  "Recently added" section (filters on `firstSeen === max firstSeen`,
  `docs/log/2026-08-13-staff-curate-recently-added.md`) will show her,
  mixed with the other 54 brands' arrivals from today's nightly run.

## Root cause — why the dead links weren't already gone

Two separate things, easy to conflate:

1. **The automated pipeline worked as designed.** The scheduled nightly
   refresh (`refresh.yml`, 04:10 UTC daily) DID catch and delist 14 dead
   Touché Privé products on 2026-08-15 — the day after Tina first noticed
   them. That's expected latency for a once-a-day job: a product can go
   dead and sit live on the site for up to ~24h before the next scheduled
   run sees it. Nothing here is a bug in `lib/lifecycle.ts` — `isCompleteFetch`
   correctly gated the delist on a complete fetch (`complete: true`,
   `fetched: 1073`), same mechanism as every other brand.
2. **What actually would have re-broken it: this session's local checkout
   never pulled that commit before I started editing data files.** Had I
   committed and pushed on the stale base, it would have silently reverted
   478e6aa's other-brand work (101 new products, 56 delisted, 64 filtered
   across 107 other brands) the moment it deployed — while looking, from
   inside this session, like a normal targeted Touché Privé fix. Caught
   only because the 11 "cut" ids from Tina's own paste didn't exist in
   local raw at all, which had no other explanation.

## Notes / follow-ups

- Added CLAUDE.md §10.35 (mistake log) and proposed a §4 rule in §12
  (`git pull origin main` before any local data-pipeline command) — see
  that file for the exact wording; flagged to Tina rather than silently
  edited into the binding rules section.
- Did not push. Data changes are committed locally; pushing/deploying is
  Tina's call per the working agreement's "actions visible to others"
  guidance.
