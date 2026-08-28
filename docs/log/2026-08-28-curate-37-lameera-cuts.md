# Applied a second /staff/curate export: 37 cuts, all Lameera Moda

**Date:** 2026-08-28 · **Status:** done

## Goal
Tina pasted a second `/staff/curate` export the same day as
`2026-08-28-curate-46-lameera-cuts.md`: 37 `deletes`, one `moves` entry, no `laneMoves`
or `dressTypes`. Every id is `lameera-moda` — 16 skirts, 16 dresses, 5 abayas (3 of them
"abaya set"). She asked for it live, so this went staging -> `main` in the same pass.

The single `move` is `lameera-moda:7364394025128` "Naomi Pleated Skirt- Black",
`from: "skirt"` -> `to: "skirt"`. That is a no-op judgement — she opened the pencil and
re-picked the value it already had — but it is applied faithfully rather than dropped,
because a `garment-overrides.json` entry pins the classification against a future
`lib/tag.ts` change. It is asserted as a control below.

## Done in an isolated worktree, not the shared tree
A concurrent session was mid-`npm run refresh` (PID 31638, 52 of 108 brands at the time)
with an unfinished size-floor changeset dirty in the working copy —
`lib/sizeAvailability.ts`, `lib/normalize.ts`, `lib/types.ts`, `scripts/build-data.mjs`,
plus rewritten `raw-products.json` / `decisions.json` / `products.json`.

Doing this in the shared tree would have hit three of §10's traps at once: racing that
refresh's per-brand `decisions.json` read-modify-write (`scripts/refresh.mjs:102`),
publishing a `products.json` built from a half-refreshed raw, and committing another
session's work under this commit's message (§10.30 / §10.39). So the whole job ran in
`git worktree add /tmp/mh-cuts-wt staging --detach` off `d84c1bd`, with `node_modules`
symlinked. `npm run build:data` is `tsx`-only, so the §10.38 Turbopack symlink panic does
not apply here.

Consequence, stated plainly: **this commit carries the 37 cuts and nothing else.** The
size-floor rule is not in it and is not live.

## What changed
- `data/decisions.json` — 37 ids -> `cut` (0 already matched), via
  `node scripts/merge-live-edits.mjs`. No file hand-edited.
- `data/garment-overrides.json` — 1 entry, the Naomi skirt -> `skirt`.
- `data/dress-subtypes.json` — 2 now-cut ids pruned, `lameera-moda:9117343973544` and
  `lameera-moda:9293812465832` (both `everyday`). 409 -> 407. Caught by
  `lib/dressSubtypes.test.ts`, exactly as in the 46-cut pass.
- `data/products.json` — republished. 18,847 -> 18,810 rows (-37).

## Verification
Base check first (§10.35): `origin/main`, `origin/staging` and `HEAD` were all
`d84c1bd` — one ref, so nothing local could revert the nightly refresh's work.

Presence **before** the cut, on the base actually being written to (§10.49: absence is
only evidence if you know the row was there). All 37 resolved in the worktree's
`data/products.json` with garments intact — 16 `skirt`, 16 `dress`, 5 `abaya`:
`present: 37 | absent: 0`, 18,847 rows.

After the republish:

```
rows now: 18810
deletes gone: 37/37
lameera-moda published now: 207 (was 244)
  PRESENT lameera-moda:9404835561640 | set   | Sila Textured Chiffon Pants Set - Butter Yellow
  PRESENT lameera-moda:9064633434280 | hijab | Premium Modal Scarf- Ocean Blue
  PRESENT lameera-moda:9064634515624 | hijab | Premium Modal Scarf- Denim Blue
  PRESENT lameera-moda:7364394025128 | skirt | Naomi Pleated Skirt- Black
decisions cut for all 37: true
```

The control rows are the point (§10.49 rule 3) — a one-sided "is it gone" check reads
just as green when the whole brand has vanished. 207 of 244 remain, a 15.2% drop, under
`brandDropViolations`' 30% gate; no guard fired:

```
Published 18810 products (mixed across 109 brands) | rejected 6195 | review 2125 |
delisted-by-brand 2540
Titles: 3984 translated from cache | cache covers every non-English title
```

`npx vitest run` — 55 files, **901 tests pass** (1 failure before the subtype prune, 0
after).

## Notes / follow-ups
Not a brand cut. 37 of 244 is a batch of individual editorial judgements, so
`lameera-moda` stays in `data/brands.ts` and out of `exclusions.json.brands` (§7's
"cutting a brand is two edits" does not apply). Invariant 14 keeps them: the next
`refresh` / `add-brands` pass defaults only ids **absent** from the map.

Cumulative for the day: 46 + 37 = 83 Lameera Moda products cut, 290 -> 207.

**Open, and owned by the other session:** its `decisions.json` working copy predates
these 37 cuts, so committing it as-is would revert them. It has been told to re-run
`scripts/merge-live-edits.mjs` against the same export, or rebase onto this commit,
before it commits. Worth re-asserting the 37 are still `cut` after its commit lands.
