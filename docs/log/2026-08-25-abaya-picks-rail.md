# "Our picks on abayas" — a second product rail on the homepage
**Date:** 2026-08-25 · **Status:** done

## Goal
Tina: *"i want a card row like popular items from brands and then for abayas"*,
with a pasted list of 17 abaya titles + brands + prices; then *"i want it under
everyday lace"* (homepage, confirmed) and *"our picks on abayas"* for the
heading.

## What changed

- **New: `lib/abayaPicks.ts`** — the 17 product ids, in her order. She pasted
  titles rather than URLs, so each was matched to its real catalogue id by exact
  title within that brand against `data/products.json`. Same rule as
  `lib/popularItems.ts`: ids only, looked up live, so a cut/delisted product
  drops out instead of rendering a dead card.
- **`app/page.tsx`** — a second `<PopularShowcase>` section placed after the
  `EDITS` banner map, which is where Everyday Lace sits (Jersey Hijabs carries
  `featured`, so it renders first). Heading is her copy verbatim; the plum italic
  on the last word is the treatment the sibling rail's heading already uses.
  Also extracted `railCards(ids)`, which narrows `Product` → `CardProduct`'s 9
  fields for BOTH rails. The existing rail was handing whole `Product` objects to
  a client component, which CLAUDE.md §8 explicitly rules out (`occasion`,
  `season`, `activity`, lifecycle and lane-override fields were all being
  serialised into the RSC payload for cards that never read them).
- **`components/PopularShowcase.tsx`** — new optional `surface` prop, defaulting
  to `'popular-showcase'` so the existing call site is unchanged. Without it both
  rails would report as one surface in Pulse and in every brand's UTM report.
- **`lib/outbound.ts`** — `'abaya-picks'` added to `OutboundSurface`.

The component itself is otherwise reused unmodified, not forked — the full-bleed
breakout, the edge fade, and the wheel/drag traps documented at length in its own
header apply identically here.

## Verification

Merged `origin/main` into `staging` first (§10.35 — the 04:10 nightly refresh
commit `90d023f` was not in this checkout, and this work is catalogue-shaped).
That merge matters: re-checking the ids AFTER it found one had changed state.

- All 17 ids resolve in `data/products.json` **except** `avyaana:15784275607926`
  ("Blush Closed Abayah"), which went `inStock: false` in that morning's refresh.
  It is still in Avyaana's feed (`delistedAt: null`, `lastSeen: 2026-08-25`), so
  the id stays in the list and the card returns on its own if it restocks. **The
  rail renders 16 of 17 today.** Told Tina.
- `npx tsc --noEmit` → exit 0. `npm run lint` → clean. `npm test` → 47 files,
  756 tests passed.
- `npm run build` → succeeded, all routes.
- Against `next start -p 3211`: `data-surface="abaya-picks"` × 16,
  `utm_content=abaya-picks` × 16, heading renders as
  `Our picks on <span class="italic" ...>abayas.</span>`.
- Playwright, desktop 1440 and phone 390, with the stylesheet-loaded assertion
  (§10.24/§10.26) — body background read `rgb(250, 247, 241)`, not transparent,
  so the measurements are real. 16 cards at both widths; screenshots of the
  section reviewed at both. Off-screen cards report `naturalWidth 0` because they
  are `loading="lazy"` and horizontally out of view — expected, not a broken
  image.

## Notes / follow-ups
- Every pick is `garment: 'abaya'`, so all 16 take `PopularShowcase`'s
  `object-contain` branch. Correct per Tina's earlier "zoom the picture on the
  abayas a little out", but it means this row is letterboxed white where Popular
  Items is mostly filled. Worth a look on staging.
- Five brands appear twice in the row (Avyaana, Jawda, Bayt El Hayat, Modesty in
  Style, Nour Al Houda) and in two cases adjacently, because the order is hers
  verbatim (cheapest first) and was deliberately not re-sorted.
- Staging verification still pending at the time of writing — see the commit that
  follows.
