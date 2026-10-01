# Merge /partner-with-us staging work to main
**Date:** 2026-10-01 · **Status:** done

## Goal
Ship the accumulated `/partner-with-us` session (FAQ copy fixes, the
Blog post FAQ, the horizontal price-split section, the stats band's
countries-not-currencies swap, the locked-Subject contact form, and the
"Let's talk" dialog's background/layout iterations) from `staging` to
`main`, per CLAUDE.md's staging-first protocol. Tina: "You can push
through main, like all the changes we did."

## What changed
67 commits, `staging` → `main`, fast-forward (`e525217..7739db4`, via an
intermediate `122829c` already on `main` from a concurrent session).
Touches `app/partner-with-us/page.tsx`, `app/about/page.tsx`,
`components/ContactForm.tsx`, `components/PartnerInterestDialog.tsx`,
`lib/aboutStats.ts` (+ test), four `public/partner-preview-*.jpg`
screenshots, and the `PartnerFAQTabs` / `PartnerFeatureAccordion` /
`PartnerFAQNumbered` components built and compared along the way.

## Verification
Before merging: fresh `rm tsconfig.tsbuildinfo && npx tsc --noEmit` —
clean. `npx eslint app components lib scripts` (scoped past the
untracked `videos/tmh-3d-lottie-test/vendor/three.*.js` vendor files,
which aren't covered by `eslint.config.mjs`'s ignore list and are the
entire reason `npm run lint` reported 3899 problems — same shape as the
documented `.venv-style/` landmine, not a regression) — 0 errors, 1
pre-existing unrelated warning. `npx vitest run` — 1327 passed, 1
failed (`lib/colourLeads.test.ts`, a stale `lameera-moda` product id in
`data/colour-leads.json`), confirmed byte-identical on `origin/main`
before the merge too (`diff` against both the test file and the data
file), so not something this merge introduced. `npm run build` — 144
routes, exit 0, `/partner-with-us` present.

`git fetch` immediately before cutting the merge: `origin/main` was 0
commits behind `origin/staging` both times (once before the pre-merge
verification pass, once again right before the actual `checkout
main`), so a plain `git merge --ff-only staging` was safe.
`git merge-base --is-ancestor HEAD origin/main` after push confirmed
the ancestor relationship.

## Notes / follow-ups
- `lib/colourLeads.test.ts`'s `lameera-moda:8791781867688` failure is
  pre-existing catalogue drift, unrelated to this merge — worth fixing
  separately but out of scope here.
- `/partner-with-us` is `noindex`/unlinked, so Cloudflare's HTML cache
  staying warm for up to an hour isn't urgent — flagged to Tina rather
  than purged unprompted.
