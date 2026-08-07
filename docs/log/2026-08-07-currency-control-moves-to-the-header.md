# Currency control moves to the header
**Date:** 2026-08-07 · **Status:** done

## Goal
Owner request: put the currency control in the header — after the heart, a divider like the
one between the crest and the wordmark, then a dollar icon that opens a dropdown on click.
Remove the currency button from the index console.

## What changed

**`components/CurrencySwitcher.tsx`** — same options and the same ADR-0002 disclaimer, new
presentation:
- Trigger is a `CurrencyDollar` icon (Phosphor, the house set) instead of an `As listed ▾`
  chip. It fills and shows the code when a preference is set, matching how the heart fills.
- **Built on Base UI's `Menu`** — the same library as the header nav (`components/NavMenu`),
  rather than a third hand-rolled dropdown. First pass hand-rolled the open state with
  `document` mousedown/keydown listeners; that is all deleted. Base UI supplies open/close,
  outside click, Escape, focus management, keyboard navigation and collision-aware
  positioning, and it **portals**, so the panel cannot be clipped by an ancestor's overflow.
- `Menu.RadioGroup` / `Menu.RadioItem` rather than plain items: it is one choice out of four,
  and each row gets a real `aria-checked`.
- Opens on click, not hover — it sits beside a link in a fixed header, where a hover panel
  opens whenever the pointer crosses it on the way somewhere else.

**Alignment**, per follow-up: the icon is centred in its trigger, nudged **1px down** (the
heart is nudged 1px *up* because its mass sits low; the dollar glyph has the opposite
problem and read high beside it), and the divider lengthened from `h-5` to `h-8` against the
crest divider's `h-10`.

**`components/Header.tsx`** — heart, then the same `w-px` hairline rule used between the
crest and the wordmark, then the currency control.

**`components/IndexPanel.tsx`** — the `Prices in` block and its import removed, as asked.

## A defect found and fixed before shipping
First pass put the control in both header rows. The mobile row is
`md:hidden flex … overflow-x-auto`, and `overflow-x: auto` establishes a **clipping context** —
the computed `overflow-y` becomes `auto` too, so an absolutely-positioned panel opened inside
it would have been cut off on every phone.

Restructured instead: favourites and currency now live in the white pill at **every** width,
and the scrolling row below carries only `<Nav />`. Two benefits beyond the fix — the panel is
outside any clipping context, and the favourites link is declared **once** instead of twice.

## Verification
```
$ npm run typecheck  clean
$ npm run lint       clean
$ npx vitest run     366 passed (16 files)
$ npm run build      Compiled successfully
```

Served from a real `next start`:
```
Base UI menu trigger present:           true
icon nudged 1px down:                   true
divider h-8 (was h-5):                  true
hand-rolled mousedown listeners gone:   true
heart declared once:                    true   (was 2)
currency declared once:                 true
order heart → divider → dollar:         true
no currency inside the scrolling row:   true
/about, /favourites, /modest-tops:      1 currency control each
"Prices in" left in the index console:  false (all pages)
```

`/about` is the point: it never had a currency control before, because it carries no index
console. Currency is a site-wide preference, so it belongs in site-wide furniture.

## Notes / follow-ups
- **Not verified in a browser** — the Chrome extension is not connected, so the open/close
  interaction, the panel's position under the fixed header, and the mobile layout are
  confirmed only by build and server-rendered markup.
- The panel is right-aligned (`right-0`) against the header's right edge, which is the correct
  side for a control at the far right of the bar. Worth a look at narrow widths.
