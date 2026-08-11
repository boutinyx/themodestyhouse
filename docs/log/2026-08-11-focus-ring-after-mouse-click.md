# Fix: mouse-driven filter selection left a keyboard focus ring

**Date:** 2026-08-11 · **Status:** done

## Goal

Tina reported a visible ring around the Sort chip after picking "Oldest" with the mouse
(screenshot on `/directory`). Fix it without weakening keyboard accessibility.

## What changed

- `components/InputModality.tsx` (new) — a renderless client component, mirroring
  `OutboundTracking.tsx`'s pattern. Tracks the visitor's last input device as
  `data-input-modality="keyboard" | "mouse"` on `<html>`, via delegated `keydown` /
  `pointerdown` listeners.
- `app/globals.css` — a new rule, scoped to `html[data-input-modality="mouse"]`, that sets
  `outline: none` on the same selector list the site's existing focus-ring rule already covers
  (`a`, `button`, `[role="button"]`, `input`, `select`, `textarea`, `summary`). Only fires when
  the tracked modality is definitively mouse; keyboard users are untouched.
- `app/layout.tsx` — mounts `<InputModality />` once, next to `<OutboundTracking />`.

## Root cause

Base UI's `Menu` (used by every dropdown chip, the header nav, and the currency switcher)
returns DOM focus to its trigger button after closing — correct, and required for keyboard
users — via a raw `element.focus()` call
(`node_modules/@base-ui-components/react/floating-ui-react/components/FloatingFocusManager.js:498`).
The browser's native `:focus-visible` heuristic can't always attribute that call to the mouse
click that actually closed the menu, so picking a filter with the mouse could leave the
trigger showing the site's 2px aubergine keyboard-focus ring afterward — on every
`FilterDropdown` (Category/Occasion/Brand/Sort), not just Sort.

## Verification

- `npx tsc --noEmit` — clean.
- `npm run lint` — clean (the one warning present is `.fontprobe.tmp.mjs`, an untracked
  scratch file from another session, unrelated to this change).
- `npm test` — 460/460 passing.
- `npm run build` — clean, 31 routes.
- Manual, via a throwaway Playwright script against a local `next start` build (both Chromium
  and WebKit, with WebKit's HSTS/`upgrade-insecure-requests` headers stripped per CLAUDE.md
  §10.24): a real `page.keyboard.press('Tab')` onto the trigger shows `outline: solid 2px`
  (unaffected); selecting a Sort option via `.click()` shows `outline: none` after the fix.

**Could not reproduce the reported bug itself in automation.** Neither engine's synthetic
`.click()` ever left a visible ring on the trigger, fix present or not — so this ships without
an automated negative control proving it fixes Tina's exact case. Working theory: her real
browser session hit a heuristic edge case a synthetic click doesn't replicate — macOS's "Full
Keyboard Access" accessibility setting is one well-documented real-world trigger for this exact
class of bug (it makes Safari/Chrome treat all restored focus as keyboard-worthy, mouse or
not). The fix doesn't depend on knowing which heuristic misfired: it unconditionally hides the
ring whenever the tracked input device is mouse, which covers this cause and any other with the
same symptom. Ask Tina to confirm on her machine after deploy.

## Notes / follow-ups

- This fix's blast radius is the whole site (every focusable element), not just Sort — by
  design, since the same `Menu.Trigger` pattern is shared by the header nav and currency
  switcher and would have the identical bug.
- If Tina still sees a ring after this ships, the next thing to check is whether it's actually
  a native Safari/WebKit chrome ring drawn independently of the `outline` CSS property (would
  need a `-webkit-appearance` reset instead) rather than the `:focus-visible` heuristic this fix
  targets — ruled out as *less* likely (modern Safari respects author `outline` on buttons) but
  not eliminated, since it couldn't be reproduced directly.
