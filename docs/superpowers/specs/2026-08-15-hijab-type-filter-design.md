# Hijab Type filter (fabric + style, one combined list)

**Date:** 2026-08-15 · **Status:** approved

## Goal

A "Type" filter for the Hijabs & Scarves lane (`modest-hijabs`), reachable from the header
nav flyout the same way Outerwear (Blazers/Vests/Cardigans/Coats) and Layering Basics
(neck covers/sleeve extenders/etc.) already are — hovering "Hijabs & Scarves" in Products
shows a list of types, each linking to `/modest-hijabs?type=…`, pre-filtering the grid on
arrival. Tina's request: a filter for "the types of hijabs there are — prints, jersey,
instant hijabs etc" — a single, folk-taxonomy list mixing fabric (jersey, chiffon, modal…)
and style/format (instant, underscarf, khimar…), the way a shopper would actually think
about hijab types, not two separate filter axes.

## Current state

The `modest-hijabs` lane carries 5,146 published products (measured 2026-08-15, via
`productsForLane('modest-hijabs')`). `Product.garment` only has one coarse bucket
(`'hijab'`) for all of them — no existing field distinguishes fabric or style. No keyword
groups existed before this design; the taxonomy below was built by matching real published
titles, not guessed.

The mechanism this needs already exists twice, for different categories:
`layeringSubtype()`/`outerwearSubtype()` (`lib/specialty.ts`) plus their compact-catalogue
columns (`lib/compactCatalogue.ts`) and their "Type" filtering in
`components/FilterableGrid.tsx` and `components/Nav.tsx`. Per the Outerwear design doc
(`docs/superpowers/specs/2026-08-13-outerwear-category-design.md`), this codebase
deliberately keeps each subtype system as its own narrow parallel implementation rather
than generalizing across them — "matching how this codebase already prefers a narrow
parallel implementation over reworking a shipped one." This design follows that same
convention for a third system rather than refactoring the first two.

## Taxonomy

