# Draft "Inside Fajr Noor" in Ghost
**Date:** 2026-10-14 · **Status:** partial (draft only, not published)

## Goal
Tina: "can we make the blog post already", after the Fajr Noor team (Osman, manager) sent their
questionnaire answers and paid the $99 invoice.

## What changed
`scripts/ghost-draft-fajr-noor-feature.mjs`, same draft-only pattern as the Try Modest founder
post. Ran once and created `inside-fajr-noor` in Ghost with `status: draft`.

- 351 words ([[feedback_editorial-length]]). Every quote is the team's own wording.
- **Their conditions are kept.** The post is about the brand and credited to "the Fajr Noor
  team", with no founder name and no portrait.
- Links: fajrnoor.com, plus their three requested pages: abayas, hijabs, khatijah-abayas. All
  returned 200 on 2026-10-14.
- "twelve colours" was counted from `/collections/khatijah-abayas/products.json` (12 products).
- Their "the desert" is quoted as "the dessert", which is what they meant.

## Verification
- Admin API read-back: `status: draft`, and the 4 hrefs are exactly the requested URLs.
- `https://themodestyhouse.com/editorial/inside-fajr-noor` returns 404, so the post is not public.

## Notes / follow-ups
- Editor: https://cms.themodestyhouse.com/ghost/#/editor/post/6acf9f5ab4f0b200019e397a
- **No cover image.** They asked for illustrations instead of a portrait, and none exist yet.
- **Followed link, open question.** They asked for "a standard, followed link". Our renderer
  adds `rel="sponsored"` to every outbound link (`components/GhostHtml.tsx`, CLAUDE.md §6).
  This feature is part of a paid package, and Google's guidelines say paid links should carry
  `sponsored`, so leaving it is the safe default. Tina decides.
- Fajr Noor is not in `data/brands.ts` yet. Once it is onboarded, add a
  `/designers/fajr-noor` link.

## Rewrite (same day)
Tina said the first version didn't pull her in the way the Try Modest feature does. Rewritten as
a single story with no bold Q&A labels:
- It opens on the name ("the light of dawn") and the question the team started from.
- It closes back on the dawn.
- New title: "Meet Fajr Noor, the Brand That Puts Faith First".
- About 450 words.
- The script now updates the draft in place and refuses to touch a post that isn't a draft.

**Framing of ours, not theirs:** the Khatijah paragraph says Khadijah (RA) ran a trading business
and was the first to believe. That is historical fact, but the team didn't say it, so Tina should
approve it.
Read-back after the update: still `draft`, and the same 4 hrefs.
