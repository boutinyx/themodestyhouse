# 16 new lane pages, FAQ schema on 106 pages, and an empty ItemList nobody had looked at
**Date:** 2026-09-02 · **Status:** done

## Goal
Act on findings 1–3 of `docs/log/2026-09-02-pulse-and-gsc-seo-review.md`. Tina:
*"do everything necessary"*.

## What changed

### 1. `?type=` pages for the six biggest lanes (was: zero)

`lib/specialty.ts` gains `garmentSubtype()` — a classifier for Abayas, Tops, Skirts,
Trousers and Co-ord Sets — and `lib/laneSubtypes.ts` gains six `LANE_SUBTYPES` entries.
Everything downstream (title, description, canonical, `h1`, breadcrumb, CollectionPage,
sitemap) already keyed off that map, so it followed for free.

**The vocabulary is not mine.** Every label is the one Tina already wrote in that lane's
`intro` in `lib/lanes.ts`: *"Open, closed, kimono and butterfly abayas"*, *"Tunics,
blouses, shirts and layering tops"*, *"Maxi, pleated and A-line skirts"*, *"Wide-leg,
tailored and relaxed trousers"*, *"Matching two-piece sets and co-ords"*. This implements
a taxonomy that already existed in prose rather than inventing one (§10.18).

**One label is not hers and should be reviewed:** `T-Shirts`. It is not in the Tops intro
and exists only because `shirt` matches "T-shirt" — the character before "shirt" there is
a hyphen, which is not a letter, so the boundary passes. Without its own bucket a
"Shirts" page would be 22% t-shirts. Deleting the value folds them back into `shirt`.

`/modest-dresses` was a different case: `dressSubtype()` and its Type filter have existed
since 2026-08-26, but there was no PAGE. Measured live before touching anything —
`/modest-dresses?type=occasion` rendered a genuinely different grid and then served
`<title>Modest Dresses Online…</title>` and `canonical=/modest-dresses`, i.e. exactly the
defect the 2026-08-19 pass fixed for the specialty lanes and never reached here.

Counts measured against the live catalogue on the day, first-match-wins:

| lane | subtype | products | in sitemap |
|---|---|---|---|
| modest-abayas | open · kimono · butterfly · closed | 370 · 141 · 108 · 84 | yes |
| modest-tops | shirt · tunic · blouse · tshirt | 247 · 245 · 223 · 68 | yes |
| modest-skirts | maxi · pleated · **a-line** | 86 · 53 · **21** | yes · yes · **no** |
| modest-trousers | wide-leg · tailored | 134 · 42 | yes |
| modest-sets | two-piece · co-ord | 89 · 41 | yes |
| modest-dresses | everyday · occasion · **slip** | 289 · 129 · **14** | yes · yes · **no** |

Sitemap: **143 → 159 URLs**. `a-line` and `slip` sit below the bar
`TOO_THIN_FOR_SITEMAP` already set on 2026-08-19 (9–21 products); both stay linked and
filterable, neither is submitted.

**Why these regexes need not carry the §10.10/§10.31 anxiety `GARMENT_RULES` does:** an
unmatched product returns null, stays on its lane and matches no chip. Nothing is dropped,
hidden or reclassified. Anchoring is still the Unicode-property form, not `\b`, because
the feeds are not all English — proven, not assumed: `/\bmaxi\b/` matches inside
`"Maxişort Etek"` and the Unicode form does not.

Two orderings are load-bearing and both have a test:
- `butterfly` before `open`, because *farasha* IS the butterfly cut and
  "Premium Nightfall Mirage Textured Open Farasha" matches both.
- `tshirt` before `shirt`, per above.

Rules are keyed on `p.garment`, not a flat list, so `kimono` cannot claim
"Kimono Sleeve Blouse" for `/modest-abayas?type=kimono` — a lane that top is not on.

**The Type dropdown now writes the URL.** The old code carried a note arguing that
honouring `?type=` for an in-page control makes a page contradict itself — heading from
the URL, grid from local state, second click changes one and not the other. The reasoning
was right and the conclusion was not: the fix is to remove the second source of truth,
not to hide it. `setUrlType` does `router.replace`, so each option is a real URL and the
h1, the canonical and the grid cannot disagree.

### 2. FAQPage schema on 14 lane pages + 16 subtype pages

`faqPageSchema()` already existed and was used on `/faq` alone. The lane answer blocks in
`lib/laneAnswers.ts` — an `<h2>` question and ~150 words, live since 2026-08-11 — now
emit it, reading **the same object the page paints**, so the two cannot drift.

Stated plainly in the code and here: **this will not produce a Google rich result.**
Google restricted FAQ rich results to government and health sites in 2023. It is here
because the AI answer engines parse it, and on this site that is not a side channel —
Pulse, 30 days to 2026-09-01: ~102 visitors from ChatGPT against ~51 from google.com.

### 3. Designer pages: three statements became three questions

`What MERRACHI makes` → `What does MERRACHI make?`, `MERRACHI prices` → `How much do
MERRACHI pieces cost?`, `Where to buy MERRACHI` → `Where can you buy MERRACHI?`, plus
FAQPage over all three, on 92 pages. The content is unchanged and still entirely counted
from that house's own rows. Each answer is built ONCE and both painted and emitted, because
the guidelines require question and answer to be visible and the way that stops being true
is two versions drifting, not anyone deciding.

