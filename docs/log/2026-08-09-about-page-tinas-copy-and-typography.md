# /about — Tina's copy, and a type scale that is not a caption

**Date:** 2026-08-09 · **Status:** done

## Goal

Two things Tina asked for in one pass:

1. Put her own words on the About page. The page shipped with a `MISSION` copy slot
   deliberately left empty — inventing brand voice is §10.18 — and she wrote it.
2. *"i dont know if the lettertypes are the same branding and the size of the letters
   because they look so small. and verything looks so boring fix that up"*

## Two decisions taken to Tina before writing anything

- **Brand name.** Her copy says "The Modest House"; the site says "The Modesty House" in
  30 places and the domain is `themodestyhouse.com`. She chose to keep "The Modesty
  House", so the two brand mentions in her text are the only edit made to it. Everything
  else is verbatim, down to the em dashes and curly apostrophes.
- **Placement.** Her copy overlapped what was already on the page — "a curator, not a
  catalogue" was in the existing opening line, and the high-street/layering idea was a
  whole existing band written in a voice that was not hers. She chose *her voice leads,
  the mechanism supports*: her words take the spine of the page, the duplicated bands are
  cut, and the factual bands (how it is built, the standard, the disclosure) stay.

## The typography answer

The typefaces were **already** the house three — Bodoni Moda, Marcellus, Jost, via the
`--font-*` tokens. Nothing on the page was in a foreign family. The problem was size:

| | before | after |
|---|---|---|
| every paragraph on the page | `text-sm` — **14px** | 17px, 18px from `md` |
| section labels (×9) | `.eyebrow` 10px | 11px, tracking 0.3em, with a brass rule |
| h1 | clamp(30, 5vw, 52) | clamp(42, **7vw**, 88) |
| section h2 | clamp(26, 4vw, 40) | clamp(30, 4.6vw, 50) |
| the figures | clamp(34, 5vw, 56) | clamp(40, 6.5vw, 68) |

14px is a UI size — a step *below* the 15px `body` sets — and it was carrying eleven
paragraphs of continuous prose. That, not the font choice, is what read as small.

## What changed

`app/about/page.tsx`, rewritten. `app/globals.css` untouched — every size here is local to
this page, so nothing else on the site moves.

**Structure** (was 10 bands, now 10, but a different 10):

1. **The opening** — asymmetric 7/5 grid at `lg`: title left, her lede right, its second
   sentence in italic plum. Was a centred title over a 14px line.
2. **The photograph** — now always renders, carrying *"I wanted to give them a podium."*
   at clamp(30,5vw,56) italic. The band previously rendered as a bare image because
   `MISSION` was empty.
3. **What this is** — her curator paragraphs, with a **drop cap** on the first.
4. **The figures** — unchanged content, hairline rules between the columns.
5. **How we solve it** — the four steps, as hanging brass numerals over a hairline. They
   were bordered boxes, which made four short paragraphs read as a settings screen.
6. **The standard** — unchanged content, larger type, and a rule between the two lists on
   mobile.
7. **Where this is headed** — her paragraph, at display size. **Cut:** the old three-
   paragraph "Layering, and the high street" band, on her call.
8. The people — still gated on an empty `PEOPLE`, unchanged.
9. Disclosure — unchanged content and its tap-target note.
10. **The close** — *"Welcome to The Modesty House."* replaces "Start with the directory",
    which duplicated the button beneath it.

**Cut entirely:** the old band 4, "What we do / The problem". Her opening says the same
thing in two sentences.

### Four things that needed measuring, not taste

- **The drop cap is not `aria-hidden`.** The obvious build — hide the cap, print
  `para.slice(1)` — makes every screen reader announce *"o this is a curator"*. The span
  holds the real "S" and is left in the accessibility tree. Sized to exactly two lines:
  the copy runs at line-height 1.7, so two lines are 3.4em, and a float of `font-size:
  3.3em` at `line-height: 1` is 3.3em tall.
- **The figures' rules are a 1px grid gap, not borders.** Which cell needs a left border
  depends on the column count, which changes at `md` (2-up → 4-up) — and an inline
  `style={{}}` has no media query, so an `i % 2` rule is right at two columns and wrong at
  four. A `gap-px` over a tinted parent draws every internal rule in both layouts and none
  on the outside edges.
