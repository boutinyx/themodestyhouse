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
- **Opens on click, not hover.** It sits beside a link in a fixed header, where a
  hover-triggered panel opens whenever the pointer crosses it on the way somewhere else.
  Click also makes it reachable on touch. Closes on outside click, Escape, and selection.

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