Why these pages: they rank on the house's own name and convert at zero — merrachi 380
impressions at position 6.5, jawda modest 169, hawaa clothing 123, all 0 clicks. Beating a
brand's own storefront for its own name is not winnable. The modifier query is.

### 4. A pre-existing bug the verification found: empty ItemLists

`app/[lane]/page.tsx` built its CollectionPage `ItemList` by scanning the encoded
catalogue for matching rows and calling `decodeCard` on each. `decodeCard` returns null
outside the `embedCards: 48` window, and a subtype's matches are spread through the whole
interleaved lane — so rows were found and then silently dropped. **Measured on
production, before any change:**

```
/modest-hijabs?type=undercap        ItemList = 0 items
/modest-hijabs?type=khimar-jilbab   ItemList = 1 item
/blazers-vests?type=vest            ItemList = 23 items
```

Zero, on a page whose entire machine-readable claim about its own contents is that list.
Not a regression from this work — older than it — but it would have applied to all 16 new
pages, so it is fixed here: the list is built from `productsForLane()` (already in hand,
same order) filtered by the new `subtypeValueOf()`, with no dependence on the encoding.
All the above now read 24. The `.filter(Boolean)` above it was written as a defensive
measure and was in fact load-bearing, which is the tell that nobody had read the output.

`productsForLane` is called ONCE and shared with the encoder — it re-parses 10.9 MB per
call (§8), and the first version of this fix called it twice.

## Files
`lib/specialty.ts` · `lib/specialty.test.ts` · `lib/laneSubtypes.ts` ·
`lib/compactCatalogue.ts` (new `garmentSubtypeIdx` column + dictionary) ·
`components/FilterableGrid.tsx` · `app/[lane]/page.tsx` ·
`app/designers/[slug]/page.tsx` · `scripts/interaction-audit.mjs`

## Verification

```
npx tsc --noEmit                    clean
npm run lint                        exit 0
npm test                            1090 passed · 2 failed
```

**The 2 failures are `lib/edits.test.ts` and are NOT from this work.** Reproduced
identically on unmodified `HEAD` in a detached worktree before doing anything else
(§10.38 rule 1): `2 failed | 22 passed`, same two "hijabs bunched together" rows
(`Premium Modal Scarf- Sage/Tan`). It is a data-shaped assertion over a catalogue the
04:10 refresh moves nightly.

Built and served on :3199 from a clean worktree (§10.28 rule 4 — `.next` is shared).

**Structured data + routing, 33 assertions:** sitemap contains each new `?type=` URL,
EXCLUDES the two thin ones, and — the control — still contains
`/modest-hijabs?type=khimar-jilbab`, `/modest-swimwear?type=burkini`,
`/blazers-vests?type=blazer`. Each subtype page's h1, `<title>`, canonical and
CollectionPage name agree. Every one of the 24 ItemList entries matches its subtype.
Negative controls all fired: the bare lane's h1 is not the subtype and its canonical
carries no `?type=`; `?type=zzzz` falls back to the lane; and `?type=blouse` on
`/modest-abayas` is rejected rather than minting a junk page.

**Browser, both engines, 18/18:** the kimono page paints 24 cards and every one is a
kimono; the Type control shows the current subtype; choosing Butterfly rewrites the URL,
the h1 follows, and all 24 cards follow. Controls: the bare lane still paints a full grid,
and `/modest-hijabs?type=undercap` still works.

WebKit first reported 3 cards and a dropdown that would not open. That was **§10.24
exactly** — the site sends HSTS and `upgrade-insecure-requests`, WebKit honours both over
plain-http localhost, and 57 subresources failed TLS, so the page had no CSS and no JS.
Fixed by copying `scripts/mobile-audit.mjs`'s header-stripping verbatim, plus a
stylesheet-loaded assertion so no number is believed before the CSS is. Two earlier
"failures" were likewise mine: a probe reading the breadcrumb's `ListItem`s instead of the
CollectionPage's, and one reading `textContent` off the card anchor, which is an empty
overlay — the words are in its `aria-label`.

**New permanent check** `lane-subtype-url` in `scripts/interaction-audit.mjs`, driving the
whole journey (tap the Type chip → pick another subtype → assert the URL, the h1 AND the
grid all moved). **Negative control run against PRODUCTION before trusting it**
(§10.28 rule 1): production reports `NO TYPE TRIGGER SHOWING THE CURRENT SUBTYPE`, the
local build reports `ok`. It selects on nothing the fix introduced (§10.32 rule 2) — an
`<h1>`, a button found by its label text, and `data-surface`, all of which predate it.

## Notes / follow-ups
- **Not done, deliberately:** finding 4, more editorial. Those are articles in Tina's
  voice and §10.18 says writing them is not mine to do.
- `T-Shirts` is the one label not taken from her own copy — see above.
- The butterfly rule has ~7% impurity: 8 of 108 matches ("Butterfly Bliss",
  "Embroidery Butterfly") may be a butterfly PRINT rather than a butterfly cut. They are
  abayas either way and on the right lane; only the chip is arguable.
- Coverage is partial by design and matches the existing precedent: 50% of Tops carry a
  subtype, 18.6% of Abayas, 24.7% of Skirts. An untyped row shows under "All".
- `lib/edits.test.ts` is red on `main` and someone should look at it.
