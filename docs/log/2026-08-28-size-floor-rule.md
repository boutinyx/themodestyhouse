# Drop products whose smallest in-stock size is XL or bigger

**Date:** 2026-08-28 · **Status:** done — live rule, backfill partial by design (51 of 108 brands; the nightly completes it)

## Goal
Tina: *"i want to have a rule next time there are products that have only xl and xll left
just higher than xl i want them gone."*

Three forks were hers to settle, and she took the recommended option on each:
- **Threshold** — cut once the smallest size still in stock is **XL** (not "only above XL").
- **Reversible** — hidden while sold down, republished automatically on restock. Not a
  permanent cut.
- **Enforcement** — automatic in the pipeline, not a manual step at curate time.

## Research first (§1), because the rule turned out to be unimplementable as stated
`Product` carries a single `inStock` boolean and **every variant is discarded at ingest** —
there is no size data anywhere in `raw-products.json`, so nothing in the pipeline could see
what the rule is about.

A probe over **14 live feeds / 2,603 products / 205 distinct size values** established the
shape of the problem before any code was written:

| | count | share |
|---|---|---|
| alpha-sized (S/M/L/XL — rule can apply) | 887 | 34% |
| **not** alpha-sized (rule cannot apply) | 1,716 | 66% |
| — no size option at all | 1,072 | |
| — "One Size" / "Standard" / "Regular" | 361 | |
| — cm/inch dimensions (hijabs) | 125 | |
| — numeric (52-60 abaya, US 10-22) | 84 | |
| smallest available size is XL or bigger | 32 | 3.6% of alpha-sized |
| smallest available is *above* XL (XXL+) | 14 | 1.6% of alpha-sized |

Two thirds of the catalogue is invisible to this rule. That is the single most important
fact about it and is what the implementation is shaped around.

A second measurement split the 32 candidates by whether smaller sizes had ever existed:
**30 genuinely sold down** (Vela's Braided Cascade Skirt stocks XXS-3XL and has only XL
left), and **2 were never offered smaller** — a girls' school uniform labelled `58 XL`, and
an `XL -XXL` range label from `urban-modesty`, already a default-cut brand. Too rare to
justify a separate rule, so the plain "smallest available size" reading was implemented,
matching Tina's words exactly.

## What changed
- **`lib/sizeAvailability.ts`** (new) — `sizeRank()` and `onlyLargeSizesLeft()`.
- **`lib/types.ts`** — `VariantSize`, and `raw.sizes?: VariantSize[]` on the raw-only block.
- **`lib/normalize.ts`** — `variantSizes()` finds the size option axis (in six languages;
  Turkish "Beden" and French "Taille" both occur in the real feeds) and records each
  variant's label + stock state. Rides in `raw`, so `stripRawSignals()` already keeps it out
  of `products.json` (Invariant 16) and no separate stripping step can be forgotten.
- **`scripts/build-data.mjs`** — `verdict()` gains an `only-large-sizes` rejection. The rule
  lives in `lib/`, and the script calls it, deliberately: §8's duplicated-exclusion-logic
  trap is what happens when a publish rule is written twice.
- **`CLAUDE.md` §7** — the rule, its default-allow behaviour, and the refresh requirement.

### Two properties the implementation is built around
1. **Unreadable is never "large".** No size data, an unreadable sizing system, or a single
   unreadable size still in stock ("One Size" fits anyone) all return `false`. Every raw row
   ingested before today has no sizes, and so does every WooCommerce brand — `wooToShopify`
   synthesises one variant with no options, because the Store API list endpoint exposes no
   variations. A rule that read absence as "only big sizes left" would have emptied the
   directory on its first publish (§10.31 rule 2).
2. **Exact tokens, never substring matching.** "Slim", "Maxi", "Long" and "Mini" are all
   real size labels containing a size letter. The label is looked up whole first, then by
   separator-delimited token — no substring search anywhere, which is why no word-boundary
   escape hatch is needed. §10.5, §10.10 and §10.31 are three separate incidents caused by
   matching a short token inside a longer word.

## Verification
Written test-first (RED verified before every implementation step):

```
lib/sizeAvailability.test.ts   RED: 5 failed / 11 passed against a stub
                               GREEN: 16 passed
lib/normalize.test.ts          RED: 3 failed  ->  GREEN: 26 passed
```

**The safety tests were then proven non-vacuous** (§10.28 rule 1). Against a deliberately
naive implementation — substring matching, and "no data means cut" — six tests fire:

```
× takes the SMALLEST size named in a combined label
× returns null for sizing systems this rule cannot read
× does not find a size inside a longer word
× is false when the product has no size data at all
× is false when no size label can be read
× is false when nothing is in stock at all
```

That matters because 11 of the 16 tests also passed against the empty stub — a negative
assertion passes for free until something is there to get it wrong.

`npx tsc --noEmit` clean. `npm test` — **922 passed** (901 before; +21).

### The rule was live in code and absent from 100% of the data
Publishing immediately after wiring it in changed nothing at all:

```
Published 18847 products (mixed across 109 brands) | rejected 6195 | review 2125
```

18,847 rows, unchanged, and `only-large-sizes` did not appear in the reject table even once.
This is §10.12 exactly — raw rows are frozen at the logic that scraped them, so a
`normalize.ts` change reaches nothing until those brands are re-ingested, and measuring that
it changes zero existing rows is the check that says so out loud. **`npm run refresh` is the
delivery mechanism.**

