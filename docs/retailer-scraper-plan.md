# Plan: scraping large retailers (H&M-style) into the directory

**Date:** 2026-08-05 · **Status:** plan / for discussion (not built)
**Goal:** ingest products from big non-Shopify/non-Woo retailers (H&M, Mango, Zara-likes,
Modanisa marketplace, locked Shopify stores like hijabhouse.au) — sites the current
Shopify/Woo feed pipeline can't read.

---

## 0. Editorial decision — DECIDED: a separate destination

The main directory is **aspirational, curated, women's Muslim-modest**, and deliberately cut
mass-market brands (CLAUDE.md §2/§7). Mainstream retailers (H&M etc.) would dilute that.

**Decision (Tina, 2026-08-06):** mainstream-brand modest pieces get their **own separate
section** — a distinct destination, the way **PINK sits beside Victoria's Secret**. The curated
directory stays pure; the "modest pieces from popular brands" edit is a parallel page with its
own identity, its own scraper, and its own curation. This is the frame for everything below.

**What that means structurally:**
- Products carry a **`section` marker** (`'directory'` | `'edit'`/`'high-street'` — name TBD) so
  the two never intermix. The read-side split we already use (`browseProducts` vs lane vs vibe)
  extends to a third axis; the mainstream section is filtered *in*, never mixed into the main grids.
- Its own **route + landing page** (e.g. `/the-high-street` or a branded name), its own nav entry,
  its own hero/identity — a mini-brand, not another lane.
- Its own **curation gate** (separate keep/cut), so mainstream volume never floods the main eye.
- Same pipeline underneath (adapters below) — the difference is the `section` tag + where it surfaces.

Open naming question for you: what do we call it? (PINK-style: a short, ownable name.)

---

## 1. Why these sites are hard (they are not Shopify)

- **No open product feed.** Custom platforms; `/products.json` doesn't exist.
- **JS-rendered.** The catalogue is drawn client-side from an internal JSON API; raw HTML is a shell.
- **Anti-bot.** WAF/Cloudflare, rate limits, TLS/browser fingerprinting, geo-gating, CAPTCHAs.
- **Geo pricing/availability.** Price and stock vary by country → we must pin a locale.
- **Scale + change.** 10k–100k SKUs; internal APIs are undocumented and change without notice.
- **Legal.** Scraping mass retailers touches their ToS, robots.txt, and image copyright. This is
  the real constraint, not the code.

---

## 2. Approaches, best-first

**A. Affiliate network product feed — STRONGLY PREFERRED for big retailers.**
H&M, Mango, Modanisa etc. are on Awin / CJ / Rakuten / Sovrn. A merchant feed is a structured
CSV/XML with title, price, image, category, stock, **and an affiliate deep-link**.
- **Sanctioned** (no ToS/robots problem), **stable** (a real contract, not a reverse-engineered API),
  **monetizable** (the outbound link earns — the site's revenue is affiliate, currently a stub,
  launch-readiness P0-E). One build solves ingestion **and** revenue for every network merchant.
- Cost: network approval per merchant; a feed parser; filtering a huge feed to modest/relevant.

**B. Internal JSON API adapter (per retailer).** Their SPA calls a backend JSON endpoint
(e.g. H&M's product-list API). Discover it in the browser network tab, call it directly with the
right headers/locale. Fast and structured. Fragile (breaks when they change it), and using it may
breach ToS. One adapter module per retailer.

**C. Headless browser render (Playwright).** Drive a real browser, let the SPA render, extract
`__NEXT_DATA__` / JSON-LD / the DOM. Handles JS + some anti-bot. Slow, heavy, needs a browser
runtime **in the ingestion pipeline** (local/CI — never Vercel), and aggressive sites still block it.
Use only where A and B fail and the source is worth it.

**D. Server-rendered structured data (JSON-LD / schema.org).** If product pages ship
`<script type="application/ld+json">` (many do for SEO), parse that from a plain fetch — no
headless. Good middle ground for SEO-friendly retailers.

**Recommendation:** **A for anything on an affiliate network** (most big retailers, incl. H&M and
Modanisa/Refka); **D then B** for the rest; **C** only as a last resort per high-value source.

---

## 3. Architecture — extend the adapter pattern we already have

We just proved the pattern with WooCommerce: `lib/ingest.ts` dispatches on `brand.platform`, an
adapter maps the source's product shape into `ShopifyProduct`, and everything downstream
(normalize → tag → filter → publish) is unchanged.

Generalize it:
- `Brand.platform: 'shopify' | 'woo' | 'affiliate' | 'api:<retailer>' | 'headless:<retailer>'`.
- Each adapter exports a `PageFetcher` (already the seam) + a `<x>ToShopify` mapper (tested like
  `wooToShopify`). No pipeline rewrite — new sources are new adapters.
- **Affiliate lane** is slightly different: it reads a downloaded feed file (or the network's API),
  not a per-brand URL; it sets `url` to the affiliate deep-link and a `source: 'affiliate'` marker.

Cross-cutting work each new source triggers (all already have hooks):
- **CSP image hosts** — every new image domain must be added to `img-src` + `ALLOWED_IMAGE_HOSTS`
  (the guardrail that just caught La Femme). Retailer CDNs = new hosts each.
- **Currency** — per-brand `currency`, and affiliate feeds may be multi-currency → pin a locale.
- **Title language** — the translation rule already handles non-English (Modanisa is Turkish).
- **Garment tagging** — `tagDiscovery` is keyword-based; foreign or terse retailer titles will
  need category mapping from the feed's own taxonomy.

## 4. The modest-filter problem

A mainstream retailer's catalogue is mostly non-modest. We can't publish "H&M womenswear" — we
need only modest pieces. Options, roughly reliable→hard:
1. **Their own "modest" collection/category** — if the retailer tags a Modest line, ingest just that.
   Cleanest. (Ties back to reading **A** in §0.)
2. **Attribute filter from the feed** (sleeve length, neckline, length) — only if the feed exposes it.
3. **Our own classifier** — reuse the CLIP setup to score "is this modest?" from the image. Real work,
   imperfect, but the honest general answer.

## 5. Phased proposal

1. **Affiliate lane (Phase 1, highest ROI).** Join one network (Awin covers H&M + Modanisa),
   build the feed parser + affiliate-link handling + brand/category filter. Unlocks H&M-Modest,
   Modanisa/Refka, hijabhouse (if on a network) **and** monetization together. Scope its own spec.
2. **JSON-LD adapter (Phase 2).** For SEO-friendly retailers not on a network — plain-fetch schema
   parsing, no headless.
3. **Headless adapter (Phase 3).** Only for a high-value source that fails 1 and 2.

## 6. Open questions for Tina

- **Name** for the separate section (PINK-style: short, ownable). Drives the route + nav + identity.
- Which retailers specifically, beyond H&M? (Determines which networks to join / adapters to build.)
- Is turning on **affiliate monetization** in-scope now? (Phase 1 does both at once — it's the
  efficient path, but it's a bigger commitment than "just add the section.")
- Do mainstream pieces still pass the **modest filter** by their own modest line only, or do we
  run our own modest classifier over their full catalogue? (§4 — the section's inventory depth.)
