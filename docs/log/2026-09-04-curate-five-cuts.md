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
