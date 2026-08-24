# Hero headline: drop the italic, size down again
**Date:** 2026-08-21 · **Status:** done

## Goal
Tina: "no ialic text and make the letters a bit smaller."

## What changed
`app/page.tsx`, hero `<h1>`:
- Removed the `<span className="italic">Finally in</span>` wrapper —
  "Finally in" is now plain text, same word, no special styling left to
  scope to it.
- Font size `clamp(30px, 4.5vw, 64px)` → `clamp(24px, 3.6vw, 52px)`.

## Verification
- `npx tsc --noEmit` — clean.
- `npx eslint app/page.tsx` — clean.
- `npx vitest run --exclude ".claude/**"` — 722/722 passing, 44/44 files.
- Screenshotted at 1999×900 and 390×844 (mobile): headline reads in one
  uniform weight, noticeably smaller, wraps to 3 lines on desktop and 2 on
  mobile; subline and underline links unaffected.
