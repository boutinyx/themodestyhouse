# ADR-0002 — Display prices in native currency, formatted consistently

**Date:** 2026-08-05 · **Status:** superseded 2026-08-12 for the DEFAULT display currency —
see "Supersession" below. The formatting decision (one shared `formatPrice()`/`displayPrice()`,
`en-US` locale, the "≈" + disclosure on any converted price) is unchanged and still binding.

## Context

The catalogue carries 7 currencies across 34 brands:

| Currency | Products | Share | Brands |
|---|--:|--:|---|
| USD | 5,098 | 81.1% | 18 |
| GBP | 626 | 10.0% | 9 |
| AUD | 349 | 5.5% | Nasiba |
| MYR | 78 | 1.2% | Zora Designers |
| EUR | 70 | 1.1% | Diversity Modest, Feradje |
| CAD | 57 | 0.9% | Jaida |
| EGP | 11 | 0.2% | Ndustry |

Two separate problems were conflated under "prices are all over the place":

1. **Formatting is inconsistent between components.** Three render sites, two styles —
   `ProductCard` and `QuickView` emit `"USD 44.95"` (raw ISO code, always 2 decimals), while
   `EditorsRail` emits `"$45"` (`Intl.NumberFormat`, rounded). The *same product* appears
   differently on the homepage and in the directory. This is unambiguously a defect.
2. **Prices are not comparable across currencies.** A shopper cannot tell whether `£120` is
   more than `$44.95`. This is a product decision, not a defect.

Relevant constraints:

- Prices are **scraped at build time** (weekly refresh), so they are already somewhat stale.
- The site is an **affiliate directory** — the shopper pays on the brand's own site.
- `currency` comes from the **brand record** in `data/brands.ts`, not from the feed.
- All 7 codes are valid ISO-4217 and accepted by `Intl.NumberFormat`. Zero products have a
  missing or zero price.

## Decision

**Display every price in its native currency, formatted through one shared function.** Do
not convert currencies.

- New module `lib/price.ts` exporting `formatPrice(amount, currency)`.
- Formats via `Intl.NumberFormat('en-US', { style: 'currency', currency })`.
- **Drops `.00` on whole numbers, keeps cents when present** — `£120`, `$44.95`. 33% of the
  catalogue is whole-number, so this removes meaningful visual noise.
- **Falls back** to `` `${currency} ${amount.toFixed(2)}` `` if `Intl` rejects a code, so a
  future brand with an odd currency degrades instead of throwing.
- All three render sites adopt it. `EditorsRail` loses its rounding, gaining cents, so that
  the homepage and directory agree.

**`en-US` locale, deliberately.** It renders the dominant currency clean (`$44.95` for 81% of
items) while disambiguating the minority ones (`A$189`, `CA$32`, `£120`, `€89.90`). A UK
locale would render USD as `US$44.95` — worse for the main case.

## Consequences

**Positive**
- One source of truth for price rendering; the homepage/directory discrepancy disappears.
- Every displayed price **matches what the shopper pays at checkout**. No disclaimer needed.
- No FX data source, no build step, no second staleness layer, no new dependency.
- Reversible: native price remains the source of truth, so conversion can be layered later.

**Negative / accepted**
- Prices remain **not directly comparable** across currencies. Accepted: 81% of the catalogue
  is already USD, and currency symbols communicate the difference unambiguously.
- `EditorsRail` visually changes (`$45` → `$44.95`).
- Server-prerendered HTML and client hydration both call `Intl`. Node ships full ICU (verified:
  `A$1.00`, not `AUD 1.00`) and emits canonical CLDR forms matching browsers, so they agree —
  but this is a real hydration-mismatch surface. Mitigated by tests asserting **exact output
  strings**, which fail loudly if an environment's ICU differs.

## Alternatives considered

