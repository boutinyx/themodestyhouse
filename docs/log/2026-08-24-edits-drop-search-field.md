# /edits/[slug]: drop the search field from the index console
**Date:** 2026-08-24 · **Status:** done — on staging, awaiting Tina's approval to merge

## Goal
Tina, looking at staging: *"search bar in the Everyday Lace needs to go"*.

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
  passed straight through.
- `app/edits/[slug]/page.tsx` — passes `searchable={false}`.

The Brand / Type / Sort chips **stay**. She asked for the search bar, not the filters, and 17
houses is enough for Brand and Sort to earn their place.

`q` state stays in `FilterableGrid` and stays `''` when the field is hidden, so the filter
pipeline is unchanged rather than branched — nothing to keep in step later.

## Verification
- `npx tsc --noEmit` — exit 0.
- `npx vitest run` — **46 files, 741 tests, all passing.**
- Default preserved: `DirectoryBrowser.tsx` still calls `<IndexPanel q={q} onQ={setQ}>` with
  no `showSearch`, so `/directory` is unaffected by construction.
- On staging, before/after `index-panel-search` count per route (see below).

## Notes / follow-ups
- `/edits/everyday-lace` shows a **Type** chip. That comes from `cat.hijabTypeFilters` being
  non-empty for this catalogue slice, and the comment in `FilterableGrid` says that filter is
  meant to be a hijab-lane control only. Not touched here — out of scope for this request,
  but worth a look, since a fabric-type filter on a lace edit is probably not intended.
