# Staff curate: wire up Outerwear subtypes (blazer, vest, cardigan, coat)
**Date:** 2026-08-14 · **Status:** done

## Goal
Tina: "in the staff/curate i dont see an option to move to blazer/cardigans etc so
outerware -> blazer, cardigan etc etc fix that" — the staff "move" menu on each product
card had a submenu for Layering Basics subtypes but no equivalent for Outerwear.

## What changed
Investigated first (Explore agent): the Outerwear lane and its four subtypes (blazer, vest,
cardigan, coat) already fully existed in the data model (`lib/lanes.ts`, `lib/types.ts`,
`lib/specialty.ts`) — the gap was entirely in the staff write path, which never offered
Outerwear as a destination and would have let a layering subtype get saved onto an
outerwear item (or vice versa) if it had.

- `components/StaffEditControl.tsx` — added an Outerwear submenu mirroring the existing
  Layering Basics one; widened `StaffEditResult`/`moveLane` to accept
  `LayeringSubtype | OuterwearSubtype`; added a shared `subtypeLabel()` helper (lane-aware
  label lookup) alongside the existing `laneLabel`/`garmentMoveLabel`.
- `app/api/staff/live-edit/move-lane/route.ts` — added `'outerwear'` to `FORCED_LANES`;
  subtype is now validated **per-lane** (`SUBTYPES_BY_LANE`), not against a merged list —
  a layering subtype can never be saved onto an outerwear item or vice versa.
- `lib/types.ts` — new `Product.forcedOuterwearSubtype?: OuterwearSubtype`, deliberately
  separate from `forcedLayeringSubtype` (a shared field would let a subtype leak across
  lanes if the lane were ever changed without clearing it).
- `lib/liveLaneOverrides.ts` — widened `subtype` to `LayeringSubtype | OuterwearSubtype`.
- `lib/products.ts` and `scripts/build-data.mjs` — now branch on the override's `lane` when
  applying it, writing into `forcedLayeringSubtype` or `forcedOuterwearSubtype` accordingly
  (previously always wrote `forcedLayeringSubtype` regardless of lane — latent bug, never
  triggered because outerwear was never a reachable lane before this fix).
- `lib/specialty.ts` — `outerwearSubtype()` now has the same forced-override short-circuit
  `layeringSubtype()` already had, else a "Cardigan" move would land in the Outerwear lane
  but keep re-guessing its subtype from the title.
- `app/staff/curate/ReviewTray.tsx` and `components/ProductCard.tsx` — both consumed the
  now-shared `subtypeLabel()` instead of hardcoding `LAYERING_SUBTYPE_LABELS`, which would
  have silently rendered `undefined` for an outerwear move.

## Verification
- `npx tsc --noEmit` clean.
- `npm test` (excluding an unrelated, pre-existing failure in a different git worktree,
  `.claude/worktrees/jiggly-hugging-honey/` — confirmed unrelated by running
  `npx vitest run --exclude '.claude/**'`): 651/651 passing, including 4 new tests (2 in
  `move-lane/route.test.ts` for outerwear + cross-lane rejection, 2 in `specialty.test.ts`
  for the forced-subtype short-circuit).
- `npm run lint` clean on every changed file (one pre-existing warning in an unrelated
  untracked scratch file, `.fontprobe.tmp.mjs`, not touched by this change).
- **Real end-to-end verification**, not mocks: started `next dev` on a scratch port, logged
  in as staff via the real `/api/staff/login`, POSTed a real product through
  `/api/staff/live-edit/move-lane` with `lane: outerwear, subtype: cardigan`, confirmed the
  stored override had the right shape, confirmed `getProducts()` merges it into
  `forcedOuterwearSubtype` (not `forcedLayeringSubtype`), confirmed a cross-lane subtype
  (`layering-basics`'s `under-dress` sent with `lane: outerwear`) was correctly rejected
  (400), and confirmed the moved product actually appeared on the live `/outerwear` page
  HTML. Cleaned up the test override file afterward (gitignored, local-only, contained only
  the one test entry) and stopped the scratch dev server.
- Browser-extension UI verification (clicking the actual menu) wasn't possible — the Chrome
  extension wasn't connected this session — so the visual menu was verified by code review
  (mirrors the already-working Layering Basics submenu exactly) plus the real API-level
  end-to-end check above, not by clicking through it.

## Notes / follow-ups
- Explicitly out of scope (per Tina, asked and confirmed): `jacket` (392 top-garment rows),
  `cape` (121), `gilet` (12), `parka` (5), `poncho` (13) are still not recognized as
  Outerwear at all — `OUTERWEAR_RE` in `lib/specialty.ts` only matches
  blazer/vest/cardigan/coat. `jacket` alone is bigger than any existing subtype. Adding
  these needs the same false-positive measurement discipline the existing four-word regex
  was built with (per that file's own comment) — a separate follow-up, not bundled here.
