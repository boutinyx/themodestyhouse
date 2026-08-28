# Skimlinks is the wrong lever: no brand storefront carries a network tag
**Date:** 2026-08-28 · **Status:** done (research — no code changed)

## Goal
Tina, on being offered P0-E (turn Skimlinks on) as the next piece of work:
*"skimlinks is not going to wrok because we have brands that dont do affiliat."*
This measures that instead of arguing it.

## Method
One GET of each brand's homepage from `data/brands.ts` (112), following redirects, real
browser UA, grepping the HTML for two classes of signal:

- **networks / aggregators** — Awin, ShareASale, Impact, CJ, Rakuten, Partnerize,
  Skimlinks, LTK. These are what an aggregator can cover.
- **self-run Shopify apps** — UpPromote, GoAffPro, Refersion, Social Snowball, Affiliatly,
  LeadDyno, Shopify Collabs. These are programmes you join brand by brand.

## Result

```
MEASURED: 84 of 112 brands fetched successfully
NOT measured (excluded, NOT counted as "no programme"): 28

  in an affiliate NETWORK (an aggregator could cover):  0
  self-run programme via a Shopify app:                12
  no affiliate signal on the homepage:                 72

by signal: uppromote 8, goaffpro 6
unmeasured by reason: rate-limited 26, http-402 1, http-409 1
```

The twelve with a live self-run programme: Summer Evenings, Maison Hijab, Losyana,
Mukistore, KIMODESTY, Headed Somewear, Beyond Label, LaMeera Moda, Aurora Abaya, Zühre,
Hijabi Pop, Mondo The Label.

## What this does and does not prove

**Does:** not one of the 84 storefronts we could read carries an aggregator or network tag,
while twelve demonstrably run their own programme through a Shopify app. The catalogue is
small independent Shopify stores, many outside the US/UK — precisely the population
aggregator networks cover worst. Tina's read was right.

**Does not:** "0 in a network" is *no evidence of*, not *confirmed none*. **A brand can be
in Awin or ShareASale with nothing on its own storefront to show it** — network membership
lives in the network's merchant directory, not in the merchant's HTML. Confirming Skimlinks
coverage specifically needs a Skimlinks account and their merchant list. Likewise "no
signal on the homepage" is an upper bound on "has nothing": an invite-only programme, or
one linked only from a `/pages/affiliate` route, would not appear here.

## The first attempt reported 96 of 112 "unreachable" — that was the probe, not the brands

Five paths per brand at concurrency 6 produced HTTP 429 from the hosts, and `!r.ok`
collapsed that into `''`, so rate-limiting was indistinguishable from "no affiliate found".
Verified by `curl`ing four of the "unreachable" hosts by hand: all four returned 200 with
half a megabyte of HTML. Exactly §10.44's own footnote ("my first scan reported 97 of 112
brands skipped and I nearly published that as coverage — it was 90 × HTTP 429 from my own
concurrency"), repeated in the same file's subject matter a day later.

Rewritten to one request per brand, concurrency 2, 700ms apart, four retries with backoff
on 429, and — the part that matters — **rate-limited counted in its own bucket**, so it can
never again be read as a finding about a brand.

## What this means for P0-E

The blocker is not code. **The plumbing already exists:** every outbound anchor on the site
already routes its `href` through `withUtm()` (`lib/outbound.ts`), at render time, with ten
call sites and `Product.url` left clean in raw. Teaching that one function to prefer a
per-brand affiliate URL, plus an optional field on `data/brands.ts`, is a contained change.

So P0-E should be re-stated: **we have no deals, not no implementation.** Three routes, in
descending order of return per unit of effort:

1. **Join the twelve self-run programmes directly.** UpPromote and GoAffPro are self-serve
   and free; this is an afternoon of sign-ups, and it converts the twelve straight away.
2. **A per-brand affiliate link field.** Small, and it makes route 1 pay out. Worth doing
   only after at least a few programmes are actually joined.
3. **The other ~72** are a business conversation (direct outreach, or paid/sponsored
   placement), not an engineering task.

**Route 1 also takes cookie consent off the critical path.** P0-D is only a live blocker
"the moment Skimlinks is switched on", because Skimlinks is a third-party script setting
cookies on *our* domain. A per-brand affiliate link sets nothing here — the tracking happens
on the brand's own site, under the brand's own consent banner. Not shipping Skimlinks means
P0-D stays defensible.

## Notes / follow-ups
- The 26 rate-limited brands are unmeasured, not clean. Re-run at a slower rate to close
  them if the twelve turn out to be worth extending.
- Worth one manual check: whether Skimlinks' merchant directory lists any of these houses.
  That is the only way to answer the Skimlinks question properly, and it needs an account.
