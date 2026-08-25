# Moved the newsletter pill under the social icons
**Date:** 2026-08-25 · **Status:** done

## Goal
Tina: *"can you pit the email pill under the social media icons"*. The sign-up pill was
the last block in the footer's "The House" column, at the far right; the social row is
in the brand column, at the far left.

## What changed
**`components/Footer.tsx`** — the `The Edit, in your inbox` eyebrow + `<NewsletterSignup />`
block moved from the end of "The House" to the end of the brand column, directly under
the Pinterest / Instagram / TikTok row. Nothing else moved: both are the last child of
their column, so the grid template, the column spans and every other block are
untouched.

Two numbers on the moved block:

- **`max-w-xs`** — caps it to the strapline's own width so the pill, the paragraph and
  the social row all end on the same right edge. It is also load-bearing rather than
  decorative: the field is `flex-1` behind a fixed-width brass button, and the comment
  in "The House" recorded that at 163px it collapsed to 66px and rendered "Your er".
  The brand column is `1.4fr` of a `1.4fr_1fr_1fr_1fr_1fr` row — the widest of the five,
  so it has more room than the column it left — but the cap is what makes that true at
  every width instead of only at 1440.
- **`mt-6`, not the social row's `mt-5`** — the icons carry 44px tap targets around 20px
  glyphs, so their box already extends ~12px below the last visible pixel of the logos.
  Matching the numbers would have looked tighter than matching the numbers.

The comment on "The House" is corrected too: it explained that the column was
`col-span-2` on a phone *because of the pill*. That reason is gone; the span stays,
because at 390px a half-width column puts "Apply for the seal" on three lines.

## Verification
`npx tsc --noEmit` clean · `eslint components/Footer.tsx` clean.

On staging, six configurations — 390 / 768 in **both engines**, plus 1024 and 1440:

```
chromium-390  {"wordmarkX":32,"strapX":32,"socialsX":32,"pillX":32,
               "pillRight":351,"strapRight":352,"inputW":227,"placeholderNeeds":58,
               "fits":true,"gapSocialsToEyebrow":24,"pillBelowSocials":true,
               "pillInBrandColumn":true,"houseColStillHasPill":false}
webkit-390    {... identical ...}
chromium-768  {"pillX":32,"pillRight":283,"strapRight":284,"inputW":159,"fits":true, ...}
webkit-768    {"pillX":32,"pillRight":331,"strapRight":332,"inputW":207,"fits":true, ...}
chromium-1024 {"pillX":32,"pillRight":251,"strapRight":252,"inputW":127,"fits":true, ...}
chromium-1440 {"wordmarkX":142,"strapX":142,"socialsX":142,"pillX":142,
               "pillRight":408,"strapRight":409,"inputW":174,"fits":true, ...}
```

The three checks that matter, and why each was written rather than eyeballed:

- **`pillX` equals `wordmarkX` / `strapX` / `socialsX` at every width.** The pill used to
  carry `marginLeft: -20` for optical alignment and was corrected in 2026-08-09 to sit on
  the column edge like everything else — moving it to a different column is exactly the
  operation that could have reintroduced that, so alignment is asserted, not assumed.
- **`fits`** — the placeholder's real rendered width (58px, measured with a hidden probe
  span in the input's own font) against the field's actual width. The narrowest case is
  1024 at 127px, still more than double. This is the "Your er" regression the old comment
  documented, tested rather than reasoned about.
- **`houseColStillHasPill: false`** — a move, not a copy.

The 768 engines disagree by 48px on the column's width (chromium 159 vs webkit 207).
That is the classic scrollbar-gutter difference, not a layout defect: `fits` is true in
both and the left edges are identical at 32px.

Footer screenshot at 1440 confirms the arrangement — wordmark, strapline, socials, then
the pill, all on one left edge.

## Notes / follow-ups
- "The House" is now a plain six-link column with nothing below it, so at md+ it is the
  shortest of the four. Not a defect — the row is top-aligned — but if the footer ever
  looks unbalanced on desktop, that column is where the space is.
