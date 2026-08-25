# New drape photograph on the seal band, copy centred, dark overlay
**Date:** 2026-08-25 · **Status:** done

Third and fourth photographs on this band in one evening. Earlier passes are in
`2026-08-25-seal-band-satin-background.md`, `-more-visible.md` and
`-scrim-removed.md`; this entry covers everything after Tina replaced the image.

## Goal
1. *"use this one and put the text in middle"* — with
   `~/Downloads/Satijngolven in aubergine, bessen en lila.png` (1672x941), her own
   generated image: drapery framing a bright cream centre.
2. *"make the banner a bit tinner and put a darker overlay on it"*.

## What changed

**Assets.** `public/seal-band-drape.jpg` + `.webp` variants at 640/1024/1440/1672,
generated in **one step** from her PNG rather than via the committed JPEG.
Registered in `scripts/optimise-images.mjs`. 1672 is the source's own width and
this script never upscales, so there is no point asking for more.

**Layout.** Copy is `max-w-[46ch] mx-auto text-center` rather than `max-w-2xl`
left — the clear cream area is about 42% of the frame and a 672px column at 1440
spills onto the right-hand drape. Band is `min-h-[340px] md:min-h-[440px]`, down
from 440/560.

**The overlay is flat `rgba(0,0,0,0.60)`.** Flat rather than a ramp because the
copy is centred now, so there is no side to weight it towards.

It was aubergine at 0.75 first, and that was wrong — Tina: *"i said darker not
purple overlay"*. **An aubergine wash darkens the band but also tints it**: it
drags the drapery's own plum towards one flat hue and turns the cream wall lilac.
Black takes the luminance down and leaves the photograph's colour alone. The
satin still reads purple because the satin *is* purple. Worth keeping as a rule —
"darker" and "more of our brand colour" are different requests and the aubergine
token quietly answers the second one.

## Why 0.60

The picture's middle is a bright cream wall, so a light overlay parks the band in
the **mid-tones — the one place where neither dark nor light type works.**
Measured on the live render at 390/820/1440, worst pixel inside each text
element's own rect, heading / steps:

| black overlay | light copy | dark copy | |
|---|---|---|---|
| 0.00 | 1.15 / 1.01 | 8.37 / 7.83 | dark only |
| 0.35 | 2.70 / 2.25 | — | |
| 0.45 | 3.68 / 3.06 | — | |
| 0.50 | 4.32 / 3.58 | — | |
| 0.55 | 5.09 / **4.20** | — | **the trap** |
| **0.60** | **6.10 / 5.00** | 1.87 / 1.83 | **shipped** |
| 0.65 | 7.35 / 6.00 | — | |

**0.55 is the trap**: the heading passes at 5.09 and the band looks finished,
while the step text sits at 4.20 against a 4.5 threshold. Only one of the three
measurements would have told you.

Shipped, verified on the deployed page: `heading 6.10 · steps 5.00 ·
numerals 6.87` worst case across the three widths.

## The casualty: the gold numerals

`--brass-on-dark` is 6.08:1 on **flat** aubergine, which is what the band used to
be. Over this photograph the residual cream keeps the background too light and it
**never reaches AA at any overlay this side of erasing the picture** — under the
shipped black overlay it is 3.12 at 0.60 and still only 3.71 at 0.65; under the
rejected aubergine one, 2.19 at 0.60 and 3.23 at 0.75. A centre-heavy radial
(`.92/.70/.40`) only gets it to 4.29 and costs the phone (heading 4.95).

They are `--parchment` now: an existing token, rather than a new lighter brass
invented for one band. **`#e8d3ac` measures 5.02 under the shipped overlay and is the fix
if the gold is wanted back** — that is Tina's call, and she was told rather than left to notice.
The italic serif is what still separates a numeral from its step text.

## The intermediate bright version, and its three defects

Between the two instructions the band shipped bright, with dark copy. Worth
recording because all three faults were found by measuring, and none of them was
visible in a screenshot:

1. **Phone heading 1.03:1** — dark ink on dark satin. `object-cover` on a short
   band crops the **width**, so at 324px the phone showed only the middle 68% of
   the frame and the top-left drape ran straight through the heading. A *taller*
   phone band shows *less* width and more clear centre: 324 → 1.03, 400 → 7.23,
   460 → 7.32. **This is the opposite of the rule that held for the previous
   photograph**, where taller meant more picture — the constraint flips with the
   aspect ratio.
2. **Numerals in `--brass` at 1.60:1** on cream, barely above white-on-white.
   `--plum` 3.62, `--aubergine` 7.05.
3. **The CTA's brass pill at 1.28:1 against the photograph** — the control's edge
   did not separate from its background (WCAG 1.4.11 wants 3:1 for a boundary).

