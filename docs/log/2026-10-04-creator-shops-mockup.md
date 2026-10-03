# Creator shops — mockup agreed (not built)
**Date:** 2026-10-04 · **Status:** partial (design agreed in a local mockup; nothing on the site)

## Goal
An individual creator wanted to collab, but there is no physical product to send. Tina chose to offer
creators their own page on the site (her picks, her name, a link to her profile, a Collab post and a
story shoutout) and asked for a section for multiple creators, ShopMy-style.

## What was agreed (Tina's choices, in order)
- ShopMy-style structure: overview `Creators` → creator page (round portrait, handles, bio, counts,
  Follow / Share, "Her top picks" rail with her note per piece on tap, collections) → collection page
  (cover, her handwritten-style note, pieces).
- Visual style: the FIRST card-based version (white rounded cards, round portraits), not the later
  "high-end" magazine version (kept as `shopmy-highend.html` for reference).
- Overview hero: full-width split photo (one portrait, one outfit-only crop) with "Creators" in Bodoni.
  No tagline — copy is Tina's to write.
- Overview order: hero → Loved by creators (most-picked pieces with picker avatars) → Shop by moment
  (Wedding guest / Everyday / Abayas / Fall layers) → All creators → Latest collections.
- No "Open your own shop" block (Tina: "that's not what it is"); only a small line
  "Are you a creator? Be seen by brands".
- Explored and REVERTED at Tina's request: face-free creator options (outfit-only / collage + initials).
  Note for the build: some creators do not show their faces, so this question will come back.

## Where it lives
`.mockups/creator-edits/` (untracked, local only): `shopmy.html` (agreed), `overview-options.html`
(the 5 overview options), `shopmy-highend.html`, `index.html` (first 5 single-page concepts).
Served with `python3 -m http.server 8765` from that directory. All products, brands and prices are
real catalogue rows; names, handles, bios, notes and portraits are placeholders (portraits are two of
Tina's own Higgsfield images).

## Notes / follow-ups
- Build only once the first creator says yes (an index with 0–1 creators looks empty).
- Real build: data-driven like lanes (one record per creator → page + card), staging first.
- Monetisation: until affiliate links are live, the offer is reach, not commission.
