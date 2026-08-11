# Fix: header currency control showed a fixed $ regardless of selection

**Date:** 2026-08-12 · **Status:** done

## Goal

Tina flagged (via screenshots) that the header's currency control always showed a bare `$`
icon with no label, and asked for it to match the footer's control: an icon reflecting the
actual currency plus a label, always.

## What changed

- `components/CurrencySwitcher.tsx` — replaced the fixed `CurrencyDollar` Phosphor icon with
  `CurrencyFlag` (already built and used by `components/FooterCurrency.tsx`): shows the flag of
  the selected currency, or the globe for native/"As listed". The trigger's label now always
  renders (`LABEL[preference]` or `NATIVE_LABEL`), matching the footer instead of rendering
  nothing in native mode. The dropdown's own rows also gained the flag, for the same reason.
  `gap` is now unconditionally `8` since a label always renders.

## Root cause

The header control predates `CurrencyFlag` (built later for the footer, "at Tina's request" per
the footer's own comment) and was never brought up to parity. Two separate, compounding defects:
the icon never changed with the selection (always `$`, misleading once GBP/EUR was picked), and
`{preference ?? null}` rendered literally nothing in native mode, leaving a bare, unlabeled icon.

## Verification

- `npx tsc --noEmit` — clean.
- `npm run lint` — clean (the one warning present is `.fontprobe.tmp.mjs`, an untracked scratch
  file from another session).
- `npm test` — 493/493 passing.
- `npm run build` — clean.
- Manual, via Playwright screenshots at 1440px: native state now reads "🌐 AS LISTED" (was a
  bare `$`); selecting GBP shows the UK flag + "£ GBP" (was still a bare `$`, unchanged since
  the icon never varied by selection).
- Specifically re-checked the header's documented fragile breakpoint (§8's collision history at
  768-820px, and the `lg` 1024px switchover) — measured the wordmark/nav gap at 1024/1040/1100px:
  no overlap at any width. The added label text is short ("As listed" only appears in native
  mode at the same width budget the footer already carries) and the trigger sits in the
  `hidden lg:flex` desktop-only slot, so it was never a candidate to affect the phone header.
- Footer re-checked unchanged: native shows globe + "As listed", EUR selection shows the EU
  flag + "€ EUR" — both exactly as before.

## Notes / follow-ups

None — this was a straightforward parity fix between two controls that already shared the same
underlying `CurrencyProvider` state and the same `CurrencyFlag`/`lib/fx.ts` label source; only
the header's rendering was behind.
