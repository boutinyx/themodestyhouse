# Khair Archives added; the translate hook was minifying products.json
**Date:** 2026-08-10 · **Status:** done

## Goal
Tina: *"https://khairarchives.com add this brand to the archive"*.

## The brand
Verified before adding, per §10.3 (a parked domain also returns 200): real Shopify storefront
(`Shopify.shop`, `cdn.shopify.com`, `myshopify`), `products.json` parses with a `products` array
and plausible titles.

| | |
|---|---|
| slug | `khair-archives` |
| currency | **EUR** — verified, not inferred |
| country | **NL** |
| catalogue | **7 products, the whole of it** |
| photography | 34 images, 4.9/product, **every one portrait JPG**, up to 5760px |

**Currency was verified rather than read off the prices.** 139.99 reads equally as GBP or USD;
the storefront reports `"currency":"EUR"`, `moneyFormat "€{{amount_with_comma_separator}}"`, and
`cart.js` returns EUR, while Shopify's payload gives `"countryCode":"NL"` and merchantName
"Khair Archives". Per §3 the currency comes from the brand record and never from the feed, so
guessing would have mispriced every row.

**Catalogue size confirmed three ways** — `products.json?page=2` empty, `/collections/all` also
7, and the feed's own length.

**NL-based but the titles are English**, so it does *not* go in `data/translate-brands.json`.
That check exists because of §10.16 (the French feed where "jean" meant denim, not trousers).

**Classification measured before ingest**, not assumed: ran the real `normalizeProduct` over the
live feed — 7 kept, 0 dropped, 4 `set` + 3 `dress`. Women's only, no menswear, no non-apparel,
so no exclusions were needed. Not on the `exclusions.json.brands` blocklist.

## Result
```
raw rows        21893 -> 21900   (+7)
published rows  11209 -> 11215   (+6)   1 withheld: "Zahra Beldi Co-Ord", out of stock
lanes           modest-dresses 3 · modest-sets 3
brands          60 -> 61
```
The card image `pickImage` chose is a real on-body model shot, per §7 — checked by eye, not by
trusting the portrait-dominant heuristic.

## The bug this turned up: `translate_titles.py` was minifying the catalogue
`scripts/build-data.mjs:176` writes `products.json` with `JSON.stringify(…, null, 2)`. The
`postbuild:data` hook then rewrote the same file with `json.dumps(products, ensure_ascii=False)`
— **no `indent`** — flattening 189,000 lines onto one. A publish adding six products produced a
**189,462-line deletion against a 198-line insertion**, on the largest tracked file in the repo.

It was intermittent, which is why it survived: `npm run translate` is guarded on
`[ -x .venv-style/bin/python ]`, so a machine *with* the venv minified the file and a machine
*without* it left build-data's pretty output alone. The committed format flipped depending on who
published last. Same trap as §8's note on `decisions.json` (add-brands writes it minified,
`app/api/curate` pretty-printed), undocumented for this file.

Fixed with `indent=2`, matching build-data.

## A second, larger finding: the nightly refresh is not translating
With the format fixed, the diff was *still* 109,230 lines. Broken down against HEAD:

```
ids added                     6      (this brand)
ids removed                   0
rows whose CONTENT changed  561      — ALL of them title-only
rows that MOVED position 10,794 of 11,209
```

- The 10,794 moves are inherent: `interleaveByBrand()` re-interleaves the whole catalogue when a
  brand is added. Unavoidable, and how the pipeline has always worked.
- The **561 title changes are all Dutch/French → English** ("Satijnen top met kant detail" →
  "Satin top with lace detail"). And the run reports `attempted API translations: 0 | titles
  changed: 561` — **zero API calls**. Every one came from `data/title-translations.json`, which
  is committed.

So the translations existed in the cache and had simply never been applied to the published file.
The reason is the same venv guard: **CI has no `.venv-style`, so the nightly refresh skips the
hook**, and whatever it publishes carries untranslated titles. §4's claim that "`build:data`/
`refresh` always publish English titles" holds only on a machine with the venv. Until CI has one,
these 561 will regress on the next nightly refresh.

## Verification
```
$ npx tsc --noEmit                    exit 0
$ npm test                            21 files, 420 tests passed
$ npx eslint data/brands.ts           exit 0
$ npm run build:data
  Published 11215 products (mixed across 61 brands) | rejected 3114 | review 18
  no brandDropViolations
$ npm run build   (isolated worktree)  Compiled successfully
  Khair Archives present in the prerendered /modest-dresses
```
Product URLs spot-checked live: `diva-beldi-co-ord`, `the-sayf-dress`, `the-dot-dress` all 200.

## Notes / follow-ups
- **Give CI the venv, or move translation into `build-data.mjs`.** Until then the nightly refresh
  publishes untranslated titles and undoes this. That is the real fix; the `indent=2` change only
  stops the file thrashing format.
- Six products publish, not seven — "Zahra Beldi Co-Ord" is out of stock and will appear by
  itself on a future refresh if it returns.
