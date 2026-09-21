# Image entries in sitemap.xml for designer pages
**Date:** 2026-09-21 · **Status:** done on staging, NOT merged to main (awaiting Tina)

## Goal
Tina wants our product photographs to show up in Google Images. Only 27 of 91 designer pages had
any image impressions in 3 months (3,411 impressions, 1 click) although 90 of 91 appear in web search.
See `2026-09-21-google-shopping-and-image-search-review.md`.

## What changed
- `lib/sitemapImages.ts` (+ test): first 48 unique https product images, catalogue order.
- `app/sitemap.ts`: each `/designers/<slug>` entry gets `images`. 48 matches `embedCards: 48` on the page;
  the HTML renders 24, the rest sit behind "Load more".

## Verification
Staging `sitemap.xml` (themodestyhouse-staging-production.up.railway.app), 8192bbf deployed:
160 URLs, 91/91 designer entries carry images, max 48 per page, 3,814 images total, 605 KB,
`xmlns:image` declared, no non-designer entry has images. `tsc` clean, eslint clean, new tests pass.
Full suite: 1310 pass, 1 fail — `lib/colourLeads.test.ts` (lameera-moda id not in catalogue), which reads
data files this change does not touch; not investigated further.

## Notes / follow-ups
- This tells Google the images exist. It cannot make Google prefer our copy over the brand's identical photo,
  so expect more image impressions, not guaranteed clicks.
- Measure in ~4 weeks: Search Console, `searchType=image`, designer pages with impressions (baseline 27 of 91).
- Merge to main needs Tina's approval, then purge Cloudflare after the origin serves it (section 10.47).
