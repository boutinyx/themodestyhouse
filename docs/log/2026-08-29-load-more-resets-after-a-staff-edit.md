# "Load more" threw staff back to the beginning after every edit

**Date:** 2026-08-29 · **Status:** done

## Goal
Tina: *"when i login on staff/curate and go to a catalog and click load more it crashes"*,
and then the detail that cracked it: *"if i click the load more button after having edited a
product instead of loading more down it jumps up to the beginning"*.

## Root cause
Nothing crashed. **The page reloaded.**

`/api/catalogue/cards` serves card data by ROW INDEX, and refuses the request with **409** if
the client's `rowCount` no longer matches the server's — a deliberate staleness guard
(`lib/catalogueCards.ts`), because stale indices would paint the *wrong products under the
right titles*, which nothing downstream could detect. Both grids answered that 409 with:

```js
if (r.status === 409) { window.location.reload(); return null; }
```

That was written for a deploy or the nightly refresh (§10.35) landing under an open tab —
rare, and a reload is a fine answer. But **a staff edit changes the published row count
immediately**, so from a signed-in session every single edit arms the next "Load more" to
hard-reload the page: back to the first 24 products, scrolled to the top, mid-review.

Measured, both engines:

```
NO EDIT   : load more  scrollY 21025 -> 21025  cards 120   (fine)
AFTER EDIT: load more  scrollY 26317 -> 5997   cards 24    reset + jump
```

and the network trace naming it outright:

```
cards -> 409
*** FULL PAGE LOAD ***
```

## What changed
`components/DirectoryBrowser.tsx` and `components/FilterableGrid.tsx` — on 409, refresh the
server payload **in place** instead of reloading the document:

- `router.refresh()` re-renders the server component and streams a fresh catalogue (new row
  order, new `rowCount`) without unmounting the grid, so `visible` and the scroll position
  survive. Both routes are `ƒ` (dynamic), verified in the build output, so the refresh really
  does return current data rather than a build-time payload.
- `extraCards` is dropped at the same moment: its keys are absolute row indices against the
  OLD catalogue, and keeping them would paint exactly the mismatch the guard exists to prevent.
- A `staleRowCount` ref makes the effect **skip fetching entirely** while the refresh is in
  flight, and a second 409 for the same `rowCount` still falls back to the original hard
  reload rather than looping.

**The first version of this fix did not work, and the reason is worth keeping.** It called
`setExtraCards({})` and `router.refresh()` but had no skip guard — clearing `extraCards`
immediately re-fired the effect against the *same* stale catalogue, the server 409'd a second
time, the fallback fired, and the page hard-reloaded exactly as before. The trace is what
showed it:

```
cards -> 409 | RSC 200 /directory | cards -> 409 | *** FULL PAGE LOAD ***
```

The refresh was working; the retry was racing it.

## Verification
`npm run audit:staff-grid` — new, `scripts/staff-grid-audit.mjs`, because every check in
`scripts/interaction-audit.mjs` runs anonymously and this defect is invisible without a staff
session. It asserts three things, and the third is what keeps the fix honest: the grid grows,
without a full page load, **and every rendered card stays distinct** — a shifted index shows
up as a duplicate or a dropped product.

Negative control run BEFORE trusting it (§10.28 rule 1), against the unfixed components:

```
chromium /directory: 120 -> 24 cards | full page loads 1 | PROBLEM
    PROBLEM: the grid did not grow — it reset to the beginning.
    PROBLEM: the page fully reloaded, discarding scroll position and loaded rows.
webkit   /directory: 120 -> 24 cards | full page loads 1 | PROBLEM
2 problem(s)
```

After the fix:

```
chromium /directory: 120 -> 144 cards | full page loads 0 | distinct 144/144 — ok
webkit   /directory: 120 -> 144 cards | full page loads 0 | distinct 144/144 — ok
0 problems
```

The audit **skips loudly** when `ADMIN_PASSWORD` is unset rather than passing silently
(§10.28 rule 3).

