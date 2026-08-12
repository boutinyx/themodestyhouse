# Inline staff editing on the real site — Design

**Date:** 2026-08-12 · **Status:** approved by Tina (design Q&A, this session)

## Goal

Replace the separate `/staff/curate` swipe-list admin page with editing
controls embedded directly in the real, public product grids — Tina browses
`/directory`, the lane pages, favourites, exactly as any visitor would, and
fixes problems as she spots them, in place.

Two actions, both live-effective immediately:
- **Delete** — remove a product from the site (already exists via
  `/staff/curate`, being relocated, not rebuilt).
- **Move** — correct a product's garment type (new), which is what actually
  drives which lane/grid a product appears in
  (`lib/products.ts::productsForLane`, `browseProducts`).

Both accumulate in a small on-site tray she can copy as one block and paste
to a Claude session, which does the actual git-tracked merge — same
deliberately-manual sync model `docs/log/2026-08-12-staff-curate.md` already
established for deletes (no GitHub credentials in production, no silent
loss on redeploy, no automatic push from a live container).

## Architecture

Reuses the existing staff-auth and live-store infrastructure wholesale —
`lib/adminAuth.ts`, `lib/staffSession.ts`, `data/.live-cuts.json` — and adds
one parallel store for the new action type, following its exact pattern.

```
ProductCard (every grid)
  └─ pencil icon, staff-only ── click ── popover: Move [garment ▾] | Delete
                                              │
                                    POST /api/staff/live-edit/{move,delete}
                                              │
                        lib/liveCuts.ts (existing) ── data/.live-cuts.json
                        lib/liveGarmentOverrides.ts (new) ── data/.live-garment-overrides.json
                                              │
                              lib/products.ts::getProducts() applies both
                              live stores before any consumer sees a Product
                                              │
                              every lane/grid reflects the change immediately

/staff/curate → becomes the review tray:
  GET /api/staff/live-edit/list → { deletes: [...], moves: [...] }
  "Copy" button → clipboard.writeText(JSON) → Tina pastes to Claude
                                              │
              scripts/merge-live-edits.mjs (new) — Claude runs this locally
              deletes → data/decisions.json (matches merge-live-cuts.mjs's
                        existing behaviour — not changing that precedent here)
              moves   → data/garment-overrides.json (the file
                        lib/garmentReview.ts::resolveGarment already reads at
                        publish time — reuses it exactly, no new git-tracked
                        file)
              → npm run build:data
```

## Components

**`lib/liveGarmentOverrides.ts`** (new) — byte-for-byte the same shape as
`lib/liveCuts.ts`: `getLiveGarmentOverrides()`, `setLiveGarmentOverride(id,
garment)`, atomic temp-file+rename write, gitignored store at
`data/.live-garment-overrides.json`.

**`lib/products.ts::getProducts()`** — after applying `cutIds` (existing),
also applies garment overrides by replacing `p.garment` on the returned
objects before any lane/specialty filtering runs. This is the single choke
point every consumer already goes through, so a move is correct everywhere
with no per-page wiring, mirroring exactly how the cut filter already works.

**Staff-session awareness in the client tree** — `app/layout.tsx` (server
component) calls `hasStaffSession()` once and passes the boolean into a new
`StaffSessionProvider` (client context, same shape as `CurrencyProvider`).
No extra request: the check happens server-side on the already-rendered
page load. `ProductCard` reads `useIsStaff()`; the pencil icon renders only
when true. A signed-out visitor's bundle still ships the (tiny, inert) code
path — acceptable, since it renders nothing and touches no data — but never
the underlying product data any differently.

**`ProductCard`** — adds a third small icon, top-left, above the existing
quick-view eye (which shifts down slightly), rendered only under
`useIsStaff()`. Click opens a Base UI `Popover` (same primitive already used
for the header nav / currency switcher, per the §10.25 lesson against
hand-rolled hover/focus dropdowns) with:
- A garment `<select>`-equivalent (Base UI `Menu` or native `<select>` — a
  simple native select is fine here, this is a staff-only, function-over-
  form control) listing the 8 `GARMENT_VALUES` from `lib/tag.ts`.
- A "Delete" button.
Both actions optimistically update the card's local visual state (struck
through / grayed, like the existing `/staff/curate` list did) and POST to
the API; a failure surfaces a small inline error rather than silently
reverting (no shortcuts — CLAUDE.md §1).

