# Hero subhead: line break after the comma
**Date:** 2026-08-23 · **Status:** done

## Goal
Tina: "curated in one place. do this under the comma" — wants an explicit
break so "curated in one place." sits on its own line under "...independent
modest brands,".

## What changed
`app/page.tsx` — subhead `<p>` text split with a `<br/>` after the comma:
"Discover pieces from 100+ independent modest brands," / "curated in one
place." No breakpoint scoping — applies everywhere.

## Verification
Screenshotted at 1512×944 (desktop) — clean two-line break exactly as asked.
At 390×844 (phone) the first segment ("Discover pieces from 100+ independent
modest brands,") is still long enough to wrap on its own narrow width,
producing 3 lines instead of 2 — flagged to Tina rather than silently
leaving it; not addressed here since it wasn't part of the ask.
