# Swap "By category" mosaic photos for Abayas and Tops
**Date:** 2026-08-24 · **Status:** done

## Goal
Tina supplied two new AI-generated photos and asked for them on the
homepage's "By category" mosaic (`CATEGORY_SHOWCASE` in `app/page.tsx`):
"change the abaya card picture into this" (clarified via a follow-up
question — she meant the By Category tile, not the Popular Items showcase,
which also has abaya-tagged items), then "this one for tops but center the
pic and zoom bit in" → "zoom in more".

## What changed
- `public/category/abayas-2.png`, `public/category/tops-2.png` — new
  files, never overwriting `abayas.png`/`tops.png` in place (CLAUDE.md §6:
  a `public/` asset replaced at the same path is invisible to anyone who
  already loaded the page for up to 4 hours, since Railway serves
  `public/` uncached-but-long-lived and Next doesn't fingerprint these
  paths).
- `node scripts/optimise-images.mjs` — generated the `-400`/`-700`/`-1000`
  WebP variants the existing `category` job already knows how to produce
  for any new `.png` dropped in that directory.
- `app/page.tsx`'s `CATEGORY_SHOWCASE`:
  - `modest-abayas` → `image: '/category/abayas-2'` (kept the existing
    `zoom: 1.24`).
  - `modest-tops` → `image: '/category/tops-2'`, new `zoom: 1.35`, new
    `origin: '57% 38%'`.
- **New `origin` field** (type + render + CSS), not present before today.
  The existing `zoom` field scales via `transform: scale()`, which zooms
  from the box's own centre (`transform-origin: 50% 50%`) by default. The
  Tops photo's source and card aspect ratios are close enough that
  `object-fit: cover` barely crops anything — the actual problem was that
  the model sits left-of-centre in the FRAME itself (a courtyard with
  columns filling the right side), so a centre-anchored zoom would have
  pulled MORE empty architecture into view, not less. `origin` sets
  `--card-origin` (`app/globals.css`), consumed by
  `transform-origin: var(--card-origin, 50% 50%)` — defaults to the old
  centred behaviour for every other card, so Dresses/Sets/Skirts/Abayas/
  Activewear are unaffected.

## Verification
Playwright against `next dev`:
- Abayas card `<img src>` reads `/category/abayas-2-700.webp`.
- Tops card `<img src>` reads `/category/tops-2-700.webp`.
- Screenshot of the Tops card confirms the model is well-framed and
  legibly zoomed, "SHOP TOPS" centred over her.
- `npx tsc --noEmit` clean throughout both changes.

## Notes / follow-ups
`origin` is a genuinely new, reusable field on `CATEGORY_SHOWCASE` — worth
knowing it exists next time a curated photo has an off-centre subject,
rather than reaching for a source re-crop.
