# Add a "Clear list" button to /staff/curate's live-edit tray

**Date:** 2026-08-15 · **Status:** done

## Goal

Tina asked to clear the "Live catalogue edits — N pending" queue on
`/staff/curate` after its contents had already been copied and merged
locally (docs/log/2026-08-14-curation-batch-deletes-moves-lanemoves.md), and
to add a button so this doesn't need a deploy (or a request to Claude) every
time going forward.

Previously there was no way to reset the queue on demand — the three
runtime stores it reads (`data/.live-cuts.json`,
`data/.live-garment-overrides.json`, `data/.live-lane-overrides.json`) are
deliberately gitignored (lib/liveCuts.ts, lib/liveGarmentOverrides.ts,
lib/liveLaneOverrides.ts) and only ever reset as a side effect of a Railway
redeploy rebuilding the container from git, since none of them ship in the
image.

## What changed

- `lib/liveCuts.ts`, `lib/liveGarmentOverrides.ts`, `lib/liveLaneOverrides.ts`:
  added `clearLiveCuts()` / `clearLiveGarmentOverrides()` /
  `clearLiveLaneOverrides()`, each writing `{}` via the same atomic
  temp-file-then-rename pattern the existing setters use.
- `app/api/staff/live-edit/clear/route.ts` (+ `route.test.ts`): new
  staff-session-gated `POST` that calls all three clears together.
  Intentionally no partial-clear option — the three stores are always
  merged as one batch (`scripts/merge-live-edits.mjs`), so there's no
  correct case for clearing only one.
- `app/staff/curate/ReviewTray.tsx`: added a "Clear list" button next to
  "Copy for Claude", styled as a secondary/destructive action (outlined,
  `#b3261e`) rather than the filled aubergine primary button, disabled
  while empty or in flight. Confirms via `window.confirm` before calling the
  new endpoint (this is a real staff-facing UI control operated by a human,
  not browser automation — the confirm-dialog caution in this session's
  tooling guidance is about actions *I* trigger via the browser tools, not
  about writing normal UX for the app itself). On success, sets local state
  to the same empty shape the list fetch already falls back to on error
  (factored out as `EMPTY`), so the tray goes to "Nothing marked yet"
  immediately without a refetch.

## Verification

```
$ npx vitest run --exclude '**/.claude/**' lib/liveCuts lib/liveGarmentOverrides lib/liveLaneOverrides app/api/staff/live-edit
Test Files  7 passed (7)
     Tests  41 passed (41)

$ npx tsc --noEmit
(clean)

$ npx vitest run --exclude '**/.claude/**'
Test Files  40 passed (40)
     Tests  653 passed (653)

$ npm run lint
1 warning, in .fontprobe.tmp.mjs — untracked leftover from another session,
present before this change, unrelated to it. 0 errors.
```

Not yet verified live in a browser (no Claude-in-Chrome connection this
session) — the button's click → confirm → fetch → empty-state path is
covered by the route test and by reading the component, not by driving it
in a real page.

## Notes / follow-ups

- Nothing has been committed or deployed. This code change plus the earlier
  curation-data change (decisions.json / garment-overrides.json /
  lane-overrides.json / products.json / rejected.json) are both sitting as
  working-tree changes. Tina still needs to say go-ahead to commit + push —
  pushing is also what will make the *current* 189-pending queue on
  production disappear (redeploy wipes the gitignored stores), same
  mechanism as before, now with a button for next time instead of needing
  another redeploy.
- The other session's unrelated changes (`data/brands.ts`,
  `data/exclusions.json`, `data/raw-products.json`,
  `data/translate-brands.json`) are still sitting in this same working
  tree, untouched by this work. Any future commit here needs explicit-path
  staging, not `-A`.
