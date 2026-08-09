# /about — a photograph, hover-to-open blocks, and the standard reworked

**Date:** 2026-08-09 · **Status:** done

## Goal

Tina, in one message: drop the "About" eyebrow; put a Higgsfield photograph left of
"Read everything, publish very little" with the text and blocks right; show only the
blocks' titles and open them on hover; round the blocks like the homepage; use the verified
icon on "what gets in" and put "what we don't do" under it without icons; make "what the
seal means" a purple banner like the figures band; keep "Layering, and the high street" but
put "How this is paid for" beside it on the right.

## What changed

`app/about/page.tsx`, new `components/HowBlocks.tsx`, new `scripts/reveal-audit.mjs`, and
`public/about/rail*`.

| ask | done |
|---|---|
| eyebrow out | gone. The `<title>`, the nav's active state and the headline all already say "About". |
| photograph left | `08-rail` from the Higgsfield library — a brass rail hung with garments, which is the literal picture of the heading beside it. |
| blocks right, title only, open on hover | `HowBlocks`, a client component. One open at a time. |
| rounder, like the homepage | `borderRadius: 18` — the Style-It panel's radius, the roundest card the brand uses, and Style-It is on the homepage. The 8px they carried is the site's *tight* radius, for thumbnails. |
| verified icon on "what gets in" | `SealCheck`, filled, brass. **Flagged to her:** the Verified *badge* everywhere else on the site is Phosphor `Sparkle` — which the list already used, so that reading would have been a no-op. `SealCheck` is the seal mark on this page, and is the only reading under which the request changes anything. |
| "what we don't do" under it, no icons | Single column now. Both lists carrying an icon made six items read as one list where three happened to be crossed out — the same confusion that needed a rule between them on mobile earlier today. |
| seal as a purple banner | Its own `aubergine-band`, same treatment as the figures. Every colour swapped to its dark-ground variant: `#e7d3b6` for the label and icon (`--brass` is 4.41:1 there) and `--muted-on-dark` for the caveat (`--muted` goes the *wrong way* on a dark ground). |
| disclosure on the right | Bands 8 and 10 merged into one two-column band. `MEASURE` is off both: each column is already ~540px, inside the 65–75 characters a measure exists to enforce. |

### The photograph could not just be referenced

`higgsfield-library/` is **gitignored** (`.gitignore:72`). An `<img>` pointing into it renders
on this laptop and 404s in production — Invariant 11. So `08-rail.jpg` was copied to
`public/about/rail.jpg` and put through `scripts/optimise-images.mjs`, which is also
mandatory: `lib/staticImage.test.ts` fails on an original with no variants. 1,015KB jpg →
8 / 15 / 23 / 28KB webp. `sizes` is `(min-width: 768px) 40vw, 100vw` — this is a **column**,
not the viewport, and `100vw` would have the browser fetch the 1920 candidate for a 460px box.

## The hover reveal was broken twice, in opposite engines

This is §10.25 territory — a control that only opens on hover is unoperable on every Apple
device — so it was written as React state from the start, with mouse, touch and keyboard as
three separate inputs. It was still wrong twice, and **each fault was visible in only one
engine**:

1. **Touch tap did nothing** (WebKit and Chromium). A tap does not only produce a click;
   the browser synthesises the pointer sequence around it. Instrumented on the real element,
   a Chromium tap fires `pointerenter:touch → pointerdown → pointerleave:touch → mousedown →
   click`. With hover bound to plain `onMouseEnter`, the enter opened the block and the click
   toggled it straight shut. → hover now gates on `pointerType === 'mouse'`.
2. **Chromium tap still did nothing, WebKit was fine.** Chromium's touch emulation — and
   Android — **moves focus to a `<button>` when you tap it**, which is §10.25's Safari
   behaviour in reverse. `onFocus` opened the block, the click closed it. → `onFocus` deleted.
   Enter/Space on a real `<button aria-expanded>` is the standard disclosure interaction and
   cannot collide with anything.

Neither would have been found by any static render, and testing one engine would have shipped
one of them.

### And the harness lied first

The initial run reported WebKit failing everywhere, including hover. That was **not the site**:
the ad-hoc probe did not strip HSTS and `upgrade-insecure-requests`, so over plain-http
localhost WebKit rewrote every subresource to `https`, TLS failed, **no JavaScript loaded**,
and every interaction "failed" against a page that was never interactive. §10.24 and §10.26,
reproduced in my own throwaway script hours after citing them. The permanent script strips
the headers and gates on real hydration (`window.next`), not on the button's presence — the
button is in the SSR'd HTML, so its presence proves nothing (§10.28 #2).

## `scripts/reveal-audit.mjs`

Kept, rather than thrown away, because §10.25 says so: anything that only exists after an
interaction needs an audit that performs the interaction. 7 cases — tap / hover / keyboard
across both engines at phone, iPad and desktop. It asserts the **closed** state as well as the
open one, which is the negative control (§10.28 #1): I watched it fail on the unfixed code
three times before trusting it. Exits non-zero on failure.

```
npm run build && npx next start -p 3189
BASE=http://localhost:3189 node scripts/reveal-audit.mjs
```

## Verification

```
$ npx tsc --noEmit                                  → exit 0
$ npx eslint app/about/page.tsx components/HowBlocks.tsx → exit 0
$ npm test                                          → 21 files, 420 tests passed
$ BASE=http://localhost:3189 node scripts/reveal-audit.mjs
PASS webkit iPhone390 TAP   PASS webkit iPad1366 TAP   PASS chromium 390 TAP
PASS chromium 1440 HOVER    PASS webkit 1440 HOVER
PASS chromium 1440 KEYBOARD PASS webkit 1440 KEYBOARD          → ALL PASS, exit 0

$ BASE=http://localhost:3189 ROUTES=/about OUT=.audit/about-final node scripts/visual-audit.mjs
chromium mobile/tablet/desktop, webkit mobile/tablet/desktop
  → 12 renders | overflow 0 | overlap 0 | aspect 0 | tap 0 | img 0 | a11y 0 | errors 0 | no-css 0
```

Then read at 1:1. One thing that only showed there: at `aspect-[4/5]` the figure stood 609px
against a 407px text column and hung 200px below the last block. `md:aspect-square` puts it
at 460px, between the closed height and the height with a block open, so it reads level
either way.

**Two build breaks while writing the comment that explains a build break.** A JSX expression
comment inside an opening tag is a syntax error (caught by the build, not typecheck); then
quoting the brace-slash-star form *inside* a JSX comment closed the comment early (caught by
tsc). §10.27 said a comment in a template literal is inside the string; the general rule is
that a comment is part of the syntax it sits in, and a note *about* a syntax trap is the most
likely thing to contain one.

## Notes / follow-ups

- **`SealCheck` vs `Sparkle`** — see the table. If she meant the site-wide Verified mark, this
  is a one-line change.
- **`scripts/reveal-audit.mjs` should fold into `scripts/interaction-audit.mjs`.** It is kept
  separate only because another live session has uncommitted changes to that file right now
  (§10.17: this repo has concurrent sessions), and colliding with them would be worse than a
  second script. Merge it once theirs lands.
- No `npm run` alias was added, to avoid touching `package.json` while other work is in flight.
- The hover reveal reflows the column as a block opens. That is inherent to "only the title
  shows" and was accepted, not overlooked.
