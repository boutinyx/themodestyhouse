# Hero: bake the 21:9 crop into the actual file, drop the CSS zoom hack
**Date:** 2026-08-21 · **Status:** done

## Goal
Tina: "i want you to cut the top of the image off to make it 21:9," pointing
at a screenshot of the site's own live homepage (localhost:3000) as the
target composition — she wants a real 21:9 image that looks like what was
already on screen, not another CSS-only approximation.

## What changed
- `public/hero-home-8.jpg` — `hero-home-6.jpg` (5461×3072, 16:9) cropped to
  an EXACT 21:9 by trimming 732px off the top only: `sharp().extract({top:
  732, left: 0, width: 5461, height: 2340})`. Verified 5461/2340 = 2.3338 ≈
  21/9. Rendered the crop and looked at it before committing — both models'
  full figures, faces, and the floor beneath them survive untouched; the
  732px removed is entirely ceiling/chandelier space above their heads.
- `scripts/optimise-images.mjs` — registered `hero-home-8.jpg` with the same
  quality (92) and widths (640/1024/1440/1920/2400) as `hero-home-6.jpg`'s
  own job, generated variants.
- `app/page.tsx` — hero `<img>` repointed at `hero-home-8-*.webp`. **Removed
  the `objectPosition`/`transform: scale(1.18)` hack entirely** — that CSS
  workaround existed only to fake "models moved up, zoomed in" on top of
  `hero-home-6.jpg`'s excess ceiling space; now that the ceiling is
  physically cropped out of the source file, the hack would just over-zoom
  on top of an already-tight image. Back to plain `object-cover`, no
  position/transform overrides.
- Inverse-spotlight overlay's centre/size (68%/40%, ellipse 60%/70%) was
  left unchanged — checked visually after the swap rather than assumed, and
  it still lands correctly on the models since their position within the
  new crop is close to where the old CSS hack had put them on screen.

## Verification
- `npx tsc --noEmit` — clean.
- `npx eslint app/page.tsx scripts/optimise-images.mjs` — clean.
- `npx vitest run --exclude ".claude/**"` — 722/722 passing, 44/44 files
  (excludes an unrelated, pre-existing failure in a different session's git
  worktree under `.claude/worktrees/`, not this repo's own test file).
- Screenshotted at 1999×900 and 390×844 (mobile): composition matches the
  reference screenshot closely — full figures, chandelier, floor, and
  spotlight overlay all read correctly at both widths, no cropped heads, no
  over-zoom.

## Notes / follow-ups
- `hero-home-6.jpg` and `hero-home-7.jpg` (the reverted native-21:9 photo)
  are both left on disk, registered, unreferenced — same "cheap to keep"
  call as every earlier hero file this week.
- The overlay's exact centre/size was inherited rather than re-measured
  from scratch on the new file — if it reads slightly off on review, it's
  the next thing to re-check against `hero-home-8.jpg`'s actual pixel
  coordinates rather than the old file's.
