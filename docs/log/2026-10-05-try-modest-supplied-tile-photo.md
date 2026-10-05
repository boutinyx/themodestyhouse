# Try Modest: founder-supplied photograph on the /designers tile
**Date:** 2026-10-05 · **Status:** done on staging, awaiting Tina's approval for main

## Goal
Farheen (Try Modest) sent a photograph for the directory listing. Tina: "add this for her
the picture to the designers page".

## What changed
- `public/designers/try-modest-1.jpg` — her image (941x1672), plus `-400.webp` / `-800.webp`.
- `lib/houses.ts` — new `HOUSE_PHOTO` map (slug -> local path). Outranks the scored pick and
  `HERO_OVERRIDE`, which only choose among product shots. `houses()` has one caller, the
  /designers index, so that tile is the only place it shows.
- `lib/staticImage.ts` — `designers` dir, `DESIGNER_WIDTHS`, `designerVariant` / `designerSrcSet`.
- `scripts/optimise-images.mjs` — `designers` job, widths [400, 800].
- `app/designers/page.tsx` — tile uses the local variants when the image is one, Shopify resize otherwise.
- `lib/schema.ts` — `brandListSchema` makes a site-relative `logo` absolute.
- `lib/staticImage.test.ts` — mapping tests + on-disk variant contract for `public/designers/`.

## Verification
See the commit's follow-up section below.

## Notes / follow-ups
- A second supplied photo for the same house must be a NEW filename (`try-modest-2.jpg`), §6.
- `/designers/try-modest` (the house's own page) shows no tile photograph, so nothing changed there.
