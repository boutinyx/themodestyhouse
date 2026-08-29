# One product can carry more than one colour

**Date:** 2026-08-29 · **Status:** done

## Goal

Tina, 2026-08-29: *"and i want to able to choose 2 colors or more"* — said while reviewing
colour names on the page `npm run colour:review` generates. A colourway called
`black x red` genuinely names two families, and the catalogue could
only file it under one: whichever family's rule sits higher in `RULES`, which for that name
is red.

The format was the limit, so the format is what changed. Classification is untouched.

## What changed

**`lib/colour.ts`** — `ColourVerdict` gains `families: ColourFamily[]`, the list of every
family that applies. `family` stays, documented as "the first of `families`", because
`colourFamily()`, `npm run colour:coverage` and `scripts/colour-from-images.mjs` all want one
answer and would otherwise each write `families[0] ?? null`. New `colourFamilies()` is what
the encoder reads.

An override value in `data/colour-overrides.json` may now be a JSON **array**, and that is
the only thing that produces more than one family. The vocabulary still yields exactly one:
`RULES` is ordered and the first match wins, which is what keeps "Navy Blue" navy rather than
navy *and* blue. `candidates` is unchanged and still reports every family the suffix matched —
it is what the review page asks about, not an answer. Making `families` equal `candidates` is
the obvious wrong implementation and would put 209 navy rows on the Blue chip; there is a test
against it.

**`lib/compactCatalogue.ts`** — `rows.colourIdx` (an index, `-1` for none) becomes
`rows.colourMask` (a bitmask, `0` for none), the same shape as `occasionMask`, including a
guard that throws past 31 distinct families. Renamed, not duplicated. The `colours` dictionary
is now built by flat-mapping every family rather than taking the first, or a family named only
as somebody's *second* colour would be missing from it and the encode loop would throw on the
row that named it. The existing throw for an override naming a family that is not one stays and
now checks **every element** — `["black", "burgandy"]` is the realistic half-right hand-edit,
and it would otherwise cost only its own bit while the row still looked answered.

`colourMask` leaves the `SENTINEL_COLUMNS` list: its sentinel is `0`, not `-1`. It is dropped
by its own line beside `variantCount`, which has the same problem with a sentinel of `1`.

**`components/FilterableGrid.tsx`, `components/DirectoryBrowser.tsx`** — the filter test goes
from equality to a bit test, `?? -1` to `?? 0`. Deliberately not extracted into a shared hook;
these two duplicate their filter plumbing on purpose.

**`data/colour-overrides.json`** — the `//terms` and `//weakWords` documentation strings now
describe the array shape. No data changed.

**`scripts/colour-review.mjs`** — the family buttons are toggles. Clicking Black then Red
leaves both lit and records `["black","red"]`; clicking a lit colour puts it out, and putting
the last one out leaves the term unanswered. "Not a colour" and "Skip" stay exclusive both
ways. The type-ahead now **adds** — it lights the family, empties the box and stays put, so
`bl⏎re⏎` is black and red — and moves to the next unanswered term only on Enter in an **empty**
box, which the lede now says out loud. The export writes a plain string for one family and a
list only for two or more, so the file's existing single-family answers are not churned into
one-element arrays. A photo-read suggestion still arrives as one family with the dashed
`data-mine="0"` outline; adding a second makes the block hers.

## How many rows this actually reaches

Measured 2026-08-29 over 19,019 published rows, because the first draft of this entry and of
`lib/colour.ts`'s docstring both carried a figure that was wrong by an order of magnitude:

```
rows whose colourway SUFFIX contains " x " or "&" : 31   across 23 distinct terms
  of which genuinely name two COLOURS             : ~20  black & white (3), black x red (2),
                                                          burgundy & gold (2), grey & blue,
                                                          clay & ash, ink & oxide, ...
  of which name two GARMENTS, and must not classify: the rest — "top & bottom" (2),
                                                          "knit & flared skirt" (4)
titles containing an "A x B" phrase ANYWHERE      : 23   only 5 have a parseable suffix
```

The earlier "20 published rows of `black x red`" conflated the last line with the first. The
honest reach of the pre-existing two-tone suffixes is about 20 rows — but that is not the point
of the feature. The reach is whatever Tina marks as two colours in the review page, which is
what she asked for and cannot be counted in advance.

## Verification

Full output in `.superpowers/sdd/multicolour-report.md`. Summary:

- `npx vitest run lib/colour.test.ts lib/compactCatalogue.test.ts` — 107 passed.
  `npm test` — 1,020 passed, 58 files.
- **Three negative controls, each run against a deliberately wrong implementation and watched
  to fail** (§10.28 rule 1): a validator that accepts any list unchecked (3 tests fail), a
  `families` that reports every suffix candidate (1 fails: `['navy','blue']` vs `['navy']`),
  and a `colours` dictionary built from the first family only (1 fails, throwing on the family
  it dropped).
- **Coverage: unchanged as classification, moved as a base.** It now reads
  13,697 / 19,019 = 72.0%, where lib/colour.ts's header says 13,632 / 18,908 = 72.1%. The base
  moved earlier the same day when five activewear houses were added (`ddf5427`), not because
  of this change. Proven rather than argued: `colourFamily` from `HEAD` and `colourFamily`
  from the working tree were run over all 19,019 rows side by side —
  `{ headClassified: 13697, nowClassified: 13697, disagree: 0 }`.
- **End to end**, with `"black x red": ["black","red"]` temporarily in the real file and the
  real catalogue encoded: `classifyColour` reports `families: ["black","red"]`, and the row
  encodes to `colourMask = 2049 = 0b100000000001` — bit 0 (black) and bit 11 (red) — so it sits
  on both chips. The file was reverted; the tracked diff is the two documentation strings only.
- `rm -f tsconfig.tsbuildinfo && npx tsc --noEmit` exit 0. `npm run lint` exit 0 (three
  `--ignore-pattern`s, all for other sessions' untracked scratch files).
- The page was **driven in a real browser** (Playwright/Chromium, served on :8912): two
  families lit at once, "Not a colour" clearing them, the type-ahead adding rather than
  replacing, Enter-on-empty advancing, and the export shape — list for two, plain string for
  one — all confirmed, with a screenshot, no console errors and no page errors.

## Notes / follow-ups

- **Nothing in the catalogue carries two colours yet.** `data/colour-overrides.json` has no
  array in it; every one of the 19,019 rows still has exactly one bit set or none. The format
  is what stopped being the limit. The two-tone colourways become
  expressible the moment Tina answers one on the review page.
- Teaching `RULES` itself to return both families of a two-tone name is a **separate** change
  and was deliberately not done here: it would reclassify rows silently, which is exactly the
  thing Invariant 6 and §10.31 rule 2 warn about.
- The colour column is derived at encode time, so this reaches the site on the next build with
  no re-scrape (contrast §10.12).
