# Fixed the double-translation bug: 40 published titles were translated twice

**Date:** 2026-08-26 · **Status:** done

## Goal
Tina, on the previous task's follow-up: fix the titles that read wrong —
`Ine's great`, `Pink hijab`, `JUICE PEARL GRAY Blazer`.

## Root cause
Two things applied the translation cache, and the second one ran on the first one's
output.

1. `scripts/build-data.mjs::publishTitle()` looks the cache up under the **raw feed
   title** and writes the result into `data/products.json`. One lookup. Correct.
2. `scripts/translate_titles.py` then read `data/products.json` — i.e. those
   **already-English** titles — and used the published title as both the translation
   INPUT and the cache KEY. For a row build-data had already translated, that meant
   sending English to Google under the brand's source language and caching the result
   under the English key:

```
"Ines Oberteil" -> "Ine's top"      (build-data, correct)
"Ine's top"     -> "Ine's great"    (translate_titles.py, German->English on English)
```

Once that second entry existed, every later publish reapplied it: build-data produced
`Ine's top`, the hook overwrote it with `Ine's great`. Permanent, and invisible —
each publish looked ordinary and the error is the size of a paraphrase.

**Measured:** 52 chained cache entries; **40 published rows** whose title on disk did
not match what `publishTitle()` derives from the raw title. Worst cases:
`Ine's top -> Ine's great`, `Rossa hijab -> Pink hijab`, `Nour two-piece -> Just two
pieces`, `Sara dress -> Sarah dress`, `JUS PEARL GRAY -> JUICE PEARL GRAY`,
`Jersey breath capuchin -> Jersey breath hoodie`, `Taupe pure abaya -> Taupe sheer
abaya`, `bustier top -> strapless top`, `Greige -> Gray` (twice).

It predates this session: `git show HEAD:data/products.json` already carried
`Ine's great`.

## What changed
- **`lib/publishTitle.ts` (new)** — the raw-title -> published-title rule, extracted
  from `build-data.mjs` so the test asserts against the REAL function. §8 records what
  duplicating filter logic between a script and its test cost last time.
- **`scripts/build-data.mjs`** — now calls it; keeps only the counters.
- **`scripts/translate_titles.py`** — the actual fix. It is now a cache POPULATOR only:
  - the translation input and the cache key are the **raw feed title** from
    `data/raw-products.json`, which is exactly the key `publishTitle()` looks up, so a
    translation can never be fed back into itself;
  - it **no longer writes `data/products.json`**. `build-data.mjs` is the single writer
    of published titles, which also retires the §8 "whichever writer runs last reflows
    the file" hazard for this file;
  - it reads `products.json` for its **id list only**, to stay scoped to published rows.
    Iterating raw wholesale would have meant 4,091 extra calls to a free endpoint for
    cut and delisted rows nobody sees;
  - after caching new entries it re-runs the publish itself
    (`node_modules/.bin/tsx scripts/build-data.mjs` **directly** — `npm run build:data`
    has a `postbuild:data` hook that calls this script, so npm would recurse), so one
    command still gets a new title onto the site. `--no-republish` opts out.
- **`data/title-translations.json`** — 52 chained keys deleted (10,764 -> 10,712).
  Verified first that **none of the 52 is itself a real feed title**, so nothing
  reachable was lost.
- **`lib/titleTranslations.test.ts` (new)** — two guards, below.

## The 11 folded entries
Dropping a chain restores the first-pass translation — but for 11 raw titles the
accidental second pass had replaced a still-**Turkish** word with English, so a plain
drop would have put the foreign word back on the site and broken the "every title is
English" rule. Those improvements were folded into the FIRST-pass entry instead:

| raw | was published | now |
|---|---|---|
| Moon Abaya Takım EKRU | Moon Abaya Set EKRU | Moon Abaya Set ECRU |
| ...Bol Pantolon - Buz | ... - Buz | ... - Ice |
| ...Bol Paça Pantolon - Asit | ... - Asit | ... - Acid |
| Geniş Manşetli Keten Tunik - Asit | ... - Asit | ... - Acid |
| Yaka Detaylı Desenli Elbise - Asit | ... - Asit | ... - Acid |
| Yakası Fırfırlı Keten Elbise - Asit | ... - Asit | ... - Acid |
| Aliye Boncuklu Ferace | Aliye Boncuklu Abaya | Aliye Beaded Abaya |
| Biyeli Ferace 9051 | Pile Abaya 9051 | Pleated Abaya 9051 |
| Beli Büzgülü Brode Etek - Ekru | Gathered Waist Brode Skirt - Ecru | ...Embroidery Skirt - Ecru |
| Beli Büzgülü Brode Etek - Kahve | Gathered Waist Brode Skirt - Brown | ...Embroidery Skirt - Brown |
| Aynil Kloş Ferace KIZILCIK | Aynil Cloş Abaya KIZILCIK | Aynil Cloş Abaya CRANBERRY |

Everything else — casing, pluralisation, word reordering, diacritic stripping — kept
the first pass, because the second pass was not an improvement there.

