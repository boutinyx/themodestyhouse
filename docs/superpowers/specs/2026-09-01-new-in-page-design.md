# New In page, and the removal of All Clothing

**Date:** 2026-09-01 · **Status:** design, approved by Tina · **Author:** agent session

## Goal

Two changes, requested together:

1. Add a **New In** page showing recent arrivals from a hand-picked set of 38 houses,
   with Losyana deliberately represented near the top because the site is in Losyana's
   referral programme.
2. Remove the **All Clothing** page (`/directory`) — New In takes its place in the
   navigation and inherits the URL.

## Decisions taken with Tina

| Question | Answer |
|---|---|
| What happens to `/directory`? | New In replaces it. `/directory` 308s to `/new-in`. |
| Losyana placement | 4 pieces, spread out so it does not read as planted. |
| What counts as "new in"? | Last 30 days, rolling. |
| Where does header search land? | `/new-in?q=`, still searching all 117 houses. |
| Hijabs? | Off by default, with a toggle to turn them on. Swim and activewear always out. |
| Homepage hero | "Shop the Archive" becomes "Shop New In", pointing at `/new-in`. |

Two calls made by the agent and accepted rather than asked: Layering Basics stays in
(Tina named only swim and activewear), and the 4 Losyana pieces are chosen
automatically rather than by hardcoded id — hardcoded ids are exactly what broke when
Losyana moved storefront on 2026-08-28 (CLAUDE.md §10.54).

## The problem the data forced

`Product.firstSeen` records **when this project first scraped a piece, not when the
house published it.** Every one of the 38 houses was bulk-ingested on a single day, so a
naive 30-day window returns **5,147 rows**, opening with Merrachi's entire 1,022-piece
catalogue (94% of it dated 2026-08-05, its ingest day).

Measured concentration, selected houses, published rows carrying a `firstSeen`:

```
merrachi         n=1022  biggest single date 2026-08-05 x965  94%
losyana          n= 826  biggest single date 2026-08-28 x826 100%
nour-al-houda    n= 716  biggest single date 2026-08-10 x694  97%
chic-modesty     n= 383  biggest single date 2026-08-06 x348  91%
jennah-boutique  n= 319  biggest single date 2026-08-10 x270  85%
… every house in the list shows the same shape, 42%–100%
```

A New In page cannot use `firstSeen` raw. It needs to discard ingest batches.

## Selection rule — `lib/newIn.ts`

```
1. base      getProducts(), restricted to NEW_IN_HOUSES, minus isSwim / isActivewear
2. hijabs    unless ?hijabs=1, also drop garment === 'hijab' and the Hijabs & Scarves
             lane predicate (isJilbab | isKhimarAbaya | isUndercap | isPrayer, !isLayering)
3. anchor    the latest firstSeen day present in the published catalogue
4. window    keep day >= anchor - 30 days
5. de-batch  per house, drop every day holding >= 30% of that house's dated rows
6. order     firstSeen descending, ties in the catalogue's own Featured order (stable)
7. group     groupColourVariants LAST, after every other filter
8. seed      4 Losyana pieces inserted at indices 2, 8, 15, 21
```

### Why each step is where it is

**Step 3 anchors the window to the data, not the wall clock.** The page is prerendered,
so its data is frozen at build time. A `Date.now()` window would slide away from frozen
data and the page would empty itself over a quiet weekend. Anchoring to the newest
`firstSeen` in the catalogue makes the function deterministic and therefore testable —
the same input always gives the same output, which a clock-based rule cannot.

**Step 5 computes batch days from the house's FULL dated population**, before the swim,
activewear and hijab filters of steps 1–2. If it ran on the filtered subset, turning the
hijab toggle on would change which day counts as an ingest batch, and the two views
would disagree about what is new. Batch days are a property of the house, not of the view.

**Step 7 groups colour runs last**, matching `productsForLane()`'s own comment in
`lib/products.ts`: grouping earlier lets a card claim "+5 colours" when four of them
were filtered off the page.

**Step 8 exists because Losyana would otherwise be absent entirely.** All 826 of its
published pieces carry `firstSeen: 2026-08-28` — the `.shop` domain move, which reissued
every product id (§10.54). That is one batch, step 5 removes all of it, and Losyana's
organic contribution to New In is **zero**. The 4 seeded pieces are its whole presence,
which is what makes the seeding a requirement rather than a boost.

