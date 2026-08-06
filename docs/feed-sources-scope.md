# Scope: ingesting non-Shopify feed sources

**Date:** 2026-08-05 · **Context:** several requested brands don't expose the standard
Shopify `/products.json` the pipeline relies on. This scopes how to get each, with effort
and a recommendation. Grounded in live probes (2026-08-05), not assumption.

The current pipeline (`scripts/scrape.mjs` / `add-brands.mjs` → `lib/normalize.ts`) assumes
**one Shopify store per brand**, read from `https://<home>/products.json`. Everything below is
about brands that break that assumption.

---

## 1. lafemmecollectie.nl — WooCommerce · FEASIBLE (recommended first)

**Probe:** homepage identifies as **WooCommerce**; `/products.json` 404s, but the WooCommerce
Store API works: `GET /wp-json/wc/store/v1/products?per_page=100&page=N` → HTTP 200, real
products (e.g. *EMIRATI Satin Dress*, `prices.price:4999` = €49,99, `prices.currency_code:EUR`,
6 images). Modest womenswear, EUR.

**Approach:** add a **WooCommerce adapter** parallel to the Shopify one.
- New `platform?: 'shopify' | 'woo'` field on `Brand` (default `'shopify'`).
- A `fetchWoo(brand)` that pages `/wp-json/wc/store/v1/products` and maps to `ShopifyProduct`-ish
  shape → reuse `normalizeProduct`. Field map: `name→title`, `prices.price/100→price`,
  `id`, `permalink→url`, `images[].src`, `is_in_stock→inStock`, `categories`→tags for `tagDiscovery`.
- The scraper dispatches on `brand.platform`.

**Effort:** Medium (~1 adapter + a dispatch branch + a couple of tests). **Reusable** for any
other WooCommerce modest brand. **Recommend doing this first** — clean, self-contained win.

---

## 2. hijabhouse.au — Shopify with products.json DISABLED · PARTIAL

**Probe:** `/products.json` returns 403 to a bare UA, and **301-redirects to the homepage**
with full browser headers — i.e. the merchant has turned the JSON feed off. It is a Shopify
store, but the standard feed is unavailable.

**Options, cheapest first:**
1. Try `\/collections/all/products.json` and per-collection `\/collections/<h>/products.json` —
   often still live even when the root feed is off. **Quick to test.**
2. `\/sitemap_products_1.xml` → fetch each product's `.js` / JSON. More work, more requests.
3. If both are closed, it's only gettable via an **affiliate feed** (§3) or a headless browser
   (Playwright) — heavier, and headless invites bot-detection.

**Effort:** Low to *test* option 1; Medium if it falls to sitemap; High if it needs headless.
**Recommend:** probe option 1; if closed, defer to the affiliate lane rather than fight it.

**PROBE RESULT (2026-08-05): fully locked.** `products.json`, `/collections/all/products.json`,
and `/sitemap_products_1.xml` all 301-redirect to the homepage. No feed endpoint is open — this
store needs a headless-browser render or an affiliate feed (§3). Deferred to the retailer-scraper
plan (`docs/retailer-scraper-plan.md`).

---

## 3. Modanisa → Refka (marketplace) · NEEDS AFFILIATE FEED

**Probe:** Modanisa is a **marketplace**, not a Shopify/Woo store (`/products.json` 404).
Refka has **no standalone store** (refka.com / .com.tr / .co / .shop all dead). So Refka exists
*only inside Modanisa*, and Modanisa exposes no per-brand JSON feed.

**Two real paths:**

**A. Affiliate network product feed (recommended — strategic).** Modanisa runs affiliate
programs (Awin and others). Joining gives a **product data feed** (CSV/XML) carrying brand,
title, price, image, and an **affiliate deep-link**. We filter it to `brand == "Refka"`.
- This is *also* how the site is meant to make money — outbound links become affiliate links
  (currently a stub, see `docs/launch-readiness.md` P0-E). So building the affiliate-feed lane
  **adds Modanisa/Refka AND turns on monetization** — two blockers, one build.
- Work: join the network + get approved for Modanisa; a **feed parser** (CSV/XML → Product) as a
  third ingestion lane; store the affiliate URL as the product `url`; a `source: 'affiliate'`
  marker; brand filter. Product ids/currency come from the feed.

**B. HTML-scrape Modanisa's Refka brand page.** Possible but **not recommended** — fragile
(breaks on redesign), against marketplace ToS, and earns no affiliate revenue. Only a stopgap.

**Effort:** Medium–High for the affiliate lane (network onboarding is the long pole, not code).
**Recommend A** — it's the correct long-term shape and unlocks revenue, so it shouldn't be a
one-off Refka hack.

---

## Recommended order

1. **WooCommerce adapter** → lafemmecollectie.nl (and future Woo brands). Self-contained, fast.
2. **Probe hijabhouse.au's collection endpoint** (10-minute test). If open, ingest; if not, park
   it with the affiliate work.
3. **Affiliate-feed ingestion lane** (Awin/Modanisa) → Refka + hijabhouse fallback, and it
   doubles as the monetization mechanism. Bigger, strategic; scope its own spec before building.

None of these are blocked outright — but 1 is a clean win, 2 is a quick probe, and 3 is a real
project worth pairing with the affiliate/monetization milestone rather than doing piecemeal.
