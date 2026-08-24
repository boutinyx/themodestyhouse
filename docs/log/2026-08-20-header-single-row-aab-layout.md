# Collapse the header to one row, aab-style (logo left, nav beside it)
**Date:** 2026-08-20 · **Status:** done

## Goal
Tina: "okay i want my whole header to look like theirs" (aabcollection.com,
continuing from the transparent-on-hero work). Their header is one row:
logo left, nav links clustered beside it, icon cluster far right.

## What changed
`components/Header.tsx` — collapsed the two-row Two-Tier Classic
(masthead row, then a separate nav row) into one row:
- Desktop (`lg+`): crest + `<Nav />` clustered on the left with a gap,
  currency + favourites pushed to the far right via `justify-between` on
  the row — the same left-cluster/right-cluster shape as aab's own header.
- Mobile: crest centred (absolute, same as before), hamburger left,
  favourites right — unchanged from the prior revision, just now the only
  row instead of one of two.

The transparent-over-hero / solid-on-scroll mechanism from the previous
revision carries over unchanged — same `isHome`/`scrolled` state, same
`.header--transparent` class, same crest-inversion filter — just applied to
one row instead of two, so `borderBottom` replaces the old top+bottom
hairline pair on the (now single) nav row.

## What was deliberately left out
aab's header also has a black promotional announcement bar above it
("SHOP SUMMER SALE UP TO 50% OFF") and account/bag icons in its cluster.
Neither was built:
- **No announcement bar.** There's no real promotional copy to put in one —
  CLAUDE.md §1 and its mistakes log (§10.18) are explicit that invented
  marketing copy is worse than none. Say the word with real copy and it's a
  small addition.
- **No account or bag icons.** This is a curated directory with no cart and
  no accounts (CLAUDE.md §2) — those two icons would open features that
  don't exist here.

## Verification
- `npx tsc --noEmit` — clean.
- `npx eslint components/Header.tsx` — clean.
- Playwright against the running local dev server:
  - `/` at `scrollY 0`: one transparent row, crest+nav left, $USD/heart
    right, directly over the hero. Screenshotted.
  - `/` at `scrollY 300`: same row, solid, dark, pinned with a shadow.
    Screenshotted.
  - `/`, hovering "Products" while transparent: the mega-menu still opens
    and renders correctly (solid panel, unaffected by the transparent
    header state). Screenshotted.
  - Mobile (390×700): hamburger / crest / heart, single row. Screenshotted.
  - `/directory`: unaffected — solid, sticky, single row, no transparency.
    Screenshotted as the regression check.

## Notes / follow-ups
- Still not run through `npm run audit:interaction` / `audit:visual` for
  cross-browser/touch confirmation — carried over from the last two header
  log entries as an open item before this ships past local.
