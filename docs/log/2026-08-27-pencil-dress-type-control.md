# The staff pencil can set a dress type

**Date:** 2026-08-27 · **Status:** done

## Goal
Tina: *"i need the staff curate thing updated the pencil. the new catagories and types
etc i want to fill in that too"*. Three things have been added to the site since the
pencil was last touched and none was fillable from it, so I listed them with what each
would cost and asked which she meant. She chose **dress types only** — Everyday /
Occasion / Slip. Hijab types and a card-photo picker were offered and not taken.

## Why this one and not the others
The three sub-category families the pencil already covers — layering, outerwear, and
(read-only) hijab — all have a **classifier underneath them**, so a staff override
corrects a machine's guess. `DressSubtype` has none: `lib/specialty.ts::dressSubtype()`
reads `curatedDressSubtype`, falls back to a single brand rule, and otherwise returns
null. This control is therefore not a correction layer, it is **the only way the value
is ever produced**. Until today the sole route to one was Tina sending a batch of URLs
for someone to hand-merge — which is exactly what
`docs/log/2026-08-26-dress-subtypes.md` predicted when it wrote *"There is no staff UI
for this yet — a 'set dress type' control on the card ... would be the natural next
step if batching gets old."* 2,005 dresses are still unclassified.

## What changed
Built as the **fourth live-edit store**, deliberately identical in shape to the three
that exist, because production has no path to write back into git:

| file | role |
|---|---|
| `lib/liveDressTypes.ts` | **new.** The runtime store, `data/.live-dress-types.json`. Atomic write (tmp + rename), corrupt-file-reads-as-empty, same as its three siblings. |
| `app/api/staff/live-edit/dress-type/route.ts` | **new.** POST `{id, subtype}`. Validates the subtype against `DRESS_SUBTYPE_LABELS`, so the menu and the route can never drift. Also `setLiveCut(id, 'keep')` — same contract as the other write routes: setting a type un-hides a deleted item, so fixing a mistaken delete is one action. |
| `components/StaffEditControl.tsx` | the "Dress type" submenu, rendered **only when `garment === 'dress'`** |
| `app/staff/curate/ReviewTray.tsx` | a "Dress types (n)" group; counted in the pending total and in the Clear confirmation |
| `app/api/staff/live-edit/list/route.ts` | returns `dressTypes` — this response *is* the "Copy for Claude" export |
| `app/api/staff/live-edit/clear/route.ts` | clears the fourth store too |
| `lib/products.ts` | applies a live pick as `curatedDressSubtype`, **and keys the new store into `cacheKey()`** |
| `scripts/merge-live-edits.mjs` | folds `dressTypes` into `data/dress-subtypes.json` |
| `.gitignore` | the new store |

### The one that would have been a silent no-op
`lib/products.ts`'s cache is keyed on the **mtimes** of `products.json` plus each live
store, precisely so an edit made inside the running container takes effect on the next
request. Its own comment says: *"If a FOURTH live-override store is ever added, it must
be added to cacheKey() in the same commit, or edits through it will appear to do
nothing."* That warning has now been collected on. Without the extra `stamp()` the pick
is written to disk perfectly and then never read — the pencil would look like it worked
and nothing would change. There is now a test that fails if the line is removed.

### Only on a dress, on purpose
`dressSubtype()` returns null for anything that is not `garment === 'dress'`, so
offering the control on an abaya would write a value that can never be read back. A
control that silently does nothing is worse than an absent one. The card passes its
CURRENT garment, so the submenu appears the moment a "Move to → Modest Dresses" lands,
with no reload.

## Verification
`npm test` — `Test Files 55 passed (55) · Tests 901 passed (901)`, including 6 new route
tests, 1 new caching test, and extensions to the list and clear route tests.
`npx tsc --noEmit` clean. `npm run lint` exit 0.

**Three negative controls, each run against the unfixed code first** (§10.28 rule 1):

| check | broken how | result |
|---|---|---|
| `picks up a live dress type written after the first read` | removed `stamp(d('.live-dress-types.json'))` from `cacheKey()` | FAILS, then passes |
| `returns dress types, with the current value as 'from'` | dropped `dressTypes` from the list route's JSON | FAILS, then passes |
| the merge script's `dressTypes` branch | — | exercised on a real export: 1 new key written, 1 already-matching key skipped, existing entries untouched |

**Formatting, checked rather than assumed.** `data/dress-subtypes.json` is pretty-printed
*with a trailing newline* on disk. A merge writing `JSON.stringify(…, null, 2)` alone
would silently reflow its last line into every future diff — the §8 "contested
formatting" trap. Proved it does not: a no-op merge leaves the file **byte-identical**
(`diff -q`), and a real merge changes only the keys it should.

**A test that was writing to disk.** Unmocked, the real `clearLiveDressTypes()` ran
inside the clear-route test and created `data/.live-dress-types.json` on every
`npm test`. Gitignored, so harmless, but it meant the test had an unasserted real side
effect. Now mocked and asserted, and the file no longer appears after a run.

## Notes / follow-ups
- Not built, and offered: **hijab types** (would need a whole new override layer —
  `curatedHijabSubtype`, a data file, a publish step, and `specialty.ts` honouring it
  ahead of the classifier) and a **card-photo picker** (would need the image ARRAY kept
  on raw rows; only the chosen one is stored today). Both are hers to ask for.
- The flow is unchanged otherwise: pick in the pencil → it takes effect on the live site
  immediately → "Copy for Claude" → `node scripts/merge-live-edits.mjs` →
  `npm run build:data`.
