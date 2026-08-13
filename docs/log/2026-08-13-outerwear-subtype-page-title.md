# Landing via a subtype link shows that subtype's name, not "Outerwear"

**Date:** 2026-08-13 · **Status:** done

## Goal

Tina: "yeh but i do wnat to see blazer etc etc instead of outerwear in the title when i
click on it" — after the flyout/mobile-nav fixes, clicking "Blazers" correctly landed on
`/outerwear?type=blazer` with the grid pre-filtered, but the page heading still read the
generic "Outerwear".

## What changed

- `app/[lane]/page.tsx` — the `<h1>` now reads the subtype's label (e.g. "Blazers",
  "Vests", "Coats") when the URL's `?type=` matches a real subtype for this lane,
  falling back to the lane's own title (`"Outerwear"`) otherwise — including for a bare
  visit or an invalid/garbage `?type=` value. Validated against this catalogue's real
  `layeringSubtypes`/`outerwearSubtypes` columns, the same check `FilterableGrid`'s
  `initialType` already does — an arbitrary query string is user input, not trusted
  outright.
- Generic across both subtype families (layering and outerwear), not outerwear-only,
  since it reuses the same validation `FilterableGrid` already has — so `/layering-basics`
  would get the same treatment if it ever grows a flyout of its own. Nothing currently
  links to `/layering-basics?type=…`, so this has no visible effect there today.
- The intro paragraph below the heading is untouched (still the lane's generic intro) —
  not asked for, and there's no per-subtype copy to show instead.

## Verification

- `npx tsc --noEmit` — clean.
- `npm run lint` — clean (pre-existing unrelated warning only).
- `npx vitest run lib/devOnly.test.ts lib/aboutStats.test.ts --exclude ".claude/**"` — 41/41.
- `npm run build` — clean.
- `scripts/interaction-audit.mjs` (Chromium) — zero `PROBLEM`.
- `curl` against a local production server:
  - `/outerwear` → `<h1>Outerwear</h1>`
  - `/outerwear?type=blazer` → `<h1>Blazers</h1>`
  - `/outerwear?type=vest` → `<h1>Vests</h1>`
  - `/outerwear?type=bogus` → `<h1>Outerwear</h1>` (invalid value falls back correctly,
    doesn't print garbage)
- End-to-end via a real mobile tap flow (Playwright, touch): opened the phone menu →
  Outerwear → tapped "Coats" → landed on `/outerwear?type=coat` with `<h1>Coats</h1>` and
  the grid genuinely showing coats.
