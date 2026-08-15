# Nav flyout rows had no way to reach the unfiltered category page

**Date:** 2026-08-15 · **Status:** done

## Goal
Tina: "i cant click on hijabs and scarfes now and also not outterwear" and
"and there is no jackets option". Investigated by reading the actual
component rather than guessing, since a browser automation tool wasn't
available in-session — CLAUDE.md's own precedent (§10.26, §10.28) is to
never trust a claim about UI behavior without checking the real thing, so
once the browser tool came back online this was re-verified live with
Playwright before shipping.

## Root cause
`components/NavMenu.tsx` renders a category row with `subItems` as a
`Menu.Trigger`, deliberately NOT a `Link` — the file's own comment documents
why: rendering it as both caused a real touch-race bug (a tap would navigate
to the bare lane immediately while the flyout separately opened on top of
the page it had just left). The fix for that bug removed the Link entirely,
which was correct for that bug — but as a side effect, **a row with a flyout
has never been able to navigate anywhere by clicking the row itself**, on
either desktop (hover flyout) or mobile (tap-to-expand disclosure). Only the
flyout's own sub-items are real links.

This has been true for Outerwear since 2026-08-13. It went unnoticed because
nobody needed the *unfiltered* Outerwear view often enough to hit it. Hijabs
& Scarves got the same flyout treatment this evening (034a985), and losing
click-to-navigate on a much more frequently visited category surfaced it
immediately. "No jackets option" was the same gap read differently — there
was no way to reach "all outerwear, unfiltered" (which includes jackets/
coats/everything), only the four named subtypes.

## Fix
Added an "All X" entry as the first item in each flyout (Outerwear, Layering
Basics, Hijabs & Scarves), linking to the bare lane page with no `?type=`.
This is still just another `Menu.Item`/mobile disclosure link — it does not
reintroduce the Link-on-the-row race, since the row itself stays a
non-navigating trigger.
- `components/Nav.tsx`: prepends `{ href: '/outerwear', label: 'All Outerwear' }`
  (and the Layering Basics / Hijabs & Scarves equivalents) to each `subItems`
  array.
- `components/MobileNav.tsx`: `subtypeLinks()` now takes an `allLabel` param
  and renders that as the first link inside the open disclosure, before the
  subtype list.

## Verification
- `npx tsc --noEmit` — clean.
- `npx vitest run --exclude '**/.claude/**'` — 694/694 passing.
- `npx eslint` on both changed files — clean.
- **Real browser check** (Playwright against a local `next dev` build, once
  the browser tool was available): hovered Products → hovered each of
  Outerwear/Hijabs & Scarves/Layering Basics → confirmed "All X" is visible
  in the flyout with the correct `href` → clicked it → confirmed the page
  actually navigated to the bare lane URL (not just that the link existed).
  Also confirmed an existing subtype link (Coats) still resolves correctly
  (`/outerwear?type=coat`) — the new entry didn't break the existing ones.

## Notes / follow-ups
- This session and at least one other were both actively pushing to `main`
  in this same area tonight (khimar/undercap routing, the header flyout,
  and — from a different session — an entirely separate in-page fabric/style
  Type-filter dropdown for Hijabs & Scarves). Checked `git diff --cached`
  before every commit tonight to keep the two sessions' work from getting
  tangled together in one commit; worth remembering as a real, current risk
  on this repo, not a hypothetical one.
