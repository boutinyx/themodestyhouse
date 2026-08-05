# Size charts and wrong-garment photos published as product images (285 rows)
**Date:** 2026-08-05 · **Status:** done

## Goal
Tina reported seeing a **size chart** as the product image on the live grid
(Mariam's Collection — "3D-Style Rose Garden Embroidered Open Abaya", $59).
This is the size-chart bug, which was supposedly already fixed.

## Root cause
The earlier `pickImage()` fix **was committed and is correct** — it never reached
the data.

`data/raw-products.json` stores rows that have *already* been through
`normalizeProduct()`. `scripts/build-data.mjs` only filters those rows — it contains no
reference to `normalize` or `image` (verified by grep) and never re-derives anything.
So a fix to `lib/normalize.ts` changes nothing for any product until that brand is
re-ingested. Mariam's had not been re-ingested since the fix landed.

Evidence, from the live feed for `mariams:9114791706840`:

| # | dimensions | ratio |
|---|---|---|
| 0 | 1200×1200 | 1.00 ← real model shot |
| 1–7 | 1000×1000 / 832×832 | 1.00 |
| 8 | 521×1200 | **2.30 ← the size chart, and what we published** |

Current `pickImage()` correctly returns #0 (one portrait among nine squares fails the
"portrait must be dominant" test). The stored value is exactly what the **old** rule
("first portrait wins") returns — which is how staleness was distinguished from feed drift.

## What changed
- **`lib/normalize.test.ts`** — added 4 regression tests for the image heuristic, which
  previously had **zero** coverage. Fixture dimensions are copied verbatim from the live
  MOA275 feed. 167 → 171 tests.
- **`data/raw-products.json`** (gitignored) — re-ingested 9 affected brands via
  `npx tsx scripts/add-brands.mjs mariams vela nasiba glow-modesty lumos hawaa esme-ny emlavish bemu`.
  All 9 completed fully; no partial/rate-limited runs.
- **`data/products.json` / `decisions.json` / `rejected.json` / `review.json`** — rebuilt
  via `ALLOW_LARGE_DIFF=1 npm run build:data`.

## Verification
A read-only audit re-fetched all 32 brand feeds and compared every published product's
stored image against what current `pickImage()` would select, attributing each mismatch to
the old rule (STALE) or to feed drift (DRIFT):

```
TOTALS {"published":6278,"checked":6274,"mismatched":285,"staleOldRule":258,"notInFeed":4}
```

| Class | Count | Brands |
|---|---|---|
| STALE (old rule reproduces stored value exactly) | 258 | mariams 232, vela 22, nasiba 3, glow-modesty 1 |
| DRIFT (brand changed its own feed) | 27 | lumos 20, hawaa 2, esme-ny 2, emlavish 1, bemu 1, mariams 1 |

23 of 32 brands were completely clean.

After re-ingest + rebuild, the before/after image diff matched the audit's prediction exactly:

```
before rows: 6278  after rows: 6414
images CHANGED: 285 { mariams: 233, vela: 22, lumos: 20, nasiba: 3, esme-ny: 2,
                      hawaa: 2, emlavish: 1, bemu: 1, glow-modesty: 1 }
unchanged: 5990
NEW products: 139 { nasiba: 137, mariams: 2 }
dropped (now out of stock/excluded): 3
```

```
Published 6414 products (mixed across 32 brands) | rejected 3018 | review 41
Test Files  6 passed (6)
      Tests  171 passed (171)
```

The reported product now resolves to `…moa275-1019022.png`; downloaded and visually
confirmed as a model shot of the actual abaya. Spot-checked three more changed rows
visually (vela Petal Flare Skirt, nasiba Solace Wide Leg Pants, lumos LM354) — all now show
the correct garment.

**Mariam's was not the only damage pattern.** On Vela the old rule was not picking size
charts but *photos of a different garment*: "Petal Flare Skirt" was illustrated with
`CinchedTop-5.jpg`. Same root cause, invisible as a bug from the grid.

## Notes / follow-ups
- The rebuild tripped **GUARD 2** (drift ratchet, `build-data.mjs:130`) at
  `6278 -> 6414 (>40)` and correctly refused to write. Re-run with `ALLOW_LARGE_DIFF=1`
  after confirming the delta was 139 genuinely-new upstream products (nasiba 137,
  mariams 2), not a widened filter. The guard did its job.
- **139 newly-published products were auto-`keep`ed by `add-brands.mjs` and have not been
  editorially reviewed.** This is that script's existing designed behaviour, not a change,
  but it means a re-ingest for an image fix also grows the catalogue. Flagged to Tina.
- `decisions.json` was already minified, so the formatting-reflow landmine did not fire.
- `decisions.json` contains 13,446 keys, **all `keep`, zero non-keep** — so the re-ingest's
  forced `keep` writes could not undo any curation. Reinforces the open question about
  whether `decisions.json` earns its place at all.
- Backup of the pre-change `products.json` kept for the session; the file was clean against
  HEAD, so `git checkout -- data/products.json` was a verified restore path throughout.
