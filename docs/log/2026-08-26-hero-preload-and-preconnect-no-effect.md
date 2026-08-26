# Hero preload and Shopify preconnect: measured, ineffective, reverted
**Date:** 2026-08-26 · **Status:** reverted

## Goal
Act on findings 2 and 3 of `docs/log/2026-08-26-performance-audit-what-to-fix-next.md`:
Lighthouse put the homepage hero's LCP **Load Delay at 1060 ms** and listed
`Preconnect to required origins` as a ~197 ms opportunity.

Both were implemented, both were measured against the thing they were supposed
to improve, and **neither did anything**. Reverted.

## What was built (and undone)

- `app/page.tsx` — two `<link rel="preload" as="image">` in the head, one per
  breakpoint, `media` mirroring the hero `<picture>`, `fetchPriority="high"`.
- `app/layout.tsx` — `<link rel="preconnect">` + `<link rel="dns-prefetch">`
  for `cdn.shopify.com`.

Both shipped to staging correctly. Verified in the served HTML, and verified
that the two media queries partition cleanly — phone downloaded only
`hero-home-mobile-1290.webp`, desktop only `hero-home-10-2400.webp`, so the
double-download hazard the code comment warned about did not occur.

## The measurement that killed it

Playwright + CDP, 390x844 DPR 3, 9 Mbps / 40 ms, cache disabled, median of 3.
The question is *when does the request start, relative to the document
arriving* — TTFB differs between the two hosts because production is behind
Cloudflare and staging is not, so the absolute numbers are not comparable and
the delta from TTFB is.

**Hero image (homepage):**

| | TTFB | hero request starts | delta |
|---|---|---|---|
| production, no preload | 149 ms | 194 ms | **+45 ms** |
| staging, with preload | 553 ms | 597 ms | **+44 ms** |

**First `cdn.shopify.com` image on `/directory`** (where the LCP element *is* a
Shopify image, i.e. the best case for a preconnect):

| | TTFB | first image starts | delta |
|---|---|---|---|
| production, no preconnect | 189 ms | 241 ms | **+52 ms** |
| staging, with preconnect | 476 ms | 534 ms | **+58 ms** |

And at the network layer, both open exactly **one** connection to
`cdn.shopify.com` costing ~110 ms, preconnect or not (113 ms vs 108 ms).

Chrome's **preload scanner already finds the hero immediately** — it does not
wait for the parser to reach it, which is the entire premise of adding a head
preload. There was no discovery delay to remove.

## So where did Lighthouse's 1060 ms come from?

Lighthouse's `throttling-method=simulate` does not measure the page under load;
it builds a **model** of the network graph and replays it at ~1.6 Mbps. The
1060 ms "Load Delay" is that model's estimate of contention, not an observed
delay in starting the request. Under real throttling at 9 Mbps the delay is
45 ms and there is nothing to fix.

Note the same report *passed* `prioritize-lcp-image` and `lcp-lazy-loaded` —
Lighthouse's own audits agreed the image was already prioritised correctly.
The phase table was read as contradicting them; it was not, it was modelling
something else.

## Two false measurements produced on the way, both worth knowing

1. **Cross-origin resource timing is zeroed without `Timing-Allow-Origin`.**
   The first preconnect check read `connectStart`/`connectEnd`/`domainLookupStart`
   from `performance.getEntriesByType('resource')` and got `dns=0ms
   handshake=0ms` on **both** hosts — which reads as "no handshake needed" and
   is actually "not permitted to tell you". `cdn.shopify.com` sends no TAO
   header. Use CDP `Network.responseReceived`'s `timing` object, which is below
   that restriction.
2. **A regex that could not match what it was looking for.**
   `/hero-home(-mobile)?-\d+\.webp/` never matches `hero-home-10-1440.webp` —
   the `-10-` sits between `hero-home` and the width. The desktop check
   therefore reported **zero hero downloads**, which read as a serious bug in
   the change rather than a bug in the probe. §10.26: when a whole category
   comes back empty, suspect the harness first.

## Why revert rather than leave them

Neither is harmful — ~500 bytes of head, and the media split was verified
correct. They are reverted anyway because each carried a comment asserting a
benefit that has now been measured as absent, and a false explanation in the
code is worse than no code. The hero preload additionally created a real
maintenance hazard: two `media` queries that must be kept in sync with the
`<picture>` below them, forever, for nothing.

## What this means for the audit's remaining findings

Finding 1 — `/directory`'s 2.36 MB payload — stands, and is unaffected by any of
this. It was measured directly (92% of a 2,564,326-byte document) rather than
modelled, which is exactly the difference that matters here. The plan for it is
`docs/superpowers/plans/2026-08-26-split-catalogue-payload.md`.

**Rule this suggests:** treat a Lighthouse *simulated* phase breakdown as a
hypothesis, not a measurement. Before acting on it, reproduce the delay under
real throttling against the real host. The audits Lighthouse scores pass/fail
are more trustworthy than the timings it models.
