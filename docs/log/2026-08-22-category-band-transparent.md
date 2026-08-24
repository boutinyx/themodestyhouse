# Category band: translucent instead of solid fill
**Date:** 2026-08-22 · **Status:** reverted — see 2026-08-22-revert-hero-zoom-and-category-band.md

## Goal
Tina: "can we make it more transparent" — the band overlaying the hero's bottom
edge was a solid `--blackberry` fill, fully hiding the photo behind it.

## What changed
`components/CategoryQuickLinks.tsx` — background changed from `var(--blackberry)`
(solid) to `rgba(23,10,22,0.55)` (same colour, ~55% opacity), plus
`backdropFilter: blur(6px)` (with the `-webkit-` prefix) so the white text/icons
stay legible over whatever part of the photo shows through — same glass-panel
technique already used in `components/HeroSearch.tsx`.

## Verification
Screenshotted the live homepage with Playwright at 1512×944 — the photo (satin
fabric, floor) is visible through the band, text/icons still read clearly.
