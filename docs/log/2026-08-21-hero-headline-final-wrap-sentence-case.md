# Hero headline: revert forced line breaks, drop caps
**Date:** 2026-08-21 · **Status:** done

## Part 1 — "it reads so fucked up now its like a block"
The previous change forced four explicit line breaks, one short phrase per
line (Everything / modest. / Finally in / one place.), to match a mockup's
tight structure. Live, it read as a dense, choppy block rather than a
headline. Reverted to natural two-line wrapping — a single `<br/>` between
"Everything modest." and "Finally in one place.", letting the browser wrap
the second line inside the existing 620px cap wherever it naturally fits,
same as every pass before the forced-break detour.

## Part 2 — "okay now dont do full caps"
Right after: dropped the `uppercase` class from the `<h1>`. Text and markup
are otherwise unchanged; it now renders in the sentence case it's written
in ("Everything modest. Finally in one place.").

## Verification
- `npx tsc --noEmit` — clean, both passes.
- `npx eslint app/page.tsx` — clean, both passes.
- `npx vitest run --exclude ".claude/**"` — 722/722 passing, 44/44 files,
  both passes.
- Screenshotted at 1999×900 and 390×844 (mobile) after both changes:
  headline reads as two natural, evenly-weighted lines in sentence case,
  no longer a stacked block; subline and underline links unaffected.
