# Recover products lost to the destructive scrape

**Date:** 2026-08-05 · **Status:** done

## Goal

Restore the products permanently deleted from `data/raw-products.json` by the destructive
brand-replace bug, and pull in the two brands that had never
successfully scraped because of persistent HTTP 429 rate-limiting.

## What changed

Ran the rewritten scraper — upsert-by-id, persistent 429 retry, per-brand checkpointing:

```bash
npx tsx scripts/add-brands.mjs aab veiled mariams ndustry emlavish
npm run build:data
```

No code changes. The fixes this run depended on were made earlier in the session:
non-destructive upsert merge, retry up to 14 attempts with backoff to 45s, and a write
after each brand.

## Verification

Scrape log — note the `updated` / `new` split, which confirms the upsert keyed correctly on
product id rather than duplicating rows:

```
Scraping Veiled (veiled)...          1045 fetched → 244 updated, 801 new
Scraping Aab (aab)...                 781 fetched → 247 updated, 534 new
Scraping Mariam's Collection...      1182 fetched → 996 updated, 186 new
Scraping Ndustry (ndustry)...          25 fetched →   0 updated,  25 new
Scraping EM Lavish (emlavish)...       47 fetched →   0 updated,  47 new
```

Recovery against pre-incident counts:

| Brand | After loss | Pre-incident | Now | Delta |
|---|--:|--:|--:|--:|
| Veiled | 244 | 776 | **1,045** | +269 |
| Aab | 247 | 707 | **781** | +74 |
| Vela | 230 | 404 | **616** | +212 |
| Mariam's | 996 | 1,154 | **1,182** | +28 |
| EM Lavish | 0 | — | **47** | new |
| Ndustry | 0 | — | **25** | new |

```
$ npm run build:data
Published 6592 products (mixed across 34 brands) -> data/products.json

$ npm test
 Test Files  4 passed (4)
      Tests  15 passed (15)
```

Raw: 11,842 → **13,435** rows. Published: 5,013 → **6,592**. All 34 brands now have
published products (previously 32 — `emlavish` and `ndustry` were at zero).

Every brand paginated to completion this run; no partial fetches. Veiled is the clearest
proof the retry fix works — the old scraper gave up at 244, this one pulled 1,045.

## Notes / follow-ups

**The over-recovery is genuine, not duplication.** Counts exceed pre-incident numbers
because the old truncating scraper had never reached those products in the first place. The
upsert log's `updated` counts match the previous per-brand totals exactly, confirming
existing rows were updated in place rather than appended.

**Side effect on P1-A:** the browse payload grew from 1.36 MB to **1.78 MB** (4,112 items),
so the RSC payload blocker in `docs/launch-readiness.md` is now slightly worse. Nothing is
broken, but it reinforces the priority — page weight scales with catalogue size until the
props are paginated server-side.

`vela` needed no work this run; it had already over-recovered to 616 in the earlier
interrupted attempt.
