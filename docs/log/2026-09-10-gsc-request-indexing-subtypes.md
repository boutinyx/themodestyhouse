# Asked Google to look again at the 12 subtype pages it had never seen fixed
**Date:** 2026-09-10 · **Status:** done for 11 of 12 — all 11 indexed the same morning; co-ord sets refused by the daily quota

## Goal
Tina: *"the oogle search console the  pages that werebt indexed i see tthe we didnt restart it
requested for indexing"*

## Finding — Google had not seen the fixed versions

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
on a crawl Google had no reason to make. **Corrected the same day:** a *Validate fix* HAD been
run on this issue group — started 2026-08-10, marked failed 2026-09-05, three days before the
fix shipped. See the addendum.

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
| `/modest-tops?type=tshirt` | Gecrawld – niet geïndexeerd | not seen in the UI — **confirmed by Google crawling it at 08:11 UTC**, see addendum |
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

## Addendum — same day: every request worked, and Tina was right about failed validations

**All 11 are indexed.** URL Inspection API, re-run about an hour after the requests:

| page | now | crawled (UTC) |
|---|---|---|
| `/modest-tops?type=shirt` | Submitted and indexed | 08:09:13 |
| `/modest-tops?type=blouse` | Submitted and indexed | 08:09:14 |
| `/modest-tops?type=tunic` | Submitted and indexed | 08:11:13 |
| `/modest-tops?type=tshirt` | Submitted and indexed | 08:11:13 |
| `/modest-trousers?type=wide-leg` | Submitted and indexed | 08:13:15 |
| `/modest-trousers?type=tailored` | Submitted and indexed | 08:15:16 |
| `/modest-abayas?type=open` | Submitted and indexed | 08:15:17 |
| `/modest-abayas?type=closed` | Submitted and indexed | 08:17:15 |
| `/modest-abayas?type=kimono` | Submitted and indexed | 08:17:14 |
| `/modest-abayas?type=butterfly` | Submitted and indexed | 08:19:16 |
| `/modest-dresses?type=occasion` | Submitted and indexed | 08:19:17 |
| `/modest-sets?type=co-ord` | URL is unknown to Google | — (quota refused) |

The t-shirt page was crawled in the same minute as tunic, which settles the request the browser
timeout hid. Google took minutes, not the weeks the 09-08 log expected.

**What Tina meant.** Her screenshot was the Pages report's *Waarom pagina's niet worden
geïndexeerd* table. Its **Validatie** column reads **Mislukt** on *Niet gevonden (404)* (4 pages)
and *Gecrawld – momenteel niet geïndexeerd* (8), and **Gestart** on *Gevonden – momenteel niet
geïndexeerd* (9). That is **Validate fix**, a different mechanism from the Request indexing this
entry used: it re-crawls a whole issue group and fails if any URL in it still has the issue.
This entry originally said "nobody asked it to", and I told her there were no failed requests —
both wrong, because I checked `docs/log/` instead of the report she was looking at.
→ CLAUDE.md §10.58.

**The crawled group, read from the UI:** validation **started 2026-08-10, failed 2026-09-05** —
before the 2026-09-08 fix, so Google judged the old near-duplicate pages. The report header
reads **Laatste update: 04-09-2026**, so its counts predate this morning entirely. Its 8 URLs,
checked against the API and production:

| URL | API now | production |
|---|---|---|
| the four `/modest-tops` subtypes | Submitted and indexed | 200, self-canonical |
| `/modest-skirts?type=pleated` | Submitted and indexed | 200, self-canonical, in sitemap |
| `/modest-skirts?type=a-line` | Submitted and indexed | 200, self-canonical, withheld from the sitemap (`TOO_THIN_FOR_SITEMAP`) |
| `/favicon.ico?favicon.2vob68tjqpejf.ico` | Crawled – not indexed (crawled 2026-08-10) | 200 `image/x-icon` |
| `/favicon.ico?favicon.16qiamt2whnrc.ico` | Crawled – not indexed (crawled 2026-08-10) | 200 `image/x-icon` |

Six of eight are indexed. The two left are the site icon at cache-busting query strings — an
icon file, never a page — and they are why this group's validation cannot pass.

## Follow-ups
- **2026-09-11:** request `/modest-sets?type=co-ord`, the only one of the 12 still unknown to
  Google. The t-shirt re-request is no longer needed.
- **The 404 group (4 pages, validation failed) is still unread.** The Search Console UI stopped
  responding to the browser tool on that report — three screenshot timeouts and a click
  timeout — so its URLs and dates were not captured. Stopped rather than retried.
- Do not restart validation on *Gecrawld – momenteel niet geïndexeerd* expecting it to pass:
  the two favicon URLs will fail it again. The six real pages in it are indexed.
- Practical notes for the next session are in memory `google-search-console-access`.