15 groups, in priority order (a title matching more than one group's vocabulary resolves to
whichever is checked first — narrowest/most-functional groups before generic fabric names,
same reasoning as `outerwearSubtype`'s rightmost-match rule). Counts measured against the
real `modest-hijabs` lane, 2026-08-15:

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
| — | *(none — no flyout link)* | — | — | 848 (16.5%) |

The 848 unmatched are plain, color-named titles with no fabric or style word at all (e.g.
"Riverwalk Blue Hijab", "VZ Severine Scarf – Brown") — still shown on the lane page and in
search, just not reachable from any specific Type link, per Tina's call.

**Correction, made while writing the implementation plan (still 2026-08-15):** the first
draft's `printed` regex — `\bprints?\b|...` — matches "print"/"prints" but not "printed",
missing 134 real titles ("Printed Chiffon Hijab", "Printed Modal - Taupe Mirage",
"Hidayah Bloom Printed Jersey (Zainaara)") that instead fell into whichever fabric group
they also named. Fixed to `\bprint(?:s|ed)?\b|...`. The table above already reflects the
corrected regex and counts; verified no other group's regex had the same stem/suffix gap
(checked pashmina/pashminas, tube/tubes, check/checked, bandana/bandanas, rayon/rayons
against the real catalogue — none missed anything the strict regex didn't already cover).

## Design

**`lib/types.ts`** — new exported type, alongside the existing `LayeringSubtype`/
`OuterwearSubtype`:
```ts
export type HijabSubtype =
  | 'caps-underscarves' | 'khimar' | 'jilbab' | 'instant' | 'sport' | 'shawl' | 'printed'
  | 'set' | 'crinkle' | 'jersey' | 'modal' | 'chiffon' | 'cotton' | 'satin' | 'silk-viscose';
```

**`lib/hijabTypes.ts`** (new file — not `lib/specialty.ts`; see rationale below):
- The 15 regexes from the table above, each a named const.
- `HIJAB_SUBTYPE_LABELS: Record<HijabSubtype, string>` in the priority order above (Nav.tsx
  and the compact-catalogue's "canonical order" pre-pass both read this object's key order,
  same as `OUTERWEAR_SUBTYPE_LABELS`/`LAYERING_SUBTYPE_LABELS`).
- `hijabSubtype(p): HijabSubtype | null` — returns `null` unless the product is actually on
  the hijab lane (`p.garment === 'hijab' || isJilbab(p) || isKhimarAbaya(p) || isUndercap(p)`,
  imported from `lib/specialty.ts`, mirroring the lane's own `match` in `lib/lanes.ts`), then
  tests the 15 regexes in priority order and returns the first hit, or `null` for the
  unmatched 16.7%.

Why a new file rather than adding to `lib/specialty.ts`: every existing function there
(`isSwim`, `isLayering`, `isOuterwear`, `isJilbab`, `isSpecialty`…) answers "should this be
kept off general browsing grids." Hijab-type classification isn't that — the hijab lane is
already segregated by a separate, existing mechanism (`browseProducts()`'s
`p.garment !== 'hijab'` check in `lib/products.ts`, plus the lane's own `match`). Bolting a
15-case fabric/style classifier onto a file whose whole point is exclusion logic would blur
what that file is for.

**`lib/compactCatalogue.ts`** — parallel to the existing `layeringSubtypes`/
`rows.layeringSubtypeIdx` and `outerwearSubtypes`/`rows.outerwearSubtypeIdx`: a new
`hijabSubtypes: HijabSubtype[]` (present-subtypes list, empty on every lane except
Hijabs & Scarves) and `rows.hijabSubtypeIdx: number[]` (index into that list, or `-1`).

**`components/FilterableGrid.tsx`** — the existing two-way
`usingOuterwearTypes = cat.layeringSubtypes.length === 0 && cat.outerwearSubtypes.length > 0`
dispatch becomes three-way (add `usingHijabTypes`, checked after the other two are ruled
out). `initialType` validation (the `useState`/`useEffect` pair that reads `?type=` from the
URL) gains a third `.includes(initialType)` check against `cat.hijabSubtypes`. Only one of
the three arrays is ever non-empty for a given lane's compact catalogue — layering, outerwear
and hijab lane membership are mutually exclusive by construction (`isLayering`/`isOuterwear`
both explicitly exclude each other and the hijab lane's own `match` excludes
`isLayering(p)`) — so this stays a branch, not a merge, same as the existing two-way one.

No in-page "Type" dropdown is added — matching your 2026-08-13/15 call to remove it from
Outerwear and Layering Basics in favor of flyout-only. The underlying `?type=` filtering
logic above is still needed regardless, so a flyout link actually narrows the grid on
arrival.

**`components/Nav.tsx`** — a third `subItems` block, keyed off `l.slug === 'modest-hijabs'`,
listing all 15 `HIJAB_SUBTYPE_LABELS` entries in their canonical order, each linking to
`/modest-hijabs?type=${key}`. Same `openOnHover`/`closeOnClick`/`elementFromPoint`-driven
close mechanics already built for the other two flyouts (§10.34's fix) — no new interaction
code, just a third list of links through the existing flyout component.

## Testing

- `lib/hijabTypes.test.ts` — `hijabSubtype()` true/false per group using real catalogue
  titles (not invented ones, per this project's own `nonApparel.test.ts` precedent), priority
  resolution for a title matching two groups (e.g. an "Instant Jersey Hijab" title resolves to
  `instant`, not `jersey`), and `null` for both a non-hijab-lane product and an unmatched
  plain-color title.
- `lib/compactCatalogue.test.ts` — `hijabSubtypes`/`rows.hijabSubtypeIdx` encode correctly,
  including the `-1`/empty-array cases for a catalogue with no hijab items.

## Out of scope / follow-ups

- **No staff manual override** (no `forcedHijabSubtype` field, no curate-UI control) — skipped
  for this first version at Tina's call; add later the same way Outerwear/Layering got theirs,
  if a real misclassification turns up.
- **English vocabulary only.** This catalogue has non-English hijab titles (at minimum
  Manzaram's Dutch feed, per `data/translate-brands.json`) that these regexes won't cover —
  same documented gap the Outerwear design left open, not silently assumed away.
- **The 857-item "Other" bucket has no flyout link**, per Tina's call — reachable only via
  unfiltered browsing/search on the lane page.
- **No republish needed.** Pure application code operating on titles already published in
  `data/products.json` — classification runs at request time, not publish time.
