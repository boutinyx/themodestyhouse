# Full index-coverage sweep: 99 of 131 sitemap URLs were unknown to Google
**Date:** 2026-08-26 · **Status:** done — root cause found and fixed

## Goal
Tina: *"go search on the website everything we need to index"*. Establish, for
every URL the site serves, whether Google has it — and why not, where not.

## Method
Three sources cross-checked rather than one:
1. `sitemap.xml` (131 URLs), grouped by route family.
2. **URL Inspection API on all 131**, six at a time (`/tmp/index-audit.json`).
3. A **crawl of the site's own HTML** — every internal `href` reachable from
   `/`, `/directory`, `/designers` + its four pagination pages, `/editorial`,
   `/about`, `/faq` and two lanes — because a sitemap entry and an internal link
   are different things and only the second gets a URL crawled.

## What the inspection said

| state | count |
|---|---|
| **URL is unknown to Google** | **99** |
| Submitted and indexed | 30 |
| Discovered — currently not indexed | 2 |

Zero canonical mismatches. Sitemap registered, `lastDownloaded` 2026-08-25,
**0 errors, 0 warnings**. So nothing was being *rejected* — 99 URLs had never
been discovered at all.

By family, and this is where the shape gives it away:

| family | indexed | not |
|---|---|---|
| `/designers/*` | **5 / 91** | 86 unknown |
| `/edits/*` | 0 / 3 | 3 unknown |
| `?type=` (all lanes) | 1 / 10 | 7 unknown, 2 discovered |
| the three new outerwear lanes | 0 / 3 | 3 unknown |
| every other static page and lane | **21 / 21** | — |

## Root cause: 86 brand pages had no internal links

The crawl found **5** `href`s to `/designers/*` across the entire site — the same
five Search Console has indexed.

`app/designers/page.tsx` decided a tile's destination with
`b.description?.trim() ? '/designers/'+slug : <the brand's own site>`. That was
correct when written on 2026-08-19: a brand page existed **only** for a house
with an editorial description, and there were five. On **2026-08-24** the gate
moved to `MIN_PRODUCTS >= 24 || description` and brand pages went **5 → 91**
(`2026-08-24-brand-pages-404-fix.md`) — and this line did not move with it.

So 86 real, rendering, sitemap-listed pages were linked from nowhere. **A sitemap
entry gets a URL considered; internal links are what get it crawled.**

**The generalisable trap:** two places encoded one rule, one of them changed, and
nothing failed. No type error, no failing test, no broken page — the tiles still
worked, they just pointed off-site. The only symptom was in Search Console.

### Fix
The test is now `hasBrandPage(b.slug)` — the same function `/designers/[slug]`
itself uses to decide whether to 404 — so the next gate change carries both.

Verified on production after deploy: **91 distinct `/designers/*` internal links**
across the five pagination pages, up from 5, with **31 outbound tiles** still
present for the houses that have no page of ours. `BASE=… npm run audit:outbound`
**ALL PASS** in both engines, which is the check that could have broken.

## The other gaps, and what each actually needs

- **`?type=` (10 URLs, 1 indexed).** Their only internal links were the
  sub-category chip row, removed earlier today at Tina's request. The crawl now
  finds **zero** `href`s containing `type=` anywhere on the site. This is the cost
  already recorded in `2026-08-26-filter-chips-and-two-removals.md` — accepted, not
  accidental. They stay in the sitemap; nothing else will find them.
- **`/edits/*` (3, all unknown).** These *are* linked from the homepage. They were
  created 2026-08-24, so two days old — a discovery wait, not a defect. Worth
  noting the `/edits` **index route does not exist and 404s**; only `[slug]` does.
- **The three new outerwear lanes.** Linked and in the sitemap, created 2026-08-21.
  They now also inherit a path from an indexed URL via today's `/outerwear` 308s.
- **`/favourites`** is `noindex, follow` and absent from the sitemap — correct, it
  is a personal page.
- **`/designers?page=2..4`** are indexable, self-canonical, and deliberately not in
  the sitemap (query variants of a listed URL). `?page=5` canonicalises to `page=4`,
  which is right. Two of them already carry impressions.
- **Product pages** remain `noindex` by design (`2026-08-17-product-page-noindex…`).

## Also done
`node scripts/indexnow-notify.mjs` — 131 URLs, HTTP 200 accepted. That reaches
Bing/Copilot/Yandex, **not Google**, which does not participate in IndexNow.
Google has no ping endpoint any more; the internal links are the mechanism.

## Follow-up
Re-inspect the 91 brand pages in about a week. If they are crawled but not
indexed *after* Google has seen the linked version, the thin-content question
becomes real — and the honest test then is how many of the 91 have a genuine
`description` versus only the measured fact row. Not before: the same "establish
whether it was ever crawled" discipline as `2026-08-19-gsc-index-coverage-diagnosis.md`.
