# Sort control — final whole-branch review fixes

**Date:** 2026-08-11 · **Status:** done

## Goal

Clear the findings of the final whole-branch review of `feature/sort-control` before merge:
the Sort chip's label/active state, a missing exhaustiveness guard, and two docs claims that
were factually wrong about what populates `firstSeen`.

## What changed

**1. The Sort chip read "Featured" and was permanently highlighted.**
`FilterDropdown` (`components/IndexPanel.tsx`) hardcoded `'all'` as its "nothing chosen"
sentinel in three places: the synthetic top row's value, the trigger's label fallback, and
`data-active`. Sort's default is a REAL key — `'featured'` is a sort order, not the absence of
one — so `options.find()` always matched, the chip never fell back to the word "Sort", and
`'featured' !== 'all'` made `data-active` permanently true. Every page opened looking like a
filter was already applied.

- `components/IndexPanel.tsx` — new optional `defaultValue` prop, **defaulting to `'all'`**, used
  for all three. Category / Occasion / Brand pass nothing, so their behaviour is unchanged.
  The top row is now "the default choice": if `options` already describes that value it borrows
  that option's label and the duplicate is filtered out of the list; otherwise it synthesises
  the `All <label>` row this menu has always had. That is what keeps the Sort menu at exactly
  five rows and stops it saying "All sort".
- `components/DirectoryBrowser.tsx`, `components/FilterableGrid.tsx` — the Sort call site passes
  `defaultValue="featured"` and its `onSelect` drops the `'all' -> 'featured'` remap, which no
  longer has anything to remap. The comment above each one described the old behaviour and was
  rewritten rather than left as stale reasoning.

**2. `lib/sortRows.ts` — exhaustiveness guard.** The `switch (sort)` had no `default`, so a
future `SortKey` with no `case` would silently fall through to featured order — a control that
looks wired and never sorts. Now `const _exhaustive: never = sort` + a throw.

**3. Docs: `npm run refresh` was the wrong trigger.** Both `docs/log/2026-08-11-sort-control.md`
and the plan's Global Constraints said Newest/Oldest stay inert until the next `npm run refresh`.
Wrong: `firstSeen` is already on the raw rows and `stripLifecycle` no longer removes it, so a
plain, **offline `npm run build:data`** — no network, no feed fetch — is all it takes. Measured
below. Also corrected `scripts/build-data.mjs` and `lib/lifecycle.ts`, which both said lifecycle
fields would sit on "~5k published rows" when the catalogue is 23,142.

**4. `CLAUDE.md`** — §3 gains a note that `Product.firstSeen` is now a published field feeding
`rows.firstSeenDay` and `lib/sortRows.ts`; §8 (Frontend) gains an explicit warning, in the spirit
of the dormant-`vibe` note, that Newest/Oldest are inert until a `build:data` publish runs, with
the real numbers and the reason it is a deliberate, human-owned action.

**No republish was run.** `npm run build:data` rewrites most of `products.json`
(`interleaveByBrand`, §8) and has to be reviewed on counts and the `brandDropViolations` guard —
that is Tina's call, not a side effect of a review-fix pass.

## Verification

Measured with a join of `data/products.json` against `data/raw-products.json`:

```
published rows: 23142 | would get a real firstSeen: 17033 (73.6%) | null: 6109
raw rows: 37954   raw with firstSeen: 24327
published rows currently carrying firstSeen: 0
```

- `npx vitest run lib/sortRows.test.ts` — **8 passed**.
- `npm test` — **exit 0, 24 files / 460 tests passed.**
- `rm -f tsconfig.tsbuildinfo && npx tsc --noEmit` — **exit 0, no output.**
- `npm run lint` — **exit 0, no findings.**
- `npm run build` — **exit 0** (built in this worktree, so the shared `.next` is untouched —
  §10.28 rule 4).

**Exhaustiveness guard, negative control.** Deleted the `case 'oldest'` and re-typechecked:

```
lib/sortRows.ts(59,13): error TS2322: Type '"oldest"' is not assignable to type 'never'.
NEGATIVE CONTROL tsc exit: 2
RESTORED tsc exit: 0
```

**Chip behaviour, driven for real in BOTH engines** (Playwright, chromium + webkit, 1440x900,
against `next start` on :3211 — a menu does not exist until it is opened, §10.25; the stylesheet
assertion of §10.24 ran on every page load). `/directory` and `/modest-dresses`:

```
chips at rest: [{"text":"Category","active":"false"},{"text":"Occasion","active":"false"},
                {"text":"Brand","active":"false"},{"text":"Sort","active":"false"}]
Sort rows: ["Featured","Price: Low to High","Price: High to Low","Newest","Oldest"]
  ok: Sort chip at rest reads "Sort"          ok: Sort chip at rest is not active-styled
  ok: exactly 5 rows, no duplicate Featured, no "All sort"
  ok: Featured is the checked row at rest
  ok: choosing Price: Low to High moves the chip label AND activates it
  ok: re-selecting Featured returns the chip to "Sort", not active
  ok: Category/Occasion/Brand keep their "All <x>" synthetic row (7 / 5 / 105 rows)
  ok: ... a real choice shows its own label and activates the chip
  ok: ... "All <x>" returns them to the generic label, not active
TOTAL PROBLEMS: 0
```

**Negative control for that check** (§10.28 rule 1) — the same script against the three
component files restored from `HEAD`, rebuilt:

```
chips at rest: [... {"text":"Featured","active":"true"}]
Sort rows: ["All sort","Featured","Price: Low to High","Price: High to Low","Newest","Oldest"]
PROBLEM: Sort chip at rest reads "Featured", expected "Sort"
PROBLEM: Sort chip at rest data-active=true, expected false
PROBLEM: Sort menu rows are not exactly [...5 rows]
PROBLEM: Featured row aria-checked=false, expected true at rest
PROBLEM: re-selecting Featured left the chip as "Featured" active=true
TOTAL PROBLEMS: 20
```

It reproduces the reported defect exactly, and — the point of the exercise — **every
Category / Occasion / Brand assertion passes identically on the old code and the new**, which is
the regression evidence for the three already-shipped controls.

## Notes / follow-ups

- Newest / Oldest remain inert on the live data. One offline `npm run build:data` gives real
  dates to 17,033 of 23,142 rows (73.6%); the other 6,109 pre-date lifecycle tracking
  (2026-08-05) and stay `null`, which sorts into the unknown bucket by design. Now warned about
  in CLAUDE.md §8 as well as here, because `docs/log/` is not read by every session.
- Limitations 2, 3, 5 and the remaining half of 6 in `docs/log/2026-08-11-sort-control.md` are
  untouched and still open. None is a regression from this branch.
