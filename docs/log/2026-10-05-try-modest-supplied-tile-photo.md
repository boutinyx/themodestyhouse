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
Commit `b555d1c` on `staging`. `npx tsc --noEmit` clean, eslint clean on the touched files.

Opened `https://themodestyhouse-staging-production.up.railway.app/designers` with Playwright and
looked at the Try Modest tile:

```
chromium-1440  currentSrc .../designers/try-modest-1-800.webp  box 213x285
webkit-390     currentSrc .../designers/try-modest-1-400.webp  box 151x202
control tile (first house) still https://cdn.shopify.com/...
ld+json logo: https://themodestyhouse.com/designers/try-modest-1.jpg
```

Both women sit fully inside the arch, heads clear of the curve, Verified seal below.

`npm test`: 1345 passed, 2 failed. Both failures are data tests that this change does not
touch (it changes no file under `data/`): `lib/colourLeads.test.ts` (1 id not seen) and
`lib/unavailableProducts.test.ts` (108 ids both unavailable and published). Not investigated here.

## Notes / follow-ups
- A second supplied photo for the same house must be a NEW filename (`try-modest-2.jpg`), §6.
- `/designers/try-modest` (the house's own page) shows no tile photograph, so nothing changed there.
