# Cover image for the abaya brands roundup post
**Date:** 2026-08-19 · **Status:** done

## Goal
`content/editorial/best-abaya-brands-price-tiers.md` shipped with no cover image
(flagged as a follow-up in `docs/log/2026-08-19-abaya-brands-roundup-post.md`). Tina
supplied a photo to use.

## What changed
- **`public/editorial/mirror-selfie-abayas.jpg`** — new original (1672x941), converted
  from the PNG Tina provided.
- **`public/editorial/mirror-selfie-abayas-{400,900}.webp`** — generated via
  `node scripts/optimise-images.mjs` (451KB → 15KB / 54KB).
- **`content/editorial/best-abaya-brands-price-tiers.md`** — added `image` and
  `imageAlt` frontmatter fields, matching the convention in the other two editorial
  posts (`lib/posts.ts`, `lib/staticImage.ts`).

## Verification
- `npx tsc --noEmit` — clean.
- `npm run lint` — clean.
- `npx vitest run lib/staticImage.test.ts` — 56/56 passed (asserts every original in
  `public/editorial/` has both webp widths on disk).
- `getPost('best-abaya-brands-price-tiers')` — returns the new `image`/`imageAlt`.
- `next dev` + `curl`: `/editorial/best-abaya-brands-price-tiers` returns 200 and the
  rendered HTML's `srcset`/OG/schema all reference `mirror-selfie-abayas.jpg`.

## Notes / follow-ups
None.
