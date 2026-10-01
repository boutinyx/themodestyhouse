# Draft "Meet Farheen, the Founder Behind Try Modest" in Ghost
**Date:** 2026-10-01 · **Status:** partial (draft only, not published)

## Goal
Turn Farheen's (Try Modest) written questionnaire answers into a blog
feature post and get it into Ghost, per Tina: "make a blog post for try
modest and put it in ghost."

## What changed
Added `scripts/ghost-draft-try-modest-founder.mjs`, modelled directly on
`scripts/ghost-draft-maison-merrachi.mjs` (same draft-only pattern — Tina
reviews and publishes herself). Ran it once; created post
`meet-farheen-try-modest-founder` in Ghost, `status: draft`.

The post condenses Farheen's 7-question reply (~1,800 words as sent) to
~350 words — per [[feedback_editorial-length]], editorial content on this
site stays short, and the shorter precedent post already outranks the
longer one. Kept only the verbatim quotes and concrete specifics: the
founding prayer, the Afraa Co-Ord Set, the Shahadah and Aalimah-graduation
customer stories, the parents'-duas thread tying back to the opening.
Dropped the trend opinions, the full "hardest part" answer, and the fun
facts beyond one line — all real in her reply, none invented here.

Two deliberate gaps, both because the real material doesn't exist yet:
- **No cover image.** Farheen offered to send photos in her reply but
  hasn't yet; nothing in `public/editorial/` is hers. Shipping a stock or
  AI image here would be exactly the §10.18 mistake (inventing what should
  be real) — added a code comment flagging it instead.
- **Brand name links to `trymodest.com`, not `/designers/try-modest`.**
  Try Modest isn't in `data/brands.ts` — onboarding isn't paid/complete per
  the `/partner-with-us` flow — so that internal route doesn't exist.

## Verification
Fetched the post back via the Admin API after creation: `status: draft`,
title/slug/excerpt match, `html.length` 2464, tags `[]` (so it falls back
to Ghost's own "Story" category per `lib/ghost.ts:100`, which fits a
founder profile better than forcing it under "Guides"). Spot-checked the
rendered HTML — the first markdown link and bold lead-in converted
correctly.

## Notes / follow-ups
- Not published. Tina reviews in Ghost's editor:
  `https://cms.themodestyhouse.com/ghost/#/editor/post/6abe6537b4f0b200019e38b5`
- Before publishing: add a real Try Modest photo as the feature image, and
  once/if they're onboarded, swap the `trymodest.com` link for an internal
  `/designers/try-modest` link.
