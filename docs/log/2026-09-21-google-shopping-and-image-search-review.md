# Google Shopping eligibility and image-search review
**Date:** 2026-09-21 · **Status:** done (analysis only, no code changed)

## Goal
Tina asked whether our products can be indexed as Google Shopping products, then (after a
screenshot of Google Images results for Merrachi) why only some brands' products show up, and what
else would help SEO.

## What changed
Nothing in the site. This entry records findings so the next session does not re-derive them.

## Findings
**Shopping (Merchant Center).** Listings are for merchants who sell the product; as remembered
from Google's policy, checkout must be on the listed site. We have no checkout and link out, so we
are very likely ineligible. NOT re-verified against Google's current policy text this session.

**The screenshot.** Every product tile was labelled MERRACHI (their own site), not "The Modesty
House". It shows the brand's own images, not ours.

**Our image-search performance** (Search Console, `searchType=image`, 2026-06-21 to 2026-09-20):
3,411 impressions, 1 click. Web search over the same period: 14,597 impressions, 110 clicks.
Product `<img>` tags on `/designers/*` already carry alt text ("Premium Jersey Scarf | Misty
Blue") and the pages carry `CollectionPage` + `ItemList` JSON-LD. Most designer pages had 1-22
image impressions; a few had more (`/designers/eynaa-paris` 167, `/modest-activewear` 223).
Grid pages render 24 products in HTML; the rest arrive by client state.

**Web search.**
- Brand-name queries are navigational and we cannot outrank the brand: `merrachi` 3,132
  impressions at position 6.9, 3 clicks; `jawda modest` 431 at 6.2; `emlavish` 372 at 6.0.
  A CTR near 0.1% there is expected, not a defect.
- Titles and descriptions on designer pages and lanes are already specific and data-driven
  (e.g. "MERRACHI - 1,028 pieces & prices"). Nothing malformed found on the seven pages checked.
- Best performer: `/editorial/best-abaya-brands-price-tiers`, position 6.7, 4.3% CTR, 17 clicks.
- Weak on non-brand head terms: `/` position 35.7 (983 impressions), `/modest-sets` 41.0
  (452), `/modest-dresses` 39.9 (208), `/modest-skirts` 34.3 (279).

## Verification
Search Console API via gcloud ADC (see memory `google-search-console-access`), plus `curl` of
seven live pages parsed in python for title / description / H1 / `<img alt>` / JSON-LD types.
Commands were read-only.

## Notes / follow-ups (not done, need Tina's call)
1. Image sitemap entries and rendering more than 24 products per page would raise image
   impressions, but identical brand photos favour the brand's own site, so clicks would likely
   stay near zero. Not worth doing yet.
2. The lever with evidence behind it is more original editorial in the shape of the abaya
   price-tiers post (e.g. hijabs: `/editorial/where-to-buy-hijabs-online` sits at 23.3). That is
   Tina's voice, so per section 10.18 it is proposed, not written.
3. Original edit/editorial photography is the only imagery brand sites cannot outrank us on.
