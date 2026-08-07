# Lane pages use the same dropdown index as /directory
**Date:** 2026-08-07 · **Status:** done

## Goal
Category lanes (`/modest-tops`, `/modest-dresses`, …) rendered **every brand as a flat pill**
— roughly 50 chips over five rows, plus a row of occasion chips, before a single garment
appeared. Tina supplied two screenshots: the sprawl as-is, and `/directory`'s compact console
as the target.

Target: `Search the index` + `Filter [Category ▾] [Aesthetic ▾] [Occasion ▾] [Brand ▾]` and
`PRICES IN [As listed ▾]` on the right.

## What changed

**`components/IndexPanel.tsx`** (new) — the console extracted once: the search field, the
`Filter` row, the right-aligned currency switcher, and `FilterDropdown`.

The shell had been **copy-pasted** from `DirectoryBrowser` into `FilterableGrid`, and then
drifted — one grew dropdowns, the other kept flat pills. `FilterableGrid` even carried the
comment *"same shell … so every category page reads as the same instrument"*, which had
stopped being true. Both components now render the same component, so they cannot drift again.

**`components/FilterableGrid.tsx`** (lane pages) — flat brand and occasion pills replaced by
`IndexPanel` with Aesthetic, Occasion and Brand dropdowns. Gains an Aesthetic filter and the
`Prices in` switcher, which lanes did not have. **No Category dropdown**: the page already is
one category, and the previous author's note to that effect still holds.

**`components/DirectoryBrowser.tsx`** — local `FilterDropdown` and inline shell deleted in
favour of the shared component. No visual change; `/directory` is the reference design.

## Verification
```
$ npx vitest run   362 passed (16 files)
$ npm run typecheck  clean
$ npm run lint       clean
$ npm run build      Compiled successfully
```

Served from a real `next start` and counted in the delivered HTML:

| Page | Chips before | Chips after |
|---|---|---|
| `/modest-tops` | ~55 | **4** |
| `/modest-dresses` | ~55 | **4** |
| `/modest-abayas` | ~55 | **4** |
| `/directory` | 5 | 5 (unchanged) |

Four on a lane = Aesthetic, Occasion, Brand, plus the currency control. Five on `/directory`
adds Category. Brand names are still present in the markup inside the menu, so filtering is
unchanged — they are behind a control rather than spread across the page.

## Notes / follow-ups
- `components/IndexBar.tsx` is **dead code**: exported, rendered nowhere, and a third
  near-copy of this console (its own Category/Aesthetic/Occasion chips link to other pages
  rather than filtering). It should be deleted or wired up; left alone here to keep this
  change to the thing that was asked for.
- Lanes previously had no Aesthetic filter and no currency switcher. Both arrive with the
  shared panel. If either is unwanted on lanes, they are one line each in `FilterableGrid`.
- While verifying I ran `git stash` to compare against the old build, which parked all of this
  work; recovered with `git stash pop`. The comparison was worthless anyway — a running
  `next start` serves the build it started with, so rebuilding on disk changed nothing.
