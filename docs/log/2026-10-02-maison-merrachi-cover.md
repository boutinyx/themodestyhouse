# Maison Merrachi post: new cover image
**Date:** 2026-10-02 · **Status:** done

## Goal
Tina wanted the cover of "What Is Maison Merrachi?" replaced with one of two Higgsfield images
(`hf_20260922_112205…png`, cream dress in a doorway with a curtain; `hf_20260922_114910…png`,
burgundy top and cream trousers in a limestone doorway) and asked me to choose.

## What changed
- Chose the burgundy/cream doorway image: "Maison" = house, she stands in its doorway; it matches
  Merrachi's minimal burgundy-and-cream look; front-facing and centred, so it survives the wide
  banner crop (the other is in profile with a curtain over a third of the frame).
- Converted to JPEG q92 (2.1 MB PNG -> 471 KB, 1696x960), uploaded to Ghost under a NEW filename
  (`content/images/2026/10/maison-merrachi-cover-doorway.jpg`, §10.21) and set as `feature_image`
  via the Admin API. Old cover (`…/2026/09/maison-merrachi-cover-illustrated-2.jpg`) left in Ghost.
- No repo code changed; Ghost is shared by staging and production, so this is live on both.

## Verification
- Admin API response: `new cover: …/2026/10/maison-merrachi-cover-doorway.jpg`.
- Production, canonical `/editorial/what-is-maison-merrachi` and `/editorial`, plus a cache-busted
  copy: all `cf-cache-status: MISS`, new filename present, old filename absent.
- Playwright screenshots of the live article at 1440x900 and 390x844: banner shows the new image,
  subject fully in frame at both widths.
