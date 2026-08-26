# Fix: a row's currency now comes from the response, not from config
**Date:** 2026-08-26 · **Status:** done (code + re-ingest of the 31 affected brands)

## Goal
Close the defect diagnosed in `docs/log/2026-08-26-currency-mislabelling.md`:
`lib/normalize.ts` stamped `brand.currency` onto a price it never inspected, so
4,625 published products (24.3%) carried a price in the wrong currency.

## What changed
- **`lib/presentmentCurrency.ts`** (new) — `extractPriceCurrency(html, feedPrice?)`
  and `resolveFeedCurrency({detected, declared, brandSlug})`.
- **`lib/normalize.ts`** — `ShopifyProduct` gains `currency?`, and the product takes
  `sp.currency ?? brand.currency`. The fallback is documented as reachable only from
  direct unit-test callers; `fetchBrand` always stamps first.
- **`lib/ingest.ts`** — `detectFeedCurrency()` samples up to three product pages;
  `fetchBrand()` stamps the detected currency on every row and **throws** if it
  cannot be determined. `wooToShopify` reads `prices.currency_code` directly.
  `fetchBrand` now takes injectable `fetchText` / `fetchPage` for testing.
- **`lib/lifecycle.ts`** — `brandPriceSignals()`, per-brand median USD movement
  between publishes.
- **`scripts/refresh.mjs`** — collects and prints a CURRENCY section listing every
  brand whose feed disagreed with `data/brands.ts`.
- **`scripts/add-brands.mjs`** — per-brand try/catch so one unreadable storefront
  no longer abandons the other slugs on the command line.
- **`CLAUDE.md`** — Invariant 15 (currency comes from the response), a §8 landmine,
  and mistake §10.41.

## The part that took the thinking
A real Shopify product page names **several** currencies. jaida.ca's Syrian Full-Neck
Underscarf page carries `priceCurrency: "CAD"` for the offer and `"USD"` twice more,
for **shipping-rate thresholds** (`eligibleTransactionVolume`). Taking the first match
would have been the original bug in a new place.

So detection is **anchored on the feed's own price**: pair each currency with the
amount beside it, keep the pair whose amount equals the number `/products.json` just
returned. That is self-validating — it proves the currency belongs to the figure being
stored.

The pairing also had to be constrained by **JSON structure, not distance**. A
200-character window still reached from the real `"price": 21.21` into the shipping
block two objects later, pairing it with USD and making a decidable page read as
ambiguous. The gap is now `[^{}]` — a price and its currency are sibling keys of one
object.

## A second place held the same assumption, and it failed the build
`lib/compactCatalogue.ts` threw on encode:

```
compactCatalogue: product hawaa:15924114391413 currency "EUR"
disagrees with brand "hawaa" currency "GBP"
```

It stores ONE currency per brand in the payload dictionary and took it from
`data/brands.ts`, asserting every row matched. That assertion cited
`lib/normalize.ts:119` by line number — the very line being fixed. Left alone it
would have failed every build after the re-ingest.

Now the dictionary entry takes its currency from the FIRST ROW of that brand, and
throws only if a later row of the same brand disagrees — which can only happen after
a PARTIAL refresh, where unseen rows stay published at the old currency while
refetched ones carry the new one. The repair for that is re-running the brand, and
the message says so. Payload size is unchanged: still one currency per brand, just
sourced from the data rather than from config.

Its test asserted the old rule verbatim (*"throws when a product currency disagrees
with its brand record"*) and was replaced by two: the row wins over the config, and
one brand in two currencies throws. Checked that 0 published brands currently have
mixed currencies before relying on the per-brand model.

## Verification
- `npx tsc --noEmit` — exit 0.
- `npm test` — **844 passed** (was 791; 53 new across `presentmentCurrency`,
  `ingest`, `lifecycle` and `compactCatalogue`).
- `npm run lint` — exit 0.
- **Negative control run before trusting the new test** (§10.28 rule 1): reverted
  `lib/normalize.ts` to `currency: brand.currency` and confirmed
  *"stamps the DETECTED currency on every row"* **fails**, then restored and confirmed
  it passes.
- **Against 26 real storefronts, driving the real `detectFeedCurrency`:
  26 agree, 0 undetermined, 0 disagreements.** Before the price anchor the same probe
  scored 23 / 3 / 0 — jaida and culture-hijab were the two it refused to call.
- **End to end on the brand that started it.** `npm run refresh -- hidayah`:
  163 rows updated, 0 delisted. Raw now holds `343 DKK` where it held `20 DKK`, and
  the published median for Hidayah's hijabs went **$3.12 → $18.72** — the figure
  Tina saw on hidayah.dk.

## The re-ingest
`npm run refresh -- hidayah` then the remaining 30 slugs: **30 brands, 7,789 rows
updated, 3 added, 2 delisted, 0 incomplete, 0 errors.** 19 of the 30 printed a
CURRENCY mismatch line; the rest were served the currency `data/brands.ts` already
expected. Published catalogue: 19,308 rows across 109 brands.

Before → after, USD medians:

| house | was | now |
|---|---|---|
| Nurmirè | $2.32 | **$21.06** |
| Hidayah | $3.12 | **$18.72** |
| Nasiba | $10.73 | **$15.11** |
| Jaida | $16.62 | **$23.27** |
| KlayTheLabel | $28.63 | **$19.77** |
| Hawaa | $27.27 | **$19.77** |
| MERRACHI (hijabs) | $54.83 | **$33.83** |
| Maison Hijab | $95.66 | **$80.49** |

## Notes / follow-ups
- **Local refreshes and CI now label differently, and both are correct.** Run from an
  EU machine these brands resolve to EUR; from the US runner they resolve to USD. The
  displayed price is right either way, but a locally-run refresh followed by a CI one
  will rewrite every price row. Expect churn in `data/raw-products.json` diffs
  whenever the two alternate.
- `brandPriceSignals()` is implemented and tested but **not yet wired into
  `scripts/build-data.mjs`** — doing so is the remaining piece of the proposal.
- Not covered: the 6 WooCommerce brands take the `currency_code` path and were never
  scanned; `hijab-boutique` publishes no currency signal at all and will now be
  skipped loudly by any refresh until that is answered.
- `content/editorial/where-to-buy-hijabs-online.md` still has to be rebuilt on the
  corrected numbers before it can merge.
