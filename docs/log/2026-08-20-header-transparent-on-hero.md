# Transparent header over the homepage hero, solid on scroll
**Date:** 2026-08-20 · **Status:** done

## Goal
Tina: "i want it like this https://aabcollection.com/ one the hero its
transpartent but when you sroll its blok." Header transparent over the hero
photo at the top of the homepage, becoming a solid block as soon as you
scroll.

## Research (before implementing)
Checked the reference live rather than assuming, via Playwright against
`aabcollection.com`:
- At `scrollY 0`, its `<sticky-header>` element carries class `header white`
  — no background, white text — sitting directly over its hero photo.
- The instant you scroll at all, it picks up `header--stick` (pinned) and
  `header--dark` (solid background, dark text).
- Confirmed by reading the element's live `className` through a scripted
  scroll sequence, not by eyeballing screenshots — a single screenshot at a
  mid-scroll position doesn't distinguish "solid" from "still transparent
  over a light section," which is genuinely ambiguous by eye on this
  particular theme.

## What changed
- `components/Header.tsx`
  - Added `const isHome = pathname === '/'` (`usePathname`) and a `scrolled`
    boolean, set by a scroll listener attached ONLY when `isHome`.
    `transparent = isHome && !scrolled`.
  - `<header>` is `fixed` (not `sticky`) when `isHome`, so it comes out of
    document flow and the hero can sit directly under it starting at
    `scrollY 0` — every other route keeps `sticky`, unchanged, still
    reserving its own space.
  - Background: `transparent` vs `var(--bone)`; hairline borders swap to
    `transparent` in the same state; a shadow appears once solid (`isHome &&
    !transparent`) so the pinned bar reads as separate from whatever
    scrolls under it.
  - The crest `<img>` gets `filter: brightness(0) invert(1)` while
    transparent (it's a raster image, not text, so it can't inherit a CSS
    colour override the way the nav links do).
  - Threshold is `scrollY > 24`, not `> 0` — guards against a brief
    solid→transparent→solid flicker from rubber-band overscroll on trackpads
    and iOS at the very top.
- `app/globals.css` — added `.header--transparent .nav-link` /
  `[data-active="true"]` / `:hover` rules (higher specificity than the two
  existing `.nav-link` colour rules, so no `!important`) forcing every
  `.nav-link` control — Products/Designers/Editorial/About, the currency
  trigger, the favourites heart, the mobile hamburger — to `var(--parchment)`
  while the class is present. None of those controls set their own colour
  today, so one rule covers all of them instead of hand-colouring each.

## Why this only touches `/`
Every other route has no hero photo at its top — a transparent header there
would be white text directly on the page's own light background, unreadable.
`isHome` gates the whole thing off; every other route's header is byte-for-
byte the same solid, sticky bar it already was.

## Verification
- `npx tsc --noEmit` — clean.
- `npx eslint components/Header.tsx app/globals.css` — clean (the CSS file
  itself just isn't a target ESLint lints, expected).
- Playwright against the running local dev server:
  - `/` at `scrollY 0`: transparent header, white crest and nav, directly
    over the hero photo. Screenshotted.
  - `/` at `scrollY 300`: solid `--bone` bar, dark crest and nav, shadow
    underneath, pinned at the top. Screenshotted.
  - `/` back to `scrollY 0`: reverts to transparent. Screenshotted.
  - `/directory`: unchanged — solid, sticky, no flicker, no transparent
    state. Screenshotted as the regression check.

## Notes / follow-ups
- Not yet run through `npm run audit:interaction` / `audit:visual` for
  cross-browser/touch confirmation of the scroll transition specifically —
  worth doing before this ships past local, per the standing note on the
  last two header log entries.
- The pre-existing, unrelated Base UI console warning noted in the earlier
  header log entries is still present.
