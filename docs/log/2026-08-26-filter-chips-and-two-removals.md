# Filter chips, the lane search field, and the card's arrow badge
**Date:** 2026-08-26 · **Status:** done — **item 3 reverted the same day**

> **Item 3 (the filter chips) is no longer live.** Tina, an hour after it
> shipped: *"nvm only keep the filter bar"*. `components/ActiveFilters.tsx` is
> deleted and the chip row is out of `FilterableGrid`; the component and its
> measurements are in git at `6301e96`, and a pointer comment sits where the row
> was. **Items 1 and 2 stand** — the lane search field is still off and the card's
> arrow badge is still gone. The section below is kept as written because the
> reasoning is what would need re-deriving, not the code.

Three requests in one message from Tina, two of them screenshots.

## 1. The product card's outbound arrow badge — gone
*"this thing gone"*, with a crop of the small white disc holding an
`ArrowUpRight` in the bottom-right of a card's photograph.

Removed from `components/ProductCard.tsx`. **The comment recording why it existed
stays**, because the reason outlives the pixels: the 2026-08-13 marketing audit
found that the card's `aria-label` says "opens {brand}'s site" but a *sighted*
user had no visual signal the click leaves the site. That gap is real and is now
unaddressed visually — flagged here rather than quietly forgotten.

Nothing about the link changed: `target="_blank"`,
`rel="noopener noreferrer sponsored"`, the `aria-label` and `withUtm()` are all
untouched, so screen-reader users are unaffected.

## 2. The search field is off on every category page
*"the search bar for every catagory done just keep the filters"*, with a crop of
the "Search houses, pieces…" input.

`app/[lane]/page.tsx` passes `searchable={false}`. Brand and Sort stay.
**`/directory` keeps its search** — it is the site's index and where the header's
Search link goes; a lane is already a narrowed view, which is the same argument
`searchable={false}` was added for on `/edits/[slug]`.

Measured on staging — count of the search field per route:
`/modest-dresses 0` · `/modest-abayas 0` · `/modest-hijabs 0` ·
`/layering-basics 0` · **`/directory 1`**.

## 3. The filter chips — rewritten, not pasted
She supplied a shadcn-style `filter-chips-breadcrumb.tsx`. It is now
`components/ActiveFilters.tsx`, and **three things about it changed, all house
rules rather than taste**. Stated here and in the file so it does not read as
sloppiness:

| the snippet | here | why |
|---|---|---|
| `lucide-react`'s `X` | Phosphor's `X` | CLAUDE.md §6 — every icon on this site is Phosphor, no second icon set. **No npm dependency was installed.** |
| `bg-gray-100 dark:bg-zinc-900` | `var(--token)` inline | §6 rule 3 — colour is never a Tailwind class here. The `dark:` half is moot: there is no dark mode. |
| `/components/ui/` | `components/` | That folder is a shadcn convention and this is not a shadcn project — no `components.json`, no `lib/utils`, no `cn()`. One file does not justify the first two files of a structure nothing else follows. |

It also **reuses the existing `.chip` class** rather than restyling a pill, so a
filter chip matches every other chip by construction, and its remove button is
**24px** because `npm run audit:mobile` fails anything smaller — the snippet's
was 12–16px with a 8–12px glyph.

**What counts as a filter.** Brand, hijab fabric type, sub-category, search query.
**Sort is deliberately excluded**: `featured` is a real sort order, not the absence
of one, so an X beside it would imply removable sorting. The subtype chip earns
its place twice over — `?type=blazer` comes from the header flyout, and since the
in-page Type dropdown was retired in August **nothing on the page showed a
subtype was applied**, let alone offered a way out of it. It renders nothing when
nothing is filtered.

## Verification — driven, not just rendered
On the deployed staging page, `/modest-dresses` at 1440:

| step | chips | showing | first card |
|---|---|---|---|
| unfiltered | none | 24 of 2,901 | Niswa Fashion |
| Brand → Aab | `Brand: Aab` | 24 of **221** | Aab |
| + Sort → Price: Low to High | `Brand: Aab` — **unchanged** | 24 of 221 | Aab |
| X on the chip | none | 24 of **2,901** | — |

The sort row is the negative control: it proves a non-filter does not become a
chip. Subtype chips confirmed on two real URLs:
`/layering-basics?type=under-dress` → h1 "Under-Dresses", chip
`Category: Under-dress`, 42 items; `/modest-hijabs?type=undercap` at 390px → h1
"Undercaps", chip `Category: Undercap`, **tap target 24x24**.

`tsc` clean · `eslint` clean · 789 tests pass ·
`BASE=<staging> npm run audit:outbound` **ALL PASS** in both engines, which is the
check that matters for removal #1.

## Notes
- **`npm run audit:outbound` run locally first proved nothing** — it targets
  `localhost:3188` and no server was there, so all six cases threw
  `ERR_CONNECTION_REFUSED` / `Blocked by Web Inspector`. That is §10.28 rule 1
  again: a failure that looks like a regression and is actually an absent server.
  Re-run with `BASE=` against staging, it passes.
- **`/outerwear` now 404s** and is unrelated to any of this — the lane was split
  into `blazers-vests`, `cardigans-sweaters` and `jackets-coats`. Worth knowing
  because `scripts/interaction-audit.mjs` still has an `outerwear-flyout-navigate`
  check (§10.38), which must now be pointing at a dead route.


---

## Reverted: item 3 only

*"nvm only keep the filter bar"*. The chip row is out and
`components/ActiveFilters.tsx` is **deleted** rather than left in the tree as an
unused file — dead components are how a codebase acquires two ways to do
everything. The comment left in its place names the commit (`6301e96`) and the
two things worth not re-deriving if it ever returns: that **sort is not a
filter**, and that the remove button has to be **24px** to pass the mobile audit.

### Verified on the deployed page, all five surfaces
| route | chips | filter bar | controls | search | arrow badge |
|---|---|---|---|---|---|
| `/modest-dresses` | **0** | 1 | Brand, Sort | 0 | 0 |
| `/layering-basics?type=under-dress` | **0** | 1 | Brand, Type, Sort | 0 | 0 |
| `/directory` | **0** | 1 | Category, Brand, Sort | **1** | 0 |
| `/designers/veiled` | 0 | **0** | — | 0 | 0 |
| `/edits/everyday-lace` | **0** | 1 | Brand, Sort | 0 | 0 |

Which is the whole state of the filtering UI in one table: the bar everywhere it
belongs, no search except on `/directory`, no console at all on a brand page, and
no chips anywhere. `tsc` clean, `eslint` clean, 789 tests pass.

### A wait-loop slip, and it is §10.6 exactly
The first deploy check was
`curl -s $B/layering-basics?type=under-dress | grep -c 'Remove the'` — **unquoted**,
so zsh tried to glob the `?`, the command failed, and the loop read the failure as
"0 matches" and reported `DEPLOYED after 20s`. The Playwright run that followed
therefore measured the OLD build and reported `chipRow: 1` on a route where the
chips had just been removed. Quoting the URL fixed it; the real deploy took 160s.
CLAUDE.md §10.6 is this same shell fault in a `grep --include` glob, and §10.20 is
the same "read output from a run that never happened" consequence.
