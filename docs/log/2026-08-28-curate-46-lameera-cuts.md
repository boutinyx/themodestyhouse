# Applied a /staff/curate export: 46 cuts, all Lameera Moda

**Date:** 2026-08-28 · **Status:** done

## Goal
Tina pasted the JSON from `/staff/curate`'s "Copy for Claude" button: 46 `deletes`, no
`moves`, `laneMoves` or `dressTypes`. Every id belongs to one brand, `lameera-moda` —
12 skirts, 30 dresses, 3 abayas (2 of them "abaya set"), 2 knit/ribbed sets.

## What changed
- `data/decisions.json` — 46 ids set to `cut` (0 already matched). Applied with
  `node scripts/merge-live-edits.mjs`; no file was hand-edited.
- `data/dress-subtypes.json` — 2 stale entries pruned,
  `lameera-moda:7588358357160` and `lameera-moda:8419509239976` (both `everyday`).
  Those two products are now cut, so their subtype judgement has nothing to attach to;
  `lib/dressSubtypes.test.ts`'s "every curated id is a published dress" check caught it.
  411 -> 409 entries.
- `data/products.json` / `data/review.json` — republished with `npm run build:data`.
  18,893 -> 18,847 rows (-46).

## Verification
`git fetch` first (§10.35): `HEAD..origin/main` and `HEAD..origin/staging` both empty, so
this ran on the current base and cannot revert the nightly refresh's work.

Per §10.35/§10.49, every id confirmed **PRESENT before** the change — absence afterwards is
not evidence of a successful cut unless you already know the row was there. All 46 resolved
in `data/products.json` with their titles and garments intact (12 `skirt`, 30 `dress`,
3 `abaya`, 2 `set`; the list is in the session transcript). `present: 46 | absent: 0`.

After the republish:

```
rows now: 18847
deletes gone: 46/46
lameera-moda published now: 244 (was 290)
control rows still present:
  PRESENT lameera-moda:9404835561640 | Sila Textured Chiffon Pants Set - Butter Yellow
  PRESENT lameera-moda:9064633434280 | Premium Modal Scarf- Ocean Blue
  PRESENT lameera-moda:9064634515624 | Premium Modal Scarf- Denim Blue
```

The control rows are the point (§10.49 rule 3): a one-sided "is it gone" check passes just
as happily when the whole brand has vanished. 244 of 290 remain, which is the expected
15.9% drop — well under `brandDropViolations`' 30% gate, and no guard fired:

```
Published 18847 products (mixed across 109 brands) | rejected 6195 | review 2125 |
delisted-by-brand 2540
Titles: 3984 translated from cache | cache covers every non-English title
```

`npm test` — 55 files, **901 tests pass** (one failure before the subtype prune, zero after).

## Notes / follow-ups
Not a brand cut. 46 of 290 is a batch of individual editorial judgements, so `lameera-moda`
stays in `data/brands.ts` and out of `exclusions.json.brands` (§7's "cutting a brand is two
edits" does not apply). Invariant 14 is what makes the `cut` decisions durable — the next
`refresh`/`add-brands` pass defaults only ids that are *absent* from the map, so these 46
will not be resurrected.

Still to do: verify on staging after the push, then Tina's approval before merging to `main`
(§1).

## Staging verification (added after deploy)
Fetched `/directory`, `/modest-dresses`, `/modest-skirts` and `/modest-abayas` from
`https://themodestyhouse-staging-production.up.railway.app` and from **production
(`main`, pre-change) as the negative control**. Matching done in node against the fetched
HTML, not in a shell (§10.49 rule 1): the columnar payload embeds each title as
`\"Title\"` with `&` written `&`, so the needle is the escaped, quote-delimited form.

```
CONTROLS — must be PRESENT on BOTH
  prod=PRESENT staging=PRESENT  Clara Drop Waist Chiffon Dress - White
  prod=PRESENT staging=PRESENT  Luxe Ribbed Maxi Skirt - Maroon
  prod=PRESENT staging=PRESENT  Sena Pleat Abaya - Black
  prod=PRESENT staging=PRESENT  Sila Textured Chiffon Pants Set - Butter Yellow

CUT TITLES — want prod=PRESENT, staging=absent
  46/46 behaved as expected  | controls failing: 0/4
```

**The first verification pass was wrong and the controls are what caught it** (§10.49
rule 3). It searched for a bare `"Title"` and reported all 46 cuts *and both controls*
absent on production as well as staging — i.e. it denied the existence of live products.
Two harness faults, no site fault: the payload escapes its quotes (`\"`), and the first
control I picked, `Premium Modal Scarf- Ocean Blue`, is a scarf — `browseProducts()`
excludes hijabs from `/directory` by editorial rule (Invariant 5), so it could never have
appeared on any route being fetched. A one-sided "is it gone from staging" table would
have passed both times.

Also checked for the §10.49 prefix-collision case — a surviving product whose title starts
with a cut title, which would read as a cut that had not taken. There are none in this
batch.

Pushed as `59df42e`; `git merge-base --is-ancestor HEAD origin/staging` confirms it landed
on `origin/staging`. **Awaiting Tina's approval to merge to `main`** (§1).

## Production (merged to `main` at Tina's request)
`git push origin HEAD:main` fast-forwarded `9a9a800 -> 863a708`;
`git merge-base --is-ancestor 863a708 origin/main` confirms it landed.

Per §10.47, the **origin was confirmed serving the new build before the purge**, read past
the edge with a cache-busting query string on `/modest-skirts` — purging early would only
have re-cached the old page and pinned it for another hour:

```
cf-cache-status: MISS | bytes: 393518 | cut marker present: true    <- still old
...
cf-cache-status: MISS | bytes: 392870 | cut marker present: false   <- ORIGIN IS NEW
                                        control present: true
```

The marker is a discriminator (§10.47 rule 3): `Luxe Satin Skirt- Ruby Red` is one of the
46 cuts, paired with `Luxe Ribbed Maxi Skirt - Maroon`, a surviving Lameera skirt that must
stay — so "absent" cannot be confused with "the page failed to render".

Then Cloudflare `purge_everything` -> `success: True` (zone `themodestyhouse.com`).

Verified on **https://themodestyhouse.com**, two real GETs per canonical URL (§10.47 rule 4
— never `curl -I`):

| path | pass 1 | pass 2 |
|---|---|---|
| `/directory` | MISS | HIT |
| `/modest-dresses` | MISS | HIT |
| `/modest-skirts` | MISS | HIT |
| `/modest-abayas` | MISS | HIT |

```
cut titles absent on live: 46/46
controls (must be PRESENT):
  PRESENT  Clara Drop Waist Chiffon Dress - White
  PRESENT  Luxe Ribbed Maxi Skirt - Maroon
  PRESENT  Sena Pleat Abaya - Black
  PRESENT  Sila Textured Chiffon Pants Set - Butter Yellow
```
