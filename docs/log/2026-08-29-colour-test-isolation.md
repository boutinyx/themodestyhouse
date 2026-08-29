# Isolate the colour tests from Tina's overrides file

**Date:** 2026-08-29 · **Status:** done

## Goal

`lib/colour.test.ts` asserted **vocabulary** behaviour — what `RULES` in `lib/colour.ts`
does — while reading the **live, hand-edited** `data/colour-overrides.json`. Tina answered
~120 colour terms and six tests went red, none of them a defect in either the code or her
data. She has ~750 terms still to review, so the build breaks again every session.

§10.19 exactly: *"a test that asserts things about MUTABLE third-party data is an authoring
aid, not a build gate"*. §10.15's shape too — a guard depending on something owned by a
different concern.

## What changed

`lib/colour.test.ts` only. `lib/colour.ts` is byte-identical (md5
`227dc0b9e331dbed22dc12b85bc79661` before and after) and `data/colour-overrides.json` was
never written to.

Three groups, split by what each is actually for:

1. **Vocabulary tests → an EMPTY override map.** A `loadColour(overrides = {})` helper
   generalises the `vi.doMock` harness the file already used in four places; a file-level
   `beforeAll` binds `colourFamily`/`classifyColour` to the empty-map build under the same
   names, so no assertion body changed — only the module it runs against.
2. **Override tests → small INVENTED fixture maps**, declared beside the assertion
   (`terms: { mink: null }`, `weakWords: { rose: ['pink','red'] }`, …). Several coincide
   with real entries of hers; they are restated so the tests do not depend on that.
3. **The validator keeps reading the REAL file.** That is its whole job — it fails CI on a
   bad hand-edit and is what keeps the build-time throw in `lib/compactCatalogue.ts`
   reachable. It accepts her current file as-is.

No test was deleted. 61 → **64**: every prior assertion still made, plus an override that
*contradicts* the vocabulary (the old `bordeaux: 'red'` case could not show one, since red
is also the vocabulary answer), the recorded-null `families` case split out of a line that
mixed vocabulary and override assertions, and a validator test that her `notes` section and
the `//` prose keys are ignored.

Two pre-existing false comments fixed while in there: `'Hijab - Navy Blue'` and
`'Hijab - Mink'` were asserted under a *"every title below is a literal catalogue string"*
banner and **neither exists**, in `products.json` or `raw-products.json`. Swapped for
`'Premium Chiffon Hijab - Navy Blue'` and `'Premium Chiffon Hijab - Mink'`.

## Verification

```
$ npx vitest run lib/colour.test.ts
      Tests  64 passed (64)                    # was 6 failed | 55 passed (61)
$ npx vitest run
 Test Files  58 passed (58)
      Tests  1023 passed (1023)
$ rm -f tsconfig.tsbuildinfo && npx tsc --noEmit          -> CLEAN
$ npx eslint --max-warnings 0 --ignore-pattern '.act.tmp.mjs' .  -> CLEAN
$ npx tsx scripts/colour-coverage.mjs
  BEFORE  19019 rows | 14167 with a family  74.5%
  AFTER   19019 rows | 14167 with a family  74.5%   (identical)
```

**Durability, which is the part that matters** — green on today's file proves nothing, since
re-baselining would also be green. The suite was pointed at an AUGMENTED copy of her file
(122 terms) whose invented entries deliberately contradict four existing assertions
(`pistachio: 'beige'` vs a test expecting green, `charcoal: null` vs grey,
`chocolate: 'pink'` vs brown, plus `thyme`/`sage`/`ivory`): **64 passed**. A companion check
importing the UNMOCKED module confirmed the alias really reached `lib/colour.ts` (66 passed
with it), and the same check FAILS against her real file, so it is a genuine discriminator
and not a no-op reading green (§10.28 rule 1).

**Negative controls**, each with `lib/colour.ts` restored byte-identically after:
- `RULES` reordered so `navy` sits below `blue` → **3 isolated vocabulary tests fail**.
  Worth recording: with the real overrides file they do **not**, because
  `"navy blue": "navy"` answers first. The isolation did not just stop false failures, it
  restored a regression check her data had silently switched off.
- Both override lookups short-circuited → **13 fixture tests fail**.
- The first attempt at the ordering control was a no-op (I reinserted `navy` still above
  `blue`) and read as a clean pass — §10.20, prove the step ran before diagnosing anything.

## Notes / follow-ups

- Full detail, including every command's output: `.superpowers/sdd/test-isolation-report.md`
  (gitignored).
- Two things in Tina's file flagged for her, **not changed**: `"dusk": null` whose own note
  says the two products it covers are blue, and a cluster of four adjacent newest-batch
  values that do not match their words (`cayenne`/`bedrock`/`graystone` → purple,
  `climbing ivy` → black). The second has the shape of a review-page selection slip rather
  than four independent judgements. Neither is a validator failure — all are real families,
  so the build is safe either way.
