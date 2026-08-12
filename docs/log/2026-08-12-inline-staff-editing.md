# Inline staff editing — replace /staff/curate with edit controls on the real site
**Date:** 2026-08-12 · **Status:** done

## Goal

Tina: she wanted to browse the real site "like a normal user" and fix
problems (wrong category, doesn't belong) as she spots them, in place —
not a separate swipe-list admin page. Two actions: **Move** (correct a
product's garment type) and **Delete** (remove it), both live-effective
immediately, both accumulating in a small tray she can copy and paste to a
Claude session for the actual git-tracked merge.

Full design in `docs/superpowers/specs/2026-08-12-inline-staff-editing-design.md`,
implementation plan in `docs/superpowers/plans/2026-08-12-inline-staff-editing.md`.

## What changed

- **`lib/liveGarmentOverrides.ts`** (+test) — new live store for garment
  moves, mirrors `lib/liveCuts.ts` exactly: gitignored
  `data/.live-garment-overrides.json`, atomic temp-file+rename write.
- **`lib/products.ts::getProducts()`** — now applies live garment overrides
  (replaces `p.garment` before any lane/specialty filter runs), same choke
  point already used for live cuts, so a move is correct everywhere with no
  per-page wiring. 3 new tests in `lib/products.test.ts`.
- **`app/api/staff/live-edit/move/route.ts`** (new) — `POST {id, garment}`,
  session-gated, validates against the 8 publishable garments (excludes
  `'other'`).
- **`app/api/staff/live-edit/list/route.ts`** (new) — `GET` returns
  everything changed this session (cuts + moves) for the tray. Delete
  itself reuses the existing `/api/staff/curate/decide` route as-is — no
  new endpoint needed.
- **`components/StaffSessionProvider.tsx`** (new) + **`app/layout.tsx`** —
  `hasStaffSession()` read once per request in the root layout, passed into
  a client context (`useIsStaff()`). No client-side session request.
- **`components/StaffEditControl.tsx`** (new) — the pencil-icon popover
  (Base UI `Menu`, same primitive as the header nav / currency switcher):
  "Move to" submenu (8 garments) and "Delete".
- **`components/ProductCard.tsx`** — renders `StaffEditControl` staff-only,
  top-left of the image; the existing quick-view eye icon shifts right to
  make room; shows a local "Moved to X" / "Removed" state after an action.
- **`app/staff/curate/`** — `StaffCuratePanel.tsx` (the old swipe-list)
  deleted. `ReviewTray.tsx` (new) replaces it: lists everything changed
  this session with a "Copy for Claude" clipboard button, falling back to a
  visible textarea if the clipboard API is unavailable.
- **`scripts/merge-live-edits.mjs`** (new) — the manual sync step. Deletes
  → `data/decisions.json` (written minified, matching
  `merge-live-cuts.mjs`/`add-brands.mjs`'s existing convention — the first
  draft of this script pretty-printed it, which CLAUDE.md §8 documents as
  exactly the mistake that reflowed the whole tracked file before; caught
  and fixed before shipping). Moves → `data/garment-overrides.json`
  (pretty-printed, matching that file's existing on-disk format).
- `.gitignore` — added `data/.live-garment-overrides.json`.

## The static→dynamic tradeoff

Confirmed with Tina before building (Task 4): reading `hasStaffSession()`
in the root layout makes **every page** opt out of static prerendering.
Before this feature, `/directory`/home were static and `/[lane]` was
`revalidate: 60`. Build output now shows every route as `ƒ` (dynamic)
except the static image/robots/sitemap assets:

```
┌ ƒ /
├ ƒ /[lane]
├ ƒ /directory
├ ƒ /favourites
... (every real page ƒ)
├ ○ /apple-icon.png
├ ○ /icon.png
├ ○ /robots.txt
└ ○ /sitemap.xml
```

Accepted at this site's traffic scale, per Tina's explicit choice (the
simpler, no-extra-request option) over the alternative (keep pages static,
detect staff via a small client-side fetch).

## Verification

```
$ rm -f tsconfig.tsbuildinfo && npx tsc --noEmit         clean
$ npx vitest run                                         36 files, 592 tests passed
$ npm run lint                                           clean (0 errors in tracked source;
                                                           the only warning is in an untracked,
                                                           pre-existing stray file — .fontprobe.tmp.mjs,
                                                           present before this session, never committed)
$ rm -rf .next && npm run build                           clean, 31 routes
$ npm run verify:gate
  ok    no guarded routes in app-path-routes-manifest (31 routes total)
  ok    no guarded routes in routes-manifest
  ok    no curation source found in .next/server or .next/static
  ok    proxy built (nodejs) and matchers cover all 8 guarded paths
  ok    dev-only curation sources present in repo
GATE CHECK PASSED
```

Real end-to-end Playwright pass against a `next start` production build
(not curl), with real `ADMIN_PASSWORD`/`ADMIN_SESSION_SECRET`, run twice
(once mid-build after Task 6, once on the final build) — 12/12 assertions
passed both times:
- Signed-out visitor: 0 pencil icons anywhere; `/staff/curate` redirects to
  `/staff/login`.
- Signed-in staff: pencil icons visible on every card.
- Clicked a card's pencil → Move to → Skirt: card shows "Moved to Skirt"
  immediately.
- Clicked another card's pencil → Delete: card shows "Removed" immediately.
- Reloaded `/directory`: the deleted product no longer appears anywhere on
  the page.
- Loaded `/staff/curate`: tray shows "2 pending", lists the move (with
  from→to garment) and the delete correctly.
- Clicked "Copy for Claude": clipboard contents parsed as valid JSON with
  1 delete and 1 move, matching `GET /api/staff/live-edit/list`'s response
  exactly.

`scripts/merge-live-edits.mjs` smoke-tested against a copy of the real
`data/decisions.json`/`data/garment-overrides.json`: a test delete and move
applied correctly, files restored to their originals afterward with a
confirmed-empty `git diff`.

All test-server artifacts (`data/.live-cuts.json`,
`data/.live-garment-overrides.json`, temp verification scripts, temp
credentials) were removed after each verification pass — none reached git
(both live-edit stores are gitignored) or the real filesystem state.

## Notes / follow-ups

- Old `live-cuts-*.json` exports from the retired swipe-list flow (if any
  are sitting around unmerged from before this change) still work via the
  original `scripts/merge-live-cuts.mjs` — untouched by this work.
- This session's working tree had concurrent, uncommitted changes from
  another session throughout (`data/exclusions.json`, `data/products.json`,
  `data/rejected.json` mid-implementation; `app/globals.css` at the end) —
  none were staged or committed here, confirmed via `git diff --cached
  --stat` before every commit in this feature (§10.30 discipline).
- `ADMIN_PASSWORD`/`ADMIN_SESSION_SECRET` still need to be set on Railway
  for this to work in production — same outstanding requirement documented
  in `docs/log/2026-08-12-staff-curate.md`, unchanged by this work.
