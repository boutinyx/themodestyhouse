# Mobile Outerwear accordion: sub-rows landed off-screen

**Date:** 2026-08-13 · **Status:** done

## Goal

Tina, after the earlier Outerwear-accordion fix: "i want to click outerwear and that
works but the subcatogories not like versts blazers etc." First reported more generally
as "the buttons dont work" — narrowed down via a clarifying question to the mobile nav,
then to this specific detail.

## Root cause

Outerwear is 9th of 10 rows in the phone menu's Category list. Opening its disclosure
inserts four more rows directly below it, in place — but by the time "Outerwear" itself
is on screen, the scrollport is already near its end. Measured on production: after
opening, "Blazers" got a 1.5px sliver inside the 844px-tall viewport; Vests, Cardigans
and Coats were **entirely below the fold**, with no on-screen indication anything more
existed to scroll to.

## Why the first verification of this feature didn't catch it

The original ship (earlier today) was verified with Playwright's `.tap()`, including
against production, in both engines, with zero errors. That passed because Playwright's
`.tap()` auto-scrolls its OWN target element into view before tapping it as part of
actionability checking — invisible, silent, and nothing like what a real finger does.
Caught this time by bypassing that: reading `getBoundingClientRect()` and
`document.elementFromPoint()` directly against the coordinates a real tap would land on,
without any scroll assist. `elementFromPoint` returned `null` for "Vests" — a real signal
the point was outside the viewport, not just an intercepted element.

## Fix

`components/MobileNav.tsx` — a `ref` on the Outerwear row's wrapper, and a `useEffect`
that calls `scrollIntoView({ behavior: 'smooth', block: 'start' })` on it the moment
`outerwearOpen` becomes `true`. That scrolls the row to the TOP of the panel's own
scrollport (not the whole page — `scrollIntoView` finds the nearest scrollable ancestor,
which is the `<nav overflow-y-auto>`), leaving comfortable room below for all four
sub-rows without requiring the user to notice a fade cue and scroll manually.

## Verification

- `npx tsc --noEmit` — clean.
- `npm run lint` — clean (pre-existing unrelated warning only).
- `npx vitest run lib/devOnly.test.ts lib/aboutStats.test.ts --exclude ".claude/**"` — 41/41.
- `npm run build` — clean.
- `scripts/interaction-audit.mjs` (Chromium) — zero `PROBLEM`.
- Manual, via Playwright against a local production build, BOTH engines — this time
  checking real geometry after the tap+settle, not relying on tap-triggered auto-scroll:
  - Chromium: all four sub-links' `getBoundingClientRect()` fully inside the 844px
    viewport (`top`/`bottom` both within `[0, 844]`); a genuine `elementFromPoint()` hit
    test at each link's on-screen centre returned the correct `href` for Vests, Cardigans
    and Coats.
  - WebKit (with the standard local-HSTS header strip so the page actually renders CSS —
    CLAUDE.md §10.24): identical result, all four fully visible.
- Confirmed the ORIGINAL bug was real (not a testing artifact) by reproducing it live
  against production, pre-fix, with the same direct-geometry method: "Blazers" 143px
  sliver, the other three fully below `window.innerHeight`.

## Notes / follow-ups

Worth remembering generally: Playwright's default `.tap()`/`.click()` actionability
includes an automatic scroll-into-view of the element being acted on. That makes it a
poor tool for verifying whether content is actually REACHABLE without help — a
`getBoundingClientRect()`/`elementFromPoint()` check against real on-screen coordinates
is the more honest test for anything added below an accordion, a "load more", or any
other content whose position isn't fixed at page-load.
