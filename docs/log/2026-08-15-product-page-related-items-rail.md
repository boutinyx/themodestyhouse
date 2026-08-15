# "You might also love" rail on the product/share page
**Date:** 2026-08-15 · **Status:** done

## Goal
Tina (voice dictation, paraphrased): the open space under "Shop at {brand}" on the
product/share page should show a horizontally-scrollable row of related items — a couple
visible at a time, scroll through ~5, same pattern as the homepage's scroll-arrow rail.
"Picking my hand" was dictation garble for the homepage's own heading, "**Chosen by
hand**" (`app/page.tsx`), which is rendered by `components/EditorsRail.tsx`.

Asked Tina to resolve one fork before building: what pool of items to show. She picked
**similar items** — same garment as the product being viewed, pulled across brands — over
"more from this brand" or "reuse the homepage's exact editorial picks."

## What changed
- `components/EditorsRail.tsx` — generalized to be reusable off the homepage:
  - `surface` prop (default `'editors-rail'`) sets `data-surface` on each card's outbound
    anchor, so click-tracking can tell the two placements apart.
  - `badgeLabel` prop (default `"Editor's pick"`, accepts `null` to omit) — the homepage's
    Sparkle badge is a genuine hand-curation claim; a same-garment similarity rail isn't
    that, so mislabeling it would overclaim.
- `app/product/[brandSlug]/[shopifyId]/page.tsx` — new `relatedPicks()`: same `garment` as
  the current product, excludes the product itself, `inStock` + has an image, deduped to
  one product per brand (seeded with the CURRENT brand so its own other items don't fill
  the row — forces cross-brand spread), capped at 6. Rendered as a new section below the
  existing image/text grid — same placement on both breakpoints (under the "Shop at"
  button on desktop, under the whole stacked block on a phone) — only when at least 2
  related items exist, so a rare garment/brand combo never shows a near-empty rail.
  `badgeLabel={null}`.
- No change needed for Invariant 5 (mixed grids must never blend hijabs/specialty into an
  unrelated grid) — the rail is same-garment by construction, so a hijab page only ever
  recommends other hijabs, an abaya page other abayas, etc. It never needs
  `browseProducts()`/`isSpecialty()` gating because it never crosses garment lines.

## Verification
- `npx tsc --noEmit`: clean. `npm run lint`: clean (only the pre-existing unrelated
  `.fontprobe.tmp.mjs` warning). `npm run build`: clean, route list unchanged.
- Production build (`next start`), Playwright in **both Chromium and WebKit** at phone
  (390), tablet (820), desktop (1440) — 6 combinations, all confirmed:
  - `.btn-pill` computed `border-radius` non-zero (stylesheet genuinely loaded — the first
    WebKit pass forgot to strip HSTS/CSP over local http per CLAUDE.md §10.24 and rendered
    completely unstyled HTML; caught it, fixed the harness, reran clean).
  - "You might also love" heading present; 6 related cards rendered with the new
    `data-surface="product-page-related"`; no "Editor's pick" badge present.
  - Rail genuinely overflows (`scrollWidth` 1500 > `clientWidth` 326-704 depending on
    viewport) and a programmatic scroll actually moves `scrollLeft`.
- Visual screenshots reviewed directly: phone shows ~1.3 cards with a clear "more to
  scroll" cue and both arrows working; desktop shows ~3 cards under the Shop button,
  filling the space Tina pointed at.
- Deployed the same way as the earlier centering fix this session: committed, pushed to
  `origin/main`, confirmed `git merge-base --is-ancestor HEAD origin/main`, then polled the
  live URL until Railway's rebuild served the new `<main>`/rail markup before reporting
  done — not just verified locally.

## Notes / follow-ups
- Picks are deterministic (first N matches in catalogue order, not randomized) — simplest
  correct behavior; revisit only if Tina wants variety across repeat visits.
- No new test added — same reasoning as the original share-link feature's log entry: no
  precedent in this repo for testing `app/**/page.tsx` or `components/*.tsx` files.
