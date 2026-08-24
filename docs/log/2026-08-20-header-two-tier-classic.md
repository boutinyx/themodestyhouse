# Replace the floating pill header with Two-Tier Classic
**Date:** 2026-08-20 · **Status:** done

## Goal
Tina picked "Two-Tier Classic · solid, above the photo" out of a set of mocked
header directions (an Artifact comparing ~24 header concepts + 8 hero
concepts) and asked to have it implemented on local host, replacing the
existing floating pill header.

## What changed
- `components/Header.tsx` — full rewrite. Was a single `fixed` rounded pill
  (crest + wordmark + nav + favourites + currency, all one row) that hid on
  scroll-down and reappeared on scroll-up via a `useEffect` scroll listener.
  Now three stacked rows in normal flow, `position: sticky` instead of
  `fixed`:
  1. Utility row (currency + favourites) — desktop only.
  2. Masthead row (crest + serif wordmark, centred) — always visible; under
     `lg` it also carries the hamburger (left) and favourites (right), since
     rows 1 and 3 are hidden at that width.
  3. Nav row (`<Nav />` — Products mega-menu, Designers, Editorial, About) —
     desktop only.
  `MobileNav` is unchanged and still triggered at the same `lg` (1024px)
  breakpoint its own code depends on (see the comment in
  `components/MobileNav.tsx` about the two files needing to move together).
  `Nav`, `CurrencySwitcher` and `MobileNav` themselves were not touched —
  each already portals its own popup/panel, so dropping them into a
  full-width row instead of a pill needed no changes to any of them.

- Dropped the scroll-direction hide/show behavior entirely. It existed to
  keep the *floating, overlapping* pill out of the way when not needed;
  `sticky` reserves its own space instead of covering content, so nothing
  needs hiding, and no scroll listener is left in the component.

## Why sticky, not fixed
The whole point of this direction is that the header sits ABOVE the hero
photo instead of floating over it. `position: sticky` gets that for free —
the header occupies real space in the document (so the hero naturally starts
below it, no manual offset/padding needed) and still sticks to the top of
the viewport once you scroll past it, so navigation stays reachable without
reintroducing a scroll listener or hide/show animation. Trade-off, inherent
to the concept and not a bug in the implementation: less of the hero photo
is visible above the fold at first load, since roughly 150px of masthead now
sits above it that used to overlap it instead.

## Verification
- `npx tsc --noEmit` — clean (0 output).
- `npx eslint components/Header.tsx` — clean (0 output).
- Rendered against the already-running local dev server (`localhost:3000`,
  pid 49670) via Playwright:
  - Desktop (1440×900): three rows render correctly; hovering "Products"
    opens the same two-column mega-menu as before, positioned under the nav
    row. Screenshotted.
  - Mobile (390×844): single masthead row (hamburger / crest+wordmark /
    heart); tapping the hamburger opens the existing full-screen `MobileNav`
    panel unchanged. Screenshotted.
- Confirmed via `git stash` that a pre-existing Base UI console warning
  ("A component that acts as a button was not rendered as a native
  `<button>`") was already present on the OLD header before this change —
  not a regression introduced here, left as-is and out of scope.

## Notes / follow-ups
- A Next.js dev-mode "1 Issue" indicator badge appears in the corner of both
  screenshots — that's the same pre-existing Base UI warning above, not new.
- Not yet run through `npm run audit:interaction` / `audit:visual` /
  `audit:mobile` — those are the real verification for cross-browser and
  touch behavior (CLAUDE.md §10.24/§10.25/§10.32 are all header regressions
  those audits caught that a single Chromium screenshot would not). Worth
  running before this ships past local.
- The utility row's search icon shown in the original mockup was NOT carried
  into this build — there's no global header search feature to wire it to
  (only the homepage hero has one, via `HeroSearch`), and adding one wasn't
  part of what was asked. Flagged in the reply to Tina as a fork if she wants
  it added for real.
