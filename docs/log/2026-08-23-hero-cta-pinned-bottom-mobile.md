# Mobile/tablet hero: text stays centered mid-screen, button pinned to the bottom
**Date:** 2026-08-23 · **Status:** done

## Goal
Tina: "Every modest brand. One place. Discover pieces from 100+ independent
modest brands, curated in one place. needs to be centered in the middle and
shop needs to be on the bottom like aabs" — pointing back at the same aab
mobile-hero reference from yesterday, where the text block sits roughly
mid-screen and "SHOP NOW" is a separate element anchored near the true bottom
of the screen, not just below the text with a margin.

## What changed
`app/page.tsx`, mobile/tablet only (desktop untouched, same `lg:` split as the
rest of this feature):
- The "Shop the Archive" link that used to sit inside the centered
  headline+subhead flex column is now `hidden lg:inline-block` — desktop-only,
  unchanged position/spacing there.
- A second copy of the same link was added as its own element, absolutely
  positioned (`absolute inset-x-0 bottom-16 flex justify-center`) with
  `lg:hidden`, independent of the centered text group above it.

The headline+subhead group itself didn't need to change — it was already
`items-center justify-center text-center` from yesterday's work; pulling the
button out of that flex column is what let the remaining text block recentre
around the true middle instead of being pushed off-centre by the button's own
height.

## Verification
Playwright screenshots at 390×844 (phone) and 820×1180 (tablet) — headline +
subhead sit in the middle of the screen, "Shop the Archive" sits independently
near the bottom edge. 1512×944 (desktop) is pixel-identical to before.
