# Switching subcategories while already on Outerwear didn't change the grid

**Date:** 2026-08-13 · **Status:** done

## Goal

Tina: "it doesnt change the clothing when i click on a sub catagaorie". Landing on a
subtype fresh (e.g. from `/directory`, clicking "Blazers") worked correctly — but she was
describing something that stayed stuck, and the actual reproduction confirms why.

## Root cause

`FilterableGrid`'s `type` filter state was set with a lazy `useState(() => …)` initializer
that reads the `initialType` prop — correct on first mount, but a `useState` initializer
runs exactly once, ever. Clicking a DIFFERENT subtype link while already on `/outerwear`
(e.g. the header flyout's "Vests" while viewing `?type=blazer`) is a same-route,
search-params-only client-side navigation: Next.js re-renders the Server Component page
with a new `initialType` prop, but React does not remount `FilterableGrid` over it — same
component, same position in the tree, just new props. The `<h1>` (a Server Component
value, recomputed fresh on every render — see the previous log entry) and the URL both
updated correctly; the grid's own filter state, set once at mount, silently didn't.

Reproduced live before touching anything: landed on `/outerwear?type=blazer` (blazers
shown, correct), then used the header flyout to switch to `/outerwear?type=vest` without
a full reload — URL and `<h1>` both changed to "vest"/"Vests", but the grid kept showing
blazer titles and the same "Showing 24 of 153" (blazer's count, not vest's).

## Fix

`components/FilterableGrid.tsx` — added a `useEffect` keyed on `[initialType, cat]` that
re-validates `initialType` against the catalogue's real subtype columns (same check as
the mount-time initializer) and calls `setType` with the result whenever it changes. This
is the standard "sync state to a changed prop when a full remount isn't wanted" pattern —
a full remount (e.g. via a `key`) was considered and rejected, since it would also reset
Brand/Sort/Search state that has nothing to do with which subtype was clicked.

## Verification

- `npx tsc --noEmit` — clean (whole tree, including other concurrent sessions' in-flight
  changes).
- `npm run lint` — clean for this file; two pre-existing/unrelated warnings elsewhere
  (another session's untracked scratch file, and mid-edit unused import in a different
  session's in-progress `ProductCard.tsx` change) — neither touched or staged here.
- `npx vitest run lib/devOnly.test.ts lib/aboutStats.test.ts --exclude ".claude/**"` — 41/41.
- `npm run build` — clean.
- `scripts/interaction-audit.mjs` (Chromium) — zero `PROBLEM`.
- Manual, via Playwright against a local production build, reproducing the EXACT reported
  scenario (not a fresh-mount test, which had already passed before and missed this):
  - Desktop header flyout: landed on `?type=blazer`, clicked "Vests" from the still-open
    flyout without reloading — grid genuinely re-filtered to vest titles, `showing`
    updated to the real vest count. Chained a second switch to "Coats" the same way —
    still correct, ruling out a one-shot fix.
  - Mobile nav: same scenario via the phone menu's Outerwear accordion, landed on
    `?type=coat` with coat titles shown.

## Notes / follow-ups

The lesson worth keeping: a fresh-mount test (arriving at a filtered URL from a different
page) and a same-route client-navigation test (switching between two filtered URLs on the
page you're already on) can diverge completely when a Client Component reads a prop only
in a `useState` initializer. Every earlier verification of this feature was fresh-mount
only, which is exactly why it passed while this bug shipped.
