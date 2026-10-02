# Correction: scope the Verified/Claim swap to Try Modest only
**Date:** 2026-10-02 · **Status:** done

## Goal
Earlier today's fix ("Try Modest: add the designers-page description,
seal it verified") swapped `app/designers/[slug]/page.tsx`'s "Is this
your house? Claim this page" link for a Verified chip whenever
`brand.badge` was set — a global rule, reasoned at the time as "every
already-verified house has the same inconsistency." Tina: "but you
removed claim your house everywhere." That reasoning wasn't asked for;
the original request was about Try Modest's own page specifically (the
screenshot was of it), and the global version silently took the claim
link away from Veiled, Aab, Summer Evenings, Inayah and Glow Modesty too.

## What changed
`app/designers/[slug]/page.tsx`: condition changed from `brand.badge` to
`brand.slug === 'try-modest' && brand.badge`. Every other badged house
gets its claim link back; Try Modest keeps the Verified chip.

## Verification
- `npx tsc --noEmit` clean (the slug check alone didn't narrow
  `brand.badge` for TS, so `BADGE[brand.badge]` needed the `&& brand.badge`
  half of the condition too — caught as a real type error, not stylistic).
- Playwright against a real dev build, all 6 currently-badged houses:
  veiled/aab/summer-evenings/inayah/glow-modesty all show "Claim this
  page" again (and no Verified chip); try-modest alone shows Verified,
  no claim link. No horizontal overflow on any of the six.
- Re-checked `/designers`' index grid tiles (unaffected by this file) —
  all 6 still show their Verified badge there, confirming this fix only
  touched the individual-page claim/verified swap, not the grid.
- `npx vitest run`: 1330 passed, 1 pre-existing unrelated failure (same
  as every other check today). `npm run build` clean.

## Notes / follow-ups
- If Tina later wants the global rule back (every badged house hides its
  claim link), that's a one-line revert — but don't do it without asking
  again, given this exact correction.
