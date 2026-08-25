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

---

## The two smaller story cards, same day

Tina: *"make the other ones also smaller the back to class and still boiling"* —
the `moreStories` cards beside the feature one.

Measured at 390px before changing anything: both titles were **18px wrapping to
three lines** (65px) inside a 110px card. The same titles take two lines on
desktop, so the phone was the outlier.

`fontSize: 18` was **also inline**, exactly like the feature title — so the same
move: out of the TSX, into `.edit-more-title`, 18px base and 15px on phone.
Colour and line-height stay inline per §6.

### 15px alone was not enough, and the reason is the useful part

```
15px, no clamp:  "Back to Class, No Fuss…"        2 lines (36px)
                 "Still Boiling, Feeling Fall…"   3 lines (54px)
```

The two cards sat unevenly because the titles are different lengths. Dropping to
14px would have fixed today's pair and been the same mistake as tuning the
feature card's font to one headline — so they are **clamped to two lines**, like
the feature title above.

```
after:   both 36px, even.  "Still Boiling" truncates (it is the longer one),
         "Back to Class" does not.
desktop: unchanged — 18px, 43px, neither truncated.
```

`npm run audit:mobile`: `overflowing 0/9 | stacked text 0 | broken aspect 0` in
both engines. The single `a11y 1` is the seal band's brass pill, unchanged and
not from this work — see the 2026-08-25 entry.
