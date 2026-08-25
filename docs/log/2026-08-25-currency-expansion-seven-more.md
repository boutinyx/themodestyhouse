# Seven more currencies, from four days of Pulse
**Date:** 2026-08-25 · **Status:** done

## Goal
Tina: *"check pulse last weeks and see what people come in and what currencies you can add"*.
She sent four single-day Pulse exports (20, 21, 22 and 24 Aug), and chose **all seven** new
currencies from the analysis below.

## The data
43 visitors across the four days. Countries, with what they map to:

| Country | 20 | 21 | 22 | 24 | total | currency | status |
|---|--:|--:|--:|--:|--:|---|---|
| United States | 2 | 3 | 9 | 6 | 20 | USD | offered |
| Netherlands | 1 | 1 | – | 1 | 3 | EUR | offered |
| Egypt | 1 | – | – | 1 | 2 | **EGP** | added |
| Algeria | – | 1 | – | 1 | 2 | **DZD** | added |
| Belgium | – | 1 | – | 1 | 2 | EUR | offered |
| Australia | – | – | – | 2 | 2 | AUD | offered |
| Saudi Arabia | – | – | 2 | – | 2 | SAR | offered |
| United Kingdom | – | – | – | 1 | 1 | GBP | offered |
| France | – | – | – | 1 | 1 | EUR | offered |
| Spain | – | – | 1 | – | 1 | EUR | offered |
| Morocco | – | – | – | 1 | 1 | **MAD** | added |
| Tunisia | – | 1 | – | – | 1 | **TND** | added |
| Switzerland | – | – | – | 1 | 1 | **CHF** | added |
| Kuwait | – | – | 1 | – | 1 | **KWD** | added |
| South Africa | 1 | – | – | – | 1 | **ZAR** | added |
| Gibraltar | 1 | – | – | – | 1 | GIP | **not added** — pegged 1:1 to GBP, and GBP is what circulates there |
| Panama | – | – | – | 1 | 1 | PAB | **not added** — pegged 1:1 to USD, which is legal tender in Panama |

The reason to look at all: **North Africa is now a cluster.** Egypt + Algeria + Morocco +
Tunisia are 5 of the 43, and not one of them could see a price in their own money.

## What changed
- **`lib/fx.ts`** — `DISPLAY_CURRENCIES` 9 → 16 (EGP, DZD, MAD, TND, CHF, KWD, ZAR), with the
  reasoning and the two deliberate non-additions recorded in its docstring. `CURRENCY_LABEL`
  gained the seven. Verified the same way as the 2026-08-12 batch: en-US ICU renders **all
  seven** as their bare ISO code (`EGP 44.95`, `CHF 44.95`, `KWD 44.950`…), so the labels use
  the written Latin shorthands instead — `E£`, `DA`, `DH`, `DT`, `KD`, `R`.
  **CHF is the exception and is labelled `CHF` alone.** Both desktop menus uppercase their rows
  (`.mega-row` / `.menu-row`), which turned `Fr CHF` into **`FR CHF`** — and FR is France's
  country code, on a list of country flags. Caught by reading the rendered menu, not the source.
- **`components/CurrencyFlag.tsx`** — seven new inline SVGs in the existing 18×12 reduced-detail
  style. Two techniques carried most of them:
  - a crescent is one path with `fillRule="evenodd"` (big circle + smaller offset circle in the
    same `d`), NOT a background-coloured cut circle the way `FlagTR` does it — Algeria's crescent
    straddles the green/white boundary, so a white cut circle would paint over the green half;
  - heraldic detail is reduced, not reproduced: Egypt's Eagle of Saladin becomes a plain gold
    emblem (the same treatment `FlagSA` already uses for the Shahada), and South Africa's pall
    keeps its white fimbriation, drawn as a stroke pair, because that outline is what makes the
    shape readable at 18px.
- **`data/fx-rates.json`** — re-fetched. 18 → 24 currencies; all seven had live rates on the
  existing source (EGP 50.81, DZD 132.80, MAD 9.25, TND 2.90, CHF 0.80, KWD 0.31, ZAR 16.02).
  No script change was needed: `fetch-rates.mjs` already unions `DISPLAY_CURRENCIES` with the
  brand currencies, which is exactly the guard added in the 2026-08-12 expansion.
- **`scripts/interaction-audit.mjs`** — its footer-currency count assertion moved 8 → 15
  (`DISPLAY_CURRENCIES` minus the one you are already in). That number tracks `lib/fx.ts` and
  has to move with it; the comment says so.

## Verification
```
$ npx tsc --noEmit      # clean
$ npx eslint lib/fx.ts components/CurrencyFlag.tsx scripts/interaction-audit.mjs   # clean
$ npm test              # 46 files, 741 tests passed
```
`lib/fx.test.ts` already asserts every `DISPLAY_CURRENCIES` entry has a rate, so a missing rate
would have failed the suite rather than shipping as a silent native-price fallback.

Desktop menu driven live (Chromium 1440, stylesheet asserted first), selecting each new currency
in turn and reading the first real product price off the page:
```
rows: 15  ["£ GBP","€ EUR","CA$ CAD","A$ AUD","KR DKK","₺ TRY","SR SAR","B$ BSD",
           "E£ EGP","DA DZD","DH MAD","DT TND","CHF","KD KWD","R ZAR"]
rows with no flag: []
EGP -> ≈ EGP 6,860   DZD -> ≈ DZD 17,928   MAD -> ≈ MAD 1,249   TND -> ≈ TND 392
CHF -> ≈ CHF 108     KWD -> ≈ KWD 42       ZAR -> ≈ ZAR 2,162
```
Every one converts and is marked `≈` — none silently fell back to native. Phone menu: 15 rows
plus the trigger, same list.

Flags inspected at 5× device scale rather than at 18px, so the reduction could actually be
judged: all seven are distinguishable — Egypt's red/white/black with the gold emblem, Algeria's
green/white with the red crescent, Morocco's green pentangle on red, Tunisia's white disc,
Switzerland's cross, Kuwait's black hoist trapezoid, South Africa's pall.

## Notes / follow-ups
- The menu is now 16 rows (15 shown). At 1440 the desktop popup is ~15 rows tall and fits; on a
  phone the picker is a disclosure, so it costs one row until opened. Worth revisiting if this
  list keeps growing — a scroll or a search would beat a longer list, but not at 16.
- Same caveat as 2026-08-12: this is a snapshot of four days, not a maintained mapping. Four days
  is a small sample and a single visitor can put a currency on the list — which is the rule Tina
  chose, twice now, deliberately.
