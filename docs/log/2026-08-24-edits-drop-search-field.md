# /edits/[slug]: drop the search field and the Type filter from the index console
**Date:** 2026-08-24 · **Status:** done — on staging, awaiting Tina's approval to merge

## Goal
Tina, looking at staging: *"search bar in the Everyday Lace needs to go"*, then, after
seeing it land: *"type can go out too"*.

## What changed
`/edits/[slug]` renders `FilterableGrid`, which renders the shared `IndexPanel` — the same
console `/directory` and every lane use. That console leads with a full-width
"Search houses, pieces…" field, which is right for an index of thousands of pieces and wrong
for an edit: Everyday Lace is **24 hand-picked items across 17 houses**, a selection small
enough to read, so searching within it is a control with nothing to do.

- `components/IndexPanel.tsx` — new `showSearch` prop, **defaulting to `true`** so every
  existing caller is untouched. When false the input is not rendered and the filter row
  loses its `mt-4`, which only exists to clear the search field; keeping it would leave the
  panel visibly bottom-heavy.
- `components/FilterableGrid.tsx` — new `searchable` prop, also defaulting to `true`,
  passed straight through; plus `showTypeFilter`, same default, gating the hijab
  fabric/style chip.
- `app/edits/[slug]/page.tsx` — passes `searchable={false} showTypeFilter={false}`.

**Brand and Sort stay.** Type went because of what it actually is: the hijab fabric/style
filter, rendered whenever `cat.hijabTypeFilters` is non-empty for the slice. An edit cuts
across garment categories by definition — lace runs through abayas, dresses, tops, skirts and
hijabs at once — so a hijab-fabric chip over it answers a question the page is not asking.
This was flagged as suspicious in the first pass of this entry before Tina asked for it.

`q` state stays in `FilterableGrid` and stays `''` when the field is hidden, so the filter
pipeline is unchanged rather than branched — nothing to keep in step later.

## Verification
- `npx tsc --noEmit` — exit 0.
- `npx vitest run` — **46 files, 741 tests, all passing.**
- Default preserved: `DirectoryBrowser.tsx` still calls `<IndexPanel q={q} onQ={setQ}>` with
  no `showSearch`, so `/directory` is unaffected by construction.
- On staging, before/after `index-panel-search` count per route (see below).

## Notes / follow-ups
- Both props default to `true`, so this is additive: no lane, `/directory` or any future
  caller changes behaviour unless it opts out. Verified on staging by counting the controls
  per route rather than by reasoning about the defaults.
