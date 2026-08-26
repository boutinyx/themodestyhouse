# Performance audit — Pulse traffic + Lighthouse, and what to fix next
**Date:** 2026-08-26 · **Status:** done (analysis; no code changed)

## Goal
Tina: *"use the performance tool in pulse and check what we can do better"*.

## How this was gathered

**Pulse's own PageSpeed tool could not be used directly.** It is a dashboard
feature at `pulse.ciphera.net/sites/{id}/pagespeed` and is **not exposed on the
public API** — `/pagespeed`, `/performance`, `/vitals` and `/lighthouse` all
404 under `/api/public/v1/sites/{id}/`. Reaching the dashboard needs a login,
and the Chrome extension was not connected. What Pulse's tool runs is
Lighthouse, so the identical audit was run locally instead, which also gives the
diagnostics the dashboard only summarises.

Two API notes worth keeping:
- The base path is **`/api/public/v1`**, not `/api/v1`. `/api/v1/sites` returns
  `401 {"error":"Invalid token"}` — a *wrong path* that reports as an *auth
  failure*, which is how ten minutes went into suspecting a good key. Compare
  §10.42: judge a credential by the endpoint you actually need.
- `Authorization: Bearer` is correct. Other schemes return
  `"Authentication required"` rather than `"Invalid token"`, and that difference
  is diagnostic.
- `export/pages` returns **CSV**, not JSON, and requires explicit `from`/`to`
  (`period=30d` is rejected with `invalid_date_range`).

## Where the traffic actually is (Pulse, 30 days: 175 visitors, 482 pageviews)

| page | views | share |
|---|---|---|
| `/` | 242 | **50.2%** |
| `/directory` | 70 | **14.5%** |
| `/modest-tops` | 23 | 4.8% |
| `/modest-dresses` | 23 | 4.8% |
| `/designers` | 22 | 4.6% |
| `/outerwear` | 19 | 3.9% |
| `/layering-basics` | 17 | 3.5% |
| `/modest-abayas` | 10 | 2.1% |

`/` and `/directory` are **65% of all pageviews**. Optimising anything else is
rounding error until those two are right.

Other Pulse figures: bounce 62.3%, avg duration 322 s, avg scroll depth 53.6%.

## Lighthouse (mobile, simulated slow 4G — harsher than the 9 Mbps tests earlier today)

| | `/` | `/directory` |
|---|---|---|
| **Performance score** | **78** | **65** |
| First Contentful Paint | 1.6 s | **4.3 s** |
| Largest Contentful Paint | **5.9 s** | **7.7 s** |
| Total Blocking Time | 50 ms | 20 ms |
| Cumulative Layout Shift | **0** | **0** |
| Speed Index | 2.3 s | 4.3 s |

CLS 0 and TBT under 50 ms on both are genuinely good and need no work. Every
remaining problem is **bytes arriving too late**.

## Finding 1 — `/directory` ships 2.36 MB of catalogue to render 24 cards

Measured on the live page:

```
brotli on the wire      675,734 bytes
decoded                2,564,326 bytes
  visible HTML           199,858 bytes   (8%)
  RSC flight payload   2,361,529 bytes   (92%)
```

The flight payload is the columnar catalogue (`lib/compactCatalogue.ts`) for
~15,036 browseable rows, shipped so `DirectoryBrowser` can filter on the client.
The page renders **24** of them (`STEP = 24`, `DirectoryBrowser.tsx:8`).

This is why FCP is 4.3 s: on simulated slow 4G the document alone takes ~3.4 s
to arrive, and nothing can paint until it has. It is also why the LCP element (a
product photo) shows a **Load Delay of 3492 ms** — it cannot even be requested
until the document is parsed.

CLAUDE.md §8 already flags this payload; what is new is the measurement that it
is **92% of the page** and the direct cause of the worst FCP on the site.

**Fix:** ship the first ~200 rows and fetch the rest on demand (or move
filtering server-side). Estimated FCP 4.3 s -> ~1.5 s. This is the single
largest remaining win on the site and it affects the #2 page by traffic.
It is an architectural change, not a tweak — the client filter currently assumes
it holds the whole catalogue.

## Finding 2 — the homepage hero is discovered a second too late

LCP phase breakdown for `/`:

| phase | time | share |
|---|---|---|
| TTFB | 536 ms | 9% |
| **Load Delay** | **1060 ms** | 18% |
| **Load Time** | **3167 ms** | 54% |
| Render Delay | 1119 ms | 19% |

- **Load Delay 1060 ms** — the browser does not start fetching the hero for a
  full second. It is inside a `<picture>` with no preload. An explicit
  `<link rel="preload" as="image" imagesrcset=… fetchpriority="high">` for the
  hero would remove most of this. Note Lighthouse *passes*
  `prioritize-lcp-image` and `lcp-lazy-loaded`, so this is invisible if you read
  only the audit scores — it is only in the phase table.
- **Load Time 3167 ms** for a 132 KB image means contention, not size.
  `edit-lace-hero-mobile-v2-780.webp` (**236 KB**) and
  `edit-jersey-hero-mobile-780.webp` (100 KB) download alongside it. Both are
  `loading="lazy"` and Chrome fetches them anyway — it uses a
  distance-from-viewport threshold of roughly 2900 px, and this page packs its
  imagery well inside that (measured in
  `docs/log/2026-08-26-homepage-lcp-preload-contention.md`).

## Finding 3 — smaller, mechanical

From the Lighthouse opportunities on `/`:

```
   340ms    62KB   Reduce unused JavaScript
   200ms    85KB   Properly size images
   197ms     0KB   Preconnect to required origins
   170ms    13KB   Avoid serving legacy JavaScript to modern browsers
   170ms     2KB   Minify JavaScript
```

`Preconnect to required origins` is the cheapest of these — `cdn.shopify.com`
serves every product photograph and gets no `<link rel="preconnect">`, so each
first image pays a fresh DNS + TCP + TLS handshake. One line in
`app/layout.tsx`.

## Recommended order

1. **`/directory` payload** — biggest win, 14.5% of traffic, needs a design
   decision about client-vs-server filtering.
2. **Preload the homepage hero** — small, contained, ~1 s off the LCP of the
   page that is half the traffic.
3. **Re-encode the edit heroes** — 236 KB and 100 KB on mobile. Tina's artwork,
   so her call; a concurrent session was tuning these files this week.
4. **`preconnect` to `cdn.shopify.com`** — one line.
5. Unused/legacy JS — ~500 ms combined, most effort for least return.

## Notes / follow-ups
- Lighthouse's simulated throttling (~1.6 Mbps) is much harsher than the 9 Mbps
  emulation used earlier today, which is why LCP reads 5.9 s here and 2.58 s
  there. Neither is wrong; they answer different questions. Quote the Lighthouse
  numbers when comparing against Pulse's dashboard, since that is what it runs.
- No CrUX field data exists for this origin (`chrome ux report data not found`)
  — 175 visitors in 30 days is far below the reporting threshold. So there is no
  real-user performance data yet, only lab data.
