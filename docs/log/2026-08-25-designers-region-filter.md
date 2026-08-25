# "See all N in X" now links to a region-filtered /designers
**Date:** 2026-08-25 · **Status:** done

## Goal
Tina: *"Independent labels. / Global perspectives. / 113 houses across 39 places… can
this text be bigger"* and *"See all 56 in Europe what i meant by this was referring
them to the designers page"*.

The button shipped yesterday as an in-place expander — it grew the band to 56 rows
and sent nobody anywhere. It should have been a link.

## Why this became more than a one-line href
A link reading **"See all 56 in Europe"** that lands on an unfiltered index of 113
is a label that lies. So `/designers` had to learn `?region=`; otherwise the honest
options were to weaken the label to "All designers" or ship a promise the
destination does not keep. Building the filter is the reading where her sentence
actually works.

## What changed

**`lib/brandRegions.ts`** — `regionSlug()` / `regionFromSlug()`. The slugs are
written out rather than derived by a `slugify()`, because the homepage links to
them: they are a URL contract, and a rename should have to be deliberate.
`regionFromSlug` returns **null for anything unknown**, and the page treats null as
*no filter* rather than *no results* — so a hand-typed `?region=banana` shows the
full index instead of minting an empty page a crawler could index.

**`app/designers/page.tsx`**
- Filters the index by region, **after** the vetted-first ordering, so a region page
  keeps the index's reading order.
- `h1` becomes "Designers in Europe"; the intro line carries the real count.
- Pagination goes through one `qs()` helper, so page 2 of Europe stays Europe —
  otherwise it silently becomes page 2 of everything.
- Breadcrumb gains a region crumb; `brandListSchema` name follows the heading.
- **The vetted row is suppressed when filtered.** Page 1's first five tiles get the
  seal badge; inside a region the first five are just the first five, and badging
  them would claim a seal they may not hold.
- A "← All designers" link appears when filtered. Without it a region view is a dead
  end — nothing else on the page clears it, and the visitor arrived from the
  homepage band rather than a control they can see.

**`components/DesignerDiscovery.tsx`**
- Heading `clamp(24px,3vw,34px)` → **`clamp(30px,3.6vw,44px)`**; paragraph 14px →
  `clamp(15px,1.15vw,17px)`. Measured 34 → **44px** and 14 → **16.56px** at 1440.
- The expander is a `<Link>`. `showAll` state and its reset are gone.
- The region's `href` is built **on the server** from `regionSlug()`, so this
  component never turns a region name into a URL by string-munging.

**`lib/brandRegions.test.ts`** — 3 more tests (15 total): every region round-trips
slug→name→slug, the three slugs the homepage links to are asserted **literally**
(so renaming one fails a test rather than silently breaking a live link), and
unknown/empty/undefined all return null.

## The SEO decision, stated rather than made silently
A `?region=` view **canonicalises to the bare `/designers`**. It is a filter over a
list the unfiltered page already contains in full, so self-canonicalising it would
mint five near-duplicates — the same duplicate-minting `generateMetadata` in that
file was already hardened against for `?page=`.

Making them independently indexable ("modest fashion brands in Europe", 56 houses)
is arguably worth doing and is a real opportunity. **That is an SEO/editorial call
for Tina, not a side effect of adding a filter.** Flagging, not deciding.

## Verification
```
$ npx tsc --noEmit                                          TSC=0
$ npx eslint <the four files>                               LINT=0
$ npm test                        Test Files 47 passed · Tests 756 passed
```

Type sizes and the click-through, read out of a real Chromium render:
```
SIZES {"headingPx":"44px","paraPx":"16.56px"}
LINK  {"text":"See all 56 in Europe","href":"/designers?region=europe"}
panel {"listItems":5,"linksDirectlyInPanel":["See all 56 in Europe"]}
```
Following the link:
```
url        /designers?region=europe
h1         Designers in Europe
intro      56 houses based in Europe, from the same index — vetted for craft and taste.
tiles      30
pager      Previous 1 / 2 Next
nextHref   /designers?region=europe&page=2      <- the filter survives pagination
canonical  https://themodestyhouse.com/designers
clearLink  All designers
seals      0                                     <- vetted row correctly suppressed
errors     none
```

Every region URL served, including a deliberately invalid one:
```
/designers?region=europe          200  h1=Designers in Europe    tiles=30
/designers?region=europe&page=2   200  h1=Designers in Europe    tiles=26   (30+26 = 56 ✓)
/designers?region=banana          200  h1=Designers              tiles=30   (falls back)
/designers?region=oceania         200  h1=Designers in Oceania   tiles=5
/designers                        200  h1=Designers              tiles=30
```

## Notes / follow-ups
- **Not run:** a WebKit pass. This change is a plain `<Link>` and a server-side
  filter, with no hover/focus-only behaviour of the kind §10.25 catches, and the
  shared `.next` is still held by another session's dev server. Chromium only,
  stated rather than glossed.
- The five preview names land as 4 + 1 in the auto-fill grid at 1440. Not a defect;
  five is Tina's number. If it ever bothers her, six fills two rows of three and
  four of the four-up cleanly.
- `?region=` is not linked from `/designers` itself — there are no region chips
  there. The only entry point is the homepage band. Deliberate for now; adding
  chips would be the natural next step if these views prove useful.
