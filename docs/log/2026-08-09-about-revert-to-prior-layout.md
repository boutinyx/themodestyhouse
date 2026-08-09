# /about — reverted to the prior layout, keeping Tina's copy

**Date:** 2026-08-09 · **Status:** done · **Reverts:** the layout half of `636d081`

## Goal

Tina, verbatim: *"i want the page we have now, but not this one but the one before that
but then with the new text so could you revert"*.

So: the About page as it stood at `28f1981` — before the same-day typography and structure
overhaul — with her copy in it. Not a revert of her words, a revert of my layout.

**I read this wrong once first.** Her previous message was *"i want it like we had before
all of this but after the text i send you"*, and I took "before all of this" to mean before
the mockup detour, i.e. the shipped rebuild. I verified the live site was already that and
reported there was nothing to do. She meant the layout before the rebuild. The second
message made it explicit. Noted in §10 as a mistake, because the cost was a wasted round
trip for her.

## What changed

`app/about/page.tsx` restored wholesale from `28f1981` (`git show 28f1981:… > …`), then the
`MISSION` copy slot filled — the slot the band was built around, and the answer she declined
when first offered it and has now asked for.

Diff against `28f1981` is **31 insertions, 9 deletions, all in the mission slot**:

- `const MISSION = ''` → an array of her six paragraphs.
- `{MISSION ? …}` → `{MISSION.length ? …}`, twice. An empty array is truthy; left as
  `MISSION ?` the band would have rendered its overlay and gradient even when empty, which
  is precisely the "never an empty box" property the original comment claimed.
- The single `<p>{MISSION}</p>` → a map. Six paragraphs in one `<p>` is a wall inside a
  half-width overlay.

Nothing else on the page differs from `28f1981` — not the 14px body, not the 10px eyebrows,
not `MEASURE`, not a band.

### What this therefore undoes

Everything in `636d081` except the words: the 17/18px reading copy, the 11px labelled
eyebrows with brass rules, the larger headings, the drop cap, the hairline step list, the
640px measure, the asymmetric opening. The two bands that commit cut are **back**:
"What we do / The problem", and "Where this is going — Layering, and the high street".

That last one now says the same thing as her own "Where this is headed" paragraph two
screens above it. Flagged to her, not acted on — she asked for this layout, and cutting a
band she did not ask me to cut is how the last round started.

### Copy

Verbatim, her paragraphing. The only edit is the brand name: she wrote "The Modest House"
and chose "The Modesty House" to match the wordmark, the page titles and the domain.

## Verification

```
$ npx tsc --noEmit                      → exit 0
$ npx eslint app/about/page.tsx         → exit 0
$ npm test                              → Test Files 20 passed | Tests 407 passed
$ git diff --stat 28f1981 -- app/about/page.tsx
  app/about/page.tsx | 40 +++++++--------- | 31 insertions(+), 9 deletions(-)

$ curl -o /dev/null -w "%{http_code}" localhost:3179/about → 200   (server proven up first)
$ BASE=http://localhost:3179 ROUTES=/about OUT=.audit/about-rev node scripts/visual-audit.mjs
chromium/mobile   pages 3 | overflow 0 | overlap 0 | aspect 0 | tap 0 | img 0 | a11y 0 | errors 0 | no-css 0
chromium/tablet   pages 3 | overflow 0 | overlap 0 | aspect 0 | tap 0 | img 0 | a11y 0 | errors 0 | no-css 0
chromium/desktop  pages 3 | overflow 0 | overlap 0 | aspect 0 | tap 0 | img 0 | a11y 0 | errors 0 | no-css 0
webkit/mobile     pages 1 | overflow 0 | overlap 0 | aspect 0 | tap 0 | img 0 | a11y 0 | errors 0 | no-css 0
webkit/tablet     pages 1 | overflow 0 | overlap 0 | aspect 0 | tap 0 | img 0 | a11y 0 | errors 0 | no-css 0
webkit/desktop    pages 1 | overflow 0 | overlap 0 | aspect 0 | tap 0 | img 0 | a11y 0 | errors 0 | no-css 0
```

Built in a worktree on :3179 — `next-server` still holds :3000 from another session
(§10.28 rule 4).

Then read at 1:1, because green is not the same as right. Desktop: her six paragraphs sit
on the right half over the plum, inside the 560px band, no growth needed. Phone: the band
stacks below the photograph on aubergine and all six paragraphs are legible.

## Follow-up, same day — the copy moved above the photograph

Tina: *"i want the why this exsist before the photo"*.

The band split in two. "Why this exists" is now its own parchment section between the
statement and the picture; the photograph is a full-bleed image carrying nothing — which is
exactly the "clean image band" the copy slot's original comment described for the empty
case, now permanent rather than a fallback.

Three things this forced, none cosmetic:

- **Two colours had to change.** The paragraphs were `--parchment` because they sat on
  plum — on parchment they are invisible. The eyebrow was `#e7d3b6`, the lighter brass kept
  for dark grounds, which measures about 1.7:1 on parchment. Both revert to the light-ground
  defaults, `--ink` and the plain `.eyebrow`. A move between grounds is never just a move.
- **`pt-0` on the new section.** Band 1 above is also parchment and already carries BAND's
  bottom padding; `py` on both would have left ~190px of dead ground between two text
  blocks of the same colour, which reads as a fault rather than as rhythm.
- **Every band comment after it was renumbered**, 4→5 through 10→11. Stale numbering in
  comments is the cheapest possible lie for a file to tell.

Re-verified: `tsc` clean, eslint clean, 407 tests, and visual-audit over `/about` at 9
widths × 2 engines — 12 renders, **0 findings, `no-css 0` on all 12** — then read at 1:1.

## Three further passes on the same band, same day

Each is one commit, each verified the same way — `tsc`, eslint, the suite, and
visual-audit over `/about` at 9 widths × 2 engines (12 renders, 0 findings, `no-css 0`),
then read at 1:1.

| commit | ask | what it actually took |
|---|---|---|
| `608b955` | *"make it as wide as the screen"* | `MEASURE` off the block, so it runs the full `INNER`. **Stopped at 1220px, not the viewport edge** — that is the line the header pill and the footer sit on, and INNER's own comment records that a band running outboard of them was a measured defect. Measured the cost live with a Range over the first text node rather than estimating: **1156px, ~186 characters a line**, against the 65–75 the MEASURE comment names. Reported to her as a trade, not hidden. |
| `ae6ed42` | *"…this can go"* (the standfirst) | Cut. It predated her copy and repeated her own "So this is a curator, not a catalogue" one band below. **Verified against the SERVED HTML**, not the source: the standfirst's unique phrase `point you to where` → 0. The one remaining `curated index of modest fashion` hit is the site-wide footer, out of scope. |
| this one | *"more why this exists more up"* | Band 1 stops using `BAND`; its `pb` drops 64/96 → 20/28, `pt` kept verbatim so nothing above moves. Measured **96px → 28px** between the headline's box and the eyebrow, live-vs-local, with the live page already carrying `ae6ed42` so the baseline was honest. |

The two are one opening now — same parchment, no rule between them — which is why BAND's
full rhythm was wrong there: it is for separating bands that *differ*.

## Notes / follow-ups

- **The duplicate band.** "Where this is going — Layering, and the high street" (three
  paragraphs, my voice) now sits below her "Where this is headed" sentence. Her call.
- The typographic argument from `636d081` still stands on the evidence — 14px is a UI size
  doing an essay's job — but she has seen both and chosen this one. It is her site.
- `about-layouts.html` is still on disk, untracked, holding the twelve mockups. Nothing in
  it was ever imported or deployed. Delete on request.