- **The step numerals are `tabular-nums`.** Bodoni's figures are proportional by default,
  so "01" is narrower than "03" and each step's title started at a different x — measured
  230/232/840/840 at 1440 and 89/93/89/95 at 390.
- **The h1 is 7vw, not 8.** Measured off the shipped render: "The archive for" sets to
  6.98em and its column is 7/12 of the inner width, so at 8vw the phrase overflowed its
  column at 768, 819 and 1024 — three of the nine audited widths — and dropped "for" onto
  a line of its own. 7vw is the largest coefficient that holds it on one line from 768 up,
  and changes nothing at 1280+ where the 88px cap already applies. No manual `<br>`: that
  is one width's rag frozen and wrong at the other eight.

### `MEASURE` went from `max-w-3xl` to `max-w-[640px]`

A measure is a character count, not a pixel one, and the reading copy went from 14px to
18px in the same pass. Measured on the shipped render at 18px Jost, 768px carried **89
characters** a line — *"So this is a curator, not a catalogue. A place where modest brands
get a stage, and where"* — against the 65–75 the same comment in that file already names
as the target. 640px lands at about 74.

## Verification

Built in a **git worktree**, not in place: `next-server` was already listening on :3000
from another session, and a build here would have overwritten the shared `.next` under it
(§10.28 rule 4). Turbopack rejects a symlinked `node_modules` (*"points out of the
filesystem root"*) — `cp -al` hardlinks it in 11s instead.

```
$ npx tsc --noEmit                     → exit 0
$ npx eslint app components lib scripts → exit 0
$ npm test                             → Test Files 20 passed | Tests 407 passed
$ curl -o /dev/null -w "%{http_code}" localhost:3178/about → 200   (server proven up first)

$ BASE=http://localhost:3178 ROUTES=/about OUT=.audit/about-v3 node scripts/visual-audit.mjs
chromium/mobile   pages 3 | overflow 0 | overlap 0 | aspect 0 | tap 0 | img 0 | a11y 0 | errors 0 | no-css 0
chromium/tablet   pages 3 | overflow 0 | overlap 0 | aspect 0 | tap 0 | img 0 | a11y 0 | errors 0 | no-css 0
chromium/desktop  pages 3 | overflow 0 | overlap 0 | aspect 0 | tap 0 | img 0 | a11y 0 | errors 0 | no-css 0
webkit/mobile     pages 1 | overflow 0 | overlap 0 | aspect 0 | tap 0 | img 0 | a11y 0 | errors 0 | no-css 0
webkit/tablet     pages 1 | overflow 0 | overlap 0 | aspect 0 | tap 0 | img 0 | a11y 0 | errors 0 | no-css 0
webkit/desktop    pages 1 | overflow 0 | overlap 0 | aspect 0 | tap 0 | img 0 | a11y 0 | errors 0 | no-css 0
```

`no-css 0` on all 12 is the row that matters — it is the assertion that the stylesheet
loaded, without which every other number is decoration (§10.24).

**And then I looked at it**, which is the part the matrix cannot do. The handoff is
explicit that Tina found four real defects by eye after a 276-render run reported clean.
Three passes, each green, each followed by reading the full-page renders at 1:1:

- pass 1 green → found the 89-character measure, the misaligned step numerals, and that
  the two "what gets in" lists ran together as one list on mobile.
- pass 2 green → found the orphaned "for" at 768/819/1024.
- pass 3 green → contact sheet of the headline at 768/819/1024/1280 confirms the same
  three-line break at every width.

None of those three rounds of defects was visible to any check in the harness.

## Notes / follow-ups

- The `PEOPLE` slot is still empty and still gated. It stays empty until Tina supplies real
  names — inventing a person is fabricating a fact about a person.
- Her line *"partnering with modest brands, building edits from the high-street names too"*
  is now a public commitment on the About page. `lib/stylePieces.ts` already hardcodes
  Bershka and PrettyLittleThing on the homepage, which the handoff lists as an open
  editorial question — the About copy now argues *for* high-street pieces as styling
  material, so that item is worth revisiting rather than just removing.
- `.audit/about-v1|v2|v3` are gitignored scratch. Regenerate rather than trust them.
