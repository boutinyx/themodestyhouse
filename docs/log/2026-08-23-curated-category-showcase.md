# "By category" section: curated 6-photo showcase, replacing auto-picked images
**Date:** 2026-08-23 · **Status:** done

## Goal
Tina sent a reference screenshot (a competitor's category mosaic: photo, plain
white label card bottom-left with category name + subtitle) and six of her
own editorial photos, one per category: "i want this ... but i want one for
dresses co-cord sets skirts abayas tops and active wear."

## Mapping the photos to categories
She listed six image files, but their filenames gave no hint of content and
their order in her message didn't match the order she named the categories
in. Looked at each image directly rather than assuming positional order:
- `82215d0f...` — fitted lilac gown, closed silhouette → **Dresses**
- `a61fc56f...` — open-front kimono-sleeve piped robe → **Abayas**
- `c12954f6...` — grey wrap maxi skirt + sweater, street style → **Skirts**
- `c6aeefba...` — matching satin top + wide-leg trousers → **Co-ord Sets**
- `4790bacf...` — tennis-court athletic outfit → **Activewear**
- `ef4e9be8...` — draped satin blouse → **Tops**

## What changed
- `public/category/{dresses,coord-sets,skirts,abayas,tops,activewear}.png` —
  the six source photos, copied in.
- `scripts/optimise-images.mjs` — new job for `category/`, widths
  `[400, 700, 1000]`, quality 85. Generated WebP variants (11.2MB → ~8MB
  total across all 18 files, individual files 97-99% smaller than source).
- `app/page.tsx`:
  - New `CATEGORY_SHOWCASE` const — the six curated `{slug, label, image}`
    entries, real lane slugs (`modest-dresses`, `modest-sets`, etc.).
  - Piece counts still come LIVE from `categoryCards()` (via a
    `catCountBySlug` map), not hand-typed — only the photo and the set of six
    categories are curated, not the numbers.
  - The `tmh-cat-grid` markup (5 auto-picked-image cards, one asymmetric
    "featured" 2×2 card) replaced with a new `tmh-showcase-grid`: 6 equal
    cards, 3 columns.
  - Removed the now-unused `shopifyImage`/`shopifySrcSet` import (this
    section was their only use in this file).
- `app/globals.css` — new `.tmh-showcase-*` classes: plain photo (no dark
  scrim, unlike the existing `.tmh-cat-card`), a white `.tmh-showcase-label`
  box bottom-left holding the category name (bold, tracked) and piece count
  (small, muted) — matching Tina's reference. 2-column at ≤820px, 1-column at
  ≤480px. Kept separate from `.tmh-cat-*` rather than reusing it, since the
  existing grid's asymmetric feature-card layout and dark-scrim treatment are
  a different design.

## Verification
`npx eslint` and `npx tsc --noEmit` both clean on the changed files.
Playwright screenshots at 1512×1000 (desktop, clean 3×2 grid, correct
photo/category pairing, live piece counts) and 390×1000 (phone, 1-column
stack).

## Follow-up, same day
Tina sent a replacement photo for Dresses (lilac satin dress, storefront
setting): "i want this one for dresses." Overwrote
`public/category/dresses.png` and regenerated its WebP variants via
`node scripts/optimise-images.mjs`. Verified live on the homepage.

## Follow-up 2, same day
Tina sent a replacement photo for Co-ord Sets (mauve satin two-piece,
yacht setting): "this one for co-sets." Overwrote
`public/category/coord-sets.png`, regenerated its WebP variants.

Then: "can u zoom in the pic a lil bit of the dresses." Added an optional
`zoom` field to `CATEGORY_SHOWCASE` entries (Dresses: 1.12, everything else
unset). Composed via a CSS custom property (`--card-zoom`, set inline per
`<img>`) rather than an inline `transform`, specifically so the existing
`.tmh-showcase-card:hover img { transform: scale(1.05) }` still applies on
top instead of being silently overridden by inline style specificity — the
hover rule now reads `scale(calc(var(--card-zoom, 1) * 1.05))`. Verified via
computed style: Dresses' `<img>` resolves to `matrix(1.12, 0, 0, 1.12, 0, 0)`,
every other card's to the identity matrix.

## Follow-up 3, same day
Tina sent a replacement photo for Abayas (black abaya, lace sleeve detail,
hotel entrance): "this one for abayas." Overwrote `public/category/abayas.png`
and regenerated its WebP variants. Verified live.

## Follow-up 4, same day
Tina: "zoom the dresses one in a lilbit more." `zoom` for Dresses bumped
1.12 -> 1.24. Verified live.

## Follow-up 5, same day
Tina: "abayas one too." Same `zoom: 1.24` applied to the Abayas entry.
Verified live.

## Follow-up 6, same day — restyled to match aab's actual card treatment
Tina sent a screenshot of aabcollection.com's own homepage grid: "i want the
cards to look like aab's." Different from the white-label-card reference
from yesterday that the original version of this section was built against —
aab's real cards have bold white "SHOP X" text sitting directly on the
photo (no card/box), and a plain caption BELOW the photo entirely, off the
image.

