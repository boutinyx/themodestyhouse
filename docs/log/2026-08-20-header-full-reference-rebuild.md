# Header rebuild to match Tina's full reference mockup
**Date:** 2026-08-20 · **Status:** done

## Goal
Tina sent a reference image ("i want to do the header like this") showing:
crest + "THE MODESTY HOUSE" wordmark left, PRODUCTS/DESIGNERS/EDITORIAL/ABOUT
centred, and SEARCH / heart / BAG (0) / a divider / "USD ⌄" on the right.

## What changed
- `components/Header.tsx` — restructured the single row from two clustered
  groups (crest+nav together, utility right) to three independent groups on
  `justify-between`: crest+wordmark, `<Nav />`, and a utility cluster —
  matching the reference's spacing rather than the tighter aab-style
  clustering from the previous revision. The wordmark span ("The Modesty
  House," uppercase, `--font-label`, letter-spaced) is back beside the crest
  — it had been removed earlier this same session at Tina's request, then
  asked for again here; both were her calls, just at different points.
- `components/HeaderSearch.tsx` — new. A "SEARCH" trigger (icon + label,
  styled as `.nav-link` so it matches the other header text exactly,
  including the 2026-08-20 size bump and the transparent-header colour
  flip) that opens a small anchored panel with a real text input, submitting
  to `/directory?q=` — the same destination `HeroSearch` already uses. Built
  as a plain toggle + outside-click/Escape handler, not a Base UI primitive:
  it's not a menu (a `RadioGroup`/`Menu.Item` doesn't fit a text field) and
  doesn't need collision-aware positioning.
- `components/CurrencySwitcher.tsx` — added a `CaretDown` after the "$ USD"
  label, same `Chevron` pattern as the Products trigger (`NavMenu.tsx`):
  rotates via Base UI's own `data-popup-open` attribute, no new state.

## What was deliberately left out
- **No bag icon.** This is a curated affiliate directory — CLAUDE.md §2 —
  with no cart. A bag icon would open onto a feature that doesn't exist.
- **No black announcement bar.** No real promotional copy exists to put in
  one; CLAUDE.md §1 and its mistakes log (§10.18) are explicit that invented
  marketing copy is worse than none.
Both were the same two omissions made building the aab-style header two
revisions back, for the same reasons.

## Verification
- `npx tsc --noEmit` — clean.
- `npx eslint components/Header.tsx components/HeaderSearch.tsx components/CurrencySwitcher.tsx` — clean.
- Playwright against the running local dev server:
  - `/` at `scrollY 0`: transparent, white wordmark/nav/icons, over the
    hero, crest+wordmark / nav / search+heart+divider+USD⌄ all present.
    Screenshotted.
  - `/` at `scrollY 300`: solid, dark, pinned. Screenshotted.
  - Clicking "Search" opens the panel; typing and submitting would route to
    `/directory?q=…` (same code path as `HeroSearch`, not separately
    re-tested end-to-end here). Screenshotted mid-open.
  - Hovering the currency trigger opens the dropdown, flags still show per
    row, chevron rotates. Screenshotted.
  - Mobile (390×700): hamburger / crest / heart, unaffected by any of this
    — search and currency stay desktop-only, same convention as before.
    Screenshotted.
  - `/directory`: unaffected, solid header with the new layout, no
    transparency. Screenshotted as the regression check.

## Notes / follow-ups
- `HeaderSearch`'s submit path shares `/directory?q=` with `HeroSearch` but
  wasn't given its own test — worth a real end-to-end check (type a query,
  confirm the results page) next time this area is touched.
- Still not run through `npm run audit:interaction` / `audit:visual` —
  carried over as an open item across every header revision this session.
