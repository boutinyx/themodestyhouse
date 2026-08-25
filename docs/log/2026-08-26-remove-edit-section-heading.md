# "Reading, not just shopping." removed
**Date:** 2026-08-26 · **Status:** done (staging)

## Goal

Tina: *"Reading, not just shopping. get rid of this text"* — the `h2` above the
editorial cards at the foot of the homepage.

## What changed

The `<h2>` and its wrapping `<div>` are gone from `app/page.tsx`. The section now
carries no heading of its own; the cards carry their own titles.

Two consequences that needed handling rather than leaving:

**1. `justify-between` → `justify-end`.** That row held the heading and the
desktop "All stories" link at opposite ends. With one child left,
`justify-between` puts it at the **start** — the link would have jumped to the
left edge. Measured after the fix: 32px from the section's right edge on desktop,
which is its `px-8`, i.e. exactly where it was.

**2. `flex` → `hidden md:flex` on that row.** Its only remaining child is the
`!hidden md:!inline-flex` link, so below `md` the row was an empty box still
contributing its `mb-8`. Measured on a phone: the gap above the feature card was
**72px** (40 section padding + 32 dead margin) and is now **40px**. The phone's
own "All stories" link is a separate `md:!hidden` element at the foot of the
section and is untouched.

## Stale comment corrected

A note further up `app/page.tsx` lists the homepage's section headings as a set
of four that were resized together on 2026-08-24, naming this one. It now records
that the set is three and why this one went. Left uncorrected it would have sent
someone looking for a heading that no longer exists.

## Verification

`npx tsc --noEmit` → 0 · `npm run lint` → 0 · build clean.

```
            heading in page text   h2s in section   "All stories"   gap above card
phone       false                  0                1 (foot)        40px  (was 72)
desktop     false                  0                1 (right, 32px) 136px (unchanged)
```

`npm run audit:mobile`, both engines: `overflowing 0/9 | stacked text 0 | broken
aspect 0`. The single `a11y 1` is the seal band's brass pill — unchanged, not
from this work.
