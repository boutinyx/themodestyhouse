# Unified price formatting across the catalogue

**Date:** 2026-08-05 · **Status:** done

## Goal

Tina reported prices displaying inconsistently across the site. Investigation split this
into two distinct problems, only one of which is a defect — see
[ADR-0002](../decisions/ADR-0002-currency-display.md) for the decision and its reasoning.

## What was actually wrong

**A real defect:** three render sites formatted prices independently, in two different
styles. The *same product* showed as `"$45"` on the homepage rail and `"USD 44.95"` in the
directory grid.

**Not a defect:** prices aren't comparable across the 7 currencies (USD 81.1%, GBP 10.0%,
AUD 5.5%, MYR 1.2%, EUR 1.1%, CAD 0.9%, EGP 0.2%). We decided **not** to convert — the
converted number wouldn't match checkout on the brand's own site, which is the fastest way
to burn trust on an affiliate directory, and it stacks FX staleness on top of already-stale
scraped prices.

## What changed

| File | Change |
|---|---|
| `lib/price.ts` | **New.** `formatPrice(amount, currency)` — the single source of truth |
| `lib/price.test.ts` | **New.** 7 tests asserting exact output strings |
| `components/ProductCard.tsx` | `USD 44.95` → `formatPrice(...)` |
| `components/QuickView.tsx` | `USD 44.95` → `formatPrice(...)` |
| `components/EditorsRail.tsx` | Deleted its private duplicate formatter |
| `docs/decisions/ADR-0002-currency-display.md` | **New.** The decision + rejected alternatives |

Behaviour: native currency, `en-US` locale, decimals dropped on whole numbers
(`£120`, `$44.95`), graceful fallback on a malformed currency code.

## Verification

Two real findings came out of writing the tests first — both would have been invisible
otherwise:

**1. `Intl` uses a non-breaking space.** Three tests failed with "expected `'MYR 44.95'` to
be `'MYR 44.95'`" — visually identical strings. The separator between a bare currency *code*
and the number is **U+00A0**, not a normal space (deliberate typography: `MYR` must not wrap
away from its number). Currencies with a symbol (`$`, `£`, `€`, `A$`, `CA$`) have no
separator at all.

**2. `Intl` accepts any well-formed 3-letter code.** `formatPrice(44.95, 'XYZ')` returns
`XYZ 44.95` from `Intl` itself, not from the fallback. The fallback is only reachable via
genuinely malformed input like `'not-a-code'`. The test now asserts the real behaviour.

Hydration risk was checked rather than assumed — `formatPrice` runs during prerender (Node)
and again during hydration (browser), so differing ICU data would cause a mismatch:

```
$ node -e "…"
Node v24.14.0 · ICU: full  (A$1.00, not AUD 1.00)
```

Node ships full ICU and emits canonical CLDR forms matching browsers. The exact-string tests
are the ongoing guard — if an environment's ICU ever differs, they fail loudly.

```
$ npx vitest run
 Test Files  6 passed (6)
      Tests  167 passed (167)

$ npx tsc --noEmit      # clean apart from the pre-existing normalize.test.ts fixture error

$ npm run build         # succeeds
```

Prices in the built HTML:

```
$154.95   $49.30   £107.95   £58   £70.95
```

`£58` confirms the whole-number rule; no `"USD 44.95"` form remains anywhere.

Confirmed no stray formatters survive:

```
$ grep -rn "toFixed(2)\|Intl.NumberFormat" components/
(no matches)
```

## Notes / follow-ups

- **`EditorsRail` visually changed** — the homepage rail previously rounded (`$45`) and now
  shows cents (`$44.95`). Deliberate: it's the price of consistency. Flagged to Tina in the
  design and accepted.
- **Deferred, not forgotten:** FX conversion. ADR-0002 records the trigger for revisiting —
  audience data showing a non-US majority — and that it must ship with an "approximate,
  charged in brand's currency" disclosure.
- **Separate, editorial not technical:** EGP (11 items, Ndustry) and MYR (78, Zora) are 1.4%
  of the catalogue and cause most of the "prices all over the place" impression. Whether
  those brands earn their place is a curation decision.
