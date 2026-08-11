# Currency default changed to USD; "As listed" removed from every switcher

**Date:** 2026-08-12 · **Status:** done

## Goal

Tina's instruction, verbatim: "always keep it on usd first if a user decides to change it thats
on them but keep it usd. and get rid of 'as listed'." This reverses ADR-0002's native-by-default
decision — confirmed explicit and deliberate (she was asked directly the session before and
initially said keep native default; this is a considered reversal, not the same ask repeated).

## What changed

- `components/CurrencyProvider.tsx` — default `preference` state changed from `null` to
  `'USD'`. Both server and client render `'USD'` from the first paint (a hardcoded default, not
  user-specific data, so no hydration-mismatch risk); a returning visitor's own explicit choice
  is still applied from `localStorage` after mount, unchanged.
- `components/CurrencySwitcher.tsx` (header), `components/FooterCurrency.tsx`, and
  `components/MobileNav.tsx`'s currency chips — all three dropped `null`/"As listed" from their
  options list. Each now offers exactly USD/GBP/EUR. The header and footer's `Menu.RadioGroup`
  no longer need the `NATIVE` sentinel-mapping indirection that used to translate the menu's
  synthetic native value back to `null` — removed, since every option is now a real
  `DisplayCurrency`.
- `docs/decisions/ADR-0002-currency-display.md` — added a "Supersession" section recording the
  reversal, why it's a real reversal and not a tweak (the ADR explicitly rejected "convert
  everything to USD" as an alternative), and why it shipped low-risk (the "≈" +
  approximate-price disclosure the ADR's own Follow-ups required was already built for the
  opt-in switcher, and needed no new work).
- `CLAUDE.md` §8 — struck through and corrected the "no FX conversion, deliberate per ADR-0002"
  landmine note.

## What did NOT change

- `lib/fx.ts` was not touched — `CurrencyPreference` keeps its `null` variant, `NATIVE_LABEL`
  stays exported (now unused by any component, kept as a defensive fallback for
  `convert()`/`displayPrice()`). Deliberately minimal-footprint: another session had uncommitted,
  in-progress changes to `lib/sortRows.ts` (which imports from `lib/fx.ts`) at the time of this
  change, so the shared module's exported shape was left alone to avoid any conflict.
- The "≈" approximate-price marker and the "Converted prices are approximate. You pay the
  brand's own currency at checkout." disclosure — unchanged, still shown on every converted
  price, still the FTC-relevant safeguard ADR-0002's Follow-ups required before conversion could
  ever be a default.

## Verification

- `npx tsc --noEmit` — clean.
- `npm run lint` — clean (pre-existing, unrelated warnings only: `.fontprobe.tmp.mjs` and
  `lib/tag.test.ts`, both from other sessions' in-progress work, not touched here).
- `npm test` — 497/497 passing.
- `npm run build` — clean.
- Manual, via Playwright against a fresh browser context (no localStorage, true first-visit
  state):
  - Header trigger: `"$ USD"` (was `"$"` with no text before the 2026-08-11 icon fix, then
    `"🌐 AS LISTED"` after it — now `"$ USD"`).
  - Header menu options: `["$ USD", "£ GBP", "€ EUR"]` — no "As listed" row.
  - Footer trigger and menu: same three options, same USD default.
  - Mobile nav currency chips: same three options.
  - Homepage prices, first few: `$135`, `≈ $111`, `$189`, `$59`, `≈ $78`, `$49.30` — USD-native
    products show their exact price unmarked; non-USD products show `≈` and the converted USD
    amount. Confirms the disclosure fires correctly under the new default.

## Notes / follow-ups

- Not addressed (explicitly out of scope per the instruction): pre-selecting GBP/EUR based on
  visitor locale/geo. USD is a fixed default regardless of where a visitor is browsing from.
- Restoring "As listed" as a visible choice later, if ever wanted, is UI-only — add `null` back
  to each switcher's options array. Nothing about the conversion machinery would need to change.
