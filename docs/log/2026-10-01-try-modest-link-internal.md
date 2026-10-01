# Link the Try Modest founder post to its real designers page
**Date:** 2026-10-01 · **Status:** done

## Goal
Tina: "now that were done with the products you can link the shit" / "OF THE
BLOG" — swap the Ghost draft founder post's brand-name links from the
external `trymodest.com` URL to the internal `/designers/try-modest` page,
now that the catalogue is curated (273 published, well past `MIN_PRODUCTS`
= 24 in `lib/brandPages.ts`) and the page is live.

## What changed
- `scripts/ghost-draft-try-modest-founder.mjs`: both brand-name links now
  point at `/designers/try-modest` instead of `https://trymodest.com`, so
  re-running this script from scratch (e.g. after a clean re-create) would
  already produce the right version.
- New `scripts/ghost-update-try-modest-links.mjs`: fetches the existing
  draft, regenerates its HTML from the updated markdown, and PUTs it back —
  updating in place rather than deleting/recreating, since Ghost's PUT
  needs the post's current `updated_at` anyway (fetched fresh, not
  guessed).
- Ran it once. Post `meet-farheen-try-modest-founder` updated,
  `status: draft` unchanged — nothing published.

## Verification
- Confirmed `/designers/try-modest` was actually live on production first
  (polled until 200, since the earlier catalogue-cut merge's Railway
  deploy was still landing) before pointing anything at it.
- Fetched the post back after the update: both `<a href>`s now resolve to
  `https://themodestyhouse.com/designers/try-modest` (Ghost expands the
  relative markdown link to an absolute one on save). Still `draft`.
- Checked the live page isn't thin: 24 server-rendered product cards
  (`data-surface="product-card"`), "273 pieces" in the fallback
  description — matches the curated count exactly.

## Notes / follow-ups
- Still no cover image on the post — unchanged from the original gap,
  Farheen hasn't sent photos yet.
- No hand-written `description` added to `data/brands.ts` for try-modest —
  not asked for; the page already renders fine from measured facts per
  `app/designers/[slug]/page.tsx`'s fallback. Add one if Tina wants the
  page to carry real editorial prose instead.
