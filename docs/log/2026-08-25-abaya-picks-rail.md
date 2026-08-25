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

## Follow-up the same day — card box 3/4 → 2/3

Tina, looking at the rail: *"some of the pictures dont fit really good into our
frame can you fix that... i think we should better keep everything like how they
have done it"*, then *"can you do all the rows so also the Popular items from
brands. the same ratios as the photos from the abayas."*

Read as: don't crop the brands' photographs to fit our box — make our box the
shape their photographs already are. Measured rather than guessed, via the
rendered `naturalWidth/naturalHeight` of all 16 abaya images: **10 are exactly
0.667 (2:3), the median is 0.667, and the whole spread is 0.564–0.800.** The card
box was `aspect-[3/4]` (0.750), so under `object-contain` the majority of the row
carried white bars down both sides.

`components/PopularShowcase.tsx` is now `aspect-[2/3]`, applied to BOTH rails per
her second message. After: of the 16 abayas, 10 fill their box exactly (no bars,
no crop, up from 0), worst case 83.3%; on Popular Items, 6 of 7. The four abaya
photos wider than 2:3 gain a small top/bottom bar — the trade she chose, since
the alternative is `object-cover` cropping the majority.

Re-verified: tsc clean, lint clean, build clean, and `BASE=…:3211 ROUTES=/
npm run audit:visual` in BOTH engines reported `aspect 0 · img 0 · a11y 0 ·
errors 0 · no-css 0`. (My own quick WebKit probe reported "CSS did not load" —
that was the probe, not the site: it skipped the HSTS/upgrade-insecure-requests
header strip the audit does for local runs. §10.26 #3, again.)

The audit's tablet-819 findings — a footer column overflowing, `TAP`/`TINY` on
footer links and a `✦` span — were checked against **production** at the same
viewport as a negative control and reproduce there identically
(`div.eyebrow`/`ul.mt-4.space-y-2.text-sm`/`li`×5, w=300). Pre-existing and
unrelated to this work; not fixed here.

## Notes / follow-ups
- The footer overflow at tablet-819 above is real and unfixed. It is on
  production too, so it is not a regression, but somebody should take it.
- Five brands appear twice in the row (Avyaana, Jawda, Bayt El Hayat, Modesty in
  Style, Nour Al Houda) and in two cases adjacently, because the order is hers
  verbatim (cheapest first) and was deliberately not re-sorted.
- Staging verification still pending at the time of writing — see the commit that
  follows.
