# Easy removal on the Favourites page
**Date:** 2026-08-07 · **Status:** done (interactive behaviour unverified in a browser)

## Goal
Tina asked for an easy way to delete favourites she no longer wants.

## What was already there
Removal was technically possible — `toggleFav` removes an existing favourite,
and every `ProductCard` carries a ♥ that toggles. The problem was discoverability:
on the Favourites page a filled heart reads as "saved", not as "tap to delete",
so there was no control that *looks* like removal.

## What changed
- **Clear all**, next to the heading.
- **Undo** (8s) after any removal, single or bulk.
- **Count** in the heading.
- The ♥ on each card is the delete control — no second button.

### Revision: the × was removed at Tina's request
The first pass added a × per card. Tina's call was that the heart should carry
every function, which is right: two controls doing the same job on one card is
noise, and the heart is already where the hand goes.

That has a consequence worth recording. The heart lives inside `ProductCard` and
calls `toggleFav` directly, so this page is never told a removal happened and
cannot arm undo from a click handler. Instead the page **watches the favourites
map** and reacts to anything that disappears from it. One mechanism now covers
the heart on the card, the heart in quick view, and Clear all.

Two traps in that approach, both handled:
- **Undo restores items, which is itself a change to the map.** A `restoring`
  ref suppresses exactly one watcher pass, or the restore would arm a fresh
  undo bar.
- **The watcher must diff against the previous map**, not the current one, since
  the removed product objects are gone by the time the effect runs.

## Heart sizing
Also at Tina's request: the header heart went 12px → 16px (`.nav-link` is sized
for words, not a glyph), and the card heart's button 32px → 40px with the glyph
at 19px. The card button was below the 44px tap-target guidance and is the most
tapped control on the site; 40px is a meaningful improvement without it becoming
a blob over the photography.

## Design notes
- **Undo instead of a confirm dialog.** Favourites live only in this browser's
  localStorage (`tmh_favs`) — there is no server copy, so a mis-tap is permanent.
  A confirm on every heart would make clearing a long list miserable; undo costs
  nothing until it is needed. Bulk clear is undoable as one action.
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
