# Garment credit callouts ("the arrows") now show on mobile and tablet
**Date:** 2026-08-23 · **Status:** done

## Goal
Tina: "i want you add the arrows on the mobile and tablet too" — the KHAIR/
HANAA ATELIER garment-credit callouts (label + leader line + dot) on the hero
were desktop-only (`hidden lg:block`).

## Investigation
Two different photos are actually in play below `lg`:
- Tablet (768-1023px) still gets the desktop photo (`hero-home-10.jpg`) — the
  `<picture>` source swap in `app/page.tsx` only swaps below 768px. Confirmed
  via `currentSrc` at 820px width.
- Phone (<768px) shows `hero-home-mobile.png` instead, a separately-composed
  portrait crop, not derivable from the desktop numbers.

So this needed two calibrations, not one shared one.

## What changed
`components/HeroCallouts.tsx`:
- Refactored the render logic into a `CalloutGroup({ callouts, aspectRatio,
  className })` component so both calibrations reuse the same geometry-mirror
  technique instead of duplicating the whole JSX tree.
- Existing `CALLOUTS` (desktop numbers) now renders at `hidden md:block`
  (was `hidden lg:block`) — same photo, same percentages, just visible from
  768px up instead of 1024px up.
- New `CALLOUTS_MOBILE` + a `1728 / 3072` aspect ratio (hero-home-mobile.png's
  own dimensions) renders at `md:hidden` (<768px), pointing at the hijab and
  the sleeve/knot of the same model in that photo's own composition.

## Measuring the mobile numbers (two passes)
First pass: screenshotted the raw mobile hero (text/overlay/button hidden via
a temporary DOM tweak), guessed small photo-percentages (labelX 2-4%)
assuming 0% was the box's own left edge. Wrong — worked out the object-cover
math afterward: at 390×844 the photo (0.5625 native aspect) is
height-constrained against the box (0.462, narrower than the photo), scaling
to 474.7px displayed width and cropping 42.35px off each side, so only the
~8.9%-91.1% range of the photo is ever visible. Both labels rendered clipped
("AIR" instead of "KHAIR") as a result.

Tina then said positioning still needed work ("needs to be better on phone
and tablet") — asked which aspect specifically (position vs. size vs.
content) rather than guess again; she confirmed positioning. Re-measured
properly this time: rendered the raw mobile photo with an actual pixel grid
overlay (green gridlines every 30px horizontal / 50px vertical, injected via
Playwright) rather than eyeballing, picked target points clearly ON fabric
away from the models' faces and with real margin from the screen edge
(box (100,250) for the hijab dot, box (50,670) for the ruched-satin dot),
then converted with `(box_x + 42.35) / 474.7 * 100` for x and
`box_y / 844 * 100` for y (no crop offset vertically — height maps 1:1).

## Verification
Playwright screenshots: 360×780 and 390×844 (phone) — both labels fully
visible with margin from the edge, dots clearly on the hijab and the ruched
satin rather than near a face, no collision with the headline/subhead/button.
768×1024 and 820×1180 (tablet, reusing desktop's calibration) — dots
correctly on the hijab and sleeve knot. 1512×944 (desktop) — pixel-identical
to before.

## Follow-up: designed by hand in callout-designer.html
Built a drag-and-drop tool (`callout-designer.html`, untracked scratch file)
so Tina could position the label/dot herself instead of me re-guessing:
toggle between the mobile/desktop photos, drag the label and dot, pick a line
style (straight/elbow, with or without an arrowhead, or dot-only), and copy
generated code formatted for this file. The tool replicates the real
object-cover crop math generically (works for any photo/box combination, not
hardcoded to one breakpoint) so the output percentages are exactly what
`CALLOUTS_MOBILE` expects.

She placed both callouts herself using the elbow style and sent the code
back. Pasted verbatim into `CALLOUTS_MOBILE` above. Verified live at 390×844
— matches her placement exactly.

## Follow-up: mobile styling to match her designer-tool screenshot
Tina sent a screenshot of her own callout-designer.html session
("i wanted it like this") — a serif font, "HANAA / ATELIER" joined on one
line rather than stacked, and a noticeably bigger dot with a soft halo. That
was the TOOL's own placeholder styling (Georgia serif, 12px dot), different
from what actually shipped when I pasted her coordinates into the real
component (which kept the desktop mockup's Jost sans-serif, stacked brand
lines, small 5px dot).

`components/HeroCallouts.tsx` — `CalloutGroup` gained style props
(`nameFontFamily`, `pieceFontFamily`, `joinBrandOneLine`, `dotSize`,
`dotHalo`), all defaulted to the existing desktop values so the tablet/desktop
render is untouched. The mobile `CalloutGroup` instance now passes
`var(--font-label)` (this brand's actual serif token, not the tool's literal
Georgia placeholder), `joinBrandOneLine`, `dotSize={11}`, and a halo shadow.

Verified with Playwright at 390×844 (matches the reference: serif labels,
"HANAA / ATELIER" on one line, bigger haloed dot) and 1512×944 (desktop
pixel-identical to before).

## Reverted, same day
Tina: "fuck it get rid of the ones on tablet and phone." `HeroCallouts()` is
back to desktop-only (`hidden lg:block`, the exact original pre-2026-08-23
behaviour) — a single `<CalloutGroup callouts={CALLOUTS} ...>` call, nothing
else. `CALLOUTS_MOBILE` and `CalloutGroup`'s mobile-only style props
(`nameFontFamily`, `pieceFontFamily`, `joinBrandOneLine`, `dotSize`,
`dotHalo`) are left in the file, unused (eslint-disabled on the one resulting
warning), same "cheap to restore, not deleted" reasoning as
`HeroBrandStrip.tsx`/`lib/vibes.ts`.

Verification was interrupted by an unrelated build error: `next dev` failed
on `components/PopularShowcase.tsx:212` ("Unexpected token") — a file this
session didn't touch or create, apparently from other in-progress work. Did
NOT attempt to fix it (out of scope, risk of clashing with whatever's
mid-edit there) — confirmed instead that `HeroCallouts.tsx` itself lints
clean and that `tsc --noEmit` reports nothing against it.