Both colour decisions inverted again when the overlay landed, which is the honest
summary of the whole evening: **every colour on this band is a function of what is
behind it, and it changed four times.**

## Verification
- `npx tsc --noEmit` exit 0 · `npx eslint app/page.tsx` exit 0 · 781 tests pass.
- Contrast re-measured on the deployed staging page after each push, with the
  stylesheet-loaded assertion, at 390 / 820 / 1440. Final: **6.10 / 5.00 / 6.87**,
  read off the live page with `rgba(0, 0, 0, 0.6)` confirmed as the computed
  overlay in the same call.
- Screenshotted at 1440 and 390.

## Notes / follow-ups
- **The harness lied once, in the familiar direction.** The measuring script hid
  every `:scope > div` in the band to expose the background — which hid the new
  overlay too, so the first run after adding it reported `1.15 / 1.01 / 1.35 FAIL`
  against a background of `(242,230,221)`, i.e. bare cream. A whole category
  failing at once is the §10.26 signal; the fix was to skip `[aria-hidden]`
  children. Nothing was wrong with the site.
- The previous `seal-band-satin*` assets are still committed and now unused.
  Left in place deliberately — three of today's four versions are one commit
  revert away, and the images are the expensive part.

---

## Follow-up: Tina's marketing copy replaced the seal pitch

She supplied the band's words verbatim — a two-sentence lead, three steps, and
`Market with The Modesty House` as the CTA — repositioning it from a seal
application to a marketing offer. Set exactly as given; nothing rewritten.

**The type is smaller than the slot it inherited.** The old heading was seven
words at `clamp(24px,3vw,36px)`; the new lead is 35, which at that size renders
as six lines and ~250px on its own — more than half the band she had just asked
to make thinner. It is now `clamp(18px,1.9vw,24px)` at line-height 1.4, still an
`<h2>` so the page outline is unchanged.

**The column widened 46ch → 62ch.** 46ch was chosen when the band was *bright*
and the copy had to stay inside the picture's clear cream centre. With a uniform
black overlay the whole band is dark, so the column no longer has to dodge the
drapes. Measured at 1440:

| column | h2 lines | band height | contrast |
|---|---|---|---|
| 46ch | 6 | 555px | 6.10 / 5.45 / 7.10 |
| **62ch** | **4** | **488px** | **6.18 / 5.28 / 6.95** |
| 70ch | 3 | 442px | 6.20 / 5.22 / 6.84 |

Contrast is flat across all three because the extra width reaches into the
**drapes, which are darker than the centre**, not brighter — the opposite of what
widening a text column into a photograph usually costs. 70ch is on the table if
the band needs to be thinner still.

Final, verified on the deployed page: 1440 `488px, 4 lines, 6.18/5.28/6.95` ·
820 `440px, 3 lines, 6.10/5.12/7.41` · 390 `399px, 5 lines, 6.10/5.34/7.86`, zero
elements overflowing the band at any width.

## Open, and deliberately not decided here
**The CTA still points at `/contact?topic=seal`**, which deep-links the contact
form to its "Apply for the seal" option — wrong for a marketing enquiry.
`lib/contactTopics.ts` has no marketing entry and adding one is an editorial
decision, not a side effect of a copy change, so it is flagged rather than
guessed at.

**Nothing on the homepage states the seal standard any more.** This band was the
last surface that did (the note above `DesignerDiscovery` said so, and has been
corrected). `/about` still explains it and the footer still links "Apply for the
seal", so the standard is not unreachable — but the homepage no longer carries it.

---

## Correction: the old title stays

*"i did wnated you to keep the old title"*. **"Are you a modest fashion house?
Apply for the seal." is restored as the `<h2>`**, at its original
`clamp(24px,3vw,36px)/1.05` — it is one of the four homepage headings that move
as a set (`2026-08-24`, the "titles like these need to be smaller" pass), so its
size is not free to drift.

Her paragraph is now a `<p>` **under** it, at the band's own body colour and size
(`#e7d8e4`, `clamp(15px,1.15vw,17px)/1.6`), so it reads as prose beneath a display
heading rather than as a second heading.

**The error was reading the title and her copy as alternatives.** The copy she
sent had no heading line in it, so the paragraph looked like a replacement for
the one that was there. It was a lead paragraph. Nothing in the message said
"replace the heading" — that was inferred, and it was wrong.

The two comments elsewhere in `app/page.tsx` were corrected again with it. The
band now **names** the seal in its heading while its body and button are a
marketing pitch; `/about` is where the standard is actually explained.

Final, on the deployed page — heading / lead / steps / numerals, worst case:
`1440 525px 6.18 / 5.00 / 5.34 / 7.10` · `820 493px 6.10 / 4.84 / 5.36 / 7.52` ·
`390 436px 6.10 / 4.78 / 5.45 / 7.86`. All above 4.5, zero elements overflowing
the band at any width.

