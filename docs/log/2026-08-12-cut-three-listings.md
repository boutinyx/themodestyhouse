# Cut three individual listings (Mariam's, Touché Privé x2)

**Date:** 2026-08-12 · **Status:** done

## Goal

Tina flagged three specific product listings via screenshots for permanent removal — no
brand-level cut, just these items.

## What was cut

| Product ID | Title | Brand |
|---|---|---|
| `mariams:9044939768024` | Oversized Round Neck Pullover Sweater \| Solid Color Knit Base Layer Top(MS168) | Mariam's Collection |
| `touche-prive:9650659656008` | Peter Can Collar PopİN Under Shirt (black/white) | Touché Privé |
| `touche-prive:9650659623240` | Peter Can Collar PopİN Under Shirt (brown/black) | Touché Privé |

## What changed

- `data/exclusions.json` — added all three ids to the `ids` array (id-pin), per Invariant 3
  (permanent removals go in exclusions.json, never decisions.json). Re-applies on every future
  rebuild.
- `npm run build:data` — republished twice (once after the Mariam's id, once after adding both
  Touché Privé ids). No `brandDropViolations` guard trip — single-item drops from otherwise
  large brands don't approach the 30%/5-product threshold.

## Verification

- Confirmed directly against the published file: none of the three ids present in
  `data/products.json`. Total published 22,748 → 22,745.
- `npx tsc --noEmit` — clean.
- `npx vitest run lib/exclude.test.ts lib/catalogue.test.ts lib/compactCatalogue.test.ts` —
  21/21 passing (the pipeline tests relevant to an exclusions-list change).
- Did **not** run the full suite/full lint as the pass/fail signal here — another session has
  in-progress, uncommitted work (`app/staff/curate/*`, an inline staff-editing feature) with its
  own test file carrying real lint errors (`no-explicit-any` in
  `app/api/staff/live-edit/move/route.test.ts`) and one failing test, neither related to this
  change. Scoped verification above is what's relevant to a JSON-only exclusions edit.

## Notes / follow-ups

None.
