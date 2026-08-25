# The phone brand band, 40px -> 28px
**Date:** 2026-08-25 · **Status:** REVERTED (same day, never reached production)

## Goal

Tina, with a screenshot from her own iPhone: *"the banner on the top with the
brands ... its pretty big on iphone and we get it so it shows the background at
the time and battery"*.

## Why it looked bigger than it is

The band is `--band-height`, which was **40px**. What her screenshot actually
shows is that 40px **plus roughly 59px of iOS status bar**, which Safari tints
with whatever colour sits at the top of the document — here the band's own
`--aubergine-deep` (#1e0a1d). So the strip visually annexes the clock and the
battery and reads as a ~99px slab of near-black rather than a 40px ticker.

That mattered for choosing the fix: shrinking the band is the half of it we
control, and it shrinks the *whole* perceived slab because the tinted status bar
sits directly on top of it.

**The tint is iOS behaviour and could not be verified here.** Device emulation
sets the viewport, not the OS chrome — CLAUDE.md §10.24, the same trap as
"iPhone dimensions in Chromium is not an iPhone". It was read off her handset,
not reproduced. Said out loud rather than implied.

## The ask was genuinely ambiguous, so it was put to her

Three readings of *"we get it so it shows the background at the time and
battery"* — keep the tint and slim the band; drop the band on phone so the hero
photograph runs under the status bar; or keep the band but stop it tinting the
status bar. §10.29: when a request fits more than one reading, name the
candidates and ask rather than reason to a conclusion. She chose **slim the
band**.

## What changed

One token, `app/globals.css`: `--band-height: 40px` → **28px**.

That is the whole change. Nothing else needed touching, and that is by design —
the token exists precisely so this is a one-line edit. `.hero-vh` computes
`calc(100svh - var(--band-height))`, so the hero photograph automatically
reclaims the 12px and still ends exactly at the fold. A padding-derived height
would not have done that; the comment at the declaration already said so.

**Scope stated rather than hidden:** the token is one value for phone AND
tablet, so the tablet band slims with the phone. Her report was about a phone.
Adding a third breakpoint for a decorative ticker looked worse than the
consistency, but it is one line if the tablet should stay at 40px.

Desktop is untouched — the 1024px query already zeroes the token and the band is
`lg:hidden`.

## Verification

`npx tsc --noEmit` → 0 · `npm run lint` → 0 · build clean.

Measured at three widths in **both engines**, with the CSS-loaded assertion, and
with the HSTS/CSP headers stripped for WebKit over plain-http localhost (§10.24
— without that WebKit renders with no stylesheet and every number is garbage
while still looking like a successful run):

```
chromium  phone    token 28px  band 28px  hero 816  css rgb(250,247,241)
chromium  tablet   token 28px             hero 816
chromium  desktop  token 0px   band none  hero 844
webkit    phone    token 28px  band 28px  hero 816  css rgb(250,247,241)
webkit    tablet   token 28px  band 28px  hero 816
webkit    desktop  token 0px   band none  hero 844
```

**`hero 816 = 844 − 28` is the load-bearing number here.** It proves `.hero-vh`
picked up the new token and the photograph still ends at the fold — the exact
failure the declaration's comment warns about, and the original complaint ("i
still see a big piece of the pciture") that produced `--header-height`.

Desktop stays at the full 844 with no band, so nothing regressed above 1024px.


---

## Reverted

Tina, after seeing it on staging: *"yeah nevermind revert back"*. `--band-height`
is 40px again. It never reached `main`, so production was never on 28px.

**The code comment at the declaration was kept, not deleted**, and rewritten to
record that 28px was tried and turned down. Two reasons:

1. The finding underneath it is still true — the band reads far bigger than its
   40px because iOS tints ~59px of status bar with the colour at the top of the
   document. Anyone who measures 40px in a browser and wonders why it was called
   "pretty big on iphone" is looking at the wrong 40 pixels.
2. Without the note, the next person to see that screenshot re-derives the same
   change and re-proposes it. A rejected option is a decision, and decisions are
   what these comments are for.
