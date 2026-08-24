# Bigger header nav text, matching aab's measured size
**Date:** 2026-08-20 · **Status:** done

## Goal
Tina: "but as big letters as they have" — the header nav text (Products,
Designers, Editorial, About, $ USD, favourites) should read as large as
aabcollection.com's.

## Research
Measured aab's actual nav link, not eyeballed: `.header__menu a` computed
`font-size: 14px` (weight 500, letter-spacing ~1.47px). Ours was `12px` —
`.nav-link`'s own base size in `app/globals.css`.

## What changed
- `app/globals.css` — added `.site-header .nav-link { font-size: 14px; }`,
  scoped rather than raising `.nav-link`'s own base size. That class is also
  used by `BrandCard`, `StyleIt`, the editorial/designers/about/favourites
  pages, and the homepage's "All products" link — none of which were asked
  about, and raising the shared base would have resized all of them too.
- `components/Header.tsx` — gave `<header>` a permanent `site-header` class
  (previously only `header--transparent` was conditionally added) so the
  scoped rule above has something to target regardless of scroll state.
  Bumped the favourites link's inline `fontSize` from 13 → 14 to match — an
  inline style always wins over an external class, so it needed its own
  number, not just the new CSS rule.
- `components/CurrencySwitcher.tsx` — same reason, same fix: its trigger's
  inline `fontSize` went 13 → 14, so "$ USD" reads at the same size as
  the links beside it instead of visibly smaller.
- Left `MobileNav.tsx`'s hamburger trigger's `fontSize: 13` alone — it has
  no visible text (icon-only), so the size is inert there.

## Verification
- `npx tsc --noEmit` — clean.
- `npx eslint components/Header.tsx components/CurrencySwitcher.tsx` — clean.
- Playwright against the running local dev server: queried every
  `.nav-link` element on `/directory` — Products/Designers/Editorial/About/
  $USD/favourites all report `14px`; the hamburger's icon-only trigger still
  reports `13px` (expected, no visible text). Confirmed the footer's own
  "About" link is untouched (`Footer.tsx` uses a separate `FLink` component,
  never `.nav-link`).
- Screenshotted `/` at scrollY 0 (transparent) and scrollY 300 (solid) —
  text reads noticeably larger in both states, matching aab's scale.

## Notes / follow-ups
- Still not run through `npm run audit:interaction` / `audit:visual` — same
  open item carried across the last several header log entries.
