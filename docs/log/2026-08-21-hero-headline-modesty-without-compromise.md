# Hero: swap in the "Modesty, without compromise." mockup, then revert the headline back
**Date:** 2026-08-21 · **Status:** done

## Part 1 — the mockup pass
Tina re-sent an earlier mockup screenshot ("MODESTY, WITHOUT COMPROMISE." /
"A new destination for considered fashion." / an outlined "EXPLORE THE
ARCHIVE" button) and said: "i wanted it to be like this" — she wanted that
specific content, not the "EVERYTHING MODEST. FINALLY IN ONE PLACE." text
from the immediately preceding revision.

`app/page.tsx`, hero section — content only, layout untouched:
- Headline → "Modesty, without compromise." set in uppercase (matching the
  mockup's all-caps treatment) at `clamp(36px, 6.2vw, 84px)`.
- New subhead `<p>` — "A new destination for considered fashion." — in
  `--font-ui` (Jost, the site's body typeface), not `--font-label` (the
  small-caps one `.eyebrow`/`.badge` use), since the mockup's subline reads
  as a plain body sentence, not another label. Colour is
  `rgba(251,250,246,0.78)` rather than the flat `--muted` token, since
  `--muted` is tuned for light backgrounds and would read muddy on a photo.
- New CTA `<Link href="/directory">` reusing `.btn-pill` for its shape/type
  but overriding to an OUTLINED style (`background: transparent`, a
  parchment border) via inline `style` — every other CTA on the site is
  solid aubergine `.btn-pill`; a solid fill directly on a photograph would
  compete with it rather than sit on it, which is why this one deliberately
  breaks from that pattern.

## Part 2 — headline reverted, size restored
Minutes later, Tina: "can you also de the text same size and check the text
into the archive for everything modest." Two changes, subhead and CTA left
untouched:
- Headline text → back to **"The archive for *everything* modest."** — the
  site's original, long-standing tagline (already the default in
  `app/layout.tsx` and `public/llms.txt`, and the subject of the
  2026-08-19 log entry this had briefly superseded). Sentence case + italic
  accent on "everything," not the mockup's all-caps treatment — restoring
  the ORIGINAL text meant restoring its original styling too, not keeping
  the uppercase transform.
- Font size → back up to `clamp(40px, 7vw, 96px)`, the same clamp the
  first left-aligned pass used. The mockup headline's smaller clamp
  (36–84px) exists specifically to keep an all-caps three-line headline
  from overflowing at that length; a two-line, mixed-case headline doesn't
  need the same ceiling.

## Part 3 — sized back down
Minutes later, Tina: "its far to big make the letters smaller." The 96px
ceiling from Part 2 read oversized once live. Dropped to
`clamp(30px, 4.5vw, 64px)` — close to the size the headline had before any
of today's left-alignment work (`text-4xl md:text-6xl`, ≈36–60px), rather
than another guess at a new number.

## Part 4 — all caps
Right after, Tina: "can you make it all caps." Added `uppercase` to the
`<h1>` alongside its existing `serif` class — text content and the italic
accent on "everything" are unchanged, only the CSS transform is new, so
this is reversible without touching the copy again.

## Part 5 — kept off the models
Right after, Tina: "its too long now it touches the women can you fix
that." Upper-casing (Part 4) widened the line — capitals in this typeface
run wider per-letter than mixed case, with no ascenders/descenders to
economise on — so "EVERYTHING MODEST." on one line now reached far enough
right to meet the models on the photo's right side. Added
`maxWidth: 620` to the `<h1>`, which forces "EVERYTHING" onto its own line
(three lines total instead of two) and stops the text short of them. The
models' position in the photo is fixed, so the fix is the text stopping
short, not anything about the image.

## Verification
- `npx tsc --noEmit` — clean, after every pass.
- `npx eslint app/page.tsx` — clean, after every pass.
- `npx vitest run --exclude ".claude/**"` — 722/722 passing, 44/44 files,
  after every pass.
- Screenshotted at 1999×900 and 390×844 (mobile) after the final state:
  "The archive for *everything* modest." headline at the larger size, the
  "A new destination for considered fashion." subhead, and the outlined
  "Explore the archive" button all present, left-aligned, no search bar.
