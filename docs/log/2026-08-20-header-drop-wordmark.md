# Drop "The Modesty House" wordmark from the header masthead
**Date:** 2026-08-20 · **Status:** done

## Goal
Tina: "get rid of the sentence the modesty house" — the crest was carrying a
stacked wordmark span underneath it in the Two-Tier Classic masthead row
(`components/Header.tsx`); she wants the crest alone.

## What changed
`components/Header.tsx` — removed the `<span>The Modesty House</span>` under
the crest and the `flex-col` wrapper it needed. The `<Link>` is now just the
crest image, `flex items-center`. Sized the crest up (`h-9 lg:h-11` →
`h-11 lg:h-14`) since it's no longer sharing visual weight with text beside
it — at the old size, alone, it read small against the utility and nav rows
either side of it. `alt` text changed from "The Modesty House crest" to "The
Modesty House" (the crest is now the only thing standing in for the name, so
the alt text is what a screen reader announces as the site's name, not a
decorative aside).

## Verification
- `npx tsc --noEmit` — clean.
- `npx eslint components/Header.tsx` — clean.
- Screenshotted against the running local dev server at 1440×700 and
  390×700 (Playwright). Desktop: crest sits alone in the masthead row at a
  size that reads proportionate to the utility/nav rows. Mobile: same, next
  to the hamburger and favourites.

## Notes / follow-ups
- The pre-existing Base UI console warning noted in the prior header log
  entry is still present and still unrelated to this change.
