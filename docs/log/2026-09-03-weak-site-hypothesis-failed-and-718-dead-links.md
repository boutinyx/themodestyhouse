# The hypothesis failed, and the check that disproved it found 718 dead links
**Date:** 2026-09-03 · **Status:** done — guard shipped, three brands await Tina's call

## Goal
Test the claim I made in `docs/log/2026-09-03-what-the-impressions-are-actually-worth.md`:
*"our designer page wins exactly where the brand's own web presence is weak… that is the
whole pattern, and it is repeatable."* Tina: *"do it"*.

## The hypothesis is REFUTED

All 92 brands with a designer page had their own homepage fetched and scored on six
measured signals (unreachable, placeholder title, title omitting the brand name, no meta
description, no Organization schema, homepage word count in the bottom quartile). Joined to
28 days of Search Console per designer page:

```
pages that EARN clicks     (7)  mean weakness score  1.00
pages with >=25i, 0 clicks (15) mean weakness score  1.20
```

**No predictive power, and the direction is slightly wrong** — the pages earning nothing
sit next to marginally *weaker* brand sites, not stronger ones. Individual counter-examples
are blunt:

```
 1c   18i CTR 5.6%  score 0  fares          <- strong brand site, converts best
 2c  233i CTR 0.9%  score 0  abayabuth      <- strong brand site, converts
 0c   69i          score 7  nour-al-houda   <- brand site is GONE, converts nothing
```

**Why I believed it anyway:** I built it from two examples — Merrachi (strong site, 619
impressions, 0 clicks) and Diversity Modest (thin site, 187 impressions, 12 clicks) — and
wrote "repeatable" without testing the other 72. That is §10.11 exactly: a heuristic
validated only against the cases that inspired it.

**And the sample cannot support any theory.** Of the 8 designer pages earning clicks, six
have exactly ONE click. Only diversity-modest (12) is above noise. With 40 clicks across 74
pages, per-page CTR is not a measurement — it is coin-flipping, and I presented it as a
pattern.

## What the same check found instead, and it matters more

Probing all **117** brands, not just the 92 with pages:

```
   704 published products   nour-al-houda   nouralhouda.com.au   NO DNS — domain does not resolve
    11 published products   madiha          madiha.co.uk         HTTP 402 (Shopify: store frozen)
     3 published products   aniqq           aniqq.nl             HTTP 409 (Shopify: unavailable)
   ---
   718 published products link to a storefront that does not work.
```

Verified rather than assumed (§10.3, §10.42): the DNS failure was confirmed against
**8.8.8.8, 1.1.1.1 and Cloudflare DoH** (Status 2, no answer) with a live brand as the
control (Status 0, 1 answer); the two HTTP codes were requested twice and are stable.

**How long:** `raw-products.json` `lastSeen` says madiha's feed was last reached
**2026-08-21** and aniqq's **2026-08-11** — dead for two and three weeks, publishing the
whole time, with nothing anywhere saying so. nour-al-houda's was reached **2026-09-02**, so
that one broke within about a day and may yet be a lapsed renewal that comes back.

This is worse than any SEO finding on the site: the outbound click is the revenue event
(§11 P0-E), and 718 product cards currently spend one on a dead destination.

## Why the nightly refresh never said anything — and must not be changed to

`refresh.mjs` catches a failed fetch, skips the brand and **delists nothing**. That is
correct: Invariant 13 says only a COMPLETE fetch may delist, because a failed one is not
evidence of absence — it is the rule that stopped §10.1 recurring. The consequence is that
a permanently dead brand stays published for ever.

The fix is therefore not to let the scraper delete. It is to have something that REPORTS.

## What shipped

`scripts/storefront-health.mjs` + `npm run audit:storefronts`.

- **Only ever reports.** Writes nothing; cutting a brand stays a two-edit human decision (§7).
- **Separates DNS from HTTP**, because "the name does not resolve" is a far more final fact
  than "the server answered 403".
- **Never declares death on one failure** — two attempts, and a timeout is reported as
  UNKNOWN, not as dead.
- **Names Shopify's own codes** (402 frozen/unpaid, 409 unavailable), which otherwise read
  as generic errors.
- **Refuses to report "all clear" on a failed parse** of `data/brands.ts` — it exits 1
  rather than checking zero brands and printing success, which is the §10.28 failure mode.
- `--strict` for a job that should fail; `--json` for machine reading.

Verified: 117 of 117 brands parsed (`117 slug occurrences`, 117 parsed — nothing missed),
default exit 0, `--strict` exit 1 while brands are broken, `--json` well-formed. Lint clean.

## Open — Tina's call, not mine
1. **nour-al-houda, 704 products.** Broke within ~24h; could be a domain renewal. Cutting
   is 5.9% of the catalogue.
2. **madiha (11) and aniqq (3)** have been frozen for 2–3 weeks and look final.

## Follow-up
`audit:storefronts` is standalone. Wiring it into `.github/workflows/refresh.yml` so the
nightly says this out loud is the obvious next step and was not done here — that workflow
belongs to another thread of work and this needed no change to it.
