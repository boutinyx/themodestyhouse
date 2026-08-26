# Removed a delisted pick from the Fall Essentials edit
**Date:** 2026-08-26 · **Status:** done

## Goal
`npm test` went red after merging this morning's nightly catalogue refresh.
Tina, on the failing pick: *"just take it out"*.

## What happened
`lib/edits.test.ts` asserts every hand-picked product id in `lib/edits.ts` still
resolves to a live product:

```
FAIL lib/edits.test.ts > edits > every hand-picked product id still resolves
  fall-essentials: these picked ids are no longer live. A brand delisted them or
  they went out of stock — re-pick in /staff/curate rather than deleting the edit.
  + [ "la-petite-parisienne:12488256848212" ]
```

Not a code regression. The scheduled `refresh.yml` run at 05:17 UTC
(`612f61d`, *+62 new, 39 delisted*) delisted that product — La Petite
Parisienne's Brown VICTORY shirt (KC842). Confirmed rather than assumed:

```
$ grep -c "la-petite-parisienne:12488256848212" data/products.json         # 0  (now)
$ git show 50c416b:data/products.json | grep -c "la-petite…"               # 1  (before the merge)
```

This is the failure mode CLAUDE.md §10.14 exists for, working as designed: the
lifecycle layer noticed the brand removed the product, and the test caught that
a hand-curated list still referenced it. Without both, the edit would have
rendered a dead card linking to a 404 on the brand's site.

## What changed
- `lib/edits.ts` — one line removed from the `fall-essentials` picks.

Removed rather than replaced, per Tina. Choosing a substitute product is an
editorial call (§10.18) and she asked for the simpler outcome. The edit is
unaffected in practice: it still carries **275 picks**.

## Verification
```
$ npx tsc --noEmit     # exit 0
$ npm run lint         # exit 0
$ npm test             # Test Files 48 passed (48) · Tests 791 passed (791)
```
The suite was red on exactly one test before this and is green after it.

## Notes / follow-ups
- This will recur — 39 products were delisted in a single night, and three edits
  hold 331 hand-picked ids between them. The test is the right safety net, but
  it fails on `main` *after* the bot has already pushed, so the first sign is a
  red build rather than a warning. Worth considering: have `refresh.mjs` report
  which delisted ids are referenced by `lib/edits.ts`, `lib/popularItems.ts` or
  `lib/abayaPicks.ts` in its summary, so the collision is visible in the refresh
  output instead of surfacing later as a test failure.
