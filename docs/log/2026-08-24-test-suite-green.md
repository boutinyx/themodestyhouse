# Test suite back to green: stale fixtures + vitest walking into a worktree
**Date:** 2026-08-24 · **Status:** done

## Goal
`npm test` was red with 4 failures. None were caused by a code change. Tina: *"fix this"*.

## Two independent faults

### 1. Two stale fixtures in `lib/nonApparel.test.ts`
The guard `every test string still exists in the raw catalogue` asserts every MUST_DROP /
MUST_SURVIVE fixture is a real, current catalogue title — it exists to catch an *invented*
fixture. It failed on:

```
Denim Blue Aghabani Bisht- Final Sale
Pearl Cream SE Belted Jacket - Final Sale
```

This is the **§10.19** failure mode exactly: a test asserting things about mutable
third-party data that a nightly bot rewrites. It skips in CI for that reason and runs
locally, where a stale fixture is worth knowing about.

**Neither product was delisted.** Summer Evenings simply dropped the `- Final Sale`
suffix on the 2026-08-24 refresh — `Denim Blue Aghabani Bisht` and
`Pearl Cream SE Belted Jacket` are both still in `raw-products.json`, same brand. So the
fixtures were updated to the current strings rather than replaced with different products:
same two items, same two rules (an obscure garment noun and a jacket must both survive the
veto), only the string moved. The test's own message says not to simply delete the case,
and nothing needed deleting.

### 2. Vitest was running another checkout's entire test suite
The other three failures — `aboutStats`, `devOnly`, and a `nonApparel` fixture already
repaired here — were all in `.claude/worktrees/jiggly-hugging-honey/`, a **separate git
worktree** with its own copy of every test and its own in-progress edits.

Vitest's default include walks `**` from the project root, so `npm test` here was
collecting that checkout's 36 test files alongside this one's 45. Consequences:
- this working tree reported failures caused by code it does not contain and cannot fix;
- every shared test ran **twice**, which is why the count read ~1,331 rather than 734;
- and the noise had been dismissed as "pre-existing, another session's" several times this
  session — i.e. it was actively training everyone to ignore a red suite.

Fixed with a `test.exclude` in `vitest.config.ts` covering `.claude/worktrees/**`. A
worktree runs its own suite from its own root; this one has no business doing it for them.
Same family as the `.venv-style/` exclusion already in `eslint.config.mjs` — a tool walking
into a directory that is not the project.

## Verification
```
before:  Test Files 80  |  Tests 1327 passed, 4 failed
after :  Test Files 45  |  Tests  734 passed, 0 failed
```
The drop is the duplicate run going away, not tests being lost:
`find lib app components -name '*.test.ts'` = **45** — every one collected.
The worktree holds the other **36**.

`lib/nonApparel.test.ts` alone: 150 passed, so it is still collected.

**Negative control run before trusting the fix** (§10.28 rule 1): edited one fixture to
`"Denim Blue Aghabani Bisht ZZZ-NOT-REAL"` and confirmed the guard fires —
`These fixture titles are no longer in the catalogue` — then restored it and confirmed
green again. The check is real, not silently passing.

`npx tsc --noEmit` clean · `npx eslint` on both changed files clean.

## Notes
The exclusion changes only which files THIS root collects. The worktree has its own
`vitest.config.ts` and is unaffected.
