# Hijab Type filter (fabric + style, in-page dropdown)

**Date:** 2026-08-15 · **Status:** approved (revised)

## Goal

An in-page **Type** filter dropdown on the Hijabs & Scarves lane (`/modest-hijabs`), next to
the existing Brand and Sort dropdowns — narrowing the currently-visible grid by fabric/style
(Jersey, Chiffon, Instant, Printed, etc.) the same way Brand already narrows it by brand.
Tina's original request: a filter for "the types of hijabs there are — prints, jersey,
instant hijabs etc" — a single, folk-taxonomy list mixing fabric (jersey, chiffon, modal…)
and style/format (instant, khimar, underscarf…), the way a shopper would actually think
about hijab types.

## Revision history

**First draft (superseded):** a header nav hover-flyout, mirroring Outerwear/Layering
Basics's `?type=` mechanism. Written and approved, then superseded before implementation —
see below.

**What happened:** while writing the implementation plan, a concurrent session (this repo
regularly has one — see `docs/log/2026-08-15-session-handoff.md`) independently shipped
`components/Nav.tsx`/`components/MobileNav.tsx` flyout entries for Hijabs & Scarves already,
using that exact mechanism, for a *different* taxonomy: three structural sub-categories
(Hijabs / Khimars & Jilbabs / Undercaps), landed in commit `034a985`. Tina's own explicit
clarification once she saw both side by side: **"jilbabs and khmars are not a filter like
the fabrics they are a sub catagory what im asking you to make are filters."** Sub-category
(khimar/jilbab/undercap — what a garment structurally *is*) and filter (jersey/chiffon/
instant/printed — an attribute a garment *has*, orthogonal to what it is) are two different
concepts, and conflating them into one flyout list (an intermediate "combine both" attempt
was drafted and rejected for exactly this reason) was wrong.

**Final design:** the two features are independent and both stay.
`components/Nav.tsx`/`components/MobileNav.tsx`'s Khimars & Jilbabs/Undercaps flyout
(commit `034a985`) is **not touched by this design** — it already shipped, it does its own
job, and a khimar can also be jersey, so the two need to compose, not merge. This design adds
a second, separate control: an in-page `FilterDropdown` (`components/IndexPanel.tsx`, the
same component already powering Brand and Sort) computed over the **whole** lane
(independent of khimar-jilbab/undercap/plain-hijab status), so "Jersey" can narrow to jersey
khimars, jersey undercaps and plain jersey hijabs alike, same as Brand already does
regardless of sub-category.

## Current state

The `modest-hijabs` lane carries 5,146 published products (measured 2026-08-15, via
`productsForLane('modest-hijabs')`). Nothing distinguishes fabric or style yet. The taxonomy
below was built by matching real published titles, not guessed.

`components/IndexPanel.tsx`'s `FilterDropdown` already powers Brand and Sort on every lane
page (`components/FilterableGrid.tsx`) — `{ label, value, defaultValue, options, onSelect }`,
rendering a Base UI `Menu` styled as a chip/dropdown. This design adds a third `FilterDropdown`
call, rendered only when the lane has fabric/style groups to offer (i.e. only on
`/modest-hijabs`), exactly the same conditional-rendering shape `initialType`'s subtype
columns already use to decide whether a lane needs a Type control at all.

## Taxonomy

15 groups, in priority order (a title matching more than one group's vocabulary resolves to
whichever is checked first — narrowest/most-functional groups before generic fabric names).
Counts measured against the real `modest-hijabs` lane, 2026-08-15, over the **whole** lane —
independent of the separate khimar-jilbab/undercap/plain-hijab split the flyout uses:

| Order | Group key | Label | Regex (word-boundary anchored, case-insensitive) | Count |
|---|---|---|---|---|
| 1 | `caps-underscarves` | Caps & Underscarves | `underscarf\|under.?cap\|under.?scarf\|bonnets?\|tube\|ninja\|caps?\|turbans?\|headbands?` | 628 |
| 2 | `khimar` | Khimars | `khimaa?rs?` | 148 |
| 3 | `jilbab` | Jilbabs | `jilbabs?` | 86 |
| 4 | `instant` | Instant Hijabs | `instant\|one.?piece\|no.?pin\|ready.?to.?wear\|slip.?on` | 113 |
| 5 | `sport` | Sport Hijabs | `sports?\|active` | 29 |
| 6 | `shawl` | Shawls & Pashminas | `shawls?\|pashmina` | 76 |
| 7 | `printed` | Printed | `print(?:s\|ed)?\|floral\|polka\|animal print\|stripe[sd]?\|plaid\|check(?:ered)?` | 254 |
| 8 | `set` | Hijab Sets | `sets?` | 252 |
| 9 | `crinkle` | Crinkle | `crinkle[d]?` | 105 |
| 10 | `jersey` | Jersey | `jersey` | 1,141 |
| 11 | `modal` | Modal | `modal` | 517 |
| 12 | `chiffon` | Chiffon | `chiffon` | 666 |
| 13 | `cotton` | Cotton & Bamboo | `cotton\|bamboo` | 49 |
| 14 | `satin` | Satin | `satin` | 118 |
| 15 | `silk-viscose` | Silk & Viscose | `silk\|viscose\|rayon` | 116 |
| — | *(none — "All types" shows them)* | — | — | 848 (16.5%) |

