# Hijab Type filter — removed the fake "Hijab Sets" group
**Date:** 2026-08-15 · **Status:** done

## Goal
Tina, right after confirming the Type filter dropdown was live: "hijab sets dont exsist they
are just match undercap and hijab get rid of that." Remove the "Hijab Sets" group from
`lib/hijabTypeFilter.ts`.

## What changed
Checked the real 252 items the `set` group (`\bsets?\b`) was catching before touching
anything: almost all plain jersey/modal/chiffon/bamboo hijabs sold as a matching bundle
("Bamboo Jersey Hijab Set - Cedar", "Modal Hijab Set", "Chiffon Hijab Set - Citrus Green")
or bare bundles naming no fabric at all ("The Culture Starter Set", "3-Piece Hijab Set").
Confirmed Tina's read: "set" describes how an item is packaged, not what it is — unlike
every other group in this taxonomy, it was hiding real fabric signal rather than adding a
useful one.

- `lib/hijabTypeFilter.ts` — removed `'set'` from the `HijabTypeFilter` union, from
  `HIJAB_TYPE_FILTER_LABELS`, and its `GROUPS` regex entry. 14 groups now, not 15.
- `lib/hijabTypeFilter.test.ts` — replaced the `'set'` assertions with: a new test that
  `hijabTypeFilter()` returns `null` for fabric-less set-bundle titles ("The Culture Starter
  Set", "3-Piece Hijab Set"), and updated the "sorts a real title from each group" test to
  use "Bamboo Jersey Hijab Set - Cedar" as a `jersey` example (proving the fabric now wins
  where "set" used to steal the classification).
- `docs/superpowers/specs/2026-08-15-hijab-type-filter-design.md` — taxonomy table updated
  to 14 groups with corrected counts: removing `set` redistributed its 252 items — Jersey
  1,141 → 1,201, Modal 517 → 659, Chiffon 666 → 700, Satin 118 → 119 — and the unmatched
  ("no type") bucket grew slightly, 848 → 863 (16.5% → 16.8%), from the fabric-less bundle
  titles that now correctly fall through to null instead of a fake category.

## Verification
```
$ npx vitest run lib/hijabTypeFilter.test.ts
 Test Files  1 passed (1)
      Tests  8 passed (8)

$ rm -f tsconfig.tsbuildinfo && npx tsc --noEmit
(clean)

$ npx eslint lib/hijabTypeFilter.ts lib/hijabTypeFilter.test.ts
(clean)

$ npx vitest run --exclude '**/.claude/**'
 Test Files  42 passed (42)
      Tests  694 passed (694)
```

## Notes / follow-ups
- No republish needed — pure application code, request-time classification, same as the
  original design.
- Not yet re-verified live on the deployed site (pending push + Railway deploy).