### The Losyana seed

Source pool: Losyana rows surviving steps 1–2 and 7 (no window, no de-batch), in the
catalogue's Featured order — 104 pieces at time of writing. Take the first 4 not already
present in the list, then insert at indices 2, 8, 15, 21 **in ascending order into the
growing array**, so the final one-indexed positions are 3, 9, 16 and 22.

On a 4-column desktop grid that is rows 1, 3, 4 and 6 and columns 3, 1, 4 and 2 — four
different rows, four different columns, no two adjacent. If the list is shorter than 21
entries the remaining seeds append at the end.

The seed order is part of the server-rendered Featured order only. When a visitor
changes the sort or applies a filter, the client re-sorts everything and the Losyana
pieces move with the rest; the pins are a starting arrangement, not a lock.

## Measured result

Against the current build (`origin/staging`, before the 2026-09-01 nightly refresh):

```
pool, 38 houses minus swim/activewear      7,576
NEW IN, hijabs off,  colour-grouped          268   from 16 houses
NEW IN, hijabs on,   colour-grouped          343
Losyana pieces eligible for seeding          104
```

Garment mix with hijabs off: tops 120, sets 46, dresses 45, skirts 30, trousers 15,
abayas 10. Daily arrival rate across the list runs 20–45 pieces, so the page grows
rather than thins.

**These counts are a property of the catalogue and move nightly** (§10.35). Re-measure
rather than quoting them.

## The houses

39 slugs, from Tina's list of 38 names. `touche-prive` and `touche-prive-eu` are two
brand records for one house; the `-eu` record has 0 published rows today but is included
so a future publish cannot silently omit it.

```
veiled aab summer-evenings vela niswa jawda hawaa klay diversity-modest esme-ny
arakai bemu merrachi manzaram fares losyana whiteicy chador hum chic-modesty
kimodesty by-hasanat noureen khair-archives amariah touche-prive touche-prive-eu
jennah-boutique ayaana eynaa-paris elaa-the-label modesty-in-style labayah
aurora-abaya nour-al-houda mondo-the-label la-petite-parisienne glamberry parladusa
```

Every slug was verified against `data/brands.ts`. `niswa` currently has 0 rows carrying
a `firstSeen` and so contributes nothing until a refresh touches it — expected, not a
defect.

## The page — `app/new-in/page.tsx`

Modelled directly on `app/directory/page.tsx`, which it replaces.

- **`?q=` searches all 117 houses**, over `browseProducts()`, exactly as `/directory?q=`
  does today. This keeps the header magnifier, `useZeroResultSearch` and the `WebSite`
  `SearchAction` behaving identically. The New In selection applies only to the
  unsearched page.
- **`?hijabs=1` is a URL switch, not a client filter.** `lib/compactCatalogue.ts` encodes
  a garment dictionary, and the Hijabs & Scarves lane contains jilbabs and khimars whose
  `garment` is `abaya` or `dress` — so the client cannot tell them apart without a new
  column in a payload format that exists to be small. `?type=` on the lane pages already
  works this way.
- **The toggle renders server-side** as a single `.chip`-styled `<Link>` under the h1,
  flipping between `/new-in` and `/new-in?hijabs=1`. No client component, no change to
  `DirectoryBrowser` or `IndexPanel`.
- **Metadata:** `noindex, follow` when either `q` or `hijabs` is present, canonical to
  `/new-in` in both cases. JSON-LD (`breadcrumb` + `collectionPage`) emitted only on the
  clean URL.
- **Grid:** `DirectoryBrowser`, unchanged, so filters, sort, colour, currency and the
  card/index payload split all come across for free.

### Copy

