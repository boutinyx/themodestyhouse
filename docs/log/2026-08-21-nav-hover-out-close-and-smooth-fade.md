# Nav: restore hover-out-close, fix trigger-click reopen bug, real fade both ways
**Date:** 2026-08-21 · **Status:** done, verified with Playwright

## Goal
Three follow-ups on the same day's earlier close-behaviour work:
1. Tina: "when you hover over a catagory and hover down OUTSIDE of the
   block it still stays there" — matching aab's "doesn't close on
   hover-out" behaviour exactly was the wrong call once actually used.
2. Tina: "when you lcick of a catagory it stays open even when youre on
   the new page" — a real bug, separate from the subflyout-portal one
   fixed earlier the same day.
3. Tina: "it closes so fucking ugly can you use playwrite to take a look
   how the aabcollection has done it" — the close was an instant snap
   (no transition at all), left over from abandoning the fade-out attempt
   earlier.

## What changed
- `components/NavMenu.tsx`:
  - Reverted the "wide groups never close on hover-out" logic from
    earlier today back to ordinary hover-out closing for every group,
    wide or not. The click-outside-closer and scroll-closer added
    alongside that attempt stay (still useful, e.g. touch/no-hover input).
  - **Second real bug, found only by testing, not reasoning:** clicking a
    category link *inside* the panel already closed it correctly, but
    clicking the top-level TRIGGER itself (e.g. the word "Clothing", which
    navigates to `/directory` via its own `Link`) left the panel open on
    the destination page. Adding `onClick={closeAll}` to the trigger
    wasn't enough — a temporary `console.log` on `onValueChange` showed it
    firing AGAIN with the same group immediately after `closeAll()`,
    because the mouse hadn't moved off the trigger and Base UI's hover
    tracking re-affirmed "still hovering" as a fresh open. Fixed with a
    `suppressReopen` ref, set right before closing via a trigger click and
    cleared on the next genuine `pointermove` — vetoes exactly that one
    reopen without touching real subsequent hover-intent.
  - Replaced the single conditionally-mounted wide panel with one
    always-mounted `<div>` per wide group (Clothing/Hijabs/Basics),
    stacked at the identical position, cross-fading via `opacity`
    (`transition: opacity 150ms linear` on all of them; the active one
    gets `opacity: 1` and `pointer-events: auto`, the rest `opacity: 0`
    and `pointer-events: none`, `aria-hidden`). A conditionally-mounted
    panel can only ever fade IN — React removes the DOM node instantly on
    close, leaving no "previous style" for a transition to animate FROM.
    Keeping every panel permanently mounted sidesteps that entirely,
    without resurrecting the earlier state-during-render approach that
    silently didn't work.
  - New `data-nav-wide-panel-group` attribute (always present, all three
    panels) for the reduced-motion CSS rule; `data-nav-wide-panel` stays
    conditional (present only on the active one) for Playwright/test
    selection, matching how tests elsewhere in this pass already used it.
- `app/globals.css` — the `@keyframes navWideFadeIn` from the earlier
  fade-in-only attempt is gone (no longer used); the reduced-motion rule
  now targets `[data-nav-wide-panel-group]` and disables the `transition`
  instead of an `animation`.

## Verification
- `npx tsc --noEmit`, `npm run lint`, `npm run build`: clean.
- `npm test`: 1317/1319 (2 pre-existing stale-worktree failures, unrelated).
- Verified live with Playwright, six checks in one pass:
  1. Open fade-in: opacity samples show a genuine 0 → 1 ramp over ~150ms
     (not an instant jump).
  2. Hover-out closes again (restored behaviour) — confirmed panel gone
     after moving the pointer away and waiting.
  3. Switching Clothing → Hijabs shows Hijabs' content immediately, no
     stale/blank frame.
  4. Clicking "Blazers" under Outerwear navigates to
     `/outerwear?type=blazer` — the original "claps back up" case, still
     fixed.
  5. Clicking the "Clothing" trigger itself navigates to `/directory` AND
     the panel is confirmed closed (count 0) on the destination page — the
     new bug, now fixed.
  6. Scrolling still closes it (from the prior round, unaffected by this
     one).
  - Fade-OUT specifically re-measured after an initial flawed test (the
     first attempt started sampling too late, well after the close had
     already finished, and read as an instant snap): resampling from the
     moment the pointer leaves shows opacity genuinely ramping 1 → 0 over
     roughly 150ms, matching the intended transition.

## Notes / follow-ups
- None outstanding from this round.
