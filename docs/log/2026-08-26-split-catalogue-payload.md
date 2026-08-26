# Split the catalogue payload into an index tier and a card tier
**Date:** 2026-08-26 · **Status:** done (on staging, awaiting Tina's merge)

## Goal
`/directory` shipped a **2,564,326-byte** document — 92% of it the RSC
catalogue payload — to render **24 cards**. It was the worst FCP on the site
(4.3 s) and the #2 page by traffic (14.5% of pageviews; `/` is 50%).

Plan: `docs/superpowers/plans/2026-08-26-split-catalogue-payload.md`.

## The measurement the design came from

Not "ship fewer rows". The payload was measured column by column first:

```
imageFile      690 KB     <- render only
title          442 KB        search
urlTail        442 KB     <- render only
shopifyId      208 KB     <- render only
price           63 KB        sort
firstSeenDay    49 KB        sort
imagePrefixIdx  39 KB     <- render only
brandIdx        38 KB        filter
occasionMask    26 KB        (sort-only)
garmentIdx      26 KB        filter
altUrl          15 KB     <- render only
```

**69% of the bytes are read only by `decodeCard`** and never by a filter or a
sort. So the split runs along that line: the **index tier** still describes
every row — filtering and sorting stay instant and entirely client-side, which
is how the page is meant to feel — and the **card tier** travels for the first
48 rows only, with the rest fetched for the rows actually painted.

## What changed

- `lib/compactCatalogue.ts` — `rows` loses the four card columns; new
  `CardSlice`/`CardEntry`/`EncodeOptions`/`CardSource`, plus `rowCount`.
  `decodeCard(cat, row, extra?)` now returns `CardProduct | null`.
- `lib/catalogueCards.ts` + test — `cardSliceFor(source, rows, expectedRowCount)`,
  framework-free so it is unit-testable without a request context.
- `app/api/catalogue/cards/route.ts` — POST handler, capped at 240 rows.
- `components/DirectoryBrowser.tsx`, `components/FilterableGrid.tsx` — fetch the
  missing rows for the current window; render what has arrived.
- `app/directory`, `app/[lane]`, `app/designers/[slug]` — `embedCards: 48` and a
  `source`. `app/edits/[slug]` deliberately keeps everything inline.
- `lib/products.ts` — `getProducts()` cached, keyed on mtimes.

## Two things the tests caught that reading the code would not have

**1. `imagePrefixIdx` could not survive the split.** A fetched slice is encoded
over the *subset* of products requested, so its prefix dictionary is a
different dictionary from the one that travelled with the page. Index 0 in each
is an unrelated string — the card would render **another product's
photograph**, while still looking like a perfectly good card. That is §10.12
exactly: invisible from the grid.

Caught by a test written before the implementation, asserting a fetched slice
is byte-identical to the inline encoding for the same rows. `CardEntry` now
carries the prefix verbatim. The dedup it gave up is worth nothing once the
tier holds ~48 rows instead of 13,226 — and the now-unread dictionary came out
of the payload, saving a further 10 KB per page.

**2. A test of mine was wrong, not the code.** `lane row 0 != browse row 0`
failed because the catalogue's first product genuinely *is* a dress — both are
`niswa:10217348399402`, verified directly. The assertion now discriminates at
row 40, where the two orderings have actually diverged.

## The staleness guard

The client sends the `rowCount` its catalogue was built with; a mismatch
returns **409** and the client reloads rather than retrying.

This is the one way the scheme could fail silently and badly. `refresh.yml`
pushes a new catalogue to `main` on its own schedule (§10.35) and a deploy
restarts the container under tabs that are already open. Either would leave
every row index pointing at a *different* product — wrong products under the
right titles, undetectable downstream. A retry would make it worse, so the
client reloads.

## Results

| | before | after |
|---|---|---|
| `/directory` document | **2,564,326 B** | **988,747 B** (−61%) |
| `/modest-dresses` | — | 492,359 B |
| `/modest-abayas` | — | 583,095 B |
| `/designers/nihan` | — | 532,400 B |

Lighthouse, mobile, simulated slow 4G:

| | before (production) | after (staging) |
|---|---|---|
| Performance | 65 | **77** |
| FCP | 4.3 s | **2.8 s** |
| LCP | 7.7 s | **5.0 s** |
| TBT | 20 ms | 20 ms |
| **CLS** | **0** | **0** |

CLS staying at 0 was the guard that mattered: if the grid had started
reflowing as fetched cards arrived, that would have traded FCP for layout shift
and been worth more than the bytes saved.

Note the "before" is **production, behind Cloudflare**, and the "after" is
**staging, with no CDN at all**. The real figures after merge will be better.

## Verification

```
npx tsc --noEmit    # 0
npx eslint …        # 0
npm test            # 49 files, 809 tests pass (was 791)
```

Against a real build, both engines, on staging over HTTPS:

```
chromium: cards 24 -> 48 | brokenImgs 0 | selfLinks 0 | consoleErrors 0
webkit:   cards 24 -> 48 | brokenImgs 0 | selfLinks 0 | consoleErrors 0
    https://lafemmecollectie.nl/product/emirati-satin-dress/?utm_sou…
    https://cultabaya.com/products/ayly-trouser?utm_source=themodest…
```

The hrefs were checked by eye, not just counted — a fetched card that renders
but links wrongly is the failure this whole design could have introduced.

Endpoint guards, against a real build: `409` on a rowCount mismatch, `400` on a
malformed body, and the 240-row cap enforced.

**A WebKit run against `localhost:3188` failed** (24 -> 24, 2 broken images, 18
TLS errors) and that was the §10.24 trap, not a defect: the site sends HSTS and
`upgrade-insecure-requests`, WebKit honours both over plain-http localhost and
rewrites every subresource to `https://`. Confirmed by re-running against
staging over real HTTPS, where it is clean — not assumed.

## Two PRE-EXISTING audit failures, not caused by this

`npm run audit:interaction` reports two failures on staging. Both reproduce
**identically against production**, which does not have this change, so neither
is a regression here. Flagged rather than fixed — they need their own look:

- `hero-search-typed` — `FAILED: locator.click: Timeout` at **all four
  viewports in both engines**, on production too. Failing every run in every
  configuration is the §10.32 signature of a check whose locator has died,
  rather than of a broken feature — but it has not been confirmed either way.
- `nav-dropdown-open` — `NAV PANEL DID NOT OPEN` at **ipad-1366 only**, both
  engines, on production too. That viewport is specifically the §10.25 case
  (touch device at ≥1024px, so desktop header with no hover), which makes a
  real defect more plausible here than in the item above.

`filter-dropdown-after-tap` — the check this change could genuinely have broken
— **passes at every viewport in both engines**.

## Notes / follow-ups

- `/directory` is still ~989 KB, of which `title` (442 KB) is the largest
  single column. It stays inline because the search box filters on it. Moving
  search server-side would remove it, at the cost of a round-trip per keystroke.
- `app/edits/[slug]` embeds its whole catalogue by design: the largest edit is
  275 picks, and an edit's product set is a hand-picked id list that
  `cardSliceFor` cannot reconstruct from a slug.
- The fetch effect is duplicated between `DirectoryBrowser` and
  `FilterableGrid` rather than extracted. Those two already duplicate their
  entire filter/sort/visible structure; pulling out only this part would leave
  the harder half still duplicated and add indirection for no reduction.