`SEO_COPY['/new-in']`, the h1, the one-line intro and a `NEW_IN_ANSWER` block below the
grid are all needed for the page to function and to be indexable. Following §10.18 and
the convention `lib/laneAnswers.ts` already states for itself, the agent writes the
plainest functional wording that describes the **mechanism** — what "new" means here,
the 30-day window, why hijabs are a toggle — and never a pitch. **Tina overwrites any of
it in her own voice whenever she wants.** `DIRECTORY_ANSWER` is not reused verbatim
because its closing sentence ("Hijabs, swimwear and activewear are kept on their own
pages") stops being true on a page with a hijab toggle.

## Removing All Clothing

`app/directory/` is deleted. Fourteen places name it:

| file | change |
|---|---|
| `next.config.ts` | add `/directory` → `/new-in`, 308 |
| `next.config.ts` | repoint `/hijabi-outfits` → `/new-in` so there is no redirect chain |
| `app/page.tsx:449,461` | hero button, desktop: href `/new-in`, label **Shop New In** |
| `app/page.tsx:466,478` | hero button, mobile: href `/new-in`, label **Shop New In** |
| `components/Nav.tsx:44` | "All Clothing" → "New In", href `/new-in` |
| `components/Nav.tsx:121-123` | the group's own href and active-path test |
| `components/MobileNav.tsx:514` | `row('/directory', 'Clothing')` → `/new-in` |
| `components/HeaderSearch.tsx:78,186` | both `router.push` targets |
| `app/favourites/page.tsx:93` | empty-state CTA |
| `app/product/[brandSlug]/[shopifyId]/page.tsx:125` | back-link |
| `app/editorial/[slug]/page.tsx:85` | "Shop the directory" CTA |
| `app/llms.txt/route.ts:41` | index line |
| `app/sitemap.ts:55` | `/directory` → `/new-in` in `staticPaths` |
| `lib/schema.ts:63` | `SearchAction` `urlTemplate` |
| `lib/seoCopy.ts:81` | `/directory` entry replaced by `/new-in` |

308 rather than 404 for both redirects: `/directory` is in `sitemap.xml` and is the
site's highest-intent indexed URL, and `/hijabi-outfits` already carries a 308 to it. A
chain of two 308s is avoided by repointing the older redirect at the new destination
directly.

## Tests — `lib/newIn.test.ts`

Every one of these must fail against a deliberately broken implementation before it is
trusted (§10.28 rule 1).

1. **De-batching removes an ingest batch.** A fixture house with 100 rows on one day and
   3 rows on three later days yields exactly the 3.
2. **De-batching keeps a genuine drip.** A house whose busiest day holds 20% of its rows
   keeps every row in the window.
3. **Batch days are computed before the view filters.** The same house yields the same
   batch day with hijabs on and hijabs off.
4. **Losyana's whole published set is one batch**, so it contributes 0 organically —
   asserted against the real catalogue, not a fixture.
5. **Four Losyana pieces land at one-indexed 3, 9, 16, 22**, and no two are adjacent.
6. **A seed already present in the list is not duplicated.**
7. **Fewer than 21 results appends the remaining seeds** rather than throwing.
8. **The window is anchored to the data**, not the clock: freezing the fixture's dates
   and moving the system clock a year forward changes nothing.
9. **A house not in `NEW_IN_HOUSES` never appears**, even with a `firstSeen` of today.
10. **Swim and activewear never appear**, with hijabs on or off.
11. **Hijabs appear only with the toggle on**, including a jilbab whose `garment` is
    `abaya` — the case a garment-only filter would miss.

Plus, in the existing suites: `app/sitemap.ts` must list `/new-in` and must not list
`/directory`, and no source file under `app/`, `components/` or `lib/` may still
reference `/directory` outside `next.config.ts` — the §10.29 grep, written as a test so
it cannot be forgotten.

## Verification

Beyond the unit tests, on the staging deploy (§1 — not localhost):

- `/directory` returns 308 to `/new-in`; `/hijabi-outfits` returns 308 to `/new-in`.
  Checked with `curl -L` and the byte count read, per §10.49 rule 2.
- `/new-in` renders, and the 3rd, 9th, 16th and 22nd cards are Losyana. Verified by
  reading the rendered DOM in a real browser, not by grepping the payload for a title
  (§10.49 rule 1).
- **Controls from outside the change** (§10.53 rule 2): a product from a house NOT in
  the 38 is still published and still reachable on its lane; the header search still
  returns results for a non-listed house such as Inayah.
- `npm run audit:interaction` — the nav check reaches the renamed "New In" row.
- `npx tsc --noEmit`, `npm run lint`, `npm test` all clean.

## Follow-ups, deliberately out of scope

- The de-batch threshold (30%) is a judgement, not a measurement. It is stated as a
  named constant so it can be tuned from one place once a few weeks of genuine drip data
  exist and the ingest batches age out of the window on their own.
- Once every house's ingest day is older than 30 days, de-batching becomes a no-op for
  the window and only matters when a NEW house is added to the list. That is the correct
  long-run behaviour and needs no further change.
