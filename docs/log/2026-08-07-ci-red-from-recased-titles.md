# CI red from re-cased catalogue titles
**Date:** 2026-08-07 · **Status:** done

## Goal
CI failed on `main` (`d6c819a`). Tina forwarded the GitHub notification.

## Diagnosis
```
FAIL lib/nonApparel.test.ts > non-apparel veto > every test string still exists in the raw catalogue
AssertionError: expected [ …(3) ] to deeply equal []
Tests  1 failed | 350 passed (351)
```

Three fixture titles were not missing — they had been **re-cased** by the brand:

```
- "STRAIGHT HIJAB PINS - WHITE (ENTIRE WHEEL)"
+ "Straight Hijab Pins - White (Entire Wheel)"
```

Timeline: the nightly **Catalogue refresh ran at 05:48**, re-derived those titles from the
feed, and CI went red at **08:24**. No code defect existed at any point.

Tina had already patched the three strings (`main` was green again on `dac8459` / `78ace1c`
before I looked). This entry is about the cause, which the patch does not address.

## Root cause
The comment above that test read:

> raw-products.json is gitignored (it is the local scrape cache), so this check can only run
> on a machine that has scraped. It must SKIP rather than fail on a clean clone or in CI.

True when written. **False since 2026-08-05**, when `raw-products.json` was committed to close
P0-B and to let the nightly refresh workflow run in Actions. `hasRaw` is now true on the
runner, so a check explicitly designed never to run in CI became a CI gate — over a dataset a
bot rewrites every night.

This is the **second** thing keyed to "raw-products.json is gitignored". The first was the
layer-4 security sentinel in `lib/devOnly.ts` (§10.15), caught before it shipped. Committing
that one file changed the meaning of code in two unrelated places, and neither announced
itself.

## What changed
`lib/nonApparel.test.ts`:
- Skips when `process.env.CI` is set, restoring the author's stated intent.
- Compares case- and whitespace-insensitively. Re-casing is not evidence a fixture was
  invented, which is the only thing this check exists to catch.
- The stale comment is replaced with what is actually true, plus why it must not run in CI.
- Failure message now tells the maintainer to replace a delisted fixture with a current title
  exercising the same rule, rather than deleting the case.

`CLAUDE.md`: added §10.19. Also moved §10.18 ("Invented marketing copy") back into the
mistakes log — it had been left after §12, outside the section.

## Verification
```
$ npx vitest run              362 passed (16 files)
$ CI=true npx vitest run      361 passed | 1 skipped (16 files)   ← skipped in CI, as intended
$ npm run typecheck           clean
$ npm run lint                clean
```

The specific failure, proven fixed:
```
exact match  : false   <- what broke CI
normalised   : true
```

## Notes / follow-ups
- **Delisting will still trip this locally**, by design — a delisted fixture is worth knowing
  about on a developer machine. It can no longer break the build.
- Worth a grep for anything else that reasons about raw being gitignored; two have now been
  found (`lib/devOnly.ts`, `lib/nonApparel.test.ts`) and both were silent.
- More generally: any exact-match assertion over `raw-products.json` or `products.json` will
  eventually fail from ordinary catalogue churn, because the refresh runs nightly across 55
  brands. `lib/payload.test.ts`-style *structural* assertions are safe; literal-title ones are
  not.
