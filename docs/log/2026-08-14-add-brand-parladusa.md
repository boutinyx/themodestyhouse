# Added new brand: Parladusa (German, EUR)
**Date:** 2026-08-14 · **Status:** done

## Goal
Tina asked to add `parladusa.com` as a new brand.

## Research before implementing
- `curl https://parladusa.com/` → 200, not a parked domain (§10.3 check).
- `curl https://parladusa.com/products.json` → real Shopify feed, 134 products.
- Homepage: `Shopify.currency = {"active":"EUR"}`, `lang="de"` — confirmed EUR, German.
- Footer mentions Deutschland/Österreich/Schweiz (DACH shipping) — no single city found,
  used `city: 'Germany'` per the existing convention for other German brands with no known
  city (golden-dune, glamberry).
- Sampled 50 titles: all women's names + dress/top/set/kimono/abaya/burkini vocabulary
  (Kleid, Oberteil, Zweiteiler, Abaya, Kimono, Burkini). Explicitly checked for
  `herren`/`männer` (German men's-wear signal words, per the §10.4 lesson about
  gender-neutral-looking titles) — zero hits.
- `product_type` and `tags` are empty on every sampled row, so classification runs on title
  alone. Checked `lib/tag.ts` first: German vocabulary for `kleid`/`oberteil`/`zweiteiler`/
  `abaya`/`kimono` was already added for aurora-abaya/golden-dune/glamberry, so no new
  classifier work was needed.

## What changed
- `data/brands.ts`: added `parladusa` (currency EUR, category Modest, city Germany, vibe
  elegant), with a comment noting the empty-tags/title-only classification situation.
- `data/translate-brands.json`: added `"parladusa": "de"` so titles translate at publish
  time (build-data.mjs reads this at publish, not ingest — see CLAUDE.md §4).
- Ran `npx tsx scripts/add-brands.mjs parladusa` (upsert, safe) then `npm run build:data`.

## Verification
```
$ npx tsx scripts/add-brands.mjs parladusa
Scraping Parladusa (parladusa)...
  134 products fetched
  upserted parladusa: 0 updated, 134 new

$ npm run build:data
Published 21959 products (mixed across 111 brands) | rejected 4887 | review 184 | delisted-by-brand 312
Titles: 4754 translated from cache | 81 in non-English brands NOT in the cache — run scripts/translate_titles.py locally to fill them
```
Postbuild translate hook ran (venv present) and translated 126 titles including Parladusa's
("Ines Zweiteiler" → "Ines two-piece", "Marisa Kleid" → "Marisa dress", etc.).

```
$ python3 check data/products.json for parladusa: rows
published parladusa products: 82
Counter({'dress': 39, 'top': 21, 'set': 10, 'hijab': 7, 'abaya': 4, 'swim': 1})
```
82 of 134 fetched products published (rest filtered by stock/price-ceiling/non-apparel
guards). All rows classified — none fell into `other`.

## Notes / follow-ups
- 81 titles across all non-English brands (not just Parladusa) are still untranslated in
  cache — run `scripts/translate_titles.py` locally to close that gap, per the standing
  process in CLAUDE.md §4.
- Not committed or pushed — local working tree only.
