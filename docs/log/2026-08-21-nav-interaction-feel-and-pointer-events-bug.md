# Nav "feel": open animation, no close-on-hover-out, and a real pointer-events bug
**Date:** 2026-08-21 · **Status:** done, verified with Playwright

## Goal
Tina: "can you use playwrite again i dont only want the look but also the
feel so how it opens etc i want you to replicate the whole thing but you
can keep the arrows in the header" — match aab's actual interaction
behaviour, not just the visual layout from earlier today. Then, mid-session,
a real regression surfaced: "when i try to click one of the subcatagories
the whole block just claps back up", and after a first fix attempt,
"and now it doesnt even close...".

## What was researched (Playwright against the live aab site)
- Open transition: `opacity 0.15s linear`, `transform: none` throughout —
  a plain fade, no slide.
- No layout push — confirmed overlay, not an in-flow "drawer" pushing page
  content down (matches what was already built).
- **Does not close on hover-out at all.** Held the pointer away from both
  the trigger and the panel for 2.5s straight (real Playwright mouse
  movement, not just a single jump) — panel stayed open the entire time.
  It closes only by hovering a *different* top-level trigger, or by an
  explicit click outside the header.

## What changed
- `components/NavMenu.tsx`:
  - The pointermove-based auto-closer now treats a `wide` group's open
    panel as permanently "relevant" (never starts its close timer), instead
    of skipping the whole effect. That distinction mattered — see the
    "first fix attempt" bug below.
  - New click-outside-closes effect (`pointerdown` on `document`, closes if
    the target isn't inside `header` or `[data-nav-subflyout]`).
  - `.mega-row` items are bolded via `fontWeight: 600` when they're the
    panel's first ("All X") item — unchanged from earlier today, unrelated
    to this pass.
  - Fade-in via a CSS `@keyframes` animation (`navWideFadeIn`, 150ms
    linear) added in `app/globals.css`, applied via `animation` on the wide
    panel div. Close is instant (no fade-out) — see the abandoned attempt
    below for why.
  - New `data-nav-wide-panel` attribute on the wide panel div, for reliable
    Playwright targeting (also generally useful — matches the existing
    `data-nav-subflyout` marker pattern).

## Two real bugs found and fixed, both confirmed only by actually testing —
reasoning about the code was not enough for either:

1. **"claps back up" / "doesnt even close" — a genuine Base UI + Floating UI
   interaction, not something guessable from reading the source.** Base
   UI's hover machinery (`floating-ui-react`'s `useHover`, the "safe
   polygon" technique) sets `document.body.style.pointerEvents = 'none'`
   while a hover-opened floating element is open, and expects the mouse to
   arrive inside the floating content IT tracks (its own Positioner/Popup)
   to release the lock. The wide panel is deliberately NOT that tracked
   element — a plain sibling div, for the positioning reasons documented in
   NavMenu.tsx — so the mouse never "arrives" anywhere Base UI recognises,
   and the lock never released. With `pointer-events:none` on `<body>`,
   *every* click in the header — including on the wide panel's own links —
   hit-tested to `<html>` instead of the real target (confirmed live via
   `document.elementsFromPoint`: a one-element stack, `<html>` only). The
   link's own navigation never fired, and that phantom `<html>` target read
   as "outside" to the click-outside closer, snapping the panel shut —
   exactly "claps back up" with nothing happening. Fixed with a
   `MutationObserver` on `document.body`'s `style` attribute, active only
   while the open group is `wide`, that immediately clears
   `pointer-events: none` back to normal whenever Base UI re-asserts it.
2. **First fix attempt for "stays open" broke native-close differently.**
   The very first cut skipped attaching the pointermove-closer effect
   entirely for wide groups. That stopped the CUSTOM closer from firing,
   but `NavigationMenu.Root`'s `onValueChange` veto (`if (value === null &&
   pointerRelevant.current) return;`) depends on `pointerRelevant.current`,
   which is *only* ever set by that same effect — skipping it left the ref
   stuck at `false`, so Base UI's own native close-on-trigger-leave delay
   fired unopposed (~50ms after the pointer left the trigger). Confirmed
   live: panel closed on hover-out even with the whole effect skipped.
   Fixed by keeping the effect attached but forcing `stillRelevant` to
   always be `true` while the active group is wide.
- Also abandoned mid-session: fading the panel OUT on close, via a second
  piece of state (`displayedWide`) lagging `navValue` by ~160ms, updated
  through React's documented "adjust state during render" pattern. A
  temporary `console.log` confirmed `setDisplayedWide(active)` WAS being
  called with the correct value on every hover, yet the panel never
  rendered — something about this project's stricter lint/compiler setup
  (it already forbids reading refs during render, beyond what vanilla React
  allows) doesn't play well with that pattern here. Rather than keep
  chasing it, reverted to direct conditional mount driven by `wideActive`
  with a CSS `animation` for the fade-IN only, which needs no lagging state
  at all (an animation plays once on mount with no "previous style"
  required, unlike a transition).

## Verification
- `npx tsc --noEmit`, `npm run lint`, `npm run build`: clean.
- `npm test`: 1317/1319 (2 pre-existing stale-worktree failures, unrelated).
- Verified live with Playwright, each claim checked directly rather than
  assumed:
  - Fade-in: `animation-name` reads `navWideFadeIn` immediately on hover,
    opacity settles to 1.
  - Stays open 1s+ after the pointer moves fully away from both trigger and
    panel.
  - Closes on an explicit click outside the header.
  - Switching triggers (Clothing → Hijabs) closes the first and opens the
    second correctly, `body.style.pointerEvents` cleared back to normal
    throughout.
  - The original complaint, directly: clicking "Abayas" (plain category
    link) navigates to `/modest-abayas`; clicking "Blazers" inside the
    Outerwear sub-flyout (the exact case reported) navigates to
    `/outerwear?type=blazer`; clicking "Khimars & Jilbabs" inside Hijabs
    navigates to `/modest-hijabs?type=khimar-jilbab`. None of the three
    "clap back up" any more.

## Notes / follow-ups
- Close is instant, not a fade-out — matching aab's own OPEN transition was
  the explicit ask ("how it opens"); the fade-out was an extra reach that
  hit a real technical wall (see above) and was consciously descoped rather
  than fought further.
- The `MutationObserver` fix is scoped to `activeGroupIsWide` — compact
  groups (currently none, since Hijabs/Basics also went wide earlier today)
  still get Base UI's native pointer-events handling untouched if a future
  group opts back out of `wide`.
