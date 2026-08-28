# Applied a /staff/curate export: 46 cuts, all Lameera Moda

**Date:** 2026-08-28 · **Status:** done

## Goal
Tina pasted the JSON from `/staff/curate`'s "Copy for Claude" button: 46 `deletes`, no
`moves`, `laneMoves` or `dressTypes`. Every id belongs to one brand, `lameera-moda` —
12 skirts, 30 dresses, 3 abayas (2 of them "abaya set"), 2 knit/ribbed sets.

## What changed
- `data/decisions.json` — 46 ids set to `cut` (0 already matched). Applied with
  `node scripts/merge-live-edits.mjs`; no file was hand-edited.
- `data/dress-subtypes.json` — 2 stale entries pruned,
  `lameera-moda:7588358357160` and `lameera-moda:8419509239976` (both `everyday`).
  Those two products are now cut, so their subtype judgement has nothing to attach to;
  `lib/dressSubtypes.test.ts`'s "every curated id is a published dress" check caught it.
  411 -> 409 entries.
- `data/products.json` / `data/review.json` — republished with `npm run build:data`.
  18,893 -> 18,847 rows (-46).

## Verification
`git fetch` first (§10.35): `HEAD..origin/main` and `HEAD..origin/staging` both empty, so
this ran on the current base and cannot revert the nightly refresh's work.

Per §10.35/§10.49, every id confirmed **PRESENT before** the change — absence afterwards is
not evidence of a successful cut unless you already know the row was there. All 46 resolved
in `data/products.json` with their titles and garments intact (12 `skirt`, 30 `dress`,
3 `abaya`, 2 `set`; the list is in the session transcript). `present: 46 | absent: 0`.

After the republish:

```
rows now: 18847
deletes gone: 46/46
lameera-moda published now: 244 (was 290)
control rows still present:
  PRESENT lameera-moda:9404835561640 | Sila Textured Chiffon Pants Set - Butter Yellow
  PRESENT lameera-moda:9064633434280 | Premium Modal Scarf- Ocean Blue
  PRESENT lameera-moda:9064634515624 | Premium Modal Scarf- Denim Blue
```

The control rows are the point (§10.49 rule 3): a one-sided "is it gone" check passes just
as happily when the whole brand has vanished. 244 of 290 remain, which is the expected
15.9% drop — well under `brandDropViolations`' 30% gate, and no guard fired:

```
Published 18847 products (mixed across 109 brands) | rejected 6195 | review 2125 |
delisted-by-brand 2540
Titles: 3984 translated from cache | cache covers every non-English title
```

`npm test` — 55 files, **901 tests pass** (one failure before the subtype prune, zero after).

## Notes / follow-ups
Not a brand cut. 46 of 290 is a batch of individual editorial judgements, so `lameera-moda`
stays in `data/brands.ts` and out of `exclusions.json.brands` (§7's "cutting a brand is two
edits" does not apply). Invariant 14 is what makes the `cut` decisions durable — the next
`refresh`/`add-brands` pass defaults only ids that are *absent* from the map, so these 46
will not be resurrected.

Still to do: verify on staging after the push, then Tina's approval before merging to `main`
(§1).
