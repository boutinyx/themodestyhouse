# Lane indexing: the 2026-08-19 plan, one week on
**Date:** 2026-08-26 · **Status:** done (status check — no code changed)

## Goal
Tina: *"we had a plan about indexing categories with 'modest….'"*. Report where
that plan actually stands, from live Search Console rather than from the old log.

## The plan, as it was
`docs/log/2026-08-19-gsc-index-coverage-diagnosis.md`: five lane pages sat in
`Crawled — currently not indexed`. The diagnosis found they had **zero
impressions ever** and had been crawled for the first time hours before Tina
asked — so they were never *rejected*, they were waiting. The recommendation was
deliberately to **do nothing**: "write no new copy. Request indexing for the five
in GSC, then recheck in one to two weeks."

Alongside it, `2026-08-19-lane-depth-and-org-schema.md` deepened three lanes
(abayas, dresses, hijabs) and left eleven untouched **as a control**.

## Where it stands — URL Inspection, live
| lane | 2026-08-19 | today |
|---|---|---|
| `/modest-skirts` | Crawled, not indexed | **Submitted and indexed** (crawl 08-24) |
| `/modest-sets` | Crawled, not indexed | **Submitted and indexed** (crawl 08-23) |
| `/modest-swimwear` | Crawled, not indexed | **Submitted and indexed** (crawl 08-24) |
| `/modest-activewear` | Crawled, not indexed | **Submitted and indexed** (crawl 08-24) |
| `/outerwear` | Crawled, not indexed | Submitted and indexed — **but the URL now 404s** |

Every other lane, `/`, `/directory` and `/designers` are indexed too. **The whole
lane set is in the index.**

And they are earning. All five were *zero impressions ever* a week ago; 28 days
to 2026-08-26, by page:

| lane | imp | clicks | pos |
|---|---|---|---|
| `/modest-hijabs` | 93 | 0 | 54.9 |
| `/modest-dresses` | 75 | 0 | 58.7 |
| `/modest-tops` | 72 | 0 | 71.9 |
| **`/modest-activewear`** | **63** | **1** | 65.0 |
| **`/modest-sets`** | **61** | 0 | 49.9 |
| **`/modest-skirts`** | **25** | 0 | 62.4 |
| `/modest-abayas` | 14 | 0 | 64.8 |
| `/modest-summer-outfits` | 10 | 0 | 49.4 |
| `/modest-trousers` | 10 | 0 | 40.1 |
| **`/modest-swimwear`** | **8** | 0 | 40.0 |
| `/layering-basics` | 4 | 0 | 43.0 |
| `/outerwear` | 4 | 0 | **22.0** |
| `/modest-wedding-guest` | 2 | 0 | 14.0 |

**The call to write nothing was right.** Waiting resolved it, and
`/modest-activewear` — the worst-off of the five — is now the site's best-performing
lane by impressions and holds the only lane click.

Positions are still 40–72, so nothing is on page one yet. That is the honest
reading: indexed and accumulating impressions is the *precondition*, not the win.

## What has broken since, and it is new
**`/outerwear` is indexed, ranks at position 22 — the best position of any lane —
and returns 404.** The lane was split into `blazers-vests`, `cardigans-sweaters`
and `jackets-coats`, and unlike `/hijabi-outfits` (2026-08-19) nobody added a
redirect. `next.config.ts` already has the `redirects()` block and the reasoning
for exactly this case; `/outerwear` is simply not in it.

**The three replacements are `URL is unknown to Google`** — never crawled, despite
being in `sitemap.xml`. Products: `blazers-vests` 359, `jackets-coats` 316,
`cardigans-sweaters` 197.

Two decisions for Tina, neither taken here:
1. **Where `/outerwear` should 308 to.** `jackets-coats` is the closest match to
   what an "outerwear" query means; `blazers-vests` is the largest. A 404 on the
   site's best-positioned lane URL throws that signal away either way.
2. Whether the three new lanes need a nudge (they are in the sitemap; the
   sub-category chip row that used to link them was removed on 2026-08-26, so
   their only internal links are the header flyout, which is client-side).

## Method
`gcloud auth application-default print-access-token` + `x-goog-user-project`
(see the `google-search-console-access` memory), `urlInspection/index:inspect`
per URL and `searchAnalytics/query` by page with `dataState: "all"`.
