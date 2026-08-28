# Staging + production verification for the 37 Lameera Moda cuts, and a near-miss revert of the nightly

**Date:** 2026-08-28 · **Status:** done

## Goal
Ship the 37 cuts from `2026-08-28-curate-37-lameera-cuts.md` to production. Tina asked for
them live directly ("and push to live", then "do on live too"), so staging verification and
the merge to `main` happened in one pass.

## The near-miss, which is the part worth reading
`3e3c821` was built in a worktree cut from `d84c1bd`. **`refresh.yml` pushed `0431a21` to
`main` at 16:59 UTC while that work was in progress** — +125 new, 222 delisted, 27,593
updated, across all 108 brands. This session's only `git fetch` predated it, so the branch
was one nightly behind and did not know.

Merging that to `main` would have taken this branch's side of `data/products.json` and
`data/raw-products.json` and **silently reverted the entire nightly run**: 125 real products
gone, 222 dead ones resurrected. It would have looked, from inside the session, like a
clean 37-product cut. This is §10.35 exactly.

**It was caught by the concurrent session (`modest-house-bc`), not by this one**, and then
verified here independently before acting on it:

```
origin/main    = 0431a21  data: nightly catalogue refresh
origin/staging = 3e3c821  the 37 cuts, parented on d84c1bd
git merge-base --is-ancestor origin/main origin/staging  ->  false
```

**Why this session's own verification could never have caught it.** The table asserted
"37/37 absent" and "controls present", where every control was a *Lameera Moda* row. Both
halves pass identically whether or not the nightly was reverted — nothing in the check had
any relationship to the 108 other brands. §10.49 rule 3 says every verification table needs
rows that must read PRESENT; the lesson this adds is that a control only covers the failure
it is *adjacent to*. A control drawn from the same brand as the change cannot detect a
catalogue-wide revert.

The fix is a second control class: **8 rows the nightly ADDED must be present.** Those read
`0/8` on the stale build and `8/8` on the reconciled one, so they are a real discriminator.

## What changed
`d4d1158`, a merge of `origin/main` into the cut branch. Resolution was deterministic, not
a hand-merge:

- `data/raw-products.json`, `refresh-report.json`, `rejected.json`, `review.json` — taken
  from `origin/main` **wholesale**, then asserted byte-identical to it. The cuts have no
  business changing any of them.
- `data/decisions.json` — taken from `origin/main`, then the 37 cuts re-applied with
  `scripts/merge-live-edits.mjs`. It reported **37 written, 0 already matched**, which is
  the revert being caught in the act: the nightly's copy genuinely did not have them.
  43,461 keys = the old 43,336 + the nightly's 125 new ids.
- `data/products.json` — **regenerated** with `npm run build:data` from nightly raw +
  merged decisions. Never hand-merged; it is a build artifact and regenerating is the only
  trustworthy way to combine two sources (§8's `interleaveByBrand` makes a line-by-line
  review meaningless anyway).

## Verification
Local, after the merge:

```
Published 18822 products (mixed across 109 brands) | rejected 6194 | review 2129
rows now: 18822   (nightly build was 18859 — exactly -37)
deletes gone: 37/37        lameera-moda published now: 219
my controls present: 2/2   nightly-added controls present: 8/8
```

Staging (`https://themodestyhouse-staging-production.up.railway.app`), matching the
JSON-quoted form the columnar payload embeds and following redirects (§10.49):

```
19:24:24  CUT still present: 0/37 OK | MY controls 2/2 | NIGHTLY-ADDED 8/8 OK
```

The preceding poll at 19:23:52 read `0/37` **and `0/8`** — the stale build, which is what a
one-sided check would have accepted as success.

`main` fast-forwarded `0431a21..d4d1158`; `git merge-base --is-ancestor` asserted in both
directions (§10.17 rule 2).

Production, origin first and purge second (§10.47): polled `themodestyhouse.com` with a
cache-busting query until it served the new build (`19:26:47`, `0/37` + `8/8`), and only
then ran `purge_everything` — `success: true, errors: []`. Purging before that would have
re-filled the edge with the old page for another hour.

Then the canonical URL, real GETs, twice (§10.47 rule 4 — a HEAD is not the request the
cache serves):

```
pass 1: /directory 200 | cf-cache-status MISS | age -  | 1,887,331 bytes
          CUT 0/37 | MY controls 2/2 | NIGHTLY-ADDED 8/8
pass 2: /directory 200 | cf-cache-status HIT  | age 0  | 1,887,331 bytes
          CUT 0/37 | MY controls 2/2 | NIGHTLY-ADDED 8/8
```

The Cloudflare token was checked by calling the endpoint the task needed (`/zones?name=`),
not a verify endpoint (§10.42), and read with a single `grep` rather than sourcing `.env`
(§10.48).

## Notes / follow-ups
- **Not shipped, deliberately:** the concurrent session's size-floor rule. It was dirty and
  unfinished in the shared tree throughout; `d4d1158` contains the 37 cuts and the nightly,
  nothing else. That session takes its own measured `only-large-sizes` number to Tina and
  merges it itself.
- **`lib/dressSubtypes.test.ts` is RED on `origin/main`** and was before any of this —
  confirmed by running it in a clean worktree at `origin/main`. 5 ids the nightly delisted:
  `losyana:10056692171090`, `modern-hijabi:8186287554774`, `summer-evenings:8672944783610`,
  `summer-evenings:8672945045754`, `yasmin-jay:7509070348464`. **Left alone on purpose.**
  The 46-cut pass pruned two such entries, but those ids were *cut* — permanent. These are
  *delisted*, which is reversible by design (§Invariant 12), so pruning them discards
  editorial judgements that a restock brings straight back. The test treats "absent from
  `products.json`" as "invalid curated id", which is wrong for that case; the real fix is to
  scope its assertion to ids that are cut or gone from raw. Filed here, not fixed here.
- A `git stash -u` run mid-merge to free the tree for a control experiment unwound the merge
  state (`MERGE_HEAD` lost, conflicts silently resolved to HEAD). Recovered by popping,
  saving the six resolved files, resetting clean, and redoing the merge — but the honest
  lesson is not to stash a half-resolved merge in the first place. `git worktree add` a
  second checkout for the experiment instead; that is what it is for, and this session was
  already using one.
