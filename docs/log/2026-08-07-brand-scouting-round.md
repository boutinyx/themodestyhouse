# Brand scouting round — 54 verified candidates
**Date:** 2026-08-07 · **Status:** done (research artifact; no brand added to `brands.ts` yet)

## Goal
Tina asked for a CSV of new brands found on the internet, prioritising **good
quality pictures** and **whether they ship internationally**.

## Method
A 16-agent workflow: 7 regional scouts (UK/IE, US/CA, NL-BE-DE, FR/S-EU/Nordics,
Gulf, Turkey, SEA+AU/ZA) → per-region verification by live probe → synthesis →
a completeness critic. Scouts were told to search from several angles including
**local-language terms** (Dutch, Turkish, French, Arabic), which is what surfaced
the Turkish and Indonesian labels that English-only search misses.

83 brands researched, 62 accepted by the agents.

## Why the agents' output was not taken at face value
Per the working agreement, unverified agent claims are not facts. An independent
re-probe of all 62 caught two classes of error:

1. **7 were already in the catalogue.** Losyana, Manzaram, Maison Hijab, LES
   Atelier, Chic & Modesty, ABYYA — and **MERRACHI at a different domain**
   (`merrachi.com` vs the catalogue's `bymerrachi.com`), which a domain-only
   check would have missed. Caught by matching on domain **and** slug **and**
   name.
2. **18 feeds reported as HTTP 200 returned 429 to me.** Not agent error —
   Shopify rate-limiting our egress IP after 61 rapid requests, and several
   agents said so honestly in their notes. A naive reading would have discarded
   18 good brands. Re-probed sequentially with backoff: **all 18 recovered.**

Final: **54 brands, 54/54 feeds independently confirmed working**, with product
counts and image dimensions measured here rather than reported.

## Output
- `data/brand-candidates-2026-08-07.csv` — 54 brands, ranked by photo quality,
  then international shipping, then resolution. Columns map onto the `Brand`
  shape (`slug`, `homepage`, `feed_url`, `platform`, `currency`, `city`,
  `category`, `vibe`) so rows can be moved into `data/brands.ts` directly.
- `data/brand-candidates-2026-08-07-rejected.csv` — 21 rejections with reasons
  plus the 7 duplicates, so none of them get re-researched in six months.

## Numbers

| Shipping | | | Photography | |
|---|---|---|---|---|
| worldwide | 33 | | excellent | 27 |
| limited | 12 | | good | 22 |
| not stated | 8 | | mixed | 5 |
| domestic only | 1 | | | |

**17 brands are both `excellent` photography and confirmed worldwide shipping.**
Platforms: 50 Shopify, 4 WooCommerce (the `woo` adapter already exists).
Currencies: GBP 10, AED 8, EUR 6, TRY 5, IDR 5, USD 3, AUD 3, SEK 2.

## Verification
`feed_verified` in the CSV records the HTTP status observed **here**, not by an
agent. `image_px` is the true pixel size of a real product image downloaded from
each feed. `shipping_evidence` quotes the merchant's own wording with the URL it
was read on; where no statement exists anywhere the value is `unknown` rather
than a guess.

## Notes / follow-ups
- **8 brands publish no shipping destinations at all** — Malikaat, Modesty in
  Style, LABAYAH DESIGN, İpekstil, Vivi Zubedi, Ria Miranda, Nurmirè, Zaskia
  Sungkar. Malikaat has the best photography of the whole round, so it is worth
  an email rather than an assumption.
- `products_seen` shows `>=30` or `>=250` where the feed returned exactly a page
  boundary — that is Shopify's default page size and its cap, so the true
  catalogue is at least that, not exactly that.
- Nothing has been added to `data/brands.ts`. Adding a brand is
  `brands.ts` → `npx tsx scripts/add-brands.mjs <slug>` → `npm run build:data`.
- Several accepts carry ingest caveats in their `notes` (blank `product_type`
  fields that will push rows to `review.json`; a handful of bakhoor SKUs that the
  non-apparel veto should catch; two men's/kids rows in Jennah Boutique needing
  id-level exclusions). Read the notes column before ingesting.