The 848 unmatched are plain, color-named titles with no fabric or style word at all (e.g.
"Riverwalk Blue Hijab") — shown under the dropdown's default "All types" state, same as an
item with no special brand affinity is still shown under Brand's default "All brand" state;
no dedicated dropdown row for them, matching how `FilterDropdown` already treats "no value"
for Brand/Sort.

Regex fix applied before this table (kept from the first draft): `printed` matches
`print(?:s|ed)?`, not just `prints?` — the original missed 134 real "Printed ..." titles.
Verified no other group had the same stem/suffix gap (pashmina/pashminas, tube/tubes,
check/checked, bandana/bandanas, rayon/rayons all checked against the real catalogue).

## Design

**`lib/hijabTypeFilter.ts`** (new file — standalone, no edit to `lib/types.ts` or
`lib/specialty.ts` needed, since this design adds no `forced*` override field to `Product`
and doesn't touch lane-membership/exclusion logic):
```ts
export type HijabTypeFilter =
  | 'caps-underscarves' | 'khimar' | 'jilbab' | 'instant' | 'sport' | 'shawl' | 'printed'
  | 'set' | 'crinkle' | 'jersey' | 'modal' | 'chiffon' | 'cotton' | 'satin' | 'silk-viscose';
```
Named `HijabTypeFilter`/`hijabTypeFilter()`/`HIJAB_TYPE_FILTER_LABELS` — deliberately
**not** `HijabSubtype`/`hijabSubtype()`/`HIJAB_SUBTYPE_LABELS`, which commit `034a985` already
defined in `lib/specialty.ts`/`lib/types.ts` for the (different) khimar-jilbab/undercap/hijab
sub-category concept. Reusing those names would either collide or, worse, silently shadow the
existing exports.
- The 15 regexes from the table above, checked in priority order.
- `HIJAB_TYPE_FILTER_LABELS: Record<HijabTypeFilter, string>` — the dropdown's option order.
- `hijabTypeFilter(p): HijabTypeFilter | null` — `null` unless the product is actually on the
  hijab lane (`p.garment === 'hijab' || isJilbab(p) || isKhimarAbaya(p) || isUndercap(p)`,
  imported from `lib/specialty.ts`), then the first regex hit, or `null` for the unmatched
  16.5% (shown under "All types", not excluded).

**`lib/compactCatalogue.ts`** — a new, independent column: `hijabTypeFilters:
HijabTypeFilter[]` and `rows.hijabTypeFilterIdx: number[]`. Parallel in shape to the existing
`hijabSubtypes`/`rows.hijabSubtypeIdx` (`034a985`), but a **separate** column — the two
represent different, orthogonal facts about the same row (which sub-category it structurally
is, vs. which fabric/style it's made of), so a row legitimately has a real index in both at
once (e.g. a jersey khimar has `hijabSubtypeIdx` → 'khimar-jilbab' AND
`hijabTypeFilterIdx` → 'jersey').

**`components/FilterableGrid.tsx`** — a new local `useState('all')` (call it `fabricType`,
matching `brand`'s shape exactly: plain client state, not URL-synced — Brand/Sort aren't
either), a new `<FilterDropdown label="Type" .../>` rendered only when
`cat.hijabTypeFilters.length > 0`, and one more `continue` guard in the `filteredRows` loop
comparing `cat.rows.hijabTypeFilterIdx[i]` — **ANDed** with the existing brand/sub-category-
`type`/search filters, not a replacement for any of them. The existing `?type=` / `typeDomain`
machinery (`034a985`) is untouched — a visitor can arrive via the Khimars & Jilbabs flyout
link (narrows by sub-category) and then also pick "Jersey" from this new dropdown (narrows
further by fabric), same composability Brand + Sort already have with each other.

**Not touched by this design:** `lib/types.ts`, `lib/specialty.ts`, `components/Nav.tsx`,
`components/MobileNav.tsx`, `app/[lane]/page.tsx` — all already correct for the sub-category
flyout feature (`034a985`) and need no change for this independent filter.

## Testing

- `lib/hijabTypeFilter.test.ts` — `hijabTypeFilter()` true/false per group using real
  catalogue titles, priority resolution for a title matching two groups, `null` for a
  non-hijab-lane product and for an unmatched plain-color title, and a real-data coverage
  sanity check (not an exact snapshot — `data/products.json` is republished nightly).
- `lib/compactCatalogue.test.ts` — `hijabTypeFilters`/`rows.hijabTypeFilterIdx` encode
  correctly, including the `-1`/empty-array cases, and that a row can carry a real index in
  both `hijabSubtypeIdx` and `hijabTypeFilterIdx` simultaneously (the orthogonality this
  design depends on).

## Out of scope / follow-ups

- **No staff manual override** — same call as the first draft, unchanged.
- **English vocabulary only** — same gap as the first draft, unchanged.
- **The 848-item "no type" set has no dedicated dropdown row** — reachable under the default
  "All types" state, same as Brand/Sort already work.
- **No republish needed** — pure application code, request-time classification.
- **No URL sync for this filter** — picking "Jersey" doesn't change the URL, matching Brand's
  existing behavior. If Tina later wants a shareable filtered link, that's a separate,
  explicit follow-up (would need its own query param, since `?type=` is already the
  sub-category flyout's).
