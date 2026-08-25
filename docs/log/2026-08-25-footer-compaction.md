# Footer made smaller — a little on desktop, a lot on phone
**Date:** 2026-08-25 · **Status:** done

## Goal

Tina: *"need to make the footer smaller on desktop a lil adn on phone a lot"*.

## Measured first

| | before | after | change |
|---|---|---|---|
| desktop (1440) | 718px | **674px** | −44px (−6%) |
| phone (390) | 1589px | **1216px** | −373px (−23%) |

The phone footer was nearly two full screens tall.

## What was actually making the phone footer tall

Not padding. **Layout.**

The phone grid is two columns. Products carries every one of `CATEGORY_LANES`
— 13 links — stacked one per row inside a *half-width* cell, at a 40px pitch
(32px link box + 8px gap) = **512px**. Editorial sat beside it at 152px, so the
row was 512px tall with roughly **360px of dead space** on the right, and
everything below it started after that.

The fix is structural, not cosmetic: on a phone, Products and Editorial now span
the full width and lay their links out in **two sub-columns**. Products goes 13
rows → 7. The desktop treatment is untouched — it already did this via
`md:grid-flow-col md:grid-rows-7`; only the phone case was forced to
`grid-cols-1`.

## What changed — `components/Footer.tsx`

Every value is a responsive pair, so desktop got the "a lil" and phone the
"a lot" from the same edit:

| | phone | desktop |
|---|---|---|
| container padding `py-16` | 64 → **40** | 64 → **48** |
| grid gap `gap-10` | 40 → **24 x / 32 y** | 40 → **32** |
| heading → list `mt-4` | 16 → **12** | 16 → **12** |
| list item gap `space-y-2` | 8 → **4** | unchanged (8) |
| Products / Editorial | now `col-span-2`, list in **2 sub-columns** | unchanged |
| The House list | now 2 sub-columns | unchanged |
| newsletter block `mt-7` | 28 → **24** | unchanged |
| disclosure rule `mt-14 pt-6` | 56+24 → **40+20** | 56+24 → **48+24** |
| bottom bar `mt-8 pt-6` | 32+24 → **24+20** | unchanged |

### What was deliberately NOT touched

`FLink` keeps `minHeight: 32`. It is there because at 14px type the hit area was
a 20px strip, against the 24px floor in **WCAG 2.2 SC 2.5.8** — the reason is
written at the declaration. Height came out of the *gaps between* links, never
out of the links themselves.

`marginTop: 80` on the `<footer>` is space **above** the footer rather than part
of it, so it was left alone.

## Verification

`npx tsc --noEmit` → 0 · `npm run lint` → 0 · build clean.

Two-column link lists are the risk here — a label that wraps, a target that
shrinks, or a column that overflows the viewport. All three checked directly in
a real browser at 390 and 1440:

```
phone    links 29  wrapped []  tooSmall []  overflow []  scrollW 390 == footerW 390
desktop  links 29  wrapped []  tooSmall []  overflow []  scrollW 1440 == footerW 1440
console errors: 0 at both widths
```

`npm run audit:mobile` against the local production build, both engines:

```
chromium  overflowing 0/9 | a11y 0 | stacked text 0 | broken aspect 0
webkit    overflowing 0/9 | a11y 0 | stacked text 0 | broken aspect 0
```

The run prints the same undersized tap targets it printed before this change —
`See our picks`, `Abayas`, `Modest Wedding Guest`, the contact email. **None are
footer links**: every one is 20–21px tall, and a footer link is 32px by
construction. They are inline text links in prose, unrelated to this work and
already noted in `docs/log/2026-08-25-map-pins-crest-star.md`.

## Notes

Reading order on phone is now **across** each row rather than down each column,
because the phone lists use `grid-cols-2` with normal row flow. That is not a
compromise: it matches DOM order, which is what a screen reader and keyboard
tab order follow. Column-flow (what desktop uses via `grid-flow-col`) reads down
but puts DOM order at odds with visual order.

Room left if "a lot" is not enough: phone padding could go 40 → 32 and the grid
row gap 32 → 24, worth about another 40px. Beyond that the remaining height is
real content — the disclosure paragraph, the sign-up pill and the brand block —
and would need an editorial decision rather than a spacing one.
