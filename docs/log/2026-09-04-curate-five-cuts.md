# Five curate cuts — noureen 2, la-petite-parisienne 2, vela 1
**Date:** 2026-09-04 · **Status:** done

## Goal

Tina pasted a `/staff/curate` export: 5 `deletes`, no `moves`, `laneMoves` or `dressTypes`,
with *"and push to main when done"*.

| id | title |
|---|---|
| `noureen:58549` | Abaya Lexus Nude 142/150 cm |
| `noureen:58532` | Abaya Jazz Black 142/150/156 cm |
| `la-petite-parisienne:15498436510036` | Black ALBA Set (26CY631) |
| `la-petite-parisienne:15051531059540` | Black satin bustier top (L2120) |
| `vela:8804158210204` | Al-Sudan Hoodie |

## What changed

**`data/decisions.json`** — exactly 5 keys, all `keep -> cut`, applied through
`scripts/merge-live-edits.mjs`. Nothing hand-edited.

**`data/products.json`** — republished, 19,174 -> 19,169 rows.

Republished with `npx tsx scripts/build-data.mjs` rather than `npm run build:data`, to skip
the `postbuild:data` translate hook. The publish reports `186 in non-English brands NOT in
the cache`; filling those is a separate job and would have put a few hundred unrelated title
changes into a cuts-only commit.

## The base, first