**API routes** (`app/api/staff/live-edit/`, session-gated via
`requireStaffSession()` exactly like the existing `/api/staff/curate/*`
routes):
- `POST move` — `{ id, garment }`, validates `garment` against
  `GARMENT_VALUES`, calls `setLiveGarmentOverride`.
- `POST delete` — thin wrapper reusing the existing `setLiveCut(id, 'cut')`
  (no need to duplicate `/api/staff/curate/decide`; the tray's delete action
  calls the same endpoint that already exists).
- `GET list` — returns the accumulated session deltas for the tray: for each
  live-cut and each live-garment-override, the id, title, url, and (for
  moves) the from→to garment. Reads `data/products.json` directly (same
  reasoning as the current `/api/staff/curate/list` — the tray needs to show
  a title/thumbnail for something already cut, which `getProducts()` would
  hide).

**`/staff/curate`** — the page is repurposed from a swipe-list into the
review tray: a simple list of everything marked this session (delete or
move, each with product title + before→after), a live count, and a "Copy
for Claude" button that serializes the same shape `GET list` returns to
clipboard as formatted JSON. The old `StaffCuratePanel.tsx` swipe-grid is
deleted — its filtering/pagination logic has no job left once editing
happens inline on the real pages.

**`scripts/merge-live-edits.mjs`** (new, run manually by whoever has repo
access — the same trust boundary as the existing `merge-live-cuts.mjs`):
takes a saved copy of the pasted JSON, splits it into deletes and moves,
writes deletes into `data/decisions.json` (same target/behaviour as
`merge-live-cuts.mjs` — deliberately not revisiting that file-choice
question here, it's already Tina's confirmed design from the prior
session), writes moves into `data/garment-overrides.json`, prints a
summary, reminds to run `npm run build:data`. `merge-live-cuts.mjs` itself
is left alone; the new script is additive so an old export someone still
has lying around keeps working with the old tool.

## Data flow / error handling

- A move and a delete on the same id: last action wins, same as the
  existing `setLiveCut` semantics (a Map keyed by id).
- `getProducts()` reading a garment override for an id that no longer
  exists in `products.json` (stale from a prior publish) is a no-op —
  `.filter`/`.map` never touch a nonexistent row.
- The popover's garment picker only ever writes one of the 8 known
  `GARMENT_VALUES` — the API route 400s on anything else, same validation
  style as the existing `decide` route's `decision !== 'keep' && decision
  !== 'cut'` check.
- Clipboard write failure (permissions, non-secure context) falls back to a
  visible `<textarea>` with the same JSON pre-selected, so the tray never
  strands her with data she can't get out.

## Testing

- `lib/liveGarmentOverrides.test.ts` — mirrors `lib/liveCuts.test.ts`
  exactly (get/set/persist across calls/atomic write survives a crash mid-
  write, using a temp `storePath` param the same way the existing test
  does).
- `lib/products.test.ts` — extend the existing live-cuts coverage with: a
  garment override changes `p.garment` on the returned product; a product
  moved to `swim`/`hijab` correctly disappears from `browseProducts()`; a
  product moved to a garment matching a lane's `match` now appears in
  `productsForLane(thatLane)`.
- API route tests for `move`/`delete`/`list`, same pattern as the existing
  `app/api/staff/curate/*` routes (unauthenticated → 401, bad body → 400,
  happy path → 200 + correct store mutation).
- A real Playwright pass against a `next start` build (not curl — per this
  session's own established preference): sign in, load `/directory`, click
  a card's pencil icon, move it to a different garment, confirm the lane
  page reflects it within the request cycle; delete another, confirm it's
  gone from `/directory`; open `/staff/curate`, confirm both show in the
  tray, click Copy, confirm clipboard contents match `GET list`'s JSON.

## Alternatives considered

- **Keep `/staff/curate` as a duplicate grid, add editing there instead of
  on the real pages.** Rejected — this is exactly what already exists and
  is exactly what Tina said doesn't match how she wants to work: she wants
  to review products the way a real visitor encounters them (in their
  actual lane, next to their actual neighbors), not in an artificial
  admin-only list order.
- **Auto-apply moves/deletes straight into git-tracked files from
  production.** Rejected, consistent with the existing `/staff/curate`
  decision: no GitHub credentials in the production container, and a
  reviewed merge step catches a mistaken tap before it's permanent.
- **Toggle-based edit mode instead of always-visible icon.** Tina's own
  stated preference (this session) was an icon she clicks directly, no mode
  switch — simpler mental model, and she is the only person who will ever
  see it.
