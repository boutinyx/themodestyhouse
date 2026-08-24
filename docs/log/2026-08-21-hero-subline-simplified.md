# Hero subline: cut down to one plain sentence
**Date:** 2026-08-21 · **Status:** done

## Goal
Tina asked for ideas on the subline (which read "The world's most curated
edit of modest fashion — timeless pieces, trusted designers, effortless
elegance."). Offered four short options; she picked one ("A worldwide
collection of modest fashion — timeless pieces, trusted designers,
effortless elegance."), then cut it further: "yeah one but i would not
like the em-dash and ut the things after the wolrdwide collection so
unneassesary ai slop."

## What changed
`app/page.tsx`, hero subhead `<p>`: text replaced with a single plain
sentence, no em dash, no trailing clause —
**"A worldwide collection of modest fashion."** — dropping the "timeless
pieces, trusted designers, effortless elegance" tail entirely, which she
named specifically as the part that read as generic filler.

## Verification
- `npx tsc --noEmit` — clean.
- `npx eslint app/page.tsx` — clean.
- `npx vitest run --exclude ".claude/**"` — 722/722 passing, 44/44 files.
- Screenshotted at 1999×900 and 390×844 (mobile): subline reads as one
  short line at both widths, headline and underline "Shop"/"Designers"
  links unaffected.
