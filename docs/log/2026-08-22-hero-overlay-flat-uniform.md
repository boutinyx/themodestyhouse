# Hero overlay: flat and uniform across the whole photo, both breakpoints
**Date:** 2026-08-22 · **Status:** done

## Goal
Tina: "now the dark overlay should be for the entirety of the hero. not too
dark tho." Follows directly from "no darker overlay" (mobile-only removal,
previous log entry) — she now wants an overlay again, but a fundamentally
different shape: even across the whole image rather than the radial
"spotlight" (near-black at the edges, barely-touched over the models), and
applied everywhere, not just desktop.

## What changed
`app/page.tsx` — replaced the `radial-gradient(...)` spotlight overlay (which
had `hidden md:block`, off on mobile per the immediately preceding request)
with a single flat `rgba(0,0,0,0.25)` tint covering the full hero, no
breakpoint split.

## Verification
Screenshotted with Playwright at 390×844 and 1512×944 — both show a uniform,
moderate darkening across the entire photo (satin colors and chandelier
detail both still clearly visible, not "too dark").
