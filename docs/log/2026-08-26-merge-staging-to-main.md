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

---

# Second pass — Tina reaffirmed "push all changes to main"
**Status:** done

She repeated the instruction, so the two things held back above were re-examined rather than
re-declined. `origin/main` went `b35058c → 29bb90d`.

## What was pushed this time
| commit | source |
|---|---|
| `ed5b78b` | content(curate): 115 Beyza cuts, 8 garment moves, 5 lane moves — another session, staging-verified |
| `01e112f` | docs(log): staging verification for the Beyza curate batch — another session |
| `29bb90d` | chore(images): the six `edit-fall-hero-4-*.webp` — **the files held back above** |

`main` and `staging` are identical again.

## The webp files — measured, and my earlier read was wrong
Above I described these as "unexplained binary bytes". They are explained, and the explanation
inverts which side is the odd one. Re-encoding `public/edit-fall-hero-4.jpg` with the config
`scripts/optimise-images.mjs` **already carries for that entry** — `{ quality: 100, effort: 6 }` —
reproduces the working-tree bytes EXACTLY:

```
sharp(edit-fall-hero-4.jpg).resize(w).webp({quality:100, effort:6})
  w=640  -> 62444   working tree 62444   ✓        committed was  62480
  w=1440 -> 226032  working tree 226032  ✓        committed was 228966
  w=2674 -> 624470  working tree 624470  ✓        committed was 979070
```
So the working-tree files are that script's own output and someone simply ran it. The versions
they replace are *larger* because they were built from the source PNG rather than the `.jpg` —
which is precisely the caveat the script's own comment on this entry spells out: *"re-running
THIS script rebuilds the variants from the .jpg, not from the PNG."* Committing them is
therefore a small fidelity step down, and an invisible one: **`edit-fall-hero-4` is a dead
asset** — nothing in `lib/`, `app/` or `components/` references it; `lib/edits.ts:749` uses
`/edit-fall-hero-8.jpg` and `/edit-fall-hero-mobile-7.jpg`. Restoring the PNG-sourced variants
means rebuilding from the PNG, not re-running the script; the commit message says so.

## The two stale branches — nothing to push, now proven rather than asserted
Above I claimed their content was already on `main` and inferred it from §10.17. Checked properly
this time, commit by commit:

| legal branch commit | evidence it is already on `main` |
|---|---|
| name the data controller | `content/legal/privacy.md` — 1 hit; also `lib/legal.ts`, `lib/legal.test.ts` |
| disclose Resend | `content/legal/privacy.md` — 3 hits; `lib/legal.test.ts` — 4 (a test asserts it) |
| add HUM Clothing + Chic & Modesty | `data/brands.ts` — `slug: 'hum'` and `slug: 'chic-modesty'` |
| non-English garment vocabulary | `lib/tag.ts` — 10 French garment rules (§10.16's fix) |

`origin/claude/github-push-workflow-yfs1zs`: `git diff e4a51e8~1..676b7be -- app components` is
**empty** — its two About-copy commits are fully cancelled by its own two reverts. Net zero.

So neither branch holds a single line that `main` lacks, and both would REVERT the site if
merged — the legal one adds back `app/style/[vibe]/page.tsx`, the Style/Vibe pages Tina had
deleted on 2026-08-09. They are safe to delete whenever she says so.

## Verification
```
$ npx tsc --noEmit → clean   $ npm run lint → exit 0
$ npm test → 52 files, 856 tests passed      $ npm run build → all routes built
$ git merge-base --is-ancestor origin/main HEAD → fast-forward confirmed before pushing
```
**§10.47 applied, and it worked.** Discriminator picked first — `/modest-abayas` `rowCount`,
which reads 4526 locally and on staging against production's old 4619. Polled the ORIGIN past
the edge with a junk query string; it flipped to 4526 on the 4th try (~60 s). *Only then* purged:
```
purge success: True
canonical /modest-abayas  fetch 1 cf=MISS rowCount=4526 · fetch 2 cf=HIT rowCount=4526
```
Health check on production: `/`, `/directory`, `/modest-dresses`, `/modest-abayas`,
`/modest-hijabs`, `/designers`, `/editorial`, `/privacy`, `/terms`, `/sitemap.xml` all **200**;
`edit-fall-hero-4-2674.webp` serves **624470 bytes** (the newly committed encode);
`edit-fall-hero-8.jpg` (the live hero) 200; staging still
`x-robots-tag: noindex, nofollow, noarchive`, production carries none.

## Notes
- Had I purged first as last time, the edge would have re-cached the 4619 build for another hour.
  The origin took ~60 s longer than the push to flip. That gap is the whole of §10.47.
- `CLAUDE.md` is excluded from the repo via `.git/info/exclude`, so §10.47/§10.48 exist on this
  machine only and cannot be pushed. Worth knowing before anyone looks for them on GitHub.