Correctness of the refresh path, checked separately because it is the property the hard
reload was protecting: after an edit + Load more, 144 cards, **144 unique hrefs, 0
duplicates**, and every card renders its title and price.

The guard's ORIGINAL case still works, and is now better: with the catalogue moved **out of
band** (a staff edit issued from a different session, i.e. what a deploy or the nightly
refresh looks like), an anonymous tab went `72 -> 96` cards with `0` reloads and 96/96 unique
hrefs — it used to hard-reload there too.

`npx tsc --noEmit` clean. `npm run lint` clean (the `react-hooks/exhaustive-deps` warning the
new `router` reference introduced is fixed, not suppressed — lint is `--max-warnings 0`).
`npx vitest run` — 1006 tests, 1005 pass; the one failure is the pre-existing
`lib/edits.test.ts` `fall-essentials` check, now on `we-are-elegance:16003783688574`, which is
data movement and untouched by this change.

## Notes / follow-ups
- **Four hypotheses were formed and disproven before this one**, and two "reproductions" were
  my own harness: clicking "LAYERING BASICS" (a submenu *opener*, not an item) left a menu
  open and the page `pointer-events: none`, which looked exactly like the bug until the
  network trace showed `api calls: []` — the edit had never run. Worth remembering that a
  menu being open legitimately locks the page, so "the page is frozen" is not by itself
  evidence of anything.
- **The report said "crashes" and nothing crashed.** No JS error, no tab death — a reload.
  Error-based checks were all clean and stayed clean; the thing that found it was counting
  CARDS and SCROLL POSITION across the click. When a user says "crash", measure what they
  actually see rather than what the console says.
- Both "Load more" buttons are `type="submit"` with no `type` attribute set. They have no
  `<form>` ancestor today, so nothing happens — but that is one refactor away from being a
  real page-reloading bug in the same place. Left alone here to keep this change to its root
  cause; worth a one-line fix on the next pass.

## Production verification (appended after the merge)

`main` fast-forwarded `1b8521a..51cdd20`, ancestry asserted. Origin confirmed serving the new
build BEFORE purging (§10.47), then `purge_everything` → `success: true, errors: []`.

**The deploy discriminator here is a content-hashed chunk name**, not a title or a marker
string: this fix changes only client behaviour, so nothing about it is visible in the HTML.
The grid's chunk (`grep -l "Load more" .next/static/chunks/*.js`) is content-hashed, so when
the deployed page references the same filename the local build produced, the exact code is
live. That is a real discriminator — it read `no` on staging for several minutes and then
`YES`, rather than being true from the start.

Production, both engines, after the purge:

```
chromium: 200 | cf MISS | fix build served: true | cards 24 -> 144 | reloads during clicks 0 | unique 144/144 | js errors 0
webkit:   200 | cf HIT  | fix build served: true | cards 24 -> 144 | reloads during clicks 0 | unique 144/144 | js errors 0
```

Staging first, same shape: `24 -> 144`, `0` reloads, `144/144` unique, both engines.

**A harness fault caught on the way, worth recording** (§10.26): the first staging run
reported `reloads 1` and read as a regression. It was the page's own `load` event — the probe
navigated with `waitUntil: 'domcontentloaded'` and zeroed the counter before `load` fired, so
the initial page load counted as a reload. Re-run with `waitUntil: 'load'` and a baseline
taken afterwards: `RELOADS DURING CLICKS 0`. A reload counter is only meaningful relative to a
baseline established after the page has finished loading once.

## Still unverified, and it is the half that matters most
**The staff path itself has NOT been verified on the live site.** Both production and staging
reject the `ADMIN_PASSWORD` in `.env` with `401 Wrong password`, so no staff session could be
established remotely. Everything above is either anonymous (which exercises the same 409 code
path but cannot trigger it) or was measured against a LOCAL production build of this exact
commit, where the full staff flow does pass in both engines.

So what is proven on production is: the fix is deployed, and it did not regress ordinary
browsing. What is not proven on production is the fix working for Tina. She has to confirm, or
share the real staff password. Said plainly rather than allowed to read as fully verified.
