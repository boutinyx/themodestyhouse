# Header over-hero text: pure white instead of parchment-tinted
**Date:** 2026-08-22 · **Status:** done

## Goal
Tina: "i want the shit in the header the words & stuff in pure white." The
transparent (over-hero) header state used `rgba(251,250,246,...)` for its text,
icon and divider colors — parchment, not literal white.

## What changed
`app/globals.css` — `.site-header[data-over-hero="true"]` block: `--header-fg`,
`--header-muted` and `--header-rule` switched from `rgba(251,250,246,...)` to
`rgba(255,255,255,...)` at the same opacities (0.95 / 0.8 / 0.28). Everything in
the header reads these custom properties (nav links, search field, currency
switcher, favourites count) rather than hardcoding a color, so nothing else
needed to change. The logo/crest was already pure white via `filter:
brightness(0) invert(1)`.

Left alone: `.glass-search` (lines ~869-879 of the same file), a still-parchment-
tinted placeholder/border style — it belongs to `components/HeroSearch.tsx`,
which is unused (not imported anywhere), same as `HeroBrandStrip.tsx`.

## Verification
Playwright: computed `color` on `.site-header .nav-link` over the hero is now
`rgba(255, 255, 255, 0.8)` (was parchment-based). Screenshotted the header —
wordmark, nav, search icon, heart and currency control all read pure white.
