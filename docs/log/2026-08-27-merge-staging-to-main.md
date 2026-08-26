# Merged `staging` to `main`, purged the CDN, verified on production

**Date:** 2026-08-27 · **Status:** done

## Goal
Tina: *"push to main with the other changes"* — ship the Urban Modesty work together
with the IndexNow automation another session had already verified on staging.

## What shipped
`origin/main` `0c42ae1` -> `59e8bd2`, a fast-forward (`git merge-base --is-ancestor`
confirmed before and after the push). Five commits:

```
59e8bd2 docs(log): staging verification for emptying Urban Modesty
bded857 fix(designers): hide a house that publishes nothing
226c20a content(curate): empty Urban Modesty, keep the house listed
2f2ff20 docs(log): staging verification for the IndexNow automation
d1002a8 feat(seo): run IndexNow on every push to main, and switch to the new key
```

The last two are another session's work, verified on staging by that session and
included at Tina's explicit instruction. Note `d1002a8` adds
`.github/workflows/indexnow.yml`, which triggers **on push to main** — so this merge
is also the first thing that fires it.

Pushed with `git push origin origin/staging:main` rather than by checking `main` out:
the working tree is shared with other sessions (§10.17, §10.39), and a ref-to-ref push
cannot disturb it.

## Ordering — the CDN purge came LAST, deliberately
§10.47: a purge only DISCARDS what is cached; what refills the edge is the next
request, against whatever the origin holds at that instant. Purging before the deploy
lands re-caches the OLD page under a fresh 3600 s TTL and hides the new build for an
hour.

So the origin was read PAST the edge first, with a cache-busting query string, until
it flipped:

```
attempt 1: cf=MISS urban-modesty-tiles=1
...
attempt 7: cf=MISS urban-modesty-tiles=0     <- ORIGIN IS NEW
```

The marker is a discriminator, not a guess (§10.47 rule 3): `data-brand="urban-modesty"`
on `/designers` was present on production before this merge and absent on staging after
it. Then, and only then, Cloudflare `purge_everything` -> `success: True`.

## Verification, on https://themodestyhouse.com after the purge

| path | pass 1 | pass 2 | urban-modesty tiles |
|---|---|---|---|
| `/designers` | MISS | HIT | 0 |
| `/modest-hijabs` | MISS | HIT | 0 |
| `/modest-abayas` | MISS | HIT | 0 |

`MISS` then `HIT`, both serving the new build.

| | before | after |
|---|---|---|
| `/designers/urban-modesty` | 200 | **404** |
| `sitemap.xml` entries for it | 1 | **0** |
| "Navy Lace Trim Modal Hijab" on `/modest-hijabs` | PRESENT | **absent** |
| "Lilac Organza Open Abaya" on `/modest-abayas` | PRESENT | **absent** |

The string "Urban Modesty" still appears 6 times per page — the header marquee, which
repeats for its scroll loop and is driven by `BRANDS`. That is correct: the house is
kept, only its products are gone.

Routes spot-checked: `/`, `/directory`, `/modest-dresses`, `/edits`, `/about` all 200.

**One false alarm, and it was the harness** (§10.26). `/` and `/directory` first came
back as `000` — curl's "no HTTP response" — which reads like the two heaviest pages
being broken by the deploy. They are simply the two slowest to render cold, and every
page was cold immediately after a `purge_everything`. With `-m 60`: `/` 200 in 1.40 s
(436 KB), `/directory` 200 in 2.70 s (1,016 KB). Nothing was wrong; the default curl
timeout in the loop was.

## Notes / follow-ups
- `main` and `staging` are both on `59e8bd2`.
- The nightly refresh (04:10 UTC) will now see `data/default-cut-brands.json` for the
  first time. Expected behaviour: any new Urban Modesty arrival lands in raw as `cut`
  and does not publish. Worth a glance at tomorrow's refresh commit to confirm.
