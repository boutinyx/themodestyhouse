# Hero top-crop, re-landed without the 21:9 framing
**Date:** 2026-08-21 · **Status:** done

## Goal
Tina: "i want you to cut the top off the picture" — same ask as earlier
today, minus any mention of a target aspect ratio this time.

## Context
This is the third pass on the same underlying change today:
1. "cut the top off to make it 21:9" → built `hero-home-8.jpg` (top 732px
   trimmed off `hero-home-6.jpg`), wired in with plain `object-cover`.
2. "revert i never midn the 21:9 ... i just wanted it to be like this" →
   reverted to `hero-home-6.jpg` + the `objectPosition`/`transform: scale`
   CSS hack.
3. This message → the crop itself wasn't the problem, only its "for 21:9"
   framing was. Re-landed the exact same change from step 1.

## What changed
- `app/page.tsx` — hero `<img>` back to `hero-home-8-*.webp`, plain
  `object-cover`, no `objectPosition`/`transform` overrides (the crop is
  baked into the file, so the old zoom hack would over-zoom on top of it).
- `scripts/optimise-images.mjs` — updated `hero-home-8.jpg`'s job comment
  to reflect the full landed → reverted → re-landed sequence.

## Verification
- `npx tsc --noEmit` — clean.
- `npx eslint app/page.tsx scripts/optimise-images.mjs` — clean.
- `npx vitest run --exclude ".claude/**"` — 722/722 passing, 44/44 files.
- Screenshotted at 1999×900 and 390×844 (mobile) — matches the earlier
  verified result exactly (same file, same styling).
