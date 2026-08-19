# Why 11 pages sit in "not indexed" in Search Console
**Date:** 2026-08-19 · **Status:** done (diagnosis only — no code changed)

> **Corrected later the same session.** The first version of this entry blamed thin/duplicate
> content. That was wrong — see "Correction" at the bottom. The real answer is that Google had
> never crawled these five pages until today, and the decision is hours old.

## Goal
Tina sent the GSC "Pagina-indexering" reasons table (11 pages across 5 reasons) and asked
why they aren't indexed. Establish, with real GSC data rather than inference, which URL is
in which bucket and what the cause is.

## Method
GSC access is ADC + `x-goog-user-project` (see the `google-search-console-access` memory).
The coverage report is not exposed by the API, so every URL was run through the **URL
Inspection API** (`POST /v1/urlInspection/index:inspect`) instead — that is live data, where
the report lags ~2-3 days.

35 sitemap URLs + 8 suspected legacy/redirect URLs inspected.
Scratch data: `inspect.jsonl` / `inspect2.jsonl` in the session scratchpad.

## Findings

**Niet gevonden (404) — 2 pages: `/style/elegant`, `/style/streetwear`.**
Deleted in `4882496` ("remove the /style aesthetic pages", 2026-08-09). Google still has
them queued. Self-resolving; nothing to fix. Note `/style/maximalist` still reports
`Submitted and indexed` while live-serving 404 — it will fall into the same bucket shortly.

**Gevonden / Gecrawld - momenteel niet geïndexeerd — the real 7.**
Live inspection puts exactly five lane pages in `Crawled - currently not indexed`:

| page | last crawl (live) | words in HTML |
|---|---|---|
| `/modest-skirts` | 2026-08-19 13:38Z | 5,859 |
| `/modest-sets` | 2026-08-19 13:40Z | 2,454 |
| `/outerwear` | 2026-08-19 13:44Z | 4,050 |
| `/modest-swimwear` | 2026-08-19 13:44Z | 1,904 |
| `/modest-activewear` | 2026-08-19 13:48Z | 1,506 |

All five were crawled inside a ten-minute window today, which is why the report still shows
5 as "Gevonden" (discovered, not yet crawled) — the report predates the crawl. Every other
sitemap URL is `Submitted and indexed`.

**Ruled out as causes** (each checked, not assumed):
- Technical: all five return 200, carry a correct self-referential `rel=canonical`, no
  `noindex`, unique `<title>`/`<meta description>`/`<h1>`, and `robots.txt` allows them.
- Link starvation: inbound internal link refs across the homepage + 6 key pages are
  uniform — 7-8 for every lane, indexed and non-indexed alike.
- Page size: `layering-basics` (3,913 words) is indexed while `outerwear` (4,050) is not,
  and `modest-wedding-guest` (5,648) is indexed while `modest-skirts` (5,859) is not. Size
  does not separate the two groups.

**What does separate them:** unique text. A lane page's entire non-boilerplate content is
one sentence plus a grid of brand/title/price. `/modest-sets` in full: *"Matching two-piece
sets and co-ords, styled to go."* — then 24 product cards. Structurally that is a
near-duplicate of `/directory` and of every other lane, drawn from the same catalogue. For a
young affiliate directory that is the textbook profile for `Crawled - currently not indexed`:
Google fetched it, found nothing on it that isn't elsewhere on the site, and declined.

The two remaining report rows (1 redirect, 1 alternate-with-canonical) were not pinned to a
specific URL; both are benign states, not blockers.

## Verification
```
$ curl -s https://themodestyhouse.com/style/elegant -o /dev/null -w '%{http_code}'   → 404
$ curl -s https://themodestyhouse.com/modest-skirts -o /dev/null -w '%{http_code}'   → 200
rel="canonical" href="https://themodestyhouse.com/modest-skirts"  robots: none  h1: Skirts
```
GSC sitemap status: submitted 2026-08-08, last downloaded 2026-08-18, 0 errors, 0 warnings.
(Ignore its `"indexed": 0` field — that value is deprecated and always 0.)

## Notes / follow-ups
- The 10 `?type=` subtype URLs added to the sitemap today in `6237f64` all read
  `URL is unknown to Google` — expected, the sitemap has not been re-downloaded since.
- The fix for the five, if Tina wants one, is editorial not technical: real unique copy on
  each lane. That is a content decision, not something to write unasked (§10.18).


---

## Correction (same session, after Tina asked for the copy fix)

The "no unique text" conclusion above is **wrong**, and the recommendation that followed from
it would have been wasted work.

**What I missed:** `lib/laneAnswers.ts` has existed since `03635ea` (2026-08-11, "differentiated
lane content"). Every lane — including all five non-indexed ones — already carries a unique
~150-word `<h2>` + answer block, plus two contextual internal links. It renders **below the
product grid**, which the module's own docstring states plainly. I dumped the page with
`head -60`, saw the intro sentence and the start of the grid, and concluded there was nothing
else. I never looked past the fold of my own terminal output.

**The decisive evidence, which I should have pulled first.** Search Analytics by page,
2026-06-01 → 2026-08-19:

| page | impressions |
|---|---|
| `/modest-dresses` | 46 |
| `/modest-hijabs` | 16 |
| `/modest-abayas` | 11 |
| `/modest-tops` | 10 |
| `/modest-trousers` | 7 |
| `/layering-basics` | 3 |
| **`/modest-skirts`** | **0 — never returned in any search** |
| **`/modest-sets`** | **0** |
| **`/outerwear`** | **0** |
| **`/modest-swimwear`** | **0** |
| **`/modest-activewear`** | **0** |

Zero impressions ever. Combined with `lastCrawlTime` of 2026-08-19 13:38–13:48 for all five,
this says they were never indexed and never *dropped* — they sat in "Discovered, currently not
indexed" (known URL, never fetched) until Google crawled all five inside a ten-minute window
today, hours before Tina's screenshot.

**So the real answer:** the pages are not being rejected on quality. They were crawled for the
first time this afternoon and the index decision is pending. "Crawled — currently not indexed"
a few hours after a first crawl, on a site this young, is the normal waiting state.

Two things sharpen the picture rather than contradict it: the five are the site's five smallest
categories, which is a plausible reason Google deprioritised crawling them for so long; and
today's `6237f64` (link starvation) + `0cab7be` (/directory prose) landed at 14:49 and 15:21,
i.e. **after** the 13:38 crawl — so Google has not yet seen either improvement.

**Revised recommendation:** write no new copy. Request indexing for the five in GSC, then
recheck in one to two weeks. If they are still unindexed after Google has crawled the
post-`6237f64` version, the quality hypothesis becomes worth testing — but not before.
