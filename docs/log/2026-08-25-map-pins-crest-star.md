# Map pins are the crest's star, not circles
**Date:** 2026-08-25 · **Status:** done

## Goal

Tina, relaying a friend's suggestion: *"use the star in my logo on the map
instead of the circles ... like the seal star"*.

The map is the "Independent labels. Global perspectives." band on the homepage
(`components/DesignerDiscovery.tsx`, rendered from `app/page.tsx:676-683`).

## The ambiguity that had to be resolved first

There are **two different sets of circles** on that map, and only one of them is
the pins:

1. **The continents** — `public/world-dots-v2.svg`, ~2,078 `<circle r="2.4">`
   elements forming the dotted landmass. This is the map's texture. Untouched.
2. **The pins** — 39 inline `<circle>` elements, one per city, radius
   `3.2 + sqrt(houses) * 2.4`. **These are what changed.**

And "the star in my logo" and "the seal star" turned out to be **different
shapes**, which is why this was put to Tina rather than guessed (§10.29 — when a
request points at one of two things, name the candidates and ask):

- The crest's star is a slim four-pointed ornament with long sharp points.
- The Verified badge's star is Phosphor `Sparkle`.

## What was rejected, and why — measured, not assumed

**The crest has no vector.** `public/logo.png` / `logo-240.webp` are the only
logo assets in the repo; there is no SVG. So there was nothing to import and the
star had to be either substituted or traced.

Both Phosphor candidates were built and rendered on the real map before being
rejected:

| candidate | why not |
|---|---|
| `Sparkle` | The literal glyph the Verified badge, designers badge and Editor's-pick badge carry — so the most literal reading of "like the seal star". Its **fill path is two shapes**: a star plus two companion ticks. Confirmed by counting `M` commands in the rendered markup: `Sparkle` 2, `StarFour` 1, `Star` 1. Those ticks are sub-pixel at the badge's 10px and clutter the map badly at pin size, worst in the European cluster. |
| `StarFour` | A single clean four-pointed star and the sensible ready-made choice — but rounded tips and a thick waist. Beside the crest it reads as a different mark. |

Tina compared all three on the live map and chose the traced crest star.

## What changed

**`lib/starPath.ts`** (new) — `fourPointStar(cx, cy, r, waist)` returning SVG
path data, plus `STAR_WAIST = 0.13`. Four quadratic curves, not four lines:
straight sides give a rhombus, and the concave pull is the entire difference
between a diamond and a star. The waist fraction *is* the star's character —
toward 0 it collapses to four hairlines, toward 0.5 it bulges to a rounded
square.

In `lib/` rather than inline in the component so it is testable and so a second
surface can carry the mark without the geometry being copied. Pure arithmetic,
no imports — `DesignerDiscovery` is a `'use client'` component, so that matters
(Invariant 10).

**On CLAUDE.md §6.** "Every icon comes from Phosphor" stands and this is not an
exception to it, because this is not an icon — it is the brand mark. The rule
exists so icon weight and alignment stay consistent across the UI; a map pin is
a graphic mark. `lib/starPath.ts`'s own docstring says this, so the next reader
does not have to re-derive it.

**`lib/starPath.test.ts`** (new) — 8 tests: tips at all four compass points,
exactly four `Q` commands and no line commands, waist smaller ⇒ sharper, scales
linearly, translates without distortion, the shipped default is in a range that
still reads as a star, and **no exponential notation** — `1e-7` inside a `d`
attribute is silently invalid and the mark just fails to draw, which is why the
formatter uses `toFixed` rather than `String`.

**`components/DesignerDiscovery.tsx`** — the pin `<circle>` became a `<path>`.
Everything else about the pin is unchanged: same `sqrt(houses)` scale, same
`--aubergine` → `--plum` on the active region, same `0.92`/`0.16` opacity, same
180ms transition.

Radius multiplier **1.55x** the old circle radius. A four-pointed star inscribed
in a box reads far lighter than a disc filling the same box — most of the box is
empty — so keeping the raw number would have quietly thinned the map out.

## Verification

`npx tsc --noEmit` → 0 · `npm run lint` → 0 · `npm test` → **48 files, 781 tests
passing** (up from 47/773; the 8 new ones are `starPath`).

Rendered against a local production build and **looked at**, with the stylesheet
assertion in place (§10.24/§10.26):

```
css: rgb(250, 247, 241)      <- --parchment, so the CSS really loaded
starPins: 39
sample d: "M 226.111 101.087 Q 228.565 117.511 244.99 119.965 Q ... Z"
console errors: 0
```

Hover state driven for real, because the pins' whole interactive job is to light
up with their region:

```
region rows found: 5     hovering: EUROPE
before hover:  {total:39, plum:0,  dimmed:0}
during hover:  {total:39, plum:20, dimmed:19}
```

### Two harness faults hit on the way, both §10.28 again

1. **A stale `next start` held port 3178** across a rebuild, so the page served
   chunks from the previous build: one 404'd and one came back as `text/plain`,
   React never hydrated, and the hover check reported `plum:0, dimmed:0` — a
   *null result that looks exactly like a broken feature*. Fixed by killing the
   port (`lsof -ti tcp:3178 | xargs kill -9`) rather than `kill %1`, which was
   not addressing the job that actually owned the socket.
2. **The first hover selector matched a hidden button** elsewhere on the page
   (`button[aria-expanded]` is not unique — the nav uses it too) and timed out.
   Scoped to `section ul button[aria-expanded]`.

Neither was a defect in the change. Recorded because in both cases the *first*
reading of the output was "the feature is broken".

## Notes / follow-ups

**A scratch picker was built and deleted.** `public/map-star-picker.html`
rendered all four options over the real projection with the crest pinned for
comparison. Deliberately removed rather than committed: anything in `public/`
deploys, and `public/` is served with a 4h cache and is not fingerprinted (§6,
§10.21). Regenerating it is a few minutes if another shape is ever wanted.

**Pre-existing §6 violations found while searching, NOT fixed here** — flagged
rather than silently expanded into:
- `components/BrandCard.tsx:18-19` — `<span className="badge">✦ Verified</span>`
  and `✦ Editor&rsquo;s Pick`, using the literal character.
- `components/HeroBrandStrip.tsx:146-152` — `✦` as the brass marquee separator.

Both are exactly what `components/VerifiedSpotlight.tsx:70-73` and
`app/designers/page.tsx:42` were changed away from, with the reason recorded
there: the character is a four-pointed star with no bold weight, and at badge
sizes it falls back to a system font. Worth converting when those files are next
touched.

**The continents are still circles** and should stay that way — they are
texture, not marks, and 2,078 stars would be both visually loud and a much
larger file. If the dot field is ever regenerated, `scripts/gen-world-dots.mjs`
writes a NEW versioned filename; never overwrite in place.
