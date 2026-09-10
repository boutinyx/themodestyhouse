# Asked Google to look again at the 12 subtype pages it had never seen fixed
**Date:** 2026-09-10 · **Status:** partial — 11 requested (10 confirmed), 1 refused by the daily quota

## Goal
Tina: *"the oogle search console the  pages that werebt indexed i see tthe we didnt restart it
requested for indexing"*

## Finding — Google has not seen the fixed versions, and nobody asked it to

URL Inspection API over every URL in the live `sitemap.xml` (159), 2026-09-10:

```
147  Submitted and indexed
  6  URL is unknown to Google
  4  Crawled - currently not indexed
  2  Discovered - currently not indexed
```

All 12 not-indexed URLs are `?type=` subtype pages. The four Google crawled and refused are the
`/modest-tops` subtypes, and every one was last crawled BEFORE the duplication fix
(`b9a93ed`, committed 2026-09-08 12:55 UTC; logged live on production at 13:20 UTC in `0e6cb83`):

| page | last crawl (UTC) |
|---|---|
| `/modest-tops?type=shirt` | 2026-09-08 03:28 |
| `/modest-tops?type=blouse` | 2026-09-03 20:18 |
| `/modest-tops?type=tshirt` | 2026-09-03 21:33 |
| `/modest-tops?type=tunic` | 2026-09-03 22:48 |

So the 09-08 log's "whether Google now indexes them is unknown and will take weeks" was waiting
on a crawl that had not been requested.

**The pages are indexable today** — fetched from production with a Googlebot user agent,
parsed in python (§10.56): all 12 return `200`, carry a self-referencing canonical
(e.g. `/modest-tops?type=shirt`), no `robots`/`googlebot` meta and no `X-Robots-Tag`; ~580-620
words each against ~848 on `/modest-tops`.

**The sitemap is healthy.** `sitemaps.list`: `lastDownloaded 2026-09-09T09:15:47Z`, 0 errors,
0 warnings, 159 submitted. The "Tijdelijke verwerkingsfout" shown on the shirt and tunic
inspections is the state recorded at their old crawl, not the sitemap now.

## What was done

There is no API for this. Google's Indexing API accepts only `JobPosting` and
`BroadcastEvent` pages, and the ADC token is read-only anyway (memory:
`google-search-console-access`). The only per-URL nudge is **Indexering aanvragen** in the
Search Console UI, so it was done in Tina's logged-in Chrome with Claude in Chrome, one URL at
a time, refused pages first:

| page | state when inspected | result |
|---|---|---|
| `/modest-tops?type=shirt` | Gecrawld – niet geïndexeerd | Indexering aangevraagd |
| `/modest-tops?type=blouse` | Gecrawld – niet geïndexeerd | Indexering aangevraagd |
| `/modest-tops?type=tshirt` | Gecrawld – niet geïndexeerd | **unconfirmed** — see below |
| `/modest-tops?type=tunic` | Gecrawld – niet geïndexeerd | Indexering aangevraagd |
| `/modest-trousers?type=wide-leg` | Gevonden – niet geïndexeerd | Indexering aangevraagd |
| `/modest-trousers?type=tailored` | Gevonden – niet geïndexeerd | Indexering aangevraagd |
| `/modest-abayas?type=open` | URL onbekend bij Google | Indexering aangevraagd |
| `/modest-abayas?type=closed` | URL onbekend bij Google | Indexering aangevraagd |
| `/modest-abayas?type=kimono` | Gevonden (was *unknown* in the API run that morning) | Indexering aangevraagd |
| `/modest-abayas?type=butterfly` | URL onbekend bij Google | Indexering aangevraagd |
| `/modest-dresses?type=occasion` | URL onbekend bij Google | Indexering aangevraagd |
| `/modest-sets?type=co-ord` | Gevonden (was *unknown* that morning) | **Quotum overschreden** — "Dien dit morgen opnieuw in" |

**The t-shirt request is not proven.** It ran in a two-page browser batch that timed out before
its result screenshot came back. The next page (tunic) then loaded and its request ran, which
needs the previous result dialog to have been closed, so it very probably went through — but
that is inference, not a confirmation dialog, and the quota was gone before it could be
rechecked. The quota refused the 12th request of the day.

A request only puts a URL in a priority crawl queue. It does not make Google index a page, and
the four tops pages were refused as near-duplicates before; the fix brought their overlap with
the parent from 82-86% to 61-65%, and whether that is enough is Google's call.

## Not explained
Several "unknown" pages show **"Geen verwijzende sitemaps gevonden"** although they have been in
`sitemap.xml` since `e41869b` (2026-09-02) and Google downloaded that sitemap on 2026-09-09.
The first guess — that they were added after Google's last read — was checked and is false.
Two of them (kimono, co-ord) moved from *unknown* to *discovered, via the sitemap* during the
session itself, so Google appears to be working through the entries; left open rather than
explained.

## Follow-ups
- **2026-09-11:** request `/modest-sets?type=co-ord`, and re-request `/modest-tops?type=tshirt`.
  Google's own dialog says re-submitting "does not change queue position or priority", so the
  second one is harmless if the first went through.
- **In 3-7 days:** re-run the URL Inspection sweep. A `lastCrawlTime` after 2026-09-10 on each
  page is the evidence the requests were acted on — including the unconfirmed t-shirt one.
- Practical notes for the next session (Dutch UI, the 404 deep link, one URL per browser
  batch) are in memory `google-search-console-access`.
