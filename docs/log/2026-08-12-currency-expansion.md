# Currency switcher expanded to 9 currencies, driven by real visitor data

**Date:** 2026-08-12 · **Status:** done

## Goal

Tina shared a Pulse visitor-country breakdown (screenshot) and asked for currencies of every
country shown implemented in the switcher, except China ("fuck china that was a bot" — a
single hit, judged not a real visitor).

## Country → currency mapping

| Country | Visits | Currency | Already offered? |
|---|--:|---|---|
| Netherlands | 90 | EUR | yes |
| United States | 64 | USD | yes |
| Canada | 26 | CAD | **new** |
| Denmark | 5 | DKK | **new** |
| Australia | 5 | AUD | **new** |
| United Kingdom | 4 | GBP | yes |
| France | 3 | EUR | yes |
| Belgium | 2 | EUR | yes |
| Saudi Arabia | 1 | SAR | **new** |
| Bahamas | 1 | BSD | **new** |
| Slovenia | 1 | EUR | yes |
| China | 1 | — | excluded, judged a bot |
| Türkiye | 1 | TRY | **new** |

Six new currencies: CAD, AUD, DKK, SAR, BSD, TRY.

## What changed

- `lib/fx.ts` — `DISPLAY_CURRENCIES` grew from `['USD', 'GBP', 'EUR']` to include CAD, AUD,
  DKK, TRY, SAR, BSD (9 total). `CURRENCY_LABEL` gained an entry per new currency. Symbols are
  the commonly recognised informal ones (`CA$`, `A$`, `kr`, `₺`, `SR`, `B$`) rather than what
  `Intl.NumberFormat('en-US', ...)` actually renders for these codes — verified separately that
  DKK/TRY/SAR/BSD render as their bare ISO code in en-US ICU (no distinct symbol), so a label
  reading e.g. "DKK DKK" would have been redundant. This only affects the switcher's own label
  text, never actual price formatting (`lib/price.ts::formatPrice()` is untouched).
- `components/CurrencyFlag.tsx` — added `FlagCA`, `FlagAU`, `FlagDK`, `FlagTR`, `FlagSA`,
  `FlagBS`, matching the existing reduced-detail inline-SVG style (18×12 viewBox). Saudi
  Arabia's flag is the one built from calligraphy (the Shahada) and a sword — unreadable at any
  icon size — so it's simplified furthest, to a plain green field with a thin bar standing in
  for the sword, the standard treatment minimal flag-icon sets use for it.
- `data/fx-rates.json` — re-fetched via `scripts/fetch-rates.mjs`. Confirms AUD/CAD/DKK/TRY
  already had rates (used natively by existing brands); SAR and BSD did not and were added
  (3.75 and 1 respectively — both pegged to USD, which is why BSD's rate is exactly 1).
- `scripts/fetch-rates.mjs` — the `WANTED` currency list used to be derived only from
  `data/brands.ts` (every currency a BRAND is priced in). It now unions that with
  `DISPLAY_CURRENCIES` parsed out of `lib/fx.ts` (same text-regex approach already used for
  `brands.ts`, since this script runs under plain `node`, not `tsx`). Without this, a future
  refresh would silently drop SAR/BSD the next time it ran, since no brand uses them — exactly
  the failure mode the script's own comment already documents happening once before, to 8 brand
  currencies.

## Verification

- `npx tsc --noEmit` — clean.
- `npm run lint` — clean (pre-existing, unrelated warning only: `.fontprobe.tmp.mjs`).
- `npm test` — 514/514 passing (`lib/fx.test.ts` already asserts every `DISPLAY_CURRENCIES`
  entry has a rate, which is what caught SAR/BSD needing one before this was even run manually).
  One transient failure during a parallel full-suite run
  (`lib/compactCatalogue.test.ts`'s round-trip test hit its 5000ms timeout) traced to a leftover
  `next start` server from earlier verification work competing for CPU — confirmed unrelated to
  this change: passes in isolation (667ms) and the full suite passes clean with
  `--no-file-parallelism` (514/514) once the stray server was killed.
- `npm run build` — clean.
- Manual, via Playwright: header menu lists all 9 options in order
  (`$ USD, £ GBP, € EUR, CA$ CAD, A$ AUD, kr DKK, ₺ TRY, SR SAR, B$ BSD`); selected each of the
  six new currencies in turn and confirmed real product prices convert and show `≈` (e.g.
  `≈ CA$188`, `≈ DKK 872`, `≈ SAR 506`, `≈ BSD 135`) rather than silently falling back to
  native. Screenshotted the full flag menu — all nine flags render distinctly and are
  recognisable at their actual 18×12 render size.

## Notes / follow-ups

- The country → currency mapping is a snapshot of one Pulse export at one point in time, not a
  live or maintained list. If visitor countries shift meaningfully, revisit
  `DISPLAY_CURRENCIES` rather than assuming this set is permanent.
- Slovenia/France/Belgium/Netherlands all map to EUR, so no new work was needed for 3 of the
  13 rows in the screenshot beyond what already existed.
