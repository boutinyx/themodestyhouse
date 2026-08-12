# Permanent photo-quality safeguards
**Date:** 2026-08-12 · **Status:** done (surfacing + review UI); image-health scan running

## Goal
Tina: "fix this shit so it doesn't happen again" — after finding a $5.95 skirt listing
showing floral note cards (a Shopify CDN glitch on `lameera-moda`'s side), she was clear she
didn't want an apology, she wanted the class of problem closed, not just the one instance.

## What was actually true
The specific listing's own tags already included `"retakephotos"` and
`"RECOUNTFORONLINESALE"` — the merchant had already flagged it. Nothing in the pipeline read
that signal. That's the real gap: not "we missed one image," but "a signal that already
existed was never being surfaced."

## What changed — two independent, complementary layers

**1. Surface merchant self-flagged quality tags (built, tested, live in the pipeline)**
- `lib/qualityFlags.ts` — detects tags like `retakephotos`, `reshoot`, `draft`,
  `needsphoto`. Measured against the full corpus: **16 currently-published products across
  3 brands** carry one (aab's `reshoot_spring_26` × 6, zahraa's `Draft-26` × 1,
  lameera-moda's `retakephotos` × 9 beyond the one already removed).
- `scripts/build-data.mjs` — every publish now pushes these into `review.json`
  (`why: 'brand-flagged-photo-issue'`). **Informational only** — does not hold the product
  back. Checked 9 of lameera-moda's 10 `retakephotos` items by hand: 9 were correct photos.
  Blocking on the tag alone would hide good inventory for no reason; the point is making the
  *rare* bad one findable, not treating every flag as broken.
- New dev-only `/admin/photo-review` page: shows the actual image inline (not just a
  title — the whole point is being able to see whether it's actually wrong), with two real
  actions — "Looks fine" (`data/photo-review-decisions.json`, never re-surfaced) or "Broken —
  remove" (writes straight to `data/exclusions.json`, same permanent mechanism as every
  other removal tonight).
- Smoke-tested with Playwright against a real dev server, not curl: seeded a fake flagged
  item, confirmed the image renders, clicked "Looks fine", confirmed both the UI updated and
  the real API call landed in `photo-review-decisions.json`.

**2. Image health check (built; full-catalogue run in progress)**
- `scripts/check-images.mjs` — fetches every published product's image URL (partial-range
  request, not a full download) and flags anything that isn't a real, loading image:
  non-200 status, wrong content-type, timeout, connection failure. Writes
  `data/image-check-report.json`.
- **Explicitly does NOT catch what actually happened here** — the broken image returned a
  valid `200` and a valid `image/jpeg` content-type; it was semantically wrong (cards
  instead of a skirt), not technically broken. This is a different, complementary net:
  layer 1 catches "the merchant told us," layer 2 catches "the URL is dead," and there is
  still a real gap in between (a technically-valid image showing the wrong *content*) that
  neither layer closes. Said so plainly rather than overclaiming coverage.
- Full run over ~23,000 images started in the background; will report real counts once
  complete rather than guess.

## An unrelated finding, deliberately not touched
`npm run verify:gate` currently fails on `origin/main` — but the failure is entirely from
another session's new `/staff/curate` feature (commit `5a538f2`, already pushed), whose
component `StaffCurateClient.tsx` trips the gate's `CurateClient`/`Curate — tap` leak-check
needles (plausibly because it was built starting from the old dev-only `CurateClient.dev.tsx`
as a template — the literal old UI copy shows up in their new component too). Confirmed this
session's own new code (`PhotoReviewClient`, `dismissPhotoReview`, `excludeProduct`) is NOT
implicated: grepped `.next/server` and `.next/static` directly for those exact strings after
a full `npm run build` — zero hits, and `/admin/photo-review` is correctly absent from both
route manifests. Flagging this rather than fixing someone else's in-progress, already-pushed
feature myself.

## Verification
```
$ rm tsconfig.tsbuildinfo && npx tsc --noEmit    (clean)
$ npx vitest run                                  561/561 passing
$ npm run build:data                              review 168 -> 184, no guard trip
$ npm run build                                    clean (33 routes)
```
`npm run verify:gate` was run and its 5 failures were individually confirmed to be the
unrelated `/staff/curate` issue above, not this session's code — see that section.

## Not done
- The image-health scan (`scripts/check-images.mjs`) was still running in the background
  when this entry was written — real counts to follow in a subsequent log entry, not
  guessed here.
- No automated defense exists yet against "technically valid image, wrong content" — the
  exact failure mode that caused this whole investigation. Closing that gap fully would need
  either periodic visual/vision-based spot-checking (expensive at ~23k images, not something
  that can run on every publish) or treating merchant quality-flag tags as the primary signal
  and accepting that an *unflagged* semantic mismatch can still slip through undetected
  between human reviews.
