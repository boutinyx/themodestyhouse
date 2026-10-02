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
