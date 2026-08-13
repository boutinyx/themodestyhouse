# Mobile: Outerwear accordion, smaller card icons, drop the search label, edge-to-edge grid

**Date:** 2026-08-13 · **Status:** done

## Goal

Four separate requests from Tina in one message:
1. "when clicking on outerwear on mobile the subcatagories dont open it takes you direcly
   to outerwear fix that" — the phone menu's Outerwear row was a plain link.
2. "the icons on the photos on mobile are tooooo big" — the quick-view/favourite circles
   on `ProductCard`.
3. "get rid of the 'search index' on every search bar people know what to do" — the
   `IndexPanel` label above every search field.
4. (sent mid-turn) "the pictures can you just make them full to the edge of the page like
   h&m ... 2 pics next to eachother n but they fill the page" — edge-to-edge product photos
   on mobile.

## What changed

- `components/MobileNav.tsx` — Outerwear no longer renders via the shared `row()` link
  helper. It's now a disclosure `<button>` (`outerwearOpen` state) that toggles inline,
  showing Blazers/Vests/Cardigans/Coats as indented sub-links to `/outerwear?type=<subtype>`
  when open — the touch equivalent of the desktop header's hover flyout. Subtype order
  comes from `Object.keys(OUTERWEAR_SUBTYPE_LABELS)`, the same source `lib/compactCatalogue.ts`
  and the desktop flyout (`components/Nav.tsx`) already use, so a mismatch can't drift in
  silently.
- `components/ProductCard.tsx` — the quick-view and favourite buttons shrink from a flat
  40px circle to 32px below the `md` breakpoint (Tailwind's `w`/`h` classes override the
  Phosphor icon's `size` prop, since SVG presentation attributes lose to any CSS rule).
  Icon glyphs shrink correspondingly (Eye 20→16px, Heart 22→18px on mobile). Unchanged at
  `md:` and above.
- `components/IndexPanel.tsx` — removed the `"Search the index"` label; the input now
  spans the full width of the console on its own.
- `app/globals.css` — new `@media (max-width: 767px)` rule on `.product-grid`: negative
  32px margins cancel the page shell's `px-8` (the same shell every page carrying this
  grid uses — `/directory`, every lane, `/favourites`), pulling the grid to the screen
  edges; gap drops to 2px. `ProductCard.tsx`'s image wrapper picked up a `product-photo`
  class so the same rule can strip its border/radius at that width, so the two tiles read
  as flush photos rather than white-bordered cards with a gutter around them. Unchanged
  at `md:` and above — the existing 3-up grid inside the padded shell is untouched.

## Verification

- `npx tsc --noEmit` — clean.
- `npm run lint` — clean (pre-existing unrelated warning only, same untracked scratch file
  as every other entry this session).
- `npx vitest run lib/devOnly.test.ts lib/aboutStats.test.ts --exclude ".claude/**"` —
  41/41. Full `--no-file-parallelism` run showed the same 2 failures as every other run
  this session, both inside `.claude/worktrees/jiggly-hugging-honey/` — a different
  concurrent session's isolated worktree, not this repo's own tests.
- `npm run build` — clean.
- `scripts/mobile-audit.mjs` (Chromium, iPhone 13 width) — 0/9 routes overflowing, 0 a11y
  violations, 0 stacked text, 0 broken aspect. The two "tap target" notes on
  `/modest-dresses` and the 1px overflow on `/` are pre-existing, unrelated to any file
  touched here (footer links and `VerifiedSpotlight`, respectively).
- `scripts/interaction-audit.mjs` (Chromium, all viewports) — zero `PROBLEM`,
  `mobile-menu-open` still `ok`.
- Manual, via a real headless Playwright run at 390×844 (the Chrome extension's window
  resize wouldn't go below its own minimum chrome width, so this is a Playwright script,
  not the extension):
  - `/directory`: search bar has no label, spans full width; the two product photos are
    flush to both screen edges with no visible border/radius and a hairline gap between
    them; quick-view/favourite circles visibly smaller against the photo.
  - Tapping "Outerwear" in the phone menu (real touch tap) opened Blazers/Vests/
    Cardigans/Coats inline with the chevron rotated to point up; tapping "Vests" landed on
    `/outerwear?type=vest`.

## Notes / follow-ups

- The edge-to-edge treatment is mobile-only by design (`max-width: 767px`), matching what
  was asked — the desktop 3-up grid is untouched.
- `components/ProductGrid.tsx` shares the `.product-grid` class but has zero importers
  (confirmed via grep) — the CSS rule reaches it harmlessly if it's ever wired up, but
  nothing currently renders through it.
