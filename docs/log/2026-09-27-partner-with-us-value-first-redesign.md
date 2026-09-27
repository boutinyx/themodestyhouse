# /partner-with-us — lead with value, real screenshots, de-emphasize price
**Date:** 2026-09-27 · **Status:** done

## Goal
Tina's feedback on the first version: the $99 sat right up front and felt like it would
make people bounce; the copy didn't convey "you'll be sitting alongside brands you
already know"; the SEO/backlink and Instagram-trust angles weren't spelled out; no
fallback for a brand with no affiliate program; and she wanted actual pictures of what
being featured looks like, not just bullet text. She asked me to research how SaaS
onboarding/pricing pages actually handle this, since she's never built one before.

## Research
Two searches (SaaS pricing-page best practices 2026; B2B landing-page social proof).
Consistent findings: buyers want "is this worth it" answered before they see a number —
a bare price up front is what causes bounce; logos/named customers above the fold add
instant credibility; testimonials/proof work best placed right before the CTA, not
scattered. Applied directly: reordered the page to value-first, price-last-before-the-ask,
and used real named houses instead of generic claims.

## What changed
`app/partner-with-us/page.tsx`, plus two new images:
- Reordered: intro -> five value features -> price card -> "what we need from you" ->
  form. Price card shrunk (text-4xl, was text-6xl), reframed "To get all of the above",
  with an explicit "No subscription, nothing recurring" line.
- Rewrote the five deliverables as FOMO/trust-framed features: "You won't be listed
  alone" (names real, currently-listed, verified houses — Aab, Inayah, AbayaButh, all
  confirmed live in `data/brands.ts`), "A real page, not a listing", "A backlink that
  helps you rank" (SEO angle, wasn't stated before), "An Instagram post people actually
  engage with" (trust/understanding framing, not just "a feature"), "Commission on
  everything above" (added a fallback: no affiliate program yet -> suggest UpPromote/
  Refersion via Shopify).
- Two features carry a REAL screenshot instead of description: `/designers/aab` and
  `/designers` captured live from production via Playwright, cropped, saved as
  `public/partner-preview-designers.jpg` / `public/partner-preview-grid.jpg`. Deliberately
  NOT a fabricated mockup of the applicant's own hypothetical page — showing the real
  thing is both more honest and more persuasive than inventing one (§10.18).
  These sit outside `public/editorial/` and `public/about/`, the only two directories
  `lib/staticImage.test.ts` scans for generated WebP variants, so a plain `<img>` (with
  explicit width/height) is correct here and doesn't need `scripts/optimise-images.mjs`.

## Verification
- `npx tsc --noEmit` — clean.
- `npx eslint app/partner-with-us/page.tsx` — 0 problems.
- `npx vitest run lib/staticImage.test.ts` — 48 passed, confirming the two new
  public/ images (outside the scanned folders) don't trip the variant-on-disk guard.
- Rendered full-page in Playwright at 1280x900 (laptop width) and reviewed both halves —
  screenshots render inline, side-by-side grid holds, price card reads as secondary to
  the value section above it.
- Pushed to `staging` (`08282c4`), confirmed with
  `git merge-base --is-ancestor HEAD origin/staging`.

## Notes / follow-ups
- Still flagged, not resolved (carried from 2026-09-26's entry): `/brand-terms` says
  "placement is not for sale" — this page's fee is scoped as onboarding work + content,
  not the editorial decision, but the wording isn't reconciled between the two pages yet.
- If Aab or Inayah are ever cut from the directory, the "You won't be listed alone"
  copy names them specifically and needs updating in the same change.
