# Permanent $550 USD price ceiling
**Date:** 2026-08-13 · **Status:** done

## Goal
Tina: "i want everything above a price of 550 to be gone." Two real
ambiguities before touching anything:
1. **Which currency?** Products are priced in each brand's native
   currency (AED, TRY, GBP, USD, KWD, etc.), not one common number.
   Measured both readings before asking: comparing the raw `price` field
   directly against 550 (mixing currencies) would catch 5,280 products —
   mostly an artifact of weak currencies (550 IDR is trivial); converting
   every price to USD first catches 652. Asked Tina directly; she chose
   USD-equivalent.
2. **One-time cleanup or a standing rule?** "I want X to be gone" reads as
   an ongoing state, not a snapshot cleanup, so implemented as a permanent
   structural rule rather than a one-off id list — flagged this choice in
   the commit message in case the intent was narrower.

## What changed
- **`scripts/build-data.mjs`** — new `PRICE_CEILING_USD = 550` and
  `exceedsPriceCeiling(p)`, checked inside `verdict()` (the same function
  that already runs brand-blacklist/id-pin/title-pattern/url-pattern/
  non-apparel checks). Uses `lib/fx.ts::convert()` — the exact function the
  site's own USD display already uses — rather than reimplementing FX
  math. A currency with no FX rate is let through uncapped (`convert()`
  returns `null`) rather than guessed at.
- Republished: 21,990 → 21,338 products (654 rows hit the new rule in
  `rejected.json`; net published count dropped by 652 — the small gap is
  ordinary interaction with earlier-running checks in `verdict()`, not a
  discrepancy in the price logic itself).

## Verification
```
$ rm -f tsconfig.tsbuildinfo && npx tsc --noEmit                     clean
$ npx eslint --max-warnings 0 lib components app scripts             clean
$ npx vitest run --exclude "**/.claude/**"                            38 files, 620 tests passed
$ ALLOW_LARGE_DIFF=1 npm run build:data                                21,338 published, no guard trip
$ rm -rf .next && npm run build                                        clean, 32 routes
```
Spot-checked the actual rejected/kept boundary against real data, not just
counts:
- `2020 AED` (~$550.03) → correctly rejected (strictly greater than 550,
  the printed `~$550` is a rounded display string, the comparison itself
  uses the unrounded value).
- `433 GBP` (~$585), `26500 TRY` (~$555) → correctly rejected.
- The highest-priced published KWD item, 156 KWD (~$505) → correctly kept.

## Notes
- No escape hatch exists yet for a specific expensive item Tina might want
  kept despite the ceiling — nothing built speculatively; if she wants one,
  it's a small addition following the same pattern as
  `exclusions.json.nonApparelAllowIds`.
- This interacts with `/staff/curate`: an item over $550 is rejected in
  `verdict()`, upstream of `resolveGarment()`/live overrides, so it can
  never be "moved" back in through the inline editor — same as any other
  permanently-excluded item (brand-blacklisted, non-apparel).
