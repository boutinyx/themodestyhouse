# Applied a /staff/curate export: 115 Beyza cuts, 8 garment moves, 5 lane moves

**Date:** 2026-08-26 · **Status:** done

## Goal
Tina pasted the JSON from `/staff/curate`'s "Copy for Claude" button: 115 `deletes`,
8 `moves`, 5 `laneMoves` — all Beyza, no id appearing in more than one array
(128 ids, 128 unique).

## What changed
- `data/decisions.json` — 115 ids set to `cut` (0 already matched).
- `data/garment-overrides.json` — 8 entries: 5 × `abaya -> dress`,
  `top -> set`, `trousers -> set`, and `set -> set` (a no-op in the export;
  written as an override anyway, which pins the value rather than changing it).
- `data/lane-overrides.json` — 5 entries, all `outerwear`: 3 × `coat`,
  1 × `blazer`, 1 × `vest`.
- `data/dress-subtypes.json` — 3 entries removed. Three of the cut ids carried
  Tina's hand-curated dress subtype (`everyday`), and `lib/dressSubtypes.test.ts`
  correctly went red because the ids no longer resolve to a published dress.
  Dead judgements about products that no longer exist:
  `beyza:10136434770104`, `beyza:10413474087096`, `beyza:10442882318520`.
- `data/products.json` — republished. **19,198 -> 19,083 rows (-115).**

Applied with `node scripts/merge-live-edits.mjs` — the purpose-built merger — then
`ALLOW_LARGE_DIFF=1 npm run build:data`. No file was hand-edited except the three
dead `dress-subtypes.json` keys.

### Why `ALLOW_LARGE_DIFF=1` was required
The cut removes 115 of Beyza's 181 published rows — a **63.5% drop**, far past
`brandDropViolations`'s 30% threshold. Without the flag the publish does not fail;
it **freezes Beyza at its previous 181 rows** (`freezeCollapsedBrands`,
`scripts/build-data.mjs:331`) and the cut silently would not have applied at all.
Checked before running, not after. The next nightly refresh compares against 66,
so no further override is needed.

## Verification
Per §10.35, `git fetch` first — `HEAD..origin/main` and `HEAD..origin/staging` were
both empty, so this ran on the current base and cannot revert a nightly refresh commit.

Every id confirmed **PRESENT** before the cut (absence is not evidence of a successful
cut unless you already know it was there):

```
total published rows: 19198
beyza published: 181
missing from products.json: 0        (all 128 ids present)
deletes already marked cut: 0
delete garments: {"abaya":86,"dress":17,"top":11,"trousers":1}
```

All 8 `moves` matched their declared `from` garment — no mismatch printed.

After the republish:

```
rows now: 19083
beyza now: 66
deletes gone: 115/115
moves ok: 8/8
laneMoves ok: 5/5
```

Publish output: `Published 19083 products (mixed across 109 brands) | rejected 6195 |
review 2126 | delisted-by-brand 2547` · `Titles: 3988 translated from cache | cache
covers every non-English title`. The `postbuild:data` translate hook attempted 0 and
cached 0 new — no republish behind our back (§10.46's determinism guard holding).

Lane placement checked through the real accessor, not the JSON fields:

| id | lands on | subtype | title |
|---|---|---|---|
| beyza:10136430248120 | jackets-coats | coat | 9059 Poncho with Epaulets |
| beyza:10394853081272 | blazers-vests | blazer | 9690 DOUBLE Suit Beaded |
| beyza:10398715248824 | jackets-coats | coat | 9160-3829 Manto Exclusive |
| beyza:10139376550072 | blazers-vests | vest | Zippered Leather and Suede … 9130 |
| beyza:10136433885368 | jackets-coats | coat | Trench Abaya 9205 |

The 5 `abaya -> dress` moves now resolve to `modest-dresses` only, and the 3 `set`
moves to `modest-sets` only — each appears on exactly one of the six lanes probed.

`npm test` — `Test Files 52 passed (52) · Tests 856 passed (856)`.
`npx tsc --noEmit` clean (after `rm tsconfig.tsbuildinfo`). `npm run lint` exit 0.

### One false reading, caught (§10.28 rule 3)
The first lane probe reported **`NONE`** for all five lane moves — which reads exactly
like the overrides failing to apply. It was the probe: it asked for
`productsForLane('outerwear')`, and **there is no `outerwear` lane slug.** The single
lane was split into `blazers-vests` / `cardigans-sweaters` / `jackets-coats` on
2026-08-21 (`lib/lanes.ts:143`). `outerwear` survives only as a `ForcedLane` *value*
that those three lanes match off. `productsForLane` returns `[]` for an unknown slug
rather than throwing, so a typo'd or retired slug is indistinguishable from "the
override did nothing".

## Notes / follow-ups
- Beyza is now 66 published products, down from 181. It is still in `data/brands.ts`
  and still fetched nightly — this is a product-level cull, not a brand cut, so new
  arrivals will keep appearing.
- The `set -> set` entry in the export is harmless but is now a permanent override
  pinning that id's garment. If the tagger's answer for it ever changes, the override
  wins silently.

## Status
On `staging` — **not merged to `main`**, waiting on Tina's approval per §1.

## Staging verification (added after deploy)
`https://themodestyhouse-staging-production.up.railway.app`, with **production
(`main`, pre-change) as the negative control** — the check has to be able to fail,
or "absent" proves nothing. Searched by TITLE, not handle: the columnar payload
carries `rows.title` for every row in a lane, but the `urlTail` handle is only in
the HTML for the ~24 rendered cards.

Cuts, on `/modest-abayas`:

| title | production | staging |
|---|---|---|
| 3717 Bafra Abaya | PRESENT | absent |
| Tayyibe Abaya | PRESENT | absent |
| 9599 Abaya | PRESENT | absent |
| 9769 Abaya with Beaded Sleeves | PRESENT | absent |
| 3466 Praise Abaya | PRESENT | absent |
| 9549 Trench Abaya | PRESENT | absent |
| *control:* Partial Look Abaya 9161 | PRESENT | PRESENT |
| *control:* Sedra Abaya 3249 | PRESENT | PRESENT |
| *control:* 9793 Abaya with Accessories | PRESENT | PRESENT |

Garment moves, four-cell control:

| title | abayas prod | abayas staging | dresses prod | dresses staging |
|---|---|---|---|---|
| 9559 Abaya Bat | YES | no | no | YES |
| 9166 Abaya Wrap | YES | no | no | YES |
| 9541 Linen Abaya with Epaulets | YES | no | no | YES |

Lane moves:

| title | abayas prod | abayas staging | outerwear lane prod | outerwear lane staging |
|---|---|---|---|---|
| Trench Abaya 9205 | YES | no | no (jackets-coats) | YES (jackets-coats) |
| 9160-3829 Manto Exclusive | no | no | no (jackets-coats) | YES (jackets-coats) |
| 9690 DOUBLE Suit Beaded | — | — | no (blazers-vests) | YES (blazers-vests) |
| Zippered Leather and Suede Bitter Brown Abaya 9130 | — | — | no (blazers-vests) | YES (blazers-vests) |

`/modest-abayas` shrank 587,780 -> 583,824 bytes between production and staging,
consistent with the removed rows.

**One control I got wrong and caught:** the first "kept" control I picked,
`9629 Half Sleeve Abaya`, read `prod=1 staging=0` — because it is item 91 of the
delete list. A control has to be a row the change does not touch; verified against
`data/products.json` rather than picked from memory on the second attempt.
