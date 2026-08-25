# The feature card's title — smaller, and actually applying
**Date:** 2026-08-26 · **Status:** done (staging)

## Goal

Tina: *"can we make the title smaller"* — the headline on the homepage's feature
editorial card, which went 16:9 on phones the day before.

## The change was two lines; the finding was that the previous one had not worked

Setting the phone `font-size` to 15px changed nothing, and the check caught it:

```
phone  fontSize: "30px"   <- the media query said 15px
```

The title carried `style={{ fontSize: 30, ... }}` **inline**, and an inline style
beats a class outright. Every `font-size` written into the phone media query the
day before had been silently ignored.

Two consequences worth being precise about:

1. **The card had been shipping a 30px title inside a 183px box.** It did not
   overflow only because `-webkit-line-clamp: 2` — which is *not* set inline —
   did apply, so it truncated to two 32px lines with an ellipsis.
2. **The previous day's log credited a font change that never happened.** The
   caption's 209px → 185px drop was **entirely** the padding going 28px → 16px
   (28−16 = 12, twice = 24; 209 − 24 = 185). That entry now carries a correction.

Same class of trap as the scrim on this very card, which needed `!important` for
exactly the same reason — and the file already said so, two rules above.

## What changed

- `style={{ fontSize: 30 }}` removed from the title in `app/page.tsx`. Colour and
  line-height stay inline per §6; **size does not belong there**, because size is
  the thing that needs to be responsive.
- `.edit-feature-title { font-size: 30px }` as the base rule, `15px` in the
  `max-width: 767px` block.

Chose moving the declaration over adding `!important`. The scrim needed
`!important` because its gradient is genuinely a per-instance inline value; a
font size is not, so the honest fix is to stop writing it inline at all.

## What 15px buys beyond being smaller

The full headline now fits inside the two-line clamp:

```
            fontSize  titleBox  truncated  caption  fits in card
phone       15px      298x32    false      83       true
desktop     30px      618x65    false      144      true
```

At 30px it was truncating with an ellipsis. At 15px `scrollHeight` no longer
exceeds `clientHeight`, so "The Best Abaya Brands, Sorted by What They Actually
Cost" reads in full. The clamp stays as the guard for a longer title later.

Caption dropped 116px → **83px** in the 183px card, so the photograph gets more
room — which was the point of making the card 16:9 in the first place.

Desktop is untouched: 30px, not truncated, caption 144px in the 460px card.

## Verification

`npx tsc --noEmit` → 0 · `npm run lint` → 0 · build clean · measured in WebKit at
390 and 1440, with `getComputedStyle` read directly rather than inferred from
layout — which is the specific habit that caught the bug above.
