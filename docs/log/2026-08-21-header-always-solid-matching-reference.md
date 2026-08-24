# Header always solid, matched to the reference's colour, wordmark and thickness
**Date:** 2026-08-21 · **Status:** done

## Goal
Tina, re-sending the same reference screenshot from 2026-08-20: "i want the
header like this allt hte time so no transparent and also this color if
you can do the modesty and under that line house that would be perfect,"
then a follow-up: "also in thickness."

## What changed
`components/Header.tsx` — full rewrite, removing the transparent-over-hero
mechanism entirely:
- Dropped `usePathname`, the `scrolled` state, its scroll-listener
  `useEffect`, and every `transparent ? … : …` branch — none of it is
  reachable any more. `<header>` is unconditionally `sticky`, not `fixed` —
  it doesn't need to leave document flow to overlap the hero any more, so
  it just reserves its own space above it, back to the original Two-Tier
  Classic shape from before transparency was tried at all.
- Background: `var(--bone)` → `var(--parchment)`. Not eyeballed — sampled
  five points across the reference screenshot's header background with
  `sharp`, averaging ~`#f9f5f1`, which is `--parchment` (`#faf7f1`), not
  `--bone` (`#fbfaf6`).
- Wordmark: one line ("The Modesty House") → two ("The Modesty" / "House"),
  per Tina's explicit text instruction — the reference image itself
  actually shows it on one line; she asked for something different from
  what her own screenshot shows, and her words are what was built.
- Thickness ("also in thickness"): measured the reference's own crest
  height against its header height with `sharp` (crest ≈102px inside a
  ≈176px header) rather than guessing. Scaled the mark up to get there
  rather than just padding the old one out: crest `h-9`→`h-12` and wordmark
  `14px`→`17px` at `lg`, row padding `py-3`→`py-5` at `lg`. Mobile sizes
  (`h-9` crest, `py-3` row) are untouched — the reference is a desktop
  screenshot, and there's no reason to make the phone header taller too.
- `app/globals.css` — removed the now-dead `.header--transparent .nav-link`
  rules (the class is never applied any more); left the `.site-header
  .nav-link` font-size rule in place, still in use.

## Verification
- `npx tsc --noEmit` — clean.
- `npx eslint components/Header.tsx app/globals.css` — clean.
- `grep -rn "header--transparent"` across `components/` and `app/` — no
  hits, confirms nothing references the removed class.
- Playwright at 1999×900: header renders solid parchment at scroll 0 AND
  after scrolling (no transparent state at any point), two-line wordmark,
  visibly thicker crest+row. Screenshotted both.
- Mobile (390×700): unaffected — hamburger/crest/heart row stays the
  original compact size. Screenshotted.

## Notes / follow-ups
- The reference mockup's absolute pixel scale isn't a real, calibrated
  measurement (it's a generated image, not a browser screenshot at a known
  DPR), so the thickness match is a reasoned estimate from its own internal
  proportions (crest-to-header ratio), not an exact px-for-px copy.