§10.53's exact hazard was live: `git fetch` at the start of the task showed **`22ef748` on
`origin/main` and not in this checkout** — last night's 04:10 refresh, `+217 new, 53
delisted, 27042 updated`. Publishing on the stale base and merging would have reverted all
of it. Merged `origin/main` into `staging` (`e20fc97`) BEFORE touching `decisions.json`.

## Verification

**Presence before absence** (§10.35 — "it's not there" is not evidence of a cut unless you
know it used to be there). All five, read out of `products.json` at the merged base:

```
PRESENT  noureen:58549                        "Abaya Lexus Nude 142/150 cm"
PRESENT  vela:8804158210204                   "Al-Sudan Hoodie"
PRESENT  noureen:58532                        "Abaya Jazz Black 142/150/156 cm"
PRESENT  la-petite-parisienne:15498436510036  "Black ALBA Set (26CY631)"
PRESENT  la-petite-parisienne:15051531059540  "Black satin bustier top (L2120)"
```

Titles match her export exactly, so these are the rows she was looking at.

**After the republish:**

```
rows: 19174 -> 19169  (delta -5, expected -5)
the 5 cuts:              all gone
rows gone that I did NOT cut:  0
rows that appeared:            0
vela                 399 -> 398
noureen              180 -> 178
la-petite-parisienne 284 -> 282
brands that vanished entirely: none
```

**Controls from OUTSIDE the change** (§10.53 rule 2 — a control drawn from the brand you are
cutting cannot see damage to the 111 brands you are not). Eight rows *last night's refresh
added*, none from a cut brand, all required to survive the republish:

```
present  vivi-zubedi:89044        "VZ Mavelyn Top – Blush Pink"
present  parladusa:15552051904838 "Aura two-piece"
present  vivi-zubedi:89040        "VZ Mavelyn Top – Broken White"
present  veiled:7639107797097     "Asymmetric Cape Maxi Dress - Fern"
present  jawda:16069871075708     "Mocha Brown Linen Cotton Wave Open Abaya"
present  jennah-boutique:8003092185264 "JNA brown barrel pants"
present  vivi-zubedi:88107        "VZ Severine Scarf – Blush Pink"
present  merrachi:15233279590783  "Bamboo Jersey Scarf | Ash Brown"
```

That set reads `0/8` on a stale base and `8/8` here, which is the only assertion in this
table that can see a reverted nightly.

**Two things a plain "are they gone" would miss**, both checked before applying:

- **None of the five leads a collapsed colour group.** Run through the real
  `groupColourVariants`, each is a card with `variantCount` 1 — so each cut removes one card
  and no surviving card silently swaps its photograph for a sibling's.
- **None is hand-referenced anywhere.** Grepped across `lib/*.ts` and the curated
  `data/*.json` (edits, houses, garment/lane/dress overrides, PREFERRED_LEADS): zero hits, so
  no hand-picked rail is left a card short (§10.54).

**The two frozen brands are not mine.** The publish froze `glow-modesty` (165 -> 112) and
`voile-chic` (126 -> 72) on `brandDropViolations`. Both froze at their previously published
counts and both read identically before and after this change — `165 -> 165`, `126 -> 126` —
so the freeze came in with last night's raw, not from these cuts. Worth its own look.

**Suite:** `Test Files 62 passed (62) · Tests 1100 passed (1100)`. The two
`lib/edits.test.ts` failures recorded on 2026-09-01 are gone.

**decisions.json diff, read key by key rather than by line count:**

```
decision keys changed: 5
  vela:8804158210204                  keep -> cut
  la-petite-parisienne:15051531059540 keep -> cut
  la-petite-parisienne:15498436510036 keep -> cut
  noureen:58549                       keep -> cut
  noureen:58532                       keep -> cut
```

## Notes / follow-ups

- **`glow-modesty` and `voile-chic` are frozen** and have been since at least last night's
  refresh — 32% and 43% of their rows stopped publishing. A dead feed and a broken filter
  look identical from here (`brandDropViolations` says so itself). Not investigated in this
  session; it is the next thing worth an hour.
- **186 titles in non-English brands are still uncached.** `scripts/translate_titles.py
  --only <slug>` per house, then a republish.

---

## Second half — "btw names keep on being wrong"

Tina, mid-task. She meant the product titles: **186 published rows were still in their
source language** — Turkish, Dutch, French, German — and a visitor read them raw.

```
nihan 164 · manzaram 7 · parladusa 4 · noureen 3 · la-petite-parisienne 3
mukistore 2 · whiteicy 1 · chic-modesty 1 · baqa 1

"Pilikaşeli Kalem Etek - Açık Mavi"   "Comfy Kleid"   "Gilet ASTRID kaki (5645)"
"Knit vest met knopen"                "Hijab easy café au lait"
```

**Why it "keeps" happening, and it is structural rather than a bug:** the applier
(`build-data.mjs`) can only look a title up; the populator (`translate_titles.py`) needs the
network and the venv, so it never runs in CI. Every nightly refresh adds arrivals whose
titles have never been seen, and each one publishes untranslated until somebody runs the
populator on a machine that can. The publish has been printing the exact count every night —
`186 in non-English brands NOT in the cache` — and nobody was reading it.

```
./.venv-style/bin/python scripts/translate_titles.py --no-republish
cache 11,274 -> 11,445

15 titles failed that pass; retried per-brand (manzaram, nihan, parladusa)
cache 11,445 -> 11,460
```

Republished with `npx tsx scripts/build-data.mjs` — again NOT `npm run build:data`, because
the `postbuild:data` hook would re-run the populator against `products.json` and that is the
feedback loop of §10.46.

```
Titles: 4404 translated from cache | cache covers every non-English title
```

**Verified the republish changed titles and nothing else** (§10.44 rule 2 — a conversion
applied at both ends needs one check that the two agree):

```
rows 19169 -> 19169
id sequence identical (no reorder): true
titles changed: 184
rows differing in any NON-title field: 0
PUBLISHED rows still untranslated: 0

parladusa            "Comfy Kleid"                    -> "Comfy dress"
manzaram             "Knit vest met knopen"           -> "Knit cardigan with buttons"
whiteicy             "Gilet Victoria – Maille à boutons dorés"
                                                      -> "Victoria vest – Knit with gold buttons"
la-petite-parisienne "Gilet ASTRID écrue (5645)"      -> "ASTRID ecru vest (5645)"
baqa                 "Fırfır Detaylı Transparan Bluz" -> "Ruffle Detailed Transparent Blouse"
nihan                "A-Line Denim Etek - Füme"       -> "A-Line Denim Skirt - Smoked"
```

`lib/titleTranslations.test.ts`'s two §10.46 guards — no cache key may be another entry's
differing output, and `products.json` must equal `publishTitle(rawTitle)` — pass:
`62 files, 1100 tests`.

## Staging

`ec7d616` deployed to `https://themodestyhouse-staging-production.up.railway.app` and
verified on the product route, which 404s for an unpublished id:

```
the 5 cuts        404 404 404 404 404
nightly controls  200 200 200 200      (vivi-zubedi, parladusa, veiled, merrachi)
```

The same nine URLs read the exact inverse **before** the deploy landed — cuts `200`, control
`404` — which is the negative control for this check, obtained for free by measuring too
early (§10.28 rule 1).

## Notes / follow-ups

- **The translation gap will reopen tomorrow morning.** Every nightly adds untranslated
  arrivals and CI cannot fill them. Worth automating: the populator could run on a schedule
  from a machine with the venv, or the publish's `NOT in the cache` count could become a
  loud failure rather than a line nobody reads.
