# The guides and the market band swap places
**Date:** 2026-08-26 · **Status:** done (staging)

## Goal

Tina: *"i want the modest fasjion market with the modesty house block to swap
places with the guides"*.

- **Market band** — the full-bleed satin section, "Are you a modest fashion
  house?" with the "Market with The Modesty House" CTA.
- **Guides** — the editorial cards (the abaya feature plus the two story cards).

## What changed

`app/page.tsx` only. Both blocks moved **whole**, their comment headers included,
and nothing inside either was edited.

That mattered here more than usual: both carry long comment blocks recording
their own history — the band's has several rounds of copy and overlay decisions
from this week, the editorial one has the note about the heading Tina removed
earlier today. Moving the sections without their comments would have orphaned all
of it.

New tail of the page: map → **guides** → **market band** → footer. The band is
now the page's closing CTA, which is a reasonable place for it — the last thing
before the footer is an ask rather than a reading list.

## Verification

`npx tsc --noEmit` → 0 · `npm run lint` → 0 · build clean.

Order read off the rendered DOM rather than the source, in WebKit at both widths:

```
PHONE                          DESKTOP
 8 map                          8 map
 9 GUIDES (editorial)           9 GUIDES (editorial)
10 Are you a modest fashion... 10 Are you a modest fashion...
console errors: 0              console errors: 0
```

Spacing checked too, because a section that moves inherits whatever margins its
new neighbours have — margin collapsing makes that easy to get wrong silently:

```
            guides -> band   band -> footer   band height
phone       40px             80px             376px
desktop     80px             80px             440px
```

No doubled gap, nothing flush.

`npm run audit:mobile`, both engines: `overflowing 0/9 | stacked text 0 | broken
aspect 0`. The `a11y 1` is the seal band's brass pill at 3.03:1 — pre-existing,
from another session, and it travelled with the band rather than being introduced
here.
