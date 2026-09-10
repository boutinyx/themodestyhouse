# Edit-story link keys no longer look like URLs to Googlebot
**Date:** 2026-09-10 · **Status:** done — live on production (`b78b298`), verified after the purge

## Goal
Search Console's 404 group held `/modest-skirts-135`, an address no page ever linked to
(`docs/log/2026-09-10-gsc-request-indexing-subtypes.md`, Addendum 2). Asked whether to stop
it happening again, Tina: *"yes"*.

## Cause
`withLinks()` in `components/EditStory.tsx` keyed each inline link `${href}-${index}`. React
writes keys into the RSC payload as plain strings, so the Everyday Lace page shipped

```
["$","$L104","/modest-skirts-135",{"href":"/modest-skirts",…}]
```

— element type, KEY, props — and Googlebot crawled the path-shaped key as a URL. Production
carried four of them today, one per inline link:

| page | path-shaped keys |
|---|---|
| `/edits/everyday-lace` | `/modest-skirts-135` (the one Google already crawled) |
| `/edits/fall-essentials` | `/blazers-vests-118`, `/jackets-coats-225`, `/modest-skirts-123` |
| `/edits/jersey-hijabs` | none (no inline links) |

## What changed
- `components/EditStory.tsx` — the link key is now `a-${m.index}`, the same shape as the
  `b-${m.index}` the bold text beside it already used. `withLinks` is exported for the test.
- `components/EditStory.test.ts` — the href survives while the key carries no slash; keys stay
  unique when one paragraph links the same page twice; and the rule holds for every paragraph of
  every real edit in `lib/edits.ts`.

## Verification
**Negative control** — `withLinks` exported, key unchanged:
```
AssertionError: expected '/modest-skirts-8' not to contain '/'
AssertionError: /modest-skirts-135: expected '/modest-skirts-135' not to contain '/'
Tests  2 failed | 1 passed (3)
```
The real-data case reproduced the exact address Search Console reported. After the fix:
`Tests 3 passed (3)`; `tsc --noEmit` exit 0; `eslint` exit 0; `next build` exit 0.

**Full suite: 1183 passed, 1 failed** — `lib/exclude.test.ts > editorial size-floor pins >
every pin is actually published`: `aab:10059358863674` is pinned but not published. **Not this
change:** the identical failure on a clean detached checkout of `origin/main` (`4d1422e`) without
the fix. Its raw row is *Pinstripe Maxi Shirt Navy*, `inStock: false`, `lastSeen 2026-09-10` —
it sold out. The test is `skipIf(CI)`, so CI does not see it. Reported to Tina, not touched here.

**Local production build** (`next start -p 3199`, BUILD_ID `4ogXvxrn9bRgjpp3E4us1` confirmed in
the served HTML), parsed in python with the same pattern run against production in the same
command as the positive control:

| page | production | this build |
|---|---|---|
| `/edits/fall-essentials` | 3 path-shaped keys | **0** — `a-118`, `a-123`, `a-225`, same three hrefs |
| `/edits/everyday-lace` | 1 | **0** — `a-135` → `/modest-skirts` |
| `/edits/jersey-hijabs` | 0 | 0 |

The rendered `<a href>` set is identical on both, and the pages are 39 B and 13 B smaller —
the keys are the only thing that changed.

**Staging** — pushed as `47d7128`, which also carries last night's catalogue refresh
(`4d1422e`) from main. Polled `/edits/fall-essentials` until the old key was gone and the new
one present: live after ~102 s.

| page | production (control) | staging |
|---|---|---|
| `/edits/fall-essentials` | 3 path-shaped keys | **0** — `a-118` `/blazers-vests`, `a-123` `/modest-skirts`, `a-225` `/jackets-coats` |
| `/edits/everyday-lace` | 1 | **0** — `a-135` `/modest-skirts` |
| `/edits/jersey-hijabs` | 0 | 0 |

In a real browser on staging (Playwright, Chromium 1440x900, stylesheet confirmed by the body
font resolving to Jost): every story link renders and is visible — Everyday Lace "skirt" →
`/modest-skirts`; Fall Essentials "gilet" → `/blazers-vests`, "corduroy" → `/jackets-coats`,
"skirt" → `/modest-skirts`. Clicking "skirt" on Everyday Lace lands on `/modest-skirts`, h1
"Skirts". Screenshots of both story sections looked as before.

**Production** — Tina: *"push to main"*. `origin/staging` was checked to still be `b78b298`,
then fast-forwarded: `4d1422e..b78b298  origin/staging -> main`. The origin was confirmed to
serve the new build BEFORE purging (§10.47) — a cache-busted `/edits/fall-essentials` showed
`a-118` and no `/blazers-vests-118` at 108 s. Purged at 12:46:42 UTC. Canonical URLs, GET twice:

```
/edits/fall-essentials        MISS -> HIT   path-shaped keys: none   a-118 /blazers-vests, a-123 /modest-skirts, a-225 /jackets-coats
/edits/everyday-lace          MISS -> HIT   path-shaped keys: none   a-135 /modest-skirts
/edits/jersey-hijabs          MISS -> HIT   path-shaped keys: none
/                             MISS -> HIT
/edit-lace-hero-v2-3200.webp  MISS -> HIT   (this morning's photo caching still holds)
```

## Notes / follow-ups
- `/modest-skirts-135` stays in the 404 report until Google recrawls it and drops it; this stops
  new ones, it does not remove the old one.
