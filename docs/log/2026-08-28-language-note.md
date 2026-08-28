# A corner "i" explaining why a brand's product page may not be in English

**Date:** 2026-08-28 · **Status:** done

## Goal
Tina: *"I want a little i in the corner that says like 'why do i see other languages when i
click on a brand products'. then i can say some brands dont have the language you speak, only
have their native language. most of the time they do ship in your country still, check at
checkout."*

Two things were hers to decide and were asked rather than assumed: **placement** (she chose
the bottom-right corner of every grid page, over a marker beside quick view's "Shop at
{brand}" button) and **wording** (she chose the version closest to her own words). The copy
is hers — §10.18 is why no alternative was invented for her.

## What changed
- **`components/LanguageNote.tsx`** (new) — a 36px round "i" fixed to the bottom-right of the
  viewport, opening a small panel:

  > **Why are some product pages in another language?**
  > Some brands only publish in their own language. Most still ship to your country — check
  > at checkout.

  A sibling of the currency footnote in `CurrencySwitcher` / `FooterCurrency`: the same shape
  of promise, that something on the BRAND's side differs from what the directory showed, said
  before the click rather than discovered after it.
- **`components/FilterableGrid.tsx` / `components/DirectoryBrowser.tsx`** — mounted once each,
  so the marker follows the grid wherever one renders (every lane, `/directory`,
  `/designers/<slug>`, `/edits/<slug>`) instead of four hand-written mounts that can drift.
- **`scripts/interaction-audit.mjs`** — new `language-note` check.

Built on Base UI's `Popover` (the fourth use of a Base UI primitive here rather than a fourth
hand-rolled panel). A hover-only disclosure is unreachable on touch (§10.25); a hand-rolled
one is unreachable more subtly, because a tap fires a full hover-EXIT cascade that dismantles
the panel between the finger lifting and the click landing (§10.45), and `(hover: none)`
cannot tell a tablet with a trackpad from a finger on that same tablet (§10.50). Popover
opens on click/tap in every configuration.

## The defect the automated pass could not see
The first version passed **16/16** checks — both engines, four viewports, two routes: trigger
present, in the bottom-right, 36px tap target, heading and body both appearing on tap, panel
inside the viewport. Then the screenshot showed a card's "+3 colours" badge printed straight
through the panel.

Probing `elementFromPoint` across the panel (§10.36's technique) found it at every point:

```
panel rect {l:94, t:650, w:280, h:134} | z auto | pos static
  (122,663) -> A.absolute inset-0 z-10  *** ON TOP ***
  (178,717) -> A.absolute inset-0 z-10  *** ON TOP ***
  ... 15 of 15 probe points ***
```

`A.absolute inset-0 z-10` is **ProductCard's whole-card anchor**. So this was not cosmetic:
every tap on the note was landing on the product link and would have sent the reader out to a
brand's site — the precise opposite of what the note is for.

Cause: the z-index was on the popup, not on the **Positioner**, which is the portalled
positioned element. An explicit `z-10` beats `auto` regardless of DOM order, so being later
in the document bought the portal nothing. Fixed with `zIndex: 60` on the Positioner.

This is §10.22 restated: an automated pass proves only what it measures, and text being in
the DOM, on-screen, correctly sized and correctly positioned is not the same as being
visible. Everything the harness asked was true.

## Verification
Built and served from a throwaway worktree, not the shared tree — two other sessions were
live and `.next` is shared (§10.28 rule 4).

**The occlusion assertion was proven to fail before it was trusted** (§10.28 rule 1). Its
first draft selected an inner wrapper rather than the panel box and reported `ok` on code
that was fully occluded — the harness lying inside the harness written to catch the harness
lying (§10.26). Repaired, it fired **16/16** against the unfixed build, then **0/16** after
the fix:

```
chromium/webkit x phone-390, ipad-1366, ipad-hover, desktop-1440 x /directory, /modest-dresses
  before the z-index fix: 16 problems ("panel occluded by A.absolute.inset-0")
  after:                   0 problems
```

`ipad-hover` stubs `(hover: none)` to false before first paint, because a Playwright touch
context always reports it true — which makes touch-AND-hover-capable, the commonest real
tablet, otherwise unreachable (§10.50 rule 2).

**WebKit reported "no CSS" on all 8 of its first-pass rows.** That was the harness, not the
site: the site sends HSTS and `upgrade-insecure-requests`, both right in production, and over
plain-http localhost WebKit honours them and fails TLS on every subresource (§10.24). The
stylesheet assertion is the only reason those 8 rows were not read as site defects.
Interception is WebKit-only, since doing it in Chromium is what manufactured blank images in
§10.26.

**Negative control on presence**: `/about` has no grid, and the trigger count there is 0
while `/directory` is 1 — so "trigger present" is a discriminator, not a constant.

`npx tsc --noEmit` clean. `npm test` — 932 passing; the single failure is the deliberate
hand-picked-edit alarm from the size-floor work, unrelated and documented in
`docs/log/2026-08-28-size-floor-rule.md`.

`npm run audit:interaction` against the build, all five viewports:

```
language-note  mobile-390    chromium  language note 280x134 @94
language-note  tablet-819    chromium  language note 280x134 @523
language-note  ipad-1024     chromium  language note 280x134 @728
language-note  ipad-1366     chromium  language note 280x134 @1070
language-note  desktop-1440  chromium  language note 280x134 @1144
```

## Notes / follow-ups
- The panel width is `min(280px, calc(100vw - 32px))` so it can shrink on a narrow phone
  rather than run off the left edge; the trigger uses `env(safe-area-inset-*)` so it clears
  the iPhone home indicator.
- It is mounted from the grid components rather than the layout, so it does NOT appear on
  `/about`, `/editorial/*` or the homepage. That is deliberate — the question only arises
  where there are product cards to click.
