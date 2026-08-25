# The homepage's feature editorial card is 16:9 on a phone
**Date:** 2026-08-25 · **Status:** done (staging)

## Goal

Tina: *"i wanted the editorials on the end of the homepage to be that [16:9] or
at least the most recent one"*, then *"i mean the one with the best abaya
brand"*.

That is the **feature card** — `posts[0]` in `app/page.tsx`, currently the best-
abaya-brands guide. Confirmed by what it serves rather than by reading the code:
the card's `currentSrc` is `mirror-selfie-abayas-4-*.webp`, the cover replaced
earlier today.

This followed a **reverted** attempt at the same request on the hero — see
`docs/log/2026-08-25-phone-hero-16-9.md`, and §10.29 in CLAUDE.md.

## What changed

`minHeight: 460` came off the inline style and became `.edit-feature-card`:
460px from `md` up, `aspect-ratio: 16/9` below it.

768px because that is where this card's own grid parent already collapses
(`grid-cols-1 md:grid-cols-[1.5fr_1fr]`), so the card changes shape exactly where
it stops sharing a row.

`min-height: 0` in the phone rule is load-bearing, not tidiness: an
aspect-ratio cannot shrink a box below its own min-height, so leaving 460 in
place would keep the card 460px tall and the ratio would silently do nothing —
which looks exactly like the rule not applying.

### Two things the ratio broke, both found by measuring rather than by eye

**1. The caption did not fit.** At 390px the card is 183px tall, and the caption
measured **209px** — taller than the card. The card is `overflow-hidden`, so 26px
off the top of the headline was simply cut away.

Dropping the title to 19px got it to 185px. Still 2px over — and that number is
the point: it was being tuned to *one particular headline*. "The Best Abaya
Brands, Sorted by What They Actually Cost" is long, and the next post could be
longer.

So the title is **clamped to two lines** (`-webkit-line-clamp: 2`) at 17px, with
14px padding. Caption is now **116px in a 183px card**. Two lines is a property
that holds for any title; a font size is a guess about one. The full headline is
one tap away on the post page.

**2. The scrim stopped reaching the caption.** The gradient is
`...rgba(36,27,36,0) 55%`, tuned to the 460px desktop card. On a 183px card that
covers only ~82px while the caption is 116px, so the "GUIDES" eyebrow sat on
bright photograph and was barely readable. The phone rule extends it —
0.86 at the base, 0.45 at 55%, transparent at 100%.

`!important` on that override, deliberately: the gradient is an **inline style**
on the element, and an inline style beats a class outright. The desktop value
stays in the TSX so both are read together, with a comment on each side.

## Verification

`npx tsc --noEmit` → 0 · `npm run lint` → 0 · build clean.

Both engines, four widths. The 767/820 pair is the breakpoint boundary, and
desktop proves nothing regressed:

```
                    card       ratio  caption  fits   image
webkit  phone       326x183    1.778  116      true   ok
webkit  phone-max   703x395    1.778  120      true   ok
webkit  tablet      434x460    0.944  176      true   ok
webkit  desktop     674x460    1.466  144      true   ok
chromium — identical at all four
```

Tablet and desktop keep the 460px card and their original caption sizes.

`npm run audit:mobile`, both engines: `overflowing 0/9 | stacked text 0 |
broken aspect 0`.

## The one a11y violation, still not mine

`a11y 1` in both engines, unchanged from before this work. Read from
`.audit/report.json` rather than assumed:

```
<a class="btn-pill inline-block mt-8" style="background:var(--brass);color:var(--parchment)">
```

The seal band's CTA — parchment on brass, **3.03:1**, under AA's 4.5:1. It
arrived in `cedd781 style(home): gold pill with white letters on the seal band`,
another session's commit, which landed after the last audit run that reported
`a11y 0`. My working tree touches zero lines containing `btn-pill` or `--brass`.
Left alone because it is live design iteration with Tina; raised with her
instead.
