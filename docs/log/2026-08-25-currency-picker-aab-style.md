# Currency picker: a flag row at the top of the phone menu, and a header-menu look on desktop
**Date:** 2026-08-25 · **Status:** done

## Goal
Tina sent aabcollection.com's phone menu — flag, region, chevron, sitting just under the
close/logo bar and above the hairline that starts the navigation — with: *"i want the
currency thingie in the hamburger menu like this and on desktop a look and feel like the
menu"*. Two changes, one per surface.

## What changed

**`components/MobileNav.tsx`** — the currency control moved from the FOOT of the panel to
the TOP, and from nine wrapped `.chip` buttons to a collapsed disclosure.
- New `currencyOpen` state. The trigger shows the current choice (`<CurrencyFlag>` + the
  existing `CURRENCY_LABEL` string + a `CaretDown` that rotates), so at rest it costs one
  row rather than three lines of chips nobody scrolled to.
- Expanded, it lists all nine currencies as flag + label rows in the same 15px Jost used by
  the subtype rows, with the active one in aubergine/500 — the same active treatment every
  other row in this panel already uses. The approximate-prices note moved with it.
- The block sits inside the scroller, first, with a `border-bottom: 1px solid var(--hairline)`
  — that hairline is what the reference has between the picker and the nav.
- Still plain buttons rather than reusing `<CurrencySwitcher>`: a Base UI Menu popup opened
  from inside a Dialog is both fiddly and a second tap. Every string is reused verbatim
  (§10.18); nothing new was written.

**`components/CurrencySwitcher.tsx`** (desktop header) — restyled to match the header's own
Clothing/Hijabs panels beside it.
- Popup: `background: var(--parchment)` (was `#fff`), square corners (was `rounded-xl`), a
  shallower shadow, `px-4 py-3` (was `p-2`).
- Rows: `.mega-row` (was `.menu-row`) — 14px Jost, uppercase, ink rather than muted, with the
  label wrapped in `<span className="mega-row-label">` so it gets the same sliding underline
  on hover as every row in the Clothing panel.
- The note's horizontal padding went `px-3` → `px-1` to line up with `.mega-row`'s 4px pad.
- Trigger, hover/tap behaviour, `aria-label` and the RadioGroup semantics are all untouched —
  `scripts/interaction-audit.mjs`'s currency check locates by `aria-label*="currency"`, so it
  still points at the same thing.

## Verification
```
$ rm -f tsconfig.tsbuildinfo && npx tsc --noEmit     # clean, no output
$ npx eslint components/MobileNav.tsx components/CurrencySwitcher.tsx   # clean, no output
$ npm test
 Test Files  46 passed (46)
      Tests  741 passed (741)
```
Playwright probe (Chromium, iPhone 13 + 1440x900) against the running dev server, screenshots
read back rather than assumed:
```
trigger text: $ USD
after pick, trigger text: £ GBP          <- tapping GBP re-labels the trigger, panel stays open
desktop trigger count: 1
popup box { x: 1140, y: 66, width: 260, height: 404 } { bg: 'rgb(250, 247, 241)', radius: '0px' }
row style { ff: 'Jost', fs: '14px', tt: 'uppercase', color: 'rgb(68, 25, 67)', just: 'flex-start' }
```
`rgb(250,247,241)` is `--parchment` and `0px` is the square corner, i.e. the popup is the same
surface as the header panel, not a white popover. Phone screenshots show the collapsed row
(flag + `$ USD` + chevron, hairline beneath it, "Clothing" first below) and the expanded list.

Staging verification: see below.

## Notes / follow-ups
- The desktop popup keeps `sideOffset={10}` from the trigger, same as the compact Hijabs
  popup — so it overlaps the last ~20px of the header band rather than sitting flush under
  it. Both compact menus behave identically, which is why it was left alone; if Tina wants it
  flush like the WIDE panel, that needs anchoring to the header element, not the trigger.
- `CurrencyFlag` renders at a fixed 18x12. Next to 17px Jost on a phone it reads smaller than
  aab's, which uses a larger circular flag. Left as-is — it's the same flag every other
  switcher on the site uses.
