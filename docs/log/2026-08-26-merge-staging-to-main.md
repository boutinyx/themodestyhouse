# Merged `staging` to `main`, purged the CDN, verified on production
**Date:** 2026-08-26 · **Status:** done

## Goal
Tina: *"push all changes to main also from other sessions"*. Survey everything unpushed
across the repo — branches, worktrees, stashes, the shared working tree — and ship what is
genuinely ready.

## What was pushed
`origin/main` fast-forwarded `62949dc → 2bdff02`. Four commits, all from **another session**,
all already staging-verified by that session before I touched them:

| commit | |
|---|---|
| `b8364e5` | fix(titles): stop the translate hook translating already-translated titles |
| `8cdc517` | docs(log): staging verification for the double-translation fix |
| `50c3dd7` | content(titles): seven cache corrections — Elenora, Kloş/Cloş, Eliz Ferace |
| `2bdff02` | docs(log): staging verification for the title corrections |

`main` and `staging` are now identical.

**My own dress-subtype work needed nothing** — `ad50c56` and `71ff881` were already ancestors
of `origin/main` when I checked; another session had merged them.

## What was deliberately NOT pushed, and why

**`legal/privacy-controller-and-accuracy` (4 commits) — must never be merged.**
`git diff origin/main legal/…` is **959 files, 145,074 insertions, 1,366,820 deletions.** The
branch predates months of work, so merging it would delete `vitest.config.ts`,
`scripts/visual-audit.mjs`, `scripts/verify-gate.mjs` and most of the catalogue. Its actual
content is already on `main` — §10.17 records it being cherry-picked there from a separate
worktree, which is exactly why the branch tip is not an ancestor. The unmerged tip is an
artefact of *how* it landed, not evidence that it hasn't.

**`origin/claude/github-push-workflow-yfs1zs` (4 commits) — net zero, same trap.**
Its four commits are two About-page copy commits and their two reverts, so it contributes no
content; the copy in question is the invented MISSION/founder-voice text of §10.18. And like
the branch above it is far behind — 832 files / 1,328,305 deletions against `main`.

**Six modified `public/edit-fall-hero-4-*.webp` in the shared working tree — left alone.**
Uncommitted, not mine, and `docs/log/2026-08-26-curation-batch-5-…md` already flags them as
another session's. More to the point they are **dead bytes**: nothing in `lib/`, `app/` or
`components/` references `edit-fall-hero-4` — `lib/edits.ts:749` uses `/edit-fall-hero-8.jpg`
and `/edit-fall-hero-mobile-7.jpg`. Committing an unexplained binary diff at a superseded path,
under my message, is §10.30 and §10.40 at once. Flagged to Tina instead.

**Also surveyed and clear:** `worktree-jiggly-hugging-honey` (merged, worktree clean),
`seo/tier1-fixes` (merged), and one stash labelled *"pre-existing unrelated dirty state (not
mine) — set aside for rebase"*, left untouched.

## Verification
```
$ npx tsc --noEmit   → clean       $ npm run lint → exit 0
$ npm test           → 52 files, 856 tests passed
$ npm run build      → all routes built
$ git merge-base --is-ancestor origin/main origin/staging → fast-forward confirmed BEFORE pushing
… after push: all four commits are ancestors of origin/main; main == staging
```
Cloudflare `purge_everything` → `success: True`. Then, on **https://themodestyhouse.com**:
```
/modest-hijabs   fetch 1 cf=MISS Elenora=1 · fetch 2 cf=HIT Elenora=1   (title fix live + cached)
/modest-dresses  dressSubtypeIdx present, "Luxury Jersey Khimaar" 0     (dress work live)
/modest-hijabs   "Luxury Jersey Khimaar" 1                              (khimaar move live)
staging  x-robots-tag: noindex, nofollow, noarchive                     (guard intact)
production  no x-robots-tag                                             (correct)
```

## Notes / follow-ups
- **I purged the CDN too early and it re-cached the OLD page.** The first purge ran before
  Railway finished deploying, so the edge refilled from a stale origin and served
  `cf-cache-status: HIT` on old HTML for ten minutes while I read it as "not deployed yet". The
  fix that found it: request the same path with a junk query string, which misses the cache and
  reveals what the ORIGIN holds — it already had the new build. Then purge again.
  **Rule: confirm the origin is new BEFORE purging, or the purge is worse than useless.** This
  is §10.23 inverted — there I read a cache directive as behaviour, here I read a cache HIT as
  an origin fact.
- Two dead markers cost ~10 minutes each, both §10.28 rule 3: `grep 'Occasion Dresses'` on SSR
  HTML (those labels only exist in a portalled menu) and `grep 'Elena Hijab'` (the pre-fix
  string was never published). The marker that worked was proven first by finding it present on
  **staging** and absent on production — a discriminator, not a guess.
- `set -a; . ./.env; set +a` **clobbered `PATH` for a later shell**, so `curl`, `wc` and `tr`
  vanished mid-verification and every check silently returned 0. `.env` sets no `PATH` itself,
  so this is the sourcing, not the file. Prefer reading single keys out of `.env`
  (`grep '^KEY=' .env | cut -d= -f2-`) over sourcing the whole thing.
- Still open, for Tina: the six `edit-fall-hero-4-*.webp`. Say the word and I will commit them
  under an honest message, or delete them — but not silently.
- The two stale branches (`legal/…`, `origin/claude/github-push-workflow-…`) are landmines: they
  look like unmerged work and would revert the site. Worth deleting once Tina confirms.
