# Hero headline: undo the per-word title-case, back to full caps
**Date:** 2026-08-21 · **Status:** done

## Goal
Right after the previous per-word title-case change (Modest / In / One /
Place capitalised, rest lowercase), Tina: "nvm revert and put it in caps."

## What changed
`app/page.tsx`, hero `<h1>` — re-added the `uppercase` class (which
capitalises every letter, making the specific-word capitalisation moot) and
reverted the source text back to its plain sentence-case form: "Everything
modest." / "Finally in one place."

## Verification
- `npx tsc --noEmit` — clean.
- `npx eslint app/page.tsx` — clean.
- `npx vitest run --exclude ".claude/**"` — 722/722 passing, 44/44 files.
- Screenshotted at 1999×900 and 390×844 (mobile): headline back in full
  caps, two natural lines, matches the state from before the title-case
  detour.

## Notes
- The header's nav labels changed during this same session window
  (`PRODUCTS` → `CLOTHING`, a new `HIJABS` dropdown appeared) — visible in
  this pass's own screenshot. Not part of this change; looks like another
  concurrent session's edit to `lib/lanes.ts`/`components/Nav.tsx`, out of
  scope here and untouched.
