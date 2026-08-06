# NL/BE shop survey, nine brand additions, and a description-lead classifier fallback

**Date:** 2026-08-06 · **Status:** done

## Goal

Tina asked for a CSV of every women's modest shop in the Netherlands and Belgium that has a
website, then picked nine to add.

## Part 1 — the survey

`data/nl-be-modest-shops.csv` — **52 shops** (38 NL, 14 BE), each verified live, with
`platform`, `feed_works`, `item_count`, `currency`, `median_image_px` and `womens_only`.
42 have working product feeds.

Built from primary sources — Dutch/Flemish search terms, press, community threads, maps and
e-commerce discovery — merged from a 9-agent workflow plus a parallel manual pass, deduped by
domain, every domain curl-verified.

**Not** taken from modestdirectory.com. Their `robots.txt` names `ClaudeBot` and disallows the
whole site, and our own Terms §6 prohibit exactly that kind of bulk copying of a curated list.
Building it directly also produced the two columns that actually decide anything —
`feed_works` and `median_image_px` — which a copied list could not contain.

`/tmp/nl-be-shops.html` is a clickable index of the same data, sorted by image quality.

## Part 2 — nine brands added

| Brand | Items | Platform | Median px |
|---|--:|---|--:|
| Losyana | 642 | shopify | 3082 |
| NOUREEN Modest Fashion | 189 | woo | 1024 |
| Mukistore | 166 | shopify | 2075 |
| Hijab Boutique | 137 | shopify | 1600 |
| LES Atelier | 124 | shopify | 1080 |
| Chador | 80 | woo | 1707 |
| KIMODESTY | 59 | woo | 1920 |
| ABYYA | 22 | shopify | 3052 |
| ANIQQ Exclusive | 3 | shopify | 3024 |

**1,422 items.** Catalogue → **10,139 across 55 brands**. All EUR, so no new currency.

**Losyana publishes 404 hijabs**, which covers "all their hijabs" — its feed paginates to
750+, well past the 250 first-page cap that the survey initially reported.

**LES Atelier was already listed but pointing at a dead domain.** `lesthebrand.com` now 301s
to `les-atelier.com`; the entry was updated and the brand went from stale to 124 items.

## Part 3 — the classifier fix this exposed

ABYYA first ingested at **5 of 26 in-stock products**. Tracing it: its dropped items are
titled by colourway alone — `Coffee Bean`, `Hazelnut`, `Sepia Rose` — with an empty
`product_type`. The garment is named only in `body_html`:

> "Bamboo jersey hijab. Gentle on sensitive skin…"

`tagDiscovery` never read the description, so 21 real hijabs classified as `other` and
`normalizeProduct` dropped them silently.

**Added pass 3: the description lead.** It runs *only* when title, `product_type` and tags
have all failed, and reads only the **first 200 characters** of the stripped body — where the
product is named, before cross-sell copy that mentions other garments.

Measured before implementing, across 4,694 live products from cached feeds:

```
currently unclassified rescued by body_html: 321
rescued as: { abaya: 173, hijab: 84, top: 44, set: 13, skirt: 5, dress: 2 }
existing classifications changed: 0   (0 by construction — fallback only)
```

ABYYA went 5 → **22**. NOUREEN 105 → **189**. Losyana 611 → **642**.

Five tests added, including the two that matter: cross-sell copy in the body must not beat a
title (`Linen Maxi Skirt` + "pairs with our abaya" stays `skirt`), and a garment word 400
characters deep must not classify the product.

## Verification

```
$ npx vitest run     # 12 files, 306 passed
$ npx tsc --noEmit   # clean
$ npm run build      # ✓ compiled
```

**Two guards fired and caught real problems**, which is the whole reason they exist:

1. `lib/catalogue.test.ts` failed with *"New image host(s) found: kimodesty.com, chador.nl,
   i0.wp.com"*. The WooCommerce brands serve images from their own domains (or Jetpack's
   Photon CDN) rather than a shared Shopify CDN — so every one of their images would have
   broken the moment the CSP moved from Report-Only to enforcing. Added to `img-src` in
   `next.config.ts` and to the test allowlist.
2. Earlier in the day the same suite caught `AED` shipping without a `formatPrice`
   expectation.

## Notes / follow-ups

- **ANIQQ is 3 items, and that is correct** — 23 of its 26 products are out of stock. Its
  photography is among the best in the catalogue (3024px), so it is worth re-checking after a
  restock rather than judging it on volume.
- **Losyana's `product_type` values are German** (`Kleid`, `rock`, `oberteil`, `Hose`).
  Classification still works because those products carry English words elsewhere, but 42 of
  750 fall to `other`. A German garment vocabulary in `lib/tag.ts` would recover them.
- **12 shops in the CSV are flagged `womens_only=no`** — By Rofayda (590 items, large kids
  line), Hijab Heela (~73 of 250 girls'), Caftan Factory and Islamitischekleding.nl all carry
  explicit *Heren/Kinderen* sections. Ingestible, but they would lean on the `EXCLUDE` filter
  heavily.
- **10 shops have no usable feed** — By Sutrah (custom Nuxt), Louti (Woo API 500s), Modesva
  (Webnode), MyScarf (JouwWeb), Naadje Ben (Lightspeed), Sham Center (custom PWA). Real
  shops; they would need a scraper or hand entry.
