# Hijabs & Scarves gets a Type filter and header flyout

**Date:** 2026-08-15 · **Status:** done

## Goal
Tina: "i want a dropdown that give khimars and jilbabs undercap et etc" —
Outerwear and Layering Basics both have a hover flyout in the header (and a
matching tap-to-expand row on mobile) that pre-filters the lane page by
subtype; Hijabs & Scarves had neither. Same treatment, three groups: Hijabs,
Khimars & Jilbabs, Undercaps.

## What changed
- `lib/types.ts`: new `HijabSubtype = 'hijab' | 'khimar-jilbab' | 'undercap'`.
- `lib/specialty.ts`: new `HIJAB_SUBTYPE_LABELS` and `hijabSubtype(p)` —
  mirrors the modest-hijabs lane's own match predicate exactly (undercap →
  'undercap', jilbab or abaya-length khimar → 'khimar-jilbab', plain
  garment:'hijab' → 'hijab', anything still layering-basics-bound via
  PRAYER_RE → null). Also fixed `isSpecialty()`, which was missing
  `isKhimarAbaya()`/`isUndercap()` — without that fix, a khimar-titled abaya
  would ALSO satisfy `modest-abayas`' `garment === 'abaya'` match and show on
  both lanes at once. Verified against real data: 132 products structurally
  match both lanes' raw predicates; confirmed the `isSpecialty()` guard
  correctly excludes all 132 from Abayas' actual served list.
- `lib/compactCatalogue.ts`: added `hijabSubtypes`/`rows.hijabSubtypeIdx`,
  same shape and same canonical-order logic as the existing layering/
  outerwear columns.
- `components/FilterableGrid.tsx`: generalized the binary
  `usingOuterwearTypes` flag into a 3-way `typeDomain` ('layering' |
  'outerwear' | 'hijab' | 'none') — a lane page only ever has one subtype
  domain non-empty at a time, so this picks whichever one actually applies.
- `components/Nav.tsx` / `components/MobileNav.tsx`: added the Hijabs &
  Scarves flyout/disclosure row, same pattern as Outerwear's (2026-08-13) and
  Layering Basics's (this morning).
- `app/[lane]/page.tsx`: the page `<h1>` now also resolves a hijab subtype
  label (e.g. landing on `/modest-hijabs?type=undercap` reads "Undercaps" up
  top, not the generic lane title) — same mechanism already in place for the
  other two.
- Tests added/updated in `lib/specialty.test.ts` and
  `lib/compactCatalogue.test.ts` (new `hijabSubtype`/hijab-subtype-encoding
  describe blocks, including the "every published item gets a real subtype,
  never a silent null" completeness check already used for layering).

## Verification
- `npx tsc --noEmit` — clean.
- `npx vitest run --exclude '**/.claude/**'` — 681/681 passing.
- `npx eslint` on every changed file — clean.
- Real catalogue check: 5146 in-stock products on the Hijabs & Scarves lane
  (4701 hijab, 132 khimar-jilbab, 313 undercap) — all three subtypes non-null,
  matching the completeness test above.

## Notes / follow-ups
- Caught and fixed a real bug while building this: `isSpecialty()` didn't
  know about `isKhimarAbaya()`/`isUndercap()`, so the 132 khimar/jilbab
  abayas would have leaked onto `/modest-abayas` too. Worth remembering as a
  pattern — any time a product's classification depends on something OTHER
  than its raw `garment` field, `isSpecialty()` needs to know about it too,
  or `productsForLane` won't strip it from the lanes it doesn't belong on.
- No forced-override mechanism (`forcedHijabSubtype`) was added — the
  existing `forcedLane`/`forcedLayeringSubtype`/`forcedOuterwearSubtype`
  pattern would need extending to cover this lane too, and Tina didn't ask
  for it. If a hijab-lane item is ever misclassified badly enough to need a
  manual override, that's the next piece to build.
