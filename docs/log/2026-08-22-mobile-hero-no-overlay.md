# Mobile hero: no darkening overlay
**Date:** 2026-08-22 · **Status:** done

## Goal
Right after wiring up the phone-specific hero photo
(`2026-08-22-mobile-hero-picture-swap.md`), Tina: "no darker overlay." The
radial-gradient darkening scrim sitting over the hero was tuned entirely
against the desktop `hero-home-10.jpg` photo across many iterations earlier
this session — it was never meant for the new mobile-only shot, and she
doesn't want it there.

## What changed
`app/page.tsx` — the overlay `<div>` (the radial-gradient scrim right after
the hero `<picture>`) gained `hidden md:block`, so it's absent below the
768px breakpoint (where the mobile photo shows) and unchanged at ≥768px
(desktop, where it was tuned).

## Verification
Screenshotted with Playwright at 390×844 (no overlay, brighter/more saturated
satin colors, text still readable) and 1512×944 (overlay unchanged).
