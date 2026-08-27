# Fixed the set-vs-trousers rule order, and swept the 416 rows it was mis-filing

**Date:** 2026-08-27 · **Status:** done

## Goal
Tina, after hand-moving twelve `trousers -> set` products across two curate exports:
"you fix". Both halves — fix the classifier so new arrivals are right, and correct the
rows already published so she does not wait on a refresh.

## Root cause — two asymmetries, not one
**1. Rule order.** `GARMENT_RULES` is first-match and `['trousers']` sat one line above
`['set']`, so "Top & Pant Set" matched `pants?` and never reached `set`.

**2. The Turkish path, which is the bigger half.** `tagDiscovery` runs `GARMENT_RULES`
over the title, then over title+type+tags, and only reaches `FOREIGN_RULES` **if both
matched nothing**. `GARMENT_RULES`' trousers rule already carried the Turkish `pantolon`
— but the matching Turkish set word `takım` lived only in `FOREIGN_RULES`. So
"Pantolon Tunik Takım" matched `pantolon`, returned trousers, and the Turkish set rule was
structurally unreachable for exactly the titles that needed it. That is why the first
reorder moved only 93 published rows and Nihan's 154 did not budge: they are classified
from the raw Turkish title, not the translated one.

A foreign word in the primary block needs its counterparts there too, or the fallback
can never fire for the compounds that mix the two.

## What changed
- **`lib/tag.ts`**
  - `set` moved above `trousers` in `GARMENT_RULES`.
  - New `TR_SET` const (`takım | alt üst | kurung`) **shared by both rule blocks**, so
    they cannot drift apart. `FOREIGN_RULES` now references it instead of holding its own
    copy — §8's duplicated-logic trap.
  - `bikini` and an anchored `\bmayo(?:lar)?\b` added to the primary `swim` rule.
- **`lib/tag.test.ts`** — 12 new assertions plus two existing ones corrected (below).
- **`data/garment-overrides.json`** — 402 new entries, 287 -> 689.
- **`data/products.json`** — republished. **18,893 rows, unchanged.**

### The swim rule, and why it is part of this fix
Promoting `takım` immediately broke Invariant 5. Four Baqa **bikini sets**
("Büzgülü Bikini Takımı") moved swim -> set, and swim never appears in a mixed grid, so
that is an editorial regression rather than a relabelling. Cause: the same asymmetry
again — `bikini` existed only in `FOREIGN_RULES`. `swim` sits above `set`, so naming it in
the primary block restores it. `mayo` (tr, swimsuit) had the identical gap and is written
`\bmayo(?:lar)?\b` **anchored**, because that rule is otherwise an unanchored substring
match and `mayovera` is a real brand slug in `exclusions.json`:

```
  MATCH  Tesettür Mayo Takımı - Siyah
  no     Mayovera Abaya
  MATCH  Büzgülü Bikini Takımı
  no     Mayonnaise Dress
```

The repo's own suite had already anticipated this: `keeps Turkish swimwear off the
everyday lanes` was written long before today and would have caught it.

### Two existing assertions changed, deliberately
Both were describing the defect, not guarding against it:

| test | was | now |
|---|---|---|
| `Modal Pantolonlu Takım GRİ` (ipekstil) | `trousers` | **`set`** — "set WITH trousers" |
| `Tunik Pantolon Takım 9240` (beyza) | `trousers` | **`set`** — "tunic trousers set" |

The second lived in a test named *"never lets a Turkish word beat an English
classification"*. That principle still holds for genuinely fallback-only words, so the
test was **split**: the original keeps the still-true case (`Desenli Şifon Kimono Bluz` ->
abaya) and is renamed to say FALLBACK, and a new test documents `takım` as the deliberate
exception — including that the promotion must not swallow a plain
`Bol Paça Beyaz Pantolon`, which stays trousers.

## Verification
**Measured across the real corpus with the real entry point** (§10.31 rule 3 — never quote
a classifier from the regex alone). `tagDiscovery` was run over all 43,325 raw rows before
and after the edit, feeding it each row's own `title` / `productType` / `tags`:

```
WHOLE CORPUS (43,325 rows): 1,053 reclassified
   trousers -> set      793
   skirt -> set         220
   dress -> set          17
   trousers -> swim      11
   top -> set             9
   set -> swim            2
   abaya -> set           1

PUBLISHED rows affected: 416
   trousers -> set      265
   skirt -> set         149
   top -> set             1
   dress -> set           1
   -> other (would be DROPPED):        0
   moved off the swim lane:            0
   moved off abaya or hijab:           0
```

**Nothing becomes `other`**, which is the destructive case §10.31 rule 2 warns about —
tightening a classifier can delete products, and this one cannot.

The sweep refuses to overwrite a human decision (Invariant 14's principle applied to this
file): `written 402 · already the same 14 · LEFT ALONE because Tina's override disagreed: 0`.

After republishing:

```
swept rows now carrying the corrected garment: 416/416
trousers rows: 1479 -> 1227 | with a set word in the title: 230 -> 0
Published 18893 products — row count UNCHANGED, nothing dropped
garment mix: hijab 4923 · abaya 4700 · top 3195 · dress 2578 · trousers 1227 · set 1013 · skirt 961 · swim 296
```

`npm test` — 54 files, **894 tests** (was 879). `npx tsc --noEmit` clean after
`rm tsconfig.tsbuildinfo`. `npm run lint` exit 0.

## Why both a rule fix AND an override sweep
§8 / §10.12: `build-data.mjs` never re-runs `tagDiscovery`, so raw rows are frozen at the
tag logic that scraped them and a `lib/tag.ts` edit alone changes **zero** published rows.
The rule fix is what makes new arrivals correct; the sweep is what makes today's catalogue
correct. `data/garment-overrides.json` is read by `lib/garmentReview.ts::resolveGarment` at
publish time, so it needs no re-scrape.

The 402 entries become redundant no-ops once a refresh re-derives those rows — the override
and the classifier will simply agree. That is harmless, and cheaper than running a
108-brand network refresh in a shared working tree.

## Found while measuring — NOT fixed, and it needs a decision
Comparing each published row's **frozen** garment against what today's `lib/tag.ts` says,
independent of this change: **1,137 published rows are already out of step**, and for
**935 of them today's tagger returns `other`** — which `normalizeProduct` drops.

I checked whether this was an artifact of my measurement script feeding the tagger an empty
`productType`/`tags`: it is not. **All 935 have their `.raw` block**, so the tagger received
the same inputs the ingest did.

This is the §8 frozen-rows landmine at a scale nobody has measured before, and it has a
sharp edge: `npm run refresh` re-derives every row it sees, so **a refresh could drop those
rows**. It is untouched by this change — every number above is before-vs-after of the same
tagger — but it should be understood before the next refresh, and it is the reason I swept
overrides rather than running one. Worth its own investigation.
