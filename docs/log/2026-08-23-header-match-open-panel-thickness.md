# Closed mobile header matches the open nav panel's own thickness
**Date:** 2026-08-23 · **Status:** done

## Goal
Right after the first "header is too small" bump, Tina: "as thick as the one
when you open the hamburger." The open nav panel (`MobileNav.tsx`) has its
own top bar — a fixed 88px height with a 48px (`h-12`) crest — that the
closed header (padding-derived, crest at `h-11`/44px) no longer matched.

## What changed
`components/Header.tsx`, mobile/tablet only:
- Row: `px-4 lg:px-10 py-4 lg:py-5` → `px-4 lg:px-10 h-[88px] lg:h-auto
  lg:py-5` — fixed 88px to match the open panel's own fixed height exactly,
  rather than another guessed padding value. `lg:h-auto` hands sizing back to
  `lg:py-5` at desktop, unchanged.
- Crest: `h-11 lg:h-12` → `h-12` (same size at every breakpoint now — desktop
  was already `h-12`, so this just brings mobile up to match both the open
  panel AND desktop).

`app/globals.css` — `--header-height` fallback: `62px` → `88px`, matching.

## Verification
Playwright: closed header's measured height is 89px (88 + the 1px
`border-bottom`) at 390px width. Opened the hamburger via the actual
`Dialog.Trigger` button and screenshotted both states — crest size and bar
thickness now visually match between closed and open. Desktop screenshot at
1512×300 is unchanged.
