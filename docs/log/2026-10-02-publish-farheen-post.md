# Published "Meet Farheen, the Founder Behind Try Modest"
**Date:** 2026-10-02 · **Status:** done

## Goal
Tina: "post frahens blog post" — publish the Try Modest founder interview, a draft in Ghost since 2026-10-01.

## What changed (Ghost only, no repo code)
- `meet-farheen-try-modest-founder`: `draft` -> `published` (2026-10-02T15:28:46Z), via the Admin API.
  Body, title, excerpt and illustrated cover unchanged from the draft. No tag, so the site labels it
  "Story" (`lib/ghost.ts` default), which fits an interview.
- Added `feature_image_alt` to it (plain description of the illustration).
- Fixed `what-is-maison-merrachi`'s `feature_image_alt`, which still described the old illustrated
  cover after this morning's swap (docs/log/2026-10-02-maison-merrachi-cover.md).

## Verification
- `/designers/try-modest` (both in-body links) returns 200.
- Production `/editorial/meet-farheen-try-modest-founder` 200, `cf-cache-status: MISS`; the post is
  listed on `/editorial` and in `sitemap.xml`.
- Playwright on the live article at 390x844: cover, "STORY" label, title, excerpt, byline and date
  "2 October 2026" render; full-page capture shows the whole body ending in the Try Modest link.

## Follow-up: product links (same day)
Tina: "all the links in her blog should point to her stuff". The two named pieces were unlinked; now:
- "Afraa Co-Ord Set" -> `trymodest.com/products/afraa-everyday-elegance-abaya-pant-co-ord`
- "Lila abaya sets" -> `trymodest.com/products/lila-scalloped-floral-abaya-set`
both with the site's outbound UTM (`utm_content=editorial`) and `rel="noopener noreferrer sponsored"`.
Ghost's html->lexical conversion dropped `target="_blank"`; `rel` survived. The two existing links
(first "Try Modest", closing line) already go to `/designers/try-modest` and were left.
Live check: the rendered page carries all four links, and the site's render path also appended the
Try Modest affiliate `sca_ref`. **Afraa is sold out** on trymodest.com (`/products/…​.js` →
`available: false`); Lila is available.
