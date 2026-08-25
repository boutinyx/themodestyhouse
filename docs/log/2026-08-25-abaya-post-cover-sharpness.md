# The abaya post's cover — new photograph, and the blur fixed
**Date:** 2026-08-25 · **Status:** done (staging)

## Goal

Tina: *"the best abaya brands picture is so blurry but i rememeber it being like
pretty strong ... use this one instead and upload with the highest quality"*.

## The blur was NOT the photograph

Worth stating first because it changes what the fix has to be. The old cover's
source was **3344x1880** — enormous. Measured on the live page:

```
desktop @2x  renders 656 CSS px wide  ->  needs 1312 physical px
phone   @3x  renders 326 CSS px wide  ->  needs  978 physical px
largest variant that existed: 900px
```

So the browser was **upscaling 1.46x on a desktop retina display**. That is what
"blurry" looks like, and no change of photograph would have fixed it —
`EDITORIAL_WIDTHS` was `[400, 900]` and 900 was the ceiling for every editorial
image on the site.

Her memory of it being "pretty strong" is consistent with that: the original file
is sharp; only what got served was not.

## What changed

**1. The ceiling.** `EDITORIAL_WIDTHS` `[400, 900]` → **`[400, 900, 1440]`**, in
`lib/staticImage.ts` and in the matching `editorial` job in
`scripts/optimise-images.mjs`. Job quality also 80 → **88**: 80 is right for a
400px thumbnail and mean for a full-width cover.

Safe for every original — the smallest editorial photograph is 1696px wide and
the script never upscales, so a width above a source would silently write no file
and leave a 404 inside the srcset. `lib/staticImage.test.ts` is what would catch
that; it asserts on disk that every original has every width.

1440 variants were generated for all five editorial photographs, not just the new
one, so the whole section benefits.

**2. The new photograph.** `public/editorial/mirror-selfie-abayas-4.jpg` +
400/900/1440 webp variants. NEW filename per §6/§10.21 — `public/` is served with
a 4h cache and is not fingerprinted, so new bytes at an old path are invisible to
anyone who already has the page.

Built **one lossy step** from her original
`~/Downloads/5636def3-94cf-4e85-9a19-076562ff133e.png`: the `.jpg` at mozjpeg
q95, and each `.webp` straight from the PNG at q95 rather than via the jpg. She
asked for the highest quality, and routing through the jpg would be a second
lossy generation for nothing — the same reasoning as the Fall Essentials hero.

**Same regeneration caveat as that hero:** re-running `optimise-images.mjs`
rebuilds these variants from the `.jpg` at q88, not from the PNG at q95. It
skipped them this time because they were newer than the `.jpg`. Rebuild from the
PNG if it ever matters.

**3. Frontmatter** in `content/editorial/best-abaya-brands-price-tiers.md` — the
`image` path and the `imageAlt`, which now describes the actual picture: three
women rather than four, gold lace trim, iced matcha rather than green juice.

**Worth knowing: her new file is 1672x941 — HALF the old source's resolution.**
It is still comfortably above the 1312 the largest render needs, so it is sharp
where it counts, but there is no headroom above 1440. If the cover ever gets a
wider slot, this source cannot feed it.

## Verification

`npx tsc --noEmit` → 0 · `npm run lint` → 0 · build clean · `staticImage` 36/36.

The point of the change is that the served variant stops being upscaled, so that
is what was asserted:

```
                before                              after
desktop@2x      mirror-selfie-abayas-3-900.webp     mirror-selfie-abayas-4-1440.webp
phone@3x        mirror-selfie-abayas-3-900.webp     mirror-selfie-abayas-4-1440.webp
needed          1312 / 978 physical px              unchanged
```

## A test that broke for a correct change

`lib/staticImage.test.ts`'s "emits one candidate per width" hard-coded
`'...-400.webp 400w, ...-900.webp 900w'`, so adding 1440 turned it red for a
change that was deliberate and right.

Rewritten to **derive** the expected string from `EDITORIAL_WIDTHS`, plus a
length assertion so the derived comparison cannot pass by comparing two
identically-wrong strings. The property worth testing is "one candidate per
width, in order, each pointing at its own variant" — true whatever the list
holds.

## Note

The other four editorial photographs kept their existing 400/900 variants at
q80 and gained a 1440 at q88. Mixed, but harmless: the 1440 is the one that
decides sharpness on a retina display. Re-running the script with the originals
would even them up if it ever matters.
