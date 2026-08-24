# Hero headline: tight, one-phrase-per-line breaks
**Date:** 2026-08-21 · **Status:** done

## Goal
Two closely-spaced asks: "no ialic text and make the letters a bit
smaller" (handled in the previous log entry), then "mroe like this" with
her own mockup screenshot re-attached, followed immediately by "nvm do it
like this" with an EARLIER mockup screenshot (the "MODESTY, WITHOUT
COMPROMISE." one from `docs/log/2026-08-21-hero-headline-modesty-without-compromise.md`).
Both mockups share the same underlying structure she's after: bold,
uppercase, no italic, one short phrase per line with real space between
lines — not two phrases crammed onto a wide line.

## What changed
`app/page.tsx`, hero `<h1>` — replaced the previous two-line wrap
("Everything modest.<br/>Finally in one place.", which let the browser
decide where "Finally in" broke relative to "one place") with four explicit
`<br/>`-separated lines matching that tight, deliberate per-phrase grouping:
"Everything" / "modest." / "Finally in" / "one place." Line-height bumped
slightly, 1.02 → 1.05, to give the stack a bit more breathing room between
lines, closer to both mockups' spacing. Italic stays off, per the
immediately-prior instruction — this pass is about line breaks, not
reopening that decision.

## Verification
- `npx tsc --noEmit` — clean.
- `npx eslint app/page.tsx` — clean.
- `npx vitest run --exclude ".claude/**"` — 722/722 passing, 44/44 files.
- Screenshotted at 1999×900 and 390×844 (mobile): four tight lines, no
  italic, matches the shared visual language of both mockups reasonably
  closely at both widths.
