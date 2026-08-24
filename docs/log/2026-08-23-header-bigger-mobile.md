# Header bigger on mobile/tablet
**Date:** 2026-08-23 · **Status:** done

## Goal
Tina: "header is too small" — the mobile/tablet header (hamburger, crest,
favourites heart) looked small, especially now that the hero's own text has
gotten noticeably bigger over the last two days of work.

## What changed
Scoped to mobile/tablet (<1024px); desktop untouched throughout.
- `components/Header.tsx`:
  - Row padding: `py-3 lg:py-5` → `py-4 lg:py-5`.
  - Crest logo: `h-9 lg:h-12` → `h-11 lg:h-12`.
  - `favourites` const changed from a fixed JSX constant (heart size hardcoded
    17px) to a function taking a `size` param — a Phosphor icon's `size` prop
    sets literal SVG width/height attributes, which can't respond to a
    breakpoint on their own, so this was the way to give mobile a bigger icon
    without touching desktop. Called as `favourites(20)` on mobile,
    `favourites(17)` (unchanged) on desktop.
- `components/MobileNav.tsx` — hamburger `ListIcon`: `size={20}` → `size={24}`
  (this component only ever renders on mobile/tablet, no split needed).
- `app/globals.css` — `--header-height` CSS fallback (used for the instant
  before Header's own ResizeObserver measures the real height): `54px` →
  `62px`, matching the actual size increase. The ResizeObserver itself needed
  no changes — it re-measures automatically.

## Verification
Playwright screenshots at 390×300 (phone), 820×300 (tablet), 1512×300
(desktop) — mobile/tablet header is visibly bigger (logo, hamburger, heart
icon, row padding); desktop is pixel-identical to before.
