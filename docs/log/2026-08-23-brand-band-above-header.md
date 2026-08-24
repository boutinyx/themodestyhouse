# Brand band: above the header, near-black, phone/tablet only
**Date:** 2026-08-23 · **Status:** done

## Goal
Four asks from Tina in quick succession, all about the brand band added earlier the same
day (`docs/log/2026-08-23-brand-band-under-hero.md`):

1. *"i wnat the banner a dark purple almost black"*
2. *"and i want it above the header"*
3. *"and do it only for tablet and phone desktop leave it out"*
4. *"slower and get rid of the transparancy on the beginning and end"*
5. *"can it be even slower and can the dots be same white as the text"*

## What changed

**`app/globals.css`**
- New token `--aubergine-deep: #1e0a1d` — aubergine (`#441943`) taken most of the way to
  black rather than a new hue. Its own token because it is a surface colour used inline
  in TSX (§6: colour is never a Tailwind class here) and "almost black" should be one
  value, not a hand-typed hex per component.
- New token `--band-height: 40px`, zeroed at `min-width: 1024px`.
- `.hero-vh` now `calc(100svh - var(--band-height))`.

**`app/layout.tsx`** — `<HeroBrandStrip tone="band" />` renders immediately before
`<Header />`. "Above the header" can only be honoured from the layout, because the header
itself lives there — which necessarily makes the band site-wide rather than
homepage-only. Deliberately NOT sticky: the header is what has to stay reachable while
scrolling, and a second pinned bar would eat 40px of every viewport for a ticker.

This is, incidentally, the announcement bar `Header.tsx`'s own comment says was left out
of the reference layout for want of anything real to put in it. There is now something
real.

**`app/page.tsx`** — the band comes out; a comment marks where it went and why.

**`components/HeroBrandStrip.tsx`** — the `band` tone is now: `--aubergine-deep` fill, no
hairlines (the near-black against parchment IS the separation), fixed
`height: var(--band-height)` with `align-items: center` instead of vertical padding, text
at `rgba(251,250,246,0.62)`, `lg:hidden`, **no edge mask**, **650s** instead of 260s, and the ✦ separators in the same
held-back white as the names (via `color: inherit`, so they cannot drift apart) instead of
brass. The `hero` tone is untouched in every one of those respects.

## Two halves that are easy to split, and shouldn't be

**Hiding the band is two changes, not one.** `lg:hidden` on the element AND
`--band-height: 0px` in the same 1024px media query. Only doing the first leaves the
desktop hero ending 40px short of the fold, for a band nobody can see — and nothing in
the CSS would say why. That is the same failure `--header-height` exists to prevent; it
came from Tina's own "i still see a big piece of the pciture".

**The height is fixed, not padding-derived**, for the same reason. A padding-derived
height drifts with the font and silently moves the hero's bottom edge.

## Verification

`npm run build` — ✓ compiled. (The tree would not build for part of this work —
`components/PopularShowcase.tsx` was mid-write in another session and did not parse. That
session finished before the final build, so this was verified against the real tree, not
a copy.)

Served on :3233, Playwright at three widths, stylesheet asserted loaded first
(`.site-header` computed `position: sticky`) before any measurement:

```
phone   390x844   strip 40px @ top 0   header top 40   --band-height 40px   heroBottom 844 / vh 844
tablet  819x1180  strip 40px @ top 0   header top 40   --band-height 40px   heroBottom 1180 / vh 1180
desktop 1440x900  strip 0px (hidden)   header top 0    --band-height 0px    heroBottom 900 / vh 900
bg rgb(30, 10, 29)   names rgba(251,250,246,0.62)   aboveHeaderInDom true (all three)
```

`heroBottom === viewportH` at every width is the load-bearing number: the photograph ends
exactly at the fold whether the band is there or not.

Speed, fade and separator colour, measured live:
```
duration: 650s   maskImage: none   webkitMask: none
nameColor rgba(251, 250, 246, 0.62)
dotColor  rgba(251, 250, 246, 0.62)   match: true
```
420s went to 650s on a second "can it be even slower" in the same session — the sixth
revision of this number (48 → 110 → 180 → 260 → 420 → 650), every one in the same
direction.

Screenshot at 819 confirms it by eye: near-black bar at y=0 with names running edge to
edge and no wash at either end, header below it.

`npx tsc --noEmit` — clean. `npx eslint` on the four changed files — clean.

## Notes / follow-ups

The band is now on **every page**, not just the homepage — an unavoidable consequence of
"above the header", flagged rather than assumed. If she wants it homepage-only, that
needs either a pathname check in the layout or moving the header itself into the pages,
and the first is much cheaper.

`--band-height` is a hand-set constant, unlike `--header-height`, which a ResizeObserver
keeps matched to reality. That is fine while the band's height is literally set by the
same token, and would stop being fine the moment its content can wrap.