**Convert everything to USD.** Rejected. The converted number would not match checkout — on
an affiliate site, where the shopper leaves to pay elsewhere, that is the fastest way to burn
trust, and it is exactly what an FTC reviewer inspects. It also stacks FX staleness on top of
already-stale scraped prices, and buys comparability for only ~19% of the catalogue.

**Native price plus an approximate conversion beside it.** Rejected for now. Honest and
comparable, but doubles the price text on every card, still needs an FX source and a
disclaimer, and the visual cost lands on 100% of cards to serve 19%. Revisit if the audience
turns out to be non-US.

**Hide prices entirely.** Rejected. Removes staleness and FX questions completely, but
prices are a primary browsing signal for a shopping directory.

## Follow-ups

- **Curation, not engineering:** EGP (11 items, Ndustry) and MYR (78, Zora) are 1.4% of the
  catalogue and account for most of the "all over the place" impression. Whether those brands
  earn their place is a separate editorial decision.
- ~~If conversion is ever adopted, the trigger is audience data showing a non-US majority — and
  it must ship with an "approximate, charged in brand's currency" disclosure.~~ Adopted
  2026-08-12 — see Supersession below. It shipped with exactly that disclosure, because the
  machinery this ADR specified (the "≈" prefix, the "Converted prices are approximate" footnote)
  was already built for the opt-in switcher this decision introduced, and the switch to
  USD-by-default reuses it unchanged.

## Supersession — 2026-08-12: USD is now the default, not native

**What changed.** `CurrencyProvider`'s default `preference` moved from `null` (native/"As
listed") to `'USD'`. The three currency controls (header `CurrencySwitcher`, `FooterCurrency`,
`MobileNav`'s currency chips) no longer offer "As listed" as a choice at all — a visitor picks
USD, GBP or EUR, and USD is what they see until they explicitly change it. Tina's instruction,
verbatim: "always keep it on usd first if a user decides to change it thats on them but keep it
usd. and get rid of 'as listed'."

**Why this is a real reversal, not a tweak.** This ADR's own "Alternatives considered" section
explicitly rejected exactly this — "Convert everything to USD" — for a specific, still-true
reason: a converted number does not match what the shopper pays at checkout on an affiliate
site, which risks trust and is what an FTC reviewer inspects. That reasoning is not wrong; it is
overridden by an explicit owner decision that the comparability USD-by-default buys (prices are
now a single number a shopper can actually compare while browsing) is worth more than exactness
being the *default* experience, as long as exactness stays reachable and every converted price
is still honestly labelled. It does not relitigate the ADR's REJECTION of "hide the disclosure"
or "round with no marker" — those stay rejected.

**Why the ADR's own safeguard made this low-risk to ship.** The Follow-ups section pre-specified
the condition under which conversion-by-default would be acceptable: "it must ship with an
approximate, charged in brand's currency disclosure." `lib/fx.ts::displayPrice()` already
prefixes every converted amount with "≈" and rounds to whole units (never inventing false
precision), and all three switcher panels already carry "Converted prices are approximate. You
pay the brand's own currency at checkout." verbatim. Flipping the default did not require
building that machinery — it already existed for the opt-in USD/GBP/EUR switcher this same ADR
introduced. Verified directly after the change: a USD-native product still shows its exact
`$135`; a non-USD product now shows `≈ $111` by default instead of `£89` — visibly marked
approximate, not silently converted.

**What is now unreachable, not deleted.** `lib/fx.ts`'s `CurrencyPreference` type still includes
`null`, and `NATIVE_LABEL` ('As listed') is still exported — kept as a defensive fallback for
`displayPrice()`/`convert()`, not as a live feature. No switcher can produce `null` any more.
Restoring "As listed" as a visible choice, if ever wanted, is a UI-only change (add `null` back
to each switcher's options array); nothing about the conversion machinery needs to change either
way.

**Not revisited:** whether GBP/EUR should ever be *pre-selected* based on locale/geo rather than
always defaulting to USD. Out of scope for this instruction; USD is the fixed default regardless
of visitor origin.
