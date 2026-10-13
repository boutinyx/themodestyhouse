# Organization names + profiles, homepage category ItemList, image sitemap for lanes and edits
**Date:** 2026-10-13 · **Status:** done on branch `seo/structured-data` (not on staging or main)

## Goal
Measured: the homepage averages position 5.1 for "modest house" and 8.7 for "house of modesty", and
Google Images already sends impressions to /edits/everyday-lace (577), /cardigans-sweaters (454) and
/modest-activewear (365) with no image-sitemap entry for any of them.

## What changed
- `lib/schema.ts` — `SITE_ALTERNATE_NAMES = ['Modesty House', 'TMH']` on both Organization and
  WebSite. "House of Modesty" deliberately NOT added: it is a different Rotterdam shop
  (`docs/log/2026-09-03-brand-name-entity-confusion.md`).
- `sameAs` gained two profiles, each verified against the live page on 2026-10-13:
  - `https://www.pinterest.com/themodestyhousehq/` — full_name "The Modesty House",
    `website_url: http://themodestyhouse.com`, `domain_verified: true`.
  - `https://www.tiktok.com/@themodestyhouse.hq` — nickname "The Modesty House", bio
    "100+ modest brands in one place \nthemodestyhouse.com", 801 followers.
    (`@themodestyhousehq` on TikTok is not ours.)
- `categoryListSchema()` + `app/page.tsx` — an ItemList of `CATEGORY_LANES` (13), absolute URLs,
  bare ListItems. No FAQPage: the homepage renders no FAQ.
- `lib/sitemapImages.ts` + `app/sitemap-images.xml/route.ts` — adds every lane (first 20 product
  images, grid order) and every live edit (desktop + phone hero, uncredited story images, first 20
  picks). Credited story photographs (Instagram creators) are left out on purpose.

## Verification
`tsc` 0, eslint 0 on touched files, vitest 1350 passed / 3 failed — the three known data-driven
failures (colourLeads, edits, exclude), none of which imports a touched module.
`GHOST_OFFLINE=1 npm run build` then `next start -p 3491`, BUILD_ID matched what was served; parsed
in python:
```
Organization alternateName ['Modesty House', 'TMH'] sameAs [instagram, pinterest, tiktok]
WebSite alternateName ['Modesty House', 'TMH']
ItemList https://themodestyhouse.com/#categories numberOfItems 13
FAQPage present: False
sitemap-images.xml: urls 110 {'lane': 14, 'edit': 3, 'designer': 93} max images/url 48 non-https 0
cardigans-sweaters: sitemap images whose file appears in the page HTML: 20 / 20
everyday-lace: 23 / 24  (the 24th is the phone hero's original .jpg; the page ships its WebP variants)
```

## Notes / follow-ups
- The footer still shows only Instagram (Pinterest/TikTok icons were removed when no handle
  existed). Re-adding them is Tina's call.
- Resubmit `sitemap-images.xml` in Search Console after this reaches production.
