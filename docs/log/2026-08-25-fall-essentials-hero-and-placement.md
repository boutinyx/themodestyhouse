# Fall Essentials: real hero photograph, and its banner moved below "By category"
**Date:** 2026-08-25 · **Status:** done

## Goal
Tina supplied two files —
`~/Downloads/magnific_uitbreiden_DomU6wcpcl.png` and
`~/Downloads/magnific_upscaler_bxlcMFP5Y2.png` — with *"the image"*, then
*"and i want it on homepage under by catogory"*.

They are one shot in two crops: 2674x1504 (1.77793) and 3584x4800 (0.74667) —
i.e. a desktop/phone hero pair, which is exactly the shape `Edit` wants. And
`lib/edits.ts`'s **Fall Essentials** entry was sitting on an explicit placeholder
hero (the lace hero, reused, with `imageAlt: 'Placeholder — awaiting the Fall
Essentials hero photograph'`) whose own comment listed the replacement steps.
Burgundy is also the first of that edit's six named colours. Installed there.

## What changed

**The hero.** Followed the placeholder's own instructions rather than improvising:
- `public/edit-fall-hero.jpg` and `public/edit-fall-hero-mobile.jpg` — NEW
  filenames, never used before, per §6/§10.21 (public/ is served with a 4h cache
  and is not fingerprinted). Converted from her PNGs at quality 92; no resize, so
  both are pixel-identical in dimensions to what she sent.
- `scripts/optimise-images.mjs` — two new jobs, quality 95 like every other hero.
  **Desktop widths stop at 2674**, the source's own width: the script never
  upscales, so copying the lace hero's 3200/3840 entries would have written
  nothing and left two 404s in the srcset. Phone stops at 1920.
- `lib/edits.ts` — the five image fields now point at the pair, with ratios
  MEASURED (`2674 / 1504`, `3584 / 4800`), not rounded, and `imageWidths` /
  `imageMobileWidths` listing only what the optimiser actually wrote. Real
  `imageAlt` describing the photograph replaces the placeholder string.
  The phone crop is 0.74667, effectively identical to the lace phone hero's
  0.7468, so `EditBanner`'s `--edit-hero-ratio` handling needed no change.

**The placement.** `app/page.tsx` — the homepage rendered all three edit banners
together in one `EDITS.map`. Fall Essentials is now excluded from that group and
rendered on its own immediately after the "By category" section. The slug lives
in a module-scope `EDIT_BELOW_CATEGORIES` const in `app/page.tsx`, NOT as a new
flag on the `Edit` type: where a homepage banner sits is a fact about this page's
layout, and `lib/edits.ts` is also read by `/edits/[slug]` and the sitemap, which
have no opinion about it.

## Verification
- `node scripts/optimise-images.mjs` wrote 11 variants: desktop 640/1024/1440/
  1920/2400/2674, phone 390/780/1170/1560/1920. Each was then fetched from a
  `next start` build — all `200`, including the two edge widths and the .jpg
  original.
- `npx tsc --noEmit` exit 0 · `npm run lint` clean · `npm test` 47 files,
  773 tests passed · `npm run build` compiled.
- Homepage section order read off the rendered DOM by scroll position:
  `Popular items (1103) → Jersey Hijabs banner (2115) → Everyday Lace banner
  (2943) → Our picks on abayas (3479) → By category (4250) → Fall Essentials
  banner (6014) → Independent labels (6553)`. Exactly as asked.
- Banner screenshotted at 1440 and 390 with the stylesheet assertion (body
  background `rgb(250,247,241)`, not transparent). Desktop serves
  `edit-fall-hero-2674.webp` into a 1440x810 box; phone serves
  `edit-fall-hero-mobile-780.webp` into 390x522. Title and "See our picks" are
  legible against the photograph at both widths.

## Notes / follow-ups
- The desktop source is 2674px wide. That is native for a 1440 CSS viewport at
  1.85x and fine for every common display, but it cannot feed a 3840 variant the
  way the lace hero can. If a sharper 4K crop is ever wanted, it needs a bigger
  original, not a bigger width in the widths array.
- The two source PNGs are still in `~/Downloads` — untouched, not moved.

## Third follow-up — the desktop hero brightened

Tina: *"can you make the desktop picture lighter."*

**Measured before touching anything, and the obvious lever was the wrong one.**
The instinct is `heroWash` (the overlay), but the numbers say it barely matters
here: the photograph's own mean luminance is **18.7/255**, and the left-weighted
gradient at 0.26 averages ~0.133 alpha across the frame, so the composited banner
sits at 17.0. Taking the wash to **zero** would only reach 18.6 — a change nobody
could see. The darkness is in the pixels, so the fix had to be too.

Four candidate curves, all measured on the real file:

| transform | mean luminance | pixels ≥250 |
|---|---|---|
| original | 18.7 | 0.000% |
| `modulate({brightness: 1.4})` | 25.3 | 0.249% |
| **`linear(1.2, 12)`** | **34.0** | **0.010%** |
| `linear(1.3, 18)` | 41.9 | 0.167% |

`linear` beats `modulate` because a pure multiply scales the model's already-lit
face by the same factor as the shadows, while the offset lifts the dark painted
backdrop where the tonal range actually is. Compared 1.2/12 against 1.3/18 side
by side as images: the stronger one reaches further but starts to read hazy in
the shadows, so 1.2/12 it is. Nearly double the brightness, no meaningful
highlight clipping.

- `public/edit-fall-hero-2.jpg` — new filename, not an edit in place (§10.21).
  Registered in `scripts/optimise-images.mjs`; six variants written, all fetched
  and 200 from a `next start` build.
- `lib/edits.ts` → `image: '/edit-fall-hero-2.jpg'`. `heroWash` untouched at the
  0.26 default — with a lighter photograph the white type needs it more, not
  less.
- **Desktop only, as asked.** `imageMobile` is still the original grade. If the
  two should match, the phone crop needs the same treatment and its own new
  filename; say the word.
- `edit-fall-hero.jpg` and its six variants stay on disk, unreferenced —
  the same convention `hero-home-2.jpg` already documents in that script
  (cheap, reversible, and anyone holding the old URL from the last four hours
  still gets a file).

Re-verified: tsc clean, lint clean, 773 tests, build clean, banner screenshotted
at 1440 with the stylesheet assertion.
