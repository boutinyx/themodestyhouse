# Easy removal on the Favourites page
**Date:** 2026-08-07 · **Status:** done (interactive behaviour unverified in a browser)

## Goal
Tina asked for an easy way to delete favourites she no longer wants.

## What was already there
Removal was technically possible — `toggleFav` removes an existing favourite,
and every `ProductCard` carries a ♥ that toggles. The problem was discoverability:
on the Favourites page a filled heart reads as "saved", not as "tap to delete",
so there was no control that *looks* like removal.

## What changed — `app/favourites/page.tsx` only
- **Per-card × button**, top-left of each image, opposite the ♥ so the two are
  not confused.
- **Clear all**, next to the heading.
- **Undo** (8s) after any removal, single or bulk.
- **Count** in the heading.

Nothing outside this page changed. `ProductCard`, `QuickView` and the favourites
context are untouched, so nothing else on the site can regress.

## Design notes
- **Undo instead of a confirm dialog.** Favourites live only in this browser's
  localStorage (`tmh_favs`) — there is no server copy, so a mis-tap is permanent.
  A confirm on every heart would make clearing a long list miserable; undo costs
  nothing until it is needed. Bulk clear is undoable as one action.
- **The × is a SIBLING of the card, not a child.** The whole card is a `role="button"`
  that opens quick view; nesting a button inside it would be invalid HTML and the
  click would fall through to quick view.
- **Undo re-checks each item** before restoring. If the shopper re-saved a piece
  by hand in the meantime, blindly toggling would remove it a second time.
- Removal reuses `toggleFav` rather than adding a `removeFav`/`clearFavs` to the
  shared context — same behaviour, no shared-file change, no risk to other pages.

## Verification
`npx tsc --noEmit` clean · `next build` compiled · page renders against a real
`next start` server (empty state, since localStorage is server-side empty).

**Not verified:** the click behaviour — removal, undo, clear-all — was not
exercised in a real browser. The Chrome extension is not connected in this
environment, and favourites cannot be populated server-side. This needs a
human click-through before it is trusted.