One brand re-ingested as an end-to-end proof:

```
npm run refresh -- vela
  only-large-sizes rejections: 3
     vela | Braided Cascade Skirt | in stock: XL
     vela | Saya Draped Top Moss  | in stock: XL
     vela | Mock Neck Top Taupe   | in stock: 2XL
  vela raw rows: 665 | now carrying sizes: 605
  rows on OTHER brands carrying sizes: 0
```

Two of the three were predicted by the probe from the live feed; the third had sold down in
the interval. The `0` on the last line is the §10.12 property restated: no other brand is
affected until it is refreshed.

## Catalogue-wide result

**168 products dropped**, across 15 brands:

```
  29 veiled     29 aab        28 fares      17 lanuuk     11 summer-evenings
  11 modern-hijabi  11 merrachi   8 chic-modesty  6 zahraa   6 dignitii
   4 niswa       3 vela        3 les-atelier   1 fatima-diallo   1 sistrs
```

Published 18,873 -> **18,736**. Both safety assertions over the real data read 0:

```
SAFETY — dropped WITHOUT size data (must be 0): 0
SAFETY — dropped with a size below XL in stock (must be 0): 0
```

**168 is not the final number.** The backfill reached **51 of 108 brands** before it was
stopped, so 46 of 126 brand slugs carry size data and only 14% of live rows are alpha-sized
yet. Every brand without sizes is untouched by construction, and the nightly `refresh.yml`
picks up the rest automatically now that the capture code is on `main` — expect the count to
roughly double over the next few nights. That is the rule working, not a gap to chase.

## The refresh was stopped, and reconciled rather than re-run
The 108-brand refresh ran 69 minutes and reached 58 brands before rate limiting slowed it to
a crawl (43 backoff events). It was stopped — safe by §10.7, which is why `refresh.mjs`
writes after every brand — and **`refresh.yml` pushed the nightly straight to `main`
(`0431a21`) while it was running**, so this session's raw file was simultaneously newer
(freshly fetched) and older (built on a pre-nightly base). §10.35, arriving unprompted.

Reconciled brand-granularly rather than by re-running an hour of fetches:

- brand **completely** fetched by this run -> this run's rows (newest, and the only ones
  carrying `raw.sizes`)
- anything else -> the nightly's rows

Completeness came from the run's own log, because `refresh-report.json` is only written at
the END of a run and a stopped run never writes it. 51 brands complete, 7 INCOMPLETE
(`aniqq`, `chi-ka`, `diversity-modest`, `khair-archives`, `latifi`, `losyana`, `madiha`) —
and an incomplete fetch is evidence of presence, never of absence (Invariant 13), so its
rows must not displace the nightly's.

```
rows from this run (51 complete brands): 13,376
rows from the nightly:                   30,019
rows only the nightly has (appended):        55
SAFETY — nightly ids lost (must be 0):        0
SAFETY — my ids lost (must be 0):             0
SAFETY — duplicate ids (must be 0):           0
```

`products.json` was never merged — it is a build artifact and was regenerated from the
reconciled raw plus the 37 curate cuts already on `staging`.

## `lib/dressSubtypes.test.ts` was asserting the wrong property
The rule unpublished 7 curated dresses, and the subtype check went red on 12 ids (5 of them
already red on `main` from the nightly's delistings). The check required every curated id to
be **published today**, which conflates a typo — the thing it exists to catch, and
unrecoverable — with a product that is merely not published today, which is routine and
reversible: a brand delists it, it sells out, or now its smallest size reaches XL. All three
come back on a restock and the subtype has to still be there.

It now asserts the id is **known to raw** (Invariant 12 keeps every row it has ever seen)
and **not deliberately cut**. Negative control run before trusting it (§10.28 rule 1): an
injected typo id and an injected `cut` id both make it fail; removing them makes it pass.

## Two of Tina's hand-picked edit products were cut, deliberately left red
`lib/edits.test.ts`'s "every hand-picked product id still resolves" now fails on
`zahraa:7389671391319` (Yusra Knit Pant, Taupe — XL/2XL left) and
`les-atelier:15725952008565` (Nora Modal Longsleeve, Cacao Brown — XL left), both in the
`fall-essentials` edit. Both were live before this change; the size rule dropped them.

**Not silenced, and not re-picked.** The test's own message prescribes the remedy — "re-pick
in /staff/curate rather than deleting the edit" — and choosing an editorial replacement is
Tina's taste, not something to invent (§10.18). The edit degrades gracefully (it renders the
picks that resolve), and the check is `skipIf(inCI)` so it does not break CI. It is left
firing on purpose: it is the only thing that makes a hand-picked edit quietly losing pieces
visible at all.

## Notes / follow-ups
- **`CLAUDE.md` is excluded via `.git/info/exclude`**, so the §7 rule written there exists
  only on this machine and is not backed up or shared with any other checkout. Worth
  deciding deliberately — every other operating rule in this project is version-controlled.
- The threshold lives in one place (`SIZE_FLOOR` in `lib/sizeAvailability.ts`) and the sizes
  are held in raw, so moving it to L or to XXL is a republish, not a re-scrape.
- Two products in the sample were never offered below XL (a school uniform labelled `58 XL`,
  and an `XL -XXL` range label). The rule cuts those too, on the plain reading of "smallest
  size still in stock". Rare enough not to special-case; revisit if it ever matters.
