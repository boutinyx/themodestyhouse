# Applied a /staff/curate export: 4 cuts, 7 garment moves — and the rule behind 6 of them

**Date:** 2026-08-27 · **Status:** done (export applied; the systemic cause is reported, not fixed)

## Goal
Tina pasted the JSON from `/staff/curate`: 4 `deletes`, 7 `moves`, 0 `laneMoves`.

## What changed
- `data/decisions.json` — 4 ids set to `cut` (0 already matched).
- `data/garment-overrides.json` — 7 entries: `whiteicy:15666941722964 -> dress`, and six
  `trousers -> set`.
- `data/products.json` — republished. 18,898 -> 18,894 rows (-4).

Applied with `node scripts/merge-live-edits.mjs`, then `npm run build:data`.

## Verification
Every id confirmed PRESENT before the change (§10.35):

```
PRESENT cult-abaya:8900891574332      trousers  Ayly Pants
PRESENT nihan:15086438449515          trousers  Zipper Detailed Oversize Trouser Tunic Set - Khaki
PRESENT nihan:15086437794155          trousers  Embroidery Fabric Mix ... Lyocell Set - Plum
PRESENT baqa:9114052264187            trousers  Khaki Lurex Palazzo Trousers
PRESENT whiteicy:15666941722964       trousers -> dress
PRESENT lameera-moda:9404835561640    trousers -> set
PRESENT zahraa:7658948067415          trousers -> set
PRESENT hijabipop:8187308048437       trousers -> set
PRESENT whiteicy:15666941690196       trousers -> set
PRESENT losyana:10786785493330        trousers -> set
PRESENT qupid:9437026451785           trousers -> set
```

`git fetch` first: `HEAD..origin/main` and `HEAD..origin/staging` both empty, and
`git merge-base --is-ancestor origin/main HEAD` passes.

After the republish: `rows now: 18894`, `deletes gone: 4/4`, `moves applied: 7/7`.
Publish line `Published 18894 products (mixed across 109 brands)`; no guard fired.
`npm test` — 879 tests pass.

## The finding: six of the seven moves share one cause
Six of Tina's seven moves were `trousers -> set` on titles that plainly say "set". That is
not coincidence, it is rule ordering in `lib/tag.ts`:

```
90:  ['trousers', word(`trousers?|(?:sweat|track|cargo)?pants?|jeans?|...`)],
91:  ['set',      word(`(?:twin|jogging)?sets?|setı|setjes?|co.?ords?|...`)],
```

`GARMENT_RULES` is first-match, so "Cotton Gauze Top & Pant Set" matches `pants?` on line
90 and never reaches `set` on line 91. This is the same family as §10.10 and §10.31 —
a greedy earlier rule beating the more specific later one — except here both rules are
correctly anchored and it is purely the order.

**Measured across the published catalogue:**

```
published trousers rows:                                    1485
of those whose TITLE contains a set word:                    233   (15.7%)
of those already hand-overridden:                              0
published 'set' rows:                                        606
of those whose title ALSO names trousers:                     23
```

By brand: nihan 154 · veiled 12 · store-wf 11 · elaa-the-label 10 · zahraa 8 · arakai 7 ·
qupid 5 · touche-prive 5 · mukistore 4 · ilovemodesty 3 · and 9 more with 1-2 each.

Samples: `Rima Top & Pant Set (Dusty Blue)`, `Ayla Tie Back Structured Shirt And Trouser
Co Ord Set`, `Villa Pant Set`, `Asymmetric Knit Top & Pants Set - Black`,
`Tasneem Linen Top and Pant Set - Raml Lubnan`.

**The flip is one-directional and therefore low-risk**: moving `set` above `trousers` means
a title containing both words resolves to `set`. Rows already classified `set` cannot move
to `trousers`, and no row becomes `other`, so §10.31 rule 2 ("tightening a classifier is
destructive until you measure what stops matching") does not bite — nothing stops matching.

**Why it is reported and not fixed:** §8 / §10.12. `build-data.mjs` never re-runs
`tagDiscovery`, so raw rows are frozen at the tag logic that scraped them. Editing
`lib/tag.ts` would change **zero** published rows until `npm run refresh` re-ingests those
brands. So the real fix is three things — reorder the rule, add regression tests from
literal catalogue titles, and run a refresh — and 233 products changing lane is Tina's call,
not a side effect of applying her export.

The cheaper alternative, for the record: `data/garment-overrides.json` is applied at
publish time and needs no re-scrape, so all 233 could be written as overrides in one
command. That gets the catalogue right today but leaves the rule wrong, and the next 233
arrive with the next brand.

## Notes / follow-ups
Waiting on Tina to choose between the classifier fix (correct, needs a refresh) and the
override sweep (immediate, leaves the cause in place).
