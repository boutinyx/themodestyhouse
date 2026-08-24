# Hero copy: centred + bigger on mobile/tablet, matching Tina's reference
**Date:** 2026-08-22 · **Status:** done

## Goal
Tina, with a screenshot of a competitor's (aab's) mobile hero — big bold text
centred in the middle of the screen: "i want you to do it lik this for mobile
and tablet so text bigger and in the middle."

## What changed
- `app/page.tsx` — hero copy container: `items-start ... text-left` →
  `items-center justify-center text-center` by default, with
  `lg:items-start lg:text-left` restoring the original left-aligned desktop
  layout untouched above 1024px (same breakpoint as the overlay split from
  earlier today). Headline `<h1>` gained a `hero-h1` class; its `fontSize` was
  removed from the inline `style` (inline styles can't carry a responsive
  override, so the size now lives in CSS instead).
- `app/globals.css` — new `.hero-h1` rule: `clamp(36px, 8vw, 56px)` by
  default, with the ORIGINAL `clamp(30px, 4.8vw, 64px)` restored at
  `min-width: 1024px` so desktop is unaffected.

## A bug caught before shipping
First pass accidentally dropped `justify-center` when rewriting the
container's className (kept only `items-center`), which top-aligned the
content instead of centering it vertically — at the bigger font size the
headline then collided with the header icons at the very top of the screen.
Caught by measuring the actual rendered `h1` rect with Playwright (`top: 0`)
rather than trusting the screenshot alone; fixed by restoring `justify-center`.

Also measured the actual rendered text width (not guessed) to size the
`.hero-h1` floor: 36px keeps "Every modest brand." on one line at a 390px
viewport (333px, vs 342px available with 24px side padding); 38px does not
(351px). Bigger than that wraps the line and, combined with the explicit
`<br/>` before "One place.", makes a 3-line block tall enough to reach the
header again.

## Verification
Playwright screenshots at 390×844 (phone), 820×1180 (tablet), and 1512×944
(desktop) — phone and tablet both show centred, notably bigger text with no
header collision; desktop is pixel-identical to before.

## Follow-up, same day
Tina: "Every modest brand. One place. needs to be bigger and the button to
shop lower." Two changes, both scoped to mobile/tablet (<1024px) same as the
rest of this feature:
- `.hero-h1` (globals.css): `clamp(36px, 8vw, 56px)` → `clamp(44px, 12vw, 68px)`.
  The 36px floor had been picked to keep the headline on one line — turned out
  that constraint was chasing the `justify-center` bug above, not a real limit.
  Re-measured with it wrapping to two lines at the bigger size: still ~230px of
  clearance above the header even at a 360px-wide phone (the narrowest realistic
  target). Wrapping is fine.
- `app/page.tsx` — "Shop the Archive" link: `mt-9` → `mt-14 lg:mt-9`, so desktop
  spacing is untouched and mobile/tablet gets more room above the button.

Verified with Playwright at 360×780, 390×844, 820×1180, and 1512×944 — bigger
headline with no header collision at any width, button visibly lower, desktop
pixel-identical to before.

## Follow-up 2, same day
Tina: "less spacing between the words and i want Every modest brand. to be
on one line. and shop button lower ont he hero." The previous bigger size
(clamp 44-68px) was wrapping "Every modest brand." onto two lines at phone
widths — bigger and guaranteed-one-line are in real tension at 360-390px, so
this settles on the largest size that holds both, measured directly:

- `.hero-h1` (globals.css): `clamp(44px, 12vw, 68px)` → `clamp(34px, 9vw,
  64px)`, plus `letter-spacing: -0.02em` (tighter tracking — "less spacing
  between the words"). Moved the h1's inline `letterSpacing: '-0.01em'`
  (app/page.tsx) out entirely, since an inline style always wins over a class
  and would have silently blocked every one of these changes; desktop's
  original `-0.01em` now lives in the `@media (min-width: 1024px)` override
  instead, unchanged.
  Measured against the real rendered font at the narrowest realistic phone
  (360px): "Every modest brand." at 34px/-0.02em renders 307.98px against
  ~312px available (24px padding each side) — fits, with the rest of the
  clamp's range (up through the 64px cap) verified to still fit at 390, 768,
  820, and 1023px viewports.
- `app/page.tsx` — "Shop the Archive" link: `mt-14 lg:mt-9` → `mt-20 lg:mt-9`.

Verified with Playwright at 360×780, 390×844, 768×1024, 820×1180, 1023×1366,
and 1512×944 (desktop) — "Every modest brand." renders on one line at every
mobile/tablet width tested, button sits lower, desktop pixel-identical.