**The lead paragraph is the tightest thing on the band at 4.78:1.** It is
`#e7d8e4`, the same colour as the step text, but it sits higher where the picture
is brighter. There is no headroom left for a lighter overlay without it failing.

---

## Final: "apply for the seal ccan go"

Tina, seeing the restored title rendered. **Only the italic second sentence
went** — she named that phrase, not the title — so the heading is
"Are you a modest fashion house?" at an unchanged `clamp(24px,3vw,36px)`. That
also settles the contradiction the band carried while both existed: a heading
saying *Apply for the seal* over a body and a button selling marketing.

**The CTA's deep link followed it.** `topic=seal` was still pre-selecting "Apply
for the seal" on the contact form for what is now a marketing enquiry, so
`lib/contactTopics.ts` gains `{ value: 'marketing', label: 'Marketing' }` and the
button points at `/contact?topic=marketing`. The seal topic itself **stays** —
the footer still links it and `/about` still explains the standard. The new
label is the plainest functional string that makes the dropdown and the email
subject work, not chosen copy, and the file says so; only `value` is referenced
anywhere, so renaming it is free.

The band now mentions the seal **nowhere** — not in its heading, body or button —
so the note above `DesignerDiscovery` was corrected a third time to say that
plainly. `/about` and the footer are the only surfaces left that name it.

### Verified on the deployed page
| width | band | overflow | "seal" in the band | heading / lead / steps / numerals |
|---|---|---|---|---|
| 1440 | 487px | 0 | **0** | 6.18 / 4.96 / 5.28 / 6.95 |
| 820 | 467px | 0 | **0** | 6.10 / 4.82 / 5.26 / 7.61 |
| 390 | 436px | 0 | **0** | 6.10 / 4.78 / 5.45 / 7.86 |

`/contact?topic=marketing` was opened in a real browser and the form's select
reads `marketing / label=Marketing` — the new topic is not just declared, it is
accepted by the validator (`TOPICS.some(...)` in `app/contact/page.tsx`) and
pre-selected. tsc clean, eslint clean, 781 tests pass.

### The whole evening, in one line each
1. Plum satin macro + left-weighted aubergine scrim.
2. Scrim opened up so the picture read.
3. Scrim removed entirely; contrast knowingly sacrificed.
4. Band grown to zoom out — desktop only, because the phone's constraint inverts.
5. New drape photograph, copy centred, every colour flipped to dark.
6. Thinner band + overlay; the aubergine one tinted, so black at 0.60.
7. Tina's marketing copy; column widened 46ch → 62ch to hold the band's height.
8. Title restored above it as the lead's heading.
9. "Apply for the seal" dropped from the heading and the deep link.

**The recurring lesson**: every colour on this band is a function of what is
behind it, and the background changed four times. Each change silently
invalidated a contrast decision made against the previous one, and not one of
those invalidations was visible in a screenshot.

---

## Follow-up: tighter step spacing

Tina, pointing at the three steps: *"letss spaing between these"*.
`space-y-3` → `space-y-1.5`, i.e. **12px → 6px** between list items.

`mt-6` above the `<ol>` is deliberately **not** reduced with it — the ask was the
spacing *between the steps*, and closing the gap to the lead paragraph as well
would merge the list into the prose. Measured on the deployed page: step gaps
`[6, 6]px`, gap from the paragraph unchanged at `24px`, band 475px at 1440 and
424px at 390, zero elements overflowing at either width.

---

## Follow-up: purple pill, white letters

Tina: *"instead of the gold pill i want a purple with white letters"*.

**That is `.btn-pill`'s own default** — `background: var(--aubergine)`,
`color: var(--parchment)` — so the change is deleting the inline override, not
writing a new colour. The override existed only because this band used to be flat
aubergine, where an aubergine pill would have been invisible.

Verified on the deployed page at 1440 and 390: computed `rgb(68, 25, 67)` on
`rgb(250, 247, 241)`, `letters-vs-pill measured 13.40:1` by sampling the rendered
pixels inside the pill (not by trusting the token values).

**The trade, on the record.** 13.40 is the best text contrast this button has had
on this band — brass with ink letters measured 3.03. What it costs is the pill's
**edge**: the band immediately around it sits at luminance 0.052–0.079, so the
aubergine body is only **1.75:1** against it, under the 3:1 WCAG 1.4.11 asks of a
control's boundary. Brass was 2.52 and also short of it, so this is not a
regression against a passing state. `--plum` is worse on both counts (1.11 edge,
6.88 text), which is why aubergine is the right purple of the two.

A 1px hairline in `--brass` or `--parchment` at low opacity would take the
boundary over 3:1 without touching the fill. Flagged, not added — she asked for a
purple pill with white letters and that is what is there.