`app/globals.css` — restructured `.tmh-showcase-*`:
- `.tmh-showcase-card` is now just a block wrapper (Link), no longer the
  overflow-hidden/aspect-ratio box itself.
- New `.tmh-showcase-photo` holds the image + `.tmh-showcase-shop` (the bold
  white "SHOP {label}" text, centered, sitting at 32% up from the bottom of
  the photo, matching the reference's mid-low position).
- New `.tmh-showcase-caption` (plain category name, centered, below the
  photo) and `.tmh-showcase-count` (piece count, smaller/muted, below that) —
  replacing the old `.tmh-showcase-label` white box entirely.
- The zoom mechanism (`--card-zoom` custom property + hover composition) is
  unchanged, just moved onto `.tmh-showcase-photo img`.

`app/page.tsx` — JSX restructured to match: image + "Shop {label}" overlay
inside a `.tmh-showcase-photo` div, then the plain caption and count as
siblings below it, still inside the same `<Link>` (whole card stays
clickable).

## Verification
`npx eslint`/`npx tsc --noEmit` clean. Playwright screenshots at 1512×1100
(desktop) and 390×1100 (phone) — bold "SHOP X" white text on every photo,
plain caption + piece count underneath, closely matching aab's own layout.

## Follow-up 7, same day — spacing/type tuned closer to aab's proportions
Tina: "but my lettertype and centering the text and look at the spacing i
want the spacing to be like aabs." Three adjustments in `app/globals.css`:
- `.tmh-showcase-grid` gap: `14px 20px` → `32px 24px` — aab's grid leaves
  noticeably more room between cards than the original tighter gap.
- `.tmh-showcase-caption`: `margin-top` `12px` → `20px` (more air between
  photo and caption, matching aab), `font-size` `14px` → `19px`,
  `letter-spacing` `0.14em` → `0.06em` (the dense small-caps tracking read as
  a label chip rather than the plain, larger, lightly-tracked caption aab
  uses) — still this site's own `--font-label` serif, not aab's typeface
  ("my lettertype").
- `.tmh-showcase-count` margin-top `2px` → `4px` to match the caption's new
  spacing.
Centering was already `text-align: center` on both; confirmed still centered
under each photo after the size/spacing changes (screenshot).

Verified live at 1512×1150 — noticeably closer to aab's actual proportions.

## Follow-up 8, same day — corrected which text the font/centering feedback was about
Tina: "not that word i meant the text in the pic." The previous round's
"my lettertype"/"centering the text" feedback was about the "SHOP X" overlay
ON the photo, not the caption below it (which is what got changed instead).

`.tmh-showcase-shop` (globals.css): font `var(--font-ui)` (Jost) →
`var(--font-label)` (Marcellus) with `letter-spacing: 0.14em` — matching the
hero's own "Shop the Archive" button treatment exactly, this site's
established CTA typography rather than a generic bold sans. Centering: was
`bottom: 32%` (pinned near the bottom third); now `inset: 0` + flex
`align-items`/`justify-content: center` — genuinely centered on the photo
rather than offset toward the bottom.

## Follow-up 9, same day — corrected grid gap direction, and thicker shop text
Tina: "can it be thicker (the text in the picture) and can you revert the
text under the pictures to original size. like aabs." Then sent two more
screenshots of aab's actual "Shop by Category" grid: "the spacing i want
like aabs."

- `.tmh-showcase-shop`: added `font-weight: 700` (was relying on Marcellus's
  own default weight, which read too light against the photos).
- `.tmh-showcase-caption`: `font-size`/`letter-spacing` reverted to the
  original `14px`/`0.14em` (the `19px`/`0.06em` pass from two entries up was
  a wrong-direction guess) — `margin-top: 20px` kept.
- `.tmh-showcase-grid` gap: `32px 24px` → `40px 0` — the reference
  screenshots showed the actual aab grid has ZERO gap between columns
  (photos touch directly) and only a generous gap BETWEEN ROWS. The previous
  32px/24px pass added space on both axes, which was backwards from what she
  was asking for.
- `.tmh-showcase-photo`: removed `border-radius: 4px` — with zero gap between
  columns, rounded corners left a small notch where two photos meet; aab's
  own mosaic is sharp-edged.

Verified live at 1512×1200 — photos now touch edge-to-edge exactly like the
reference, real gap between rows, sharp corners.

## Follow-up 10, same day
Tina: "no look they have a tiny bit of space between the cards and a tiny
bit of space between the screen and card." Two parts:
- Column gap: `0` → `6px` (a real but small gap, not literally touching —
  the zero-gap pass overcorrected).
- "Space between the screen and card" was already satisfied by the
  section's own `px-8` (app/page.tsx) — confirmed via a 390px-wide
  screenshot rather than assumed.

Verified live at 1512×1200 (desktop, visible small gap between columns) and
390×1200 (phone, clean edge margin from `px-8`).

## Follow-up 11, same day
Tina: "perfect spacing betwen cards but the need to be also less space ont
he edges of the screen." `app/page.tsx` — the "By category" section's outer
padding: `px-8` (32px, every width) → `px-4 md:px-8` (16px on mobile only,
unchanged at md+), since her aab reference screenshots were mobile-width
captures with a noticeably tighter edge margin. Heading/link row above the
grid shares the same section-level padding, so nothing goes out of alignment
with the grid below it.

Verified live: 390×1200 (phone) shows a visibly tighter edge margin;
1512×1200 (desktop) is unchanged.

## Follow-up 12, same day
Tina: "a little more and make the card also a litterle longer."
- `app/page.tsx` — section padding `px-4 md:px-8` → `px-2 md:px-8` (mobile
  edge margin tightened further).
- `.tmh-showcase-photo` (globals.css) `aspect-ratio`: `3 / 4` → `3 / 4.4`
  (cards noticeably taller/longer).

Verified live at 390×1200 (phone) and 1512×1250 (desktop).

## Follow-up 13, same day
Tina: "a tiny bit more less space and also a tiny bit less space horizonally
between cards." Two smaller nudges:
- `app/page.tsx` — section padding `px-2 md:px-8` → `px-1 md:px-8`.
- `.tmh-showcase-grid` gap (globals.css): `40px 6px` → `40px 3px`.

Verified live at 390×1200 (phone) and 1512×1250 (desktop).

## Follow-up 14, 2026-08-24
Tina said "revert" after a screenshot command timed out mid-check (unrelated
dev-server hiccup, not a real issue) — reverted the just-made `gap: 48px 0`
back to `40px 3px`. She then: "a lil more spacing between cards vertically
but a tiny bit." `.tmh-showcase-grid` gap: `40px 3px` → `46px 3px`.

Verified live at 1512×1250.

## Follow-up 15, 2026-08-24
Tina: "a lil more vertically between the cards in the middle." Row gap
`46px` → `56px`.

Verified live at 1512×1300.

## Follow-up 16, 2026-08-24
Tina: "more" — read as continuing the vertical row-gap request, bumped to
72px. Corrected immediately: "no that the wrong one. that ones needs to be
smaller i meant the distance between card dresses and co sets etc" — she
meant the HORIZONTAL gap between cards in the same row (Dresses/Co-ord Sets/
Skirts), not the vertical gap between rows. `.tmh-showcase-grid` gap:
`72px 3px` → `56px 16px` (row gap back down to the previous 56px, column gap
`3px` → `16px`, now clearly visible between side-by-side cards).

Verified live at 1512×1250.

## Follow-up 17, 2026-08-24
Tina: "thats too much." Column gap `16px` → `8px`.

Verified live at 1512×1250.

## Follow-up 18, 2026-08-24
Tina: "a tiny bit more." Column gap `8px` → `11px`.

Verified live at 1512×1250.

## Follow-up 19, 2026-08-24
Tina: "a tiny bit smaller like aabs." Column gap `11px` → `9px`.

Verified live at 1512×1250.

## Follow-up 20, 2026-08-24
Tina: "little more." Column gap `9px` → `10px`.

## Follow-up 21, 2026-08-24
Tina: "more." Column gap `10px` → `12px`. Verified live at 1512×1250.

## Follow-up 22, 2026-08-24
Tina: "moreeeee." Column gap `12px` → `22px` (bigger jump given the emphasis).

## Follow-up 23, 2026-08-24
Tina: "no i meant make it smalller" — "moreeeee" was meant in the opposite
direction from how it was read. Column gap `22px` → `10px`. Verified live.

## Follow-up 24, 2026-08-24
Tina: "little more." Column gap `10px` → `13px`. (Note: `app/page.tsx`
changed on disk from another concurrent edit in the meantime — Abayas'
By-category card photo swapped to a new `abayas-2.png`, `zoom: 1.24` added
to match Dresses' treatment. Unrelated to this spacing thread, left as-is.)

## Follow-up 25, 2026-08-24
Tina: "no do it 8pc" — exact value. Column gap `13px` → `8px`.

## Follow-up 26, 2026-08-24
Tina: "6" — exact value. Column gap `8px` → `6px`.

## Follow-up 27, 2026-08-24
Tina: "and now i want less spacing horizontal so between dresses and skirts
for examples." Column gap `6px` → `3px`.

## Follow-up 28, 2026-08-24 — corrected which gap "horizontal" meant
Tina sent a screenshot with a yellow scribble circling the gap BETWEEN THE
ROWS (Dresses/Co-ord Sets row vs. Skirts/Abayas row): "i meant [screenshot]
where ive drawn the yellow box." The previous two "less spacing horizontal"
messages had been read as the column gap (between Dresses/Co-ord Sets/
Skirts side by side) and reduced that instead — wrong target. Row gap
`56px` → `24px`; column gap restored to `6px` (undoing the incorrect `3px`
reduction from the prior two messages).

Verified live at 1512×1200 — noticeably tighter gap between the two rows.
