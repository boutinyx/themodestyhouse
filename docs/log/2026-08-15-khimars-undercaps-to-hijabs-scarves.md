# Khimars and undercaps moved from Layering Basics to Hijabs & Scarves

**Date:** 2026-08-15 · **Status:** done

## Goal
Earlier today, a different session moved undercaps and abaya-length prayer
khimaars into Layering Basics (alongside prayer wear generally). Tina asked this
evening to move khimars and undercaps back out, grouped with jilbabs under
"Hijabs & Scarves" instead — she referred to the concept as "khimars and jilbabs."
Confirmed scope first via AskUserQuestion: just move the products into that lane,
no new Type-filter dropdown (Hijabs & Scarves doesn't have one today, unlike
Layering Basics/Outerwear).

## What changed
- `lib/specialty.ts`:
  - `isLayering()` no longer treats undercap or abaya-length-khimar titles as
    layering. Prayer wear generally (`PRAYER_RE`, garment-agnostic) is untouched —
    Tina didn't ask to change that, and a jilbab/khimar title that's ALSO
    prayer-titled still defers to Layering Basics (existing behavior, still
    tested).
  - New exported `isKhimarAbaya()` and `isUndercap()` — pulled the existing
    regex checks out into standalone functions so `lib/lanes.ts` can use them
    directly.
  - `LAYERING_SUBTYPE_LABELS` and `layeringSubtype()` no longer have
    `'undercap'`/`'khimar'` entries — they're unreachable now that `isLayering()`
    returns false for both.
- `lib/types.ts`: removed `'undercap' | 'khimar'` from the `LayeringSubtype` union.
- `lib/lanes.ts`: `modest-hijabs`'s match now includes `isKhimarAbaya(p) ||
  isUndercap(p)`, same `&& !isLayering(p)` guard as before (still correctly
  defers prayer-titled khimars/jilbabs to Layering Basics).
- Tests updated in `lib/specialty.test.ts` and `lib/lanes.test.ts`: removed
  assertions for the old routing, added coverage for the new one, including the
  "still defers to Layering Basics if also prayer-titled" edge case.

## Verification
- `npx tsc --noEmit` — clean.
- `npx vitest run --exclude '**/.claude/**'` — 673/673 passing in this working
  directory. (Two unrelated failures appeared under `.claude/worktrees/jiggly-
  hugging-honey/` when running plain `npm test` — a different session's worktree,
  not this repo's state, not touched.)
- `npx eslint` on all changed files — clean.

## Notes / follow-ups
- Tina also asked for a "co-ord dresses" option on Modest Dresses (co-ord sets
  that read as a dress-style look also showing on the Dresses page). Checked the
  real catalogue before implementing: only 3 of 595 published `garment: 'set'`
  rows mention "dress" in the title, and those read like mistagged plain dresses
  ("Maxi dress with polka dots"), not genuine co-ords — there's no reliable text
  signal to select a *subset* of "dress-style" sets. Flagged to Tina rather than
  inventing a heuristic; not implemented yet, waiting on her call for whether
  ALL co-ord sets should also appear on Modest Dresses (the only option the real
  data actually supports) or something narrower she'll define.
