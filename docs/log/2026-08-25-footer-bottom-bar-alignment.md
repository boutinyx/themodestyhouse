# The footer's bottom bar on a phone
**Date:** 2026-08-25 · **Status:** done (staging)

## Goal

Tina, with an iPhone screenshot of the footer's last two rows: *"fix this footer
on phone"*. The copyright sat hard against the left edge while the currency /
Privacy / Terms row below it sat centred, so the two rows visibly did not line
up.

## The cause, measured rather than eyeballed

The bar is `flex flex-col md:flex-row items-center justify-between`. On a phone
that is a column with `items-center`.

**`items-center` centres each child as a BOX. It does not centre text inside a
box that is already as wide as its parent.** The copyright is a plain `div`, so
it fills the row's full width and its text keeps the default `text-align: start`
— it wraps to two lines and both hug the left edge. The Privacy/Terms row is an
inline-flex, so it is only as wide as its contents and genuinely gets centred.

Measured at 390px, before:

```
bar 326 wide, flex-direction column, align-items center
copyright  326 wide, text-align start,  left edge x=32
links      244 wide,                    left edge x=73
```

A **41px** mismatch, and the copyright wrapping to two lines is what made it
obvious rather than subtle.

## What changed

One class in `components/Footer.tsx`: the copyright div gains
`text-center md:text-left`.

Not `items-*`, not a width, not a wrapper. The boxes were already centred
correctly; only the text inside the wide one was not.

## Verification

`npx tsc --noEmit` → 0 · `npm run lint` → 0 · build clean.

The check that matters is that the two rows share a centre axis, so that is what
was asserted rather than "it looks better":

```
            direction  copyAlign  copy centre  links centre  match
webkit    phone    column   center     195          195           true
chromium  phone    column   center     195          195           true
webkit    desktop  row      left       343          1176          false (correct)
chromium  desktop  row      left       343          1176          false (correct)
```

195 is exactly 390/2. Desktop is deliberately *not* matched — it is
`flex-row justify-between`, so the two ends belong at opposite edges; the
`md:text-left` keeps that untouched. Both engines agree, which matters because
the report came from an iPhone (§10.24).

Also measured at 320 and 430: `text-align: center` at both, no horizontal
overflow at any width.

`npm run audit:mobile`, both engines:

```
chromium  overflowing 0/9 | a11y 0 | stacked text 0 | broken aspect 0
webkit    overflowing 0/9 | a11y 0 | stacked text 0 | broken aspect 0
```

## Note

The copyright still wraps to two lines on a phone. That is fine now that it is
centred, and shortening the string would be a copy change nobody asked for
(§10.18). Left as is.
