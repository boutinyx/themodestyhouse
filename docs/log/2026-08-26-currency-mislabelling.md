# Prices on ~24% of the catalogue are in the wrong currency
**Date:** 2026-08-26 · **Status:** diagnosed, NOT fixed

## How it surfaced
Tina: *"the hidayah and other danish brands i see a lot of the time that you make
their prices like 3 and 2 dollar but when i change the currency on their website its
suddenly 15."*

## The defect, in one line
`lib/normalize.ts:119` — `currency: brand.currency`.

It stamps the brand's home currency from `data/brands.ts` onto a number it never
inspected. Shopify's `/products.json` does not state its currency, and **Shopify
Markets serves the response in whatever currency it decides the requester should
see**, so the number in the payload is frequently not in the brand's home currency at
all. `formatPrice`/`lib/fx.ts` then converts it a second time.

The nightly refresh (`.github/workflows/refresh.yml`) runs on `ubuntu-latest`, i.e. a
US-hosted runner. Any store with a US market configured hands it **USD**. Those USD
numbers are then labelled DKK / GBP / EUR / AUD / CAD / SEK.

Same family as §10.33 (a function accepting a field it never reads) and §10.15 (a
property made to depend on something owned by a different concern). The currency of a
payload is a fact about the payload; it was sourced from a config file instead.

## Evidence
Hidayah's "Premium Plain Jersey (Laurel)": the store charges **120 DKK** (≈$18.72).
`data/raw-products.json` holds `price: 20, currency: "DKK"`. The site shows **$3.12**.

Checked every matched row, not a sample:
- **Hidayah — 163 of 163 rows** match the USD conversion of the live DKK price;
  **0 of 163** match the DKK price.
- **Nurmirè — 46 of 46**, same. 200 SEK (≈$21.06) stored as `22`, shown as **$2.32**.

Ground truth for "what currency was this response in?" came from each product page's
JSON-LD `"priceCurrency"`, which reflects the same presentment currency the feed used.
Verified that the two agree on nine brands first, **including the converted cases**
(Ellem Atelier and Arakai both served EUR to this machine, and their pages said EUR).

## Scope — 112 brands scanned
| verdict | n |
|---|---|
| **currency wrong (stored number is USD)** | **31** |
| currency correct | 61 |
| ambiguous | 10 |
| not checked (3 feeds unavailable, 6 WooCommerce, 1 no currency signal) | 10 |

**4,625 of 19,024 published products — 24.3% of the catalogue — carry a wrong price.**

Wrong by declared currency: GBP 12 · EUR 10 · AUD 5 · CAD 2 · DKK 1 · SEK 1.

**It runs in both directions, and mostly makes us look expensive.** 22 of the 31 are
shown **too high**, by a median factor of **1.34**; 9 are shown too low. The direction
follows the rate: dividing a USD number by a rate below 1 (GBP 0.733, EUR 0.857)
inflates it, dividing by a rate above 1 (DKK 6.41, SEK 9.49) collapses it.

Worst overstatements: Avyaana $265.86 shown vs $194.76 true · Malikaat $152.70 vs
$111.93 · Lanuuk and Qupid $133.61 vs $97.93 · Arakai $124.07 vs $90.93.
Worst understatements: Nurmirè $2.32 vs $21.06 · Hidayah $8.58 vs $53.52 ·
Nasiba $89.44 vs $124.77 · Nour Al Houda $86.58 vs $121.27.

The 10 "ambiguous" are mostly USD-declared houses (Veiled, Niswa, Urban Modesty,
Summer Evenings, LaMeera Moda, Hijabi Pop, Modista) where the stored USD number is
self-consistent and the EU storefront simply charges more — not a mislabelling.
`amariah` is a real fault of a different shape (an EUR number labelled GBP) and
`abadia` / `abayabuth` are ordinary price drift.

## Proposed fix (not implemented — awaiting Tina)
1. **Derive the currency from the response.** During ingest, fetch one product page per
   brand and read `"priceCurrency"` from its JSON-LD; use that for every row in that
   fetch instead of `brand.currency`. One extra request per brand per refresh.
   Crucially this does **not** require forcing stores to serve their home currency — a
   USD number labelled USD renders correctly. We only have to stop lying about what we
   received.
2. **`data/brands.ts:currency` becomes the EXPECTED value**, not the asserted one. A
   mismatch between expected and detected gets reported in the publish output.
3. **No silent fallback.** If no currency signal can be found, that brand's ingest
   fails loudly rather than guessing (§1). `hijab-boutique` is the one brand where no
   signal was found, so this path is real and needs an answer.
4. **A publish-time guard**, in the shape of `brandDropViolations`: refuse the publish
   if a brand's median price moves more than a threshold between publishes.
5. **Re-ingest the 31 brands.** Raw rows are frozen at the values that scraped them
   (§8), so the fix reaches the site only via `npm run refresh -- <slugs>`.

Open question for step 1: WooCommerce brands (`lib/ingest.ts`) take a different path
and were not scanned — 6 of them. They need their own answer.

## Consequence for today's editorial
`content/editorial/where-to-buy-hijabs-online.md` is built on these prices and is
**wrong in its headline claim**. It opens "the spread runs from $2.32 to $95.66" and
names Nurmirè ($2.32) and Hidayah ($3.12) as the two cheapest houses. Corrected, those
are **$22.00 and $20.00** — third-band houses, not budget ones. Also moving: Nasiba
$10.73 → $15.00, Jaida $16.62 → $23.00, MERRACHI $54.83 → $47.00, Maison Hijab
$95.66 → $80.49, Hawaa $27.27 → $20.00, KlayTheLabel $28.63 → $21.00. The true
cheapest houses are Modest & Timeless $6.34, Store WF $6.82 and Zahraa $7.50.

**The post is on `staging` and must not be merged to `main`** until the data is fixed
and its price sections rebuilt. Its non-price sections (instant hijabs, undercap
counts, fabric *ordering*) are unaffected in structure but every dollar figure in them
needs recomputing.

## Verification
- `.fxscope2.tmp.mjs`, serial with backoff and a per-brand cache, 112 brands.
  Raw results: `/tmp/fxscope2.json`.
- **A first attempt returned 90 × HTTP 429 and would have reported 97 brands as
  "skipped".** That is §10.28 rule 3 — `skipped` is a finding — and it was caught only
  by breaking the verdict counts down instead of reading the summary line. The rerun is
  the one quoted above.
- **Ellem Atelier was initially flagged as broken and is not.** Its feed served EUR to
  this machine while our stored value is genuinely SEK. The probe was the thing lying,
  not the data (§10.26). Every verdict here is therefore anchored on the product page's
  declared `priceCurrency` rather than on a price ratio.

## Notes / follow-ups
- Nothing in the pipeline compares a feed's currency to the number in it, so this can
  silently start or stop for any brand whenever a store changes its Markets config or
  the runner's IP moves. The 31 brands are symptoms; the missing check is the defect.
- `scripts/fetch-rates.mjs` unions brand currencies with `DISPLAY_CURRENCIES`; if
  detected currencies start differing from declared ones, that union needs to follow.
