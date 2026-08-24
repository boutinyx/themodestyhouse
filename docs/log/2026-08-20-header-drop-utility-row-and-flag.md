# Drop the utility row; fold currency + favourites into the nav row, flag-free
**Date:** 2026-08-20 · **Status:** done

## Goal
Tina, from a cropped screenshot of the utility row (flag + "$ USD" + heart):
"put these on the right side on the lowest bar. i want you to hide like flag
when in the header. but when you hover over the currencies you an see them
with flag. and get rid of the top bar." Three asks in one:
1. Move currency + favourites down into the nav row (the "lowest bar"),
   right-aligned.
2. Hide the flag on the currency control while it sits in the header at
   rest — text only ("$ USD").
3. Keep the flag showing on each row of the dropdown once it's open.
4. Remove the now-empty utility row entirely.

## What changed
- `components/CurrencySwitcher.tsx` — removed `<CurrencyFlag currency={preference} />`
  from `Menu.Trigger`'s children; the trigger now renders `{LABEL[preference ?? 'USD']}`
  only. Left `<CurrencyFlag currency={o} />` untouched on every
  `Menu.RadioItem` inside the dropdown — that's what still shows a flag per
  currency once it's open. Confirmed via grep this component has exactly one
  consumer (`Header.tsx`), so this couldn't affect `FooterCurrency.tsx` or
  `MobileNav.tsx`'s own currency rows, which are separate components.
- `components/Header.tsx` — deleted the utility row (previously its own
  `hidden lg:flex` row above the masthead, bordered). The nav row changed
  from a single centred `flex` row to a `grid` with
  `gridTemplateColumns: '1fr auto 1fr'`: an empty first column, `<Nav />` in
  the centre column, and a `flex justify-end` group (currency + favourites)
  in the third. The empty first column exists only to balance the third, so
  `<Nav />` stays centred in the viewport instead of drifting left once
  something sits on the right of it. Header is down to two rows (masthead,
  nav) instead of three.

## Verification
- `npx tsc --noEmit` — clean.
- `npx eslint components/Header.tsx components/CurrencySwitcher.tsx` — clean.
- Playwright against the running local dev server, 1440×700: header renders
  as masthead + one nav row, "$ USD" and the heart sit at the row's right
  edge with no flag, Products/Designers/Editorial/About stay centred.
  Hovering the currency trigger opens the dropdown with all nine currencies,
  each showing its flag, exactly as before.
- Mobile (390×700): unaffected, screenshotted to confirm — MobileNav is a
  separate component and wasn't touched.

## Notes / follow-ups
- The pre-existing Base UI console warning from the earlier header log
  entries is still present, still unrelated.