## Verification
**Negative control run FIRST** (§10.28 rule 1) — both new tests fail on the unfixed
data, listing all 52 chains and all 40 drifted rows:

```
 Test Files  1 failed (1)
      Tests  2 failed (2)
```

After the fix:

```
 Test Files  52 passed (52)
      Tests  856 passed (856)
```

`npx tsc --noEmit` clean (after `rm tsconfig.tsbuildinfo`). `npm run lint` exit 0 — it
caught the now-unused `normalizeTitle` import in `build-data.mjs`, which was removed.

Publish is now **deterministic**: `npm run build:data` twice in a row produces a
byte-identical `data/products.json` (`cmp -s` -> IDENTICAL), and the hook reports
`raw titles behind published rows: 4193 | already cached: 4193 | attempted: 0 |
newly cached: 0` — no network, nothing to overwrite. Publish line unchanged at
`Published 19198 products (mixed across 109 brands)`; the title line now reads
`Titles: 4102 translated from cache | cache covers every non-English title`.

Spot check of the worst rows after the republish:

```
Ine's top                        [was Ine's great]
Rossa hijab                      [was Pink hijab]
JUS PEARL GRAY Blazer (W25262)   [was JUICE PEARL GRAY]
Jersey breath capuchin           [was Jersey breath hoodie]
Taupe pure abaya                 [was Taupe sheer abaya]
Black satin bustier top (L2120)  [was Black satin strapless top]
Aliye Beaded Abaya               [folded improvement kept]
Pleated Abaya 9051               [folded improvement kept]
```

## The two guards
`lib/titleTranslations.test.ts`:
1. **No double-translation chains** — no cache key may be another entry's non-identity
   output while itself mapping to something different. Re-poisoning fails the build.
2. **`products.json` agrees with `publishTitle()`** for every translate-brand row, i.e.
   the two ends of the conversion agree. This is §10.44 rule 2 ("a conversion applied
   twice is invisible at both ends") written as a test.

Neither is a §10.19 hazard: both compare files that the SAME publish writes, so a brand
re-casing a title moves both sides together and CI stays green.

## Notes / follow-ups
Two title problems this did NOT fix, both first-pass translation quality, both
pre-existing:
- `Elenora Hijab` publishes as **`Elena Hijab`** — Google mangled the name on the first
  pass. Wrong before and after.
- Two Beyza rows keep a Turkish word the first pass never translated:
  `Aynil Kloş Abaya FUME` and `Aynil Cloş Abaya CRANBERRY` (kloş = flared).

Both are single-entry corrections to `data/title-translations.json` whenever Tina wants
them; they are her product names, so they are not being rewritten unasked.

## Staging verification (added after deploy)
13 pages fetched from staging and from **production (`main`, still carrying the bug) as
the negative control**, `/directory` plus every garment lane. 6,318,539 bytes vs
6,318,544.

| title | production | staging |
|---|---|---|
| Ine's great → **Ine's top** | PRESENT / absent | absent / **PRESENT** |
| Pink hijab → **Rossa hijab** | PRESENT / absent | absent / **PRESENT** |
| JUICE PEARL GRAY Blazer → **JUS PEARL GRAY Blazer** | PRESENT / absent | absent / **PRESENT** |
| Jersey breath hoodie → **Jersey breath capuchin** | PRESENT / absent | absent / **PRESENT** |
| Taupe sheer abaya → **Taupe pure abaya** | PRESENT / absent | absent / **PRESENT** |
| Black satin strapless top → **bustier top** | PRESENT / absent | absent / **PRESENT** |
| Gray baloon skirt → **Greige baloon skirt** | PRESENT / absent | absent / **PRESENT** |
| Rimaya t shirt → **Rimaya t-shirt** | PRESENT / absent | absent / **PRESENT** |

Folded improvements present on both, as intended: `Aliye Beaded Abaya`,
`Pleated Abaya 9051`, `Gathered Waist Embroidery Skirt - Ecru`,
`Wide Cuff Linen Tunic - Acid`. Regression guard — `- Asit`, `Brode Skirt`,
`Boncuklu Abaya`, `Waist - Buz` absent on both, so no Turkish word came back.

`Nour two-piece` / `Sara dress` read absent on both: neither is published
(`parladusa:15552052068678` is `inStock: false`, `parladusa:15112765636934` was
delisted 2026-08-25). Not a gap.

**Two harness failures on the way, both §10.26.** First run accumulated 6 MB of HTML into
a shell variable and it came back **empty** — every check printed `absent`, which reads
identically to "the fix worked" for half the table. Second run had the URLs mangled by
zsh (`curl: (3) URL rejected: Malformed input`) and reported `absent` for all 34 strings,
including the controls. Only the four-cell layout — every string checked on BOTH hosts,
with rows that must read PRESENT — made either failure visible. A one-sided "is it gone
from staging" check would have passed both times.

## Status
On `staging` (`b8364e5`), verified. **Not merged to `main`** — waiting on Tina's approval.
