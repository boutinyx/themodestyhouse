# Try Modest: add the designers-page description, seal it verified
**Date:** 2026-10-02 · **Status:** done

## Goal
Tina, pointing at a screenshot of `/designers/try-modest`: "we are missing
the txt here and remove the claim your page and give them a verified
button."

## What changed
- `data/brands.ts`: `try-modest` gets `badge: 'verified'` and a real
  `description`, drawn from Farheen's own questionnaire reply (same
  source material as the Ghost founder post, never invented per
  CLAUDE.md §10.18) plus measured facts from the actual catalogue:
  garment breakdown (116/273 abayas, the largest category), median price
  ($71.28, range $12.54–$158.40). The "sealed for" line is her own stated
  shipping/duties policy (free shipping, no minimum, 20+ countries,
  duties absorbed for US/Canada/much of Europe) — a real, checkable
  commitment, not marketing copy.
- `app/designers/[slug]/page.tsx`: the "Is this your house? Claim this
  page" block now only renders when `!brand.badge`. A badged house shows
  the same Sparkle-icon "Verified"/"Editor's Pick" chip the `/designers`
  index's vetted row already uses, instead. This is a GLOBAL page-template
  fix, not a try-modest-only carve-out — every already-badged house
  (veiled, aab, summer-evenings, inayah, glow-modesty) was showing "Claim
  this page" on its own page too, which never made sense once a house is
  verified. Checked this is the right call rather than scope creep: the
  underlying ask ("verified houses shouldn't be asked to claim their own
  page") is a general rule, not specific to one brand.

## Verification
- `npx tsc --noEmit` and `npx eslint` clean on both changed files.
- `npx vitest run`: 1330 passed, 1 pre-existing unrelated failure
  (confirmed earlier this session, unrelated to this change).
- `npm run build:data` after the brands.ts edit: correctly a no-op
  (`description`/`badge` aren't part of the product pipeline, read
  directly from `BRANDS` at render time) — confirmed via `git status`
  that nothing in `data/` besides `brands.ts` changed.
- Playwright against a real dev build, both `/designers/try-modest` and
  `/designers/veiled` (an existing verified house): no horizontal
  overflow, "Claim this page" absent, "Verified" badge present, on both.
  Screenshotted try-modest's page directly — description renders above
  the measured facts, brass Sparkle "VERIFIED" chip sits where the claim
  link used to.
- `npm run build` clean, 144 routes.
