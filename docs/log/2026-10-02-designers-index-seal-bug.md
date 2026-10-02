# Fix: Verified seal missing for the 6th vetted house
**Date:** 2026-10-02 · **Status:** done

## Goal
Tina, on a screenshot of Try Modest's tile on `/designers`: "im missing
the vified here too." The individual `/designers/try-modest` page already
had its Verified chip (fixed earlier the same day); the index grid's tile
did not.

## Root cause
`app/designers/page.tsx`'s `seal` prop was `!region && page === 1 && i <
PER_ROW` — `i < PER_ROW` (5) was standing in for "is this house vetted",
and that only worked because `vetted.length` (5 named houses in
`VERIFIED_ORDER`) happened to equal `PER_ROW` (5). The comment even said
so explicitly: "there are exactly five, so they fill the first row on
their own." Setting `badge: 'verified'` on Try Modest earlier today made
`vetted.length` 6; it landed at `ordered` index 5, `i < 5` was false, and
its tile rendered with no seal despite `b.badge` being set — same bug
shape as §10.32/§10.38 in CLAUDE.md's mistakes log: a check standing in
for a condition it doesn't actually test, silently wrong once the
coincidence it depended on stopped holding.

## What changed
`vettedSlugs` (a `Set` of the actual vetted houses' slugs) replaces the
positional check: `seal={!region && page === 1 && vettedSlugs.has(b.slug)}`.
Correct regardless of how many houses are vetted from here on — no longer
coupled to `PER_ROW`.

## Verification
- `npx tsc --noEmit` and `npx eslint` clean.
- `npx vitest run`: 1330 passed, 1 pre-existing unrelated failure (same as
  every other check today).
- Playwright against a real dev build: first 8 tiles checked for the
  `.badge` element — all 5 named vetted houses true, `try-modest` now
  true, the next two unbadged houses false. Screenshotted both rows:
  row 1 unchanged, Try Modest's tile on row 2 now shows "VERIFIED" next
  to its name, the following unbadged tiles correctly show none.
- `npm run build` clean, 144 routes.
