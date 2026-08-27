# Second merge to `main` today — set-vs-trousers fix, CDN purged, verified live

**Date:** 2026-08-27 · **Status:** done

## Goal
Tina: *"merge to main all changes we have made"*.

## What actually shipped
Less than expected, and worth recording why. `origin/main` was already at `ba20d80`
when I looked — **every Urban Modesty commit of mine was already on it**, merged by a
concurrent session:

```
226c20a bded857 59e8bd2 c031662 d048c2b   -> all `git merge-base --is-ancestor` = yes
```

So the merge was `ba20d80 -> 5d5de25`, a fast-forward of two commits, both another
session's:

```
5d5de25 docs(log): staging verification for the set-vs-trousers fix
282e305 fix(tag): a set is a set, whichever garments its title names
```

Pushed with `git push origin origin/staging:main` — a ref-to-ref push, which cannot
disturb the shared working tree (§10.17, §10.39).

Before shipping someone else's change I re-ran the whole suite against the merged tree
rather than trusting their log: `Tests 894 passed (894)`, `npx tsc --noEmit` clean,
`npm run lint` exit 0.

## Ordering — origin first, then purge (§10.47)
The marker came from the other session's own log: `Lyocell Trousers Tunic Set with
Sleeve Detail - Plum`, a Nihan row that only moves under the Turkish half of their fix.
**Validated as a discriminator before relying on it**, against both hosts:

| | /modest-trousers | /modest-sets |
|---|---|---|
| production (pre-merge) | 1 | 0 |
| staging | 0 | 1 |

Then the origin was read PAST the edge with a cache-busting query string until it
flipped — six polls, all `cf-cache-status: MISS`, the sixth carrying the marker on
`/modest-sets`. Only then Cloudflare `purge_everything` -> `success: True`.

## Verification, on https://themodestyhouse.com after the purge

| path | pass 1 | pass 2 | marker |
|---|---|---|---|
| `/modest-sets` | MISS | HIT | present |
| `/modest-trousers` | MISS | HIT | absent |

`MISS` then `HIT`, both serving the new build.

Tina's 20 Urban Modesty hand-picks, now live (these went out in the earlier merge, but
this is the first check of them on the real domain past a purge):

| lane | piece | live |
|---|---|---|
| `/modest-skirts` | Olive Pocket Maxi Skirt | yes |
| `/modest-dresses` | Beige Linen Lace Up Maxi Dress | yes |
| `/modest-abayas` | Blue Butterfly Kaftan | yes |
| `/modest-sets` | Brown Longline Abaya & Pants Set | yes |
| `/modest-hijabs` | Ombré Jersey Hijab | yes |
| `/modest-tops` | Pink Striped Button Down Tunic | yes |
| `/cardigans-sweaters` | Knit Sweater | yes |

The sweater's image override is live: the long version (`B2D883A7-…`) is in the
production HTML. `/designers/urban-modesty` is `404`, as intended at 18 pieces
(`MIN_PRODUCTS = 24`). Routes spot-checked: `/`, `/directory`, `/designers`,
`/modest-dresses`, `/edits`, `/about`, `/faq` — all 200.

## One mistake, caught immediately — §10.20 again
The first discriminator check printed `0` for all four cells, which reads as "the
marker does not exist anywhere". The loop was
`for host in "$P prod"; do set -- $host; …` — and **zsh does not word-split an
unquoted parameter**, so `$1` became the whole `"https://… prod"` string and every
curl hit a malformed URL. Same family as §10.20 and §10.6: a command that never really
ran, reporting as a result that did. Rewritten without the splitting trick, the same
four cells were 1/0/0/1.

## Notes / follow-ups
- `main` and `staging` are both on `5d5de25`.
- This is the second merge to `main` today; the first is
  `docs/log/2026-08-27-merge-staging-to-main.md`.
