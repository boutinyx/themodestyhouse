# Hero: new headline, moved left, bigger, search bar removed
**Date:** 2026-08-21 · **Status:** done

## Goal
Tina sent a mockup reading "EVERYTHING MODEST. FINALLY IN ONE PLACE." and
asked: use that text, move it to the left side, make the letters bigger,
delete the search bar.

## What changed
`app/page.tsx`, hero section:
- **Text**: "The archive for *everything* modest." → "Everything modest.
  *Finally in* one place." — same two-line structure and italic-accent
  pattern the previous headline used, just the new words. This supersedes
  the 2026-08-19 "archive for everything modest" tagline decision recorded
  in `docs/log/2026-08-19-revert-hero-to-archive-tagline.md` — noted in the
  code comment so that entry doesn't read as still-current.
- **Position**: the hero's inner flex container went from
  `items-center justify-center text-center` to
  `items-start justify-center text-left`, with padding bumped
  (`px-6 md:px-16 lg:px-24`) so the block sits near the left edge with real
  breathing room rather than flush against it. `justify-center` (vertical
  centring) is untouched — only the horizontal alignment changed.
- **Size**: fixed Tailwind steps (`text-4xl md:text-6xl`) → a fluid
  `clamp(40px, 7vw, 96px)`, so it scales continuously with viewport width
  instead of jumping at breakpoints, and tops out noticeably larger (96px
  vs. the old 6xl/60px ceiling) on wide screens.
- **Search bar**: `<HeroSearch />` and its wrapper `<div>` deleted from the
  hero entirely (not hidden). Its now-unused import removed from
  `app/page.tsx`. The `HeroSearch` component file itself is untouched — not
  imported anywhere else, but not deleted either, since removing the
  source file wasn't asked for. Directory search is still reachable via the
  header's own search control (`components/HeaderSearch.tsx`), so this
  isn't a loss of the feature, just its removal from the hero specifically.

## Verification
- `npx tsc --noEmit` — clean.
- `npx eslint app/page.tsx` — clean.
- `npx vitest run --exclude ".claude/**"` — 722/722 passing, 44/44 files.
- Screenshotted at 1999×900 and 390×844 (mobile): headline reads large and
  left-aligned at both widths, wraps naturally close to the reference's own
  line breaks on mobile, no search bar present, models/overlay unaffected.
