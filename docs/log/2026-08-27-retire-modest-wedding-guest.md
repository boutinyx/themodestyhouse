# Retired `/modest-wedding-guest`

**Date:** 2026-08-27 · **Status:** done

## Goal
Tina: *"the modesty weddiging guest thing still exsist"*. Two readings — retire the
lane, or remove the one link still pointing at it — so I measured where it actually
appeared and asked which. She chose **retire it, 308 to `/modest-dresses`**.

## What it was, measured before touching anything
```
/modest-wedding-guest      200 · in sitemap.xml · 775 products
internal links:  /                0
                 /directory       0
                 /modest-dresses  1     <- the only one, the `related` row
                 /designers /faq /about /edits /editorial   0
header nav:      absent ("Wedding" appears 0 times in the homepage HTML)
```
It got there in two steps neither of which was about this lane: the footer column
holding it was cut on 2026-08-24, and the homepage Occasion tile on 2026-08-25. Both
logs recorded the cost at the time. This is that cost coming due.

The 775 products are unaffected — the lane was a cross-cut over
`occasion: 'wedding' | 'formal'`, and every one of them still appears on its own
garment lane.

## What changed
| file | change |
|---|---|
| `lib/lanes.ts` | the lane entry removed; a retirement note in its place |
| `lib/seoCopy.ts` | its title/description entry removed |
| `lib/laneAnswers.ts` | its answer block removed; `/modest-dresses`'s `related` pair repaired |
| `lib/lanes.test.ts` | dropped from the core-lanes list; its match test removed with a note |
| `next.config.ts` | `{ '/modest-wedding-guest' -> '/modest-dresses', permanent: true }` |
| `scripts/visual-audit.mjs` | dropped from the audited route list |
| `components/Footer.tsx`, `components/CategoryQuickLinks.tsx` | comments that described it as live, corrected |

The route, the `generateStaticParams` entry, the sitemap entry and the `llms.txt` entry
all disappear on their own: every one of them derives from `LANES`. That is the payoff
of the data-driven routing CLAUDE.md §6 describes — but it is also why
`scripts/visual-audit.mjs` had to be edited by hand. **A route list in `scripts/` has
no compiler behind it** (§10.32): `tsc` and `eslint` would both have stayed green while
the audit reported a 404 as a site defect on every run.

### Two things I got wrong on the first pass, both caught by the toolchain
1. **I substituted a new related link instead of removing one.** `/modest-dresses`
   pointed at `['modest-abayas', 'modest-wedding-guest']`; my first edit made it
   `['modest-abayas', 'modest-sets']` — a link Tina never asked for, which is §10.18 in
   miniature. Reverted to just dropping it.
2. **Which then did not compile.** `LaneAnswer.related` is `[string, string]`, a fixed
   pair by design — the interface's own comment explains it as page-specific internal
   linking on top of the footer's sitewide nav. So a second slug was genuinely
   required. Took `layering-basics`, because the body above it already argues for it
   twice — *"a slip or a base layer is worth owning before it is needed"* and *"the
   heavier the drape, the less an underlayer is required"*. That makes it the link the
   copy was already making rather than a new editorial claim, and two other lanes pair
   with it for the same reason.

## Verification
`git fetch` first (§10.35): `HEAD..origin/main` empty.

```
LANES: 14 | CATEGORY_LANES: 13
wedding still in LANES: false
lanes without an answer block: none
answer blocks with no lane: none
```

`npm test` — `Test Files 54 passed (54) · Tests 893 passed (893)`.
`npx tsc --noEmit` clean (after `rm tsconfig.tsbuildinfo`). `npm run lint` exit 0.

The suite has a real guard here, and it is why the dangling `related` slug could not
have shipped quietly: `lib/laneAnswers.test.ts` asserts *"every related slug points at
a real, different lane"*.
