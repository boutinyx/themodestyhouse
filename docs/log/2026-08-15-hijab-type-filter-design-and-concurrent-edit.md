# Hijab Type filter — design spec, and a discarded concurrent edit
**Date:** 2026-08-15 · **Status:** partial (design done, implementation not started)

## Goal
Tina asked for a filter on the types of hijabs in the catalogue ("prints, jersey, instant
hijabs etc"). Ran the request through the brainstorming skill: researched the real
`modest-hijabs` lane data (5,146 products), proposed a 15-group fabric+style taxonomy, got
it approved section by section.

## What changed
- `docs/superpowers/specs/2026-08-15-hijab-type-filter-design.md` — the approved design.
  Full taxonomy table, file-by-file plan, out-of-scope list. Committed (`ebe37b9`).
- Found and discarded an uncommitted, unrelated edit to `lib/types.ts`: a `HijabSubtype =
  'hijab' | 'khimar-jilbab' | 'undercap'` type, referencing a `hijabSubtype()` function that
  didn't exist anywhere in the codebase. Per `docs/log/2026-08-15-session-handoff.md`, this
  repo has an actively concurrent session working the same working directory — this looks
  like that session starting the same feature independently, with a different (coarser,
  3-category) taxonomy, mid-edit. Confirmed via `git diff HEAD -- lib/types.ts` that this
  was the file's *only* uncommitted change before touching it. Flagged to Tina rather than
  silently overwriting; she chose to discard it and proceed with the 15-group design.
  Reverted with `git checkout -- lib/types.ts`.

## Verification
```
$ git diff HEAD -- lib/types.ts
diff --git a/lib/types.ts b/lib/types.ts
+export type HijabSubtype = 'hijab' | 'khimar-jilbab' | 'undercap';
   (only hunk, before revert)

$ git checkout -- lib/types.ts && git diff HEAD -- lib/types.ts
(no output — clean)
```

## Notes / follow-ups
- If the concurrent session resumes and re-adds a hijab-type mechanism independently, it
  will collide with this one (both would touch `lib/types.ts`, `lib/compactCatalogue.ts`,
  `components/Nav.tsx`). Not resolved here — Tina's call, if it happens.
- Implementation plan not yet written; next step per the brainstorming→writing-plans flow.
