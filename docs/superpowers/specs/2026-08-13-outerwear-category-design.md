# Outerwear category (Blazers, Vests, Cardigans, Coats)

**Date:** 2026-08-13 · **Status:** approved

## Goal

A new "Outerwear" category lane, pulled out of the generic Tops lane, with a "Type" filter
(hover-opened, matching every other filter on the site) narrowing to Blazers / Vests /
Cardigans / Coats. Tina's call, arrived at over conversation: one combined lane (not four
separate ones), pulled out of mixed grids and out of Tops specifically (not left in both
places).

## Current state

~977 catalogue items match blazer/vest/cardigan/coat vocabulary by title (blazer 205, vest
257, cardigan 172, coat 362), of which 769 currently carry `garment: 'top'` — meaning they're
today indistinguishable from ordinary tunics/blouses/shirts in both `/modest-tops` and every
mixed grid.

The exact mechanism this needs already exists for a different category: `layeringSubtype()`
(`lib/specialty.ts`) plus its compact-catalogue column (`lib/compactCatalogue.ts`) and its
"Type" filter (`components/FilterableGrid.tsx`) power `/layering-basics`'s six-way
neck-cover/sleeve-extender/etc. breakdown. This design replicates that mechanism for
Outerwear rather than generalizing the existing one — kept as a second, independent
mechanism, matching how this codebase already prefers a narrow parallel implementation over
reworking a shipped one (the same choice `layeringSubtype` itself made relative to
`Garment`).

## Design

**`lib/types.ts`** — new exported type, alongside the existing `LayeringSubtype`:
```ts
export type OuterwearSubtype = 'blazer' | 'vest' | 'cardigan' | 'coat';
```

**`lib/specialty.ts`**:
- `OUTERWEAR_RE` — a `\b`-anchored regex over `blazers?|vests?|cardigans?|coats?`. English
  vocabulary only for this first pass (matching what Tina named); non-English coverage is an
  explicit, documented gap, not a silent one — flagged in the follow-ups below rather than
  guessed at now.
- `isOuterwear(p)`: `if (p.forcedLane) return p.forcedLane === 'outerwear'`, then
  `OUTERWEAR_RE.test(p.title)`. Same shape as `isSwim`/`isLayering`.
- `OUTERWEAR_SUBTYPE_LABELS: Record<OuterwearSubtype, string>` — `{ blazer: 'Blazers', vest:
  'Vests', cardigan: 'Cardigans', coat: 'Coats' }`.
- `outerwearSubtype(p): OuterwearSubtype | null` — returns null if `!isOuterwear(p)`, then
  tests coat/cardigan/vest/blazer regexes in that order (a title matching more than one word
  takes the first hit; order chosen so more specific/less ambiguous nouns are checked before
  "vest", which is the one most likely to appear as a secondary word in a longer title).
- `isSpecialty()` gains `|| isOuterwear(p)`.

**`lib/lanes.ts`** — new entry in `LANES`, `kind: 'category'`, `specialty: true`:
```ts
{
  slug: 'outerwear',
  title: 'Outerwear',
  nav: 'Outerwear',
  intro: 'Blazers, vests, cardigans and coats to layer over everything else.',
  kind: 'category',
  match: (p) => isOuterwear(p),
  specialty: true,
},
```
Appearing in `CATEGORY_LANES` means it's picked up automatically by the nav dropdown, footer,
sitemap and `generateStaticParams` — no hand-written route, per this project's existing
data-driven routing rule.

`modest-tops`'s `match` changes from `(p) => p.garment === 'top'` to
`(p) => p.garment === 'top' && !isOuterwear(p)`, so these items actually leave Tops rather
than appearing in both places — the same exclusion shape `isActivewear()` already uses against
`isSwim()`/`isLayering()`.

**`lib/compactCatalogue.ts`** — parallel to the existing `layeringSubtypes` /
`rows.layeringSubtypeIdx`: a new `outerwearSubtypes: OuterwearSubtype[]` (present-subtypes
list, empty on every lane except Outerwear) and `rows.outerwearSubtypeIdx: number[]` (index
into that list, or `-1`).

**`components/FilterableGrid.tsx`** — the existing Type filter (currently gated on
`cat.layeringSubtypes.length > 0`) is extended to also check `cat.outerwearSubtypes.length >
0` and, when so, source its options/row-filtering from the outerwear column instead. Only one
of the two is ever non-empty for a given lane's compact catalogue, so this is a branch, not a
merge.

## Testing

- `lib/specialty.test.ts` — `isOuterwear()` true/false cases per subtype, `outerwearSubtype()`
  returns the right value for each, `forcedLane` override respected, `isSpecialty()` picks it
  up.
- `lib/compactCatalogue.test.ts` — `outerwearSubtypes`/`rows.outerwearSubtypeIdx` encode
  correctly, including the `-1`/empty-array cases for a catalogue with no outerwear items.

## Out of scope / follow-ups

- **No republish.** This is pure application code operating on titles already published in
  `data/products.json` — `isSpecialty`/lane matching run at request time, not publish time.
- **English vocabulary only, for now.** Non-English blazer/vest/cardigan/coat terms (French,
  Turkish, Dutch, etc. — this catalogue has brands in all of those) are not covered by this
  pass. Flagged explicitly rather than guessed at, per this project's own documented history of
  language-collision bugs when regexes were extended past their tested vocabulary.
- **No accuracy sweep against real catalogue titles yet.** The 977-item estimate is a raw title
  match, not a verified classification — some fraction may be false positives (e.g. "vest"
  appearing as part of an unrelated compound word) or miss real items with different phrasing.
  The implementation should re-measure against the actual published catalogue and spot-check a
  sample before calling this done, the same discipline `layeringSubtype`'s own history in this
  file was built with.
