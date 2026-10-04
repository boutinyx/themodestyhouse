# Creator-shops mockup served on staging (host-gated, never on production)
**Date:** 2026-10-04 · **Status:** done (staging only)

## Goal
Tina: "push to staging" — make the agreed creator-shops mockup viewable on the staging URL (phone,
sharing), without building the real feature yet.

## The constraint
The mockup shows three FICTIONAL creators (AI-generated people, made-up handles: @laylaelamrani,
@ammiri, @yaszzmi_x). `staging` is fast-forwarded into `main`, so anything committed reaches the
production build. Putting it in `public/` would publish fake creators on themodestyhouse.com at the
next merge.

## What changed
- `mockups/creator-shops/` (repo root, NOT public/): the page (`index.html`, from
  `.mockups/creator-edits/shopmy.html`), `shelves.js` (real catalogue rows), fonts, logo, hero PNG
  (Tina's original, lossless), three persona photos as JPEG q92, and a self-hosted copy of
  @phosphor-icons/web 2.1.1 regular + fill (unpkg is blocked by the site CSP's script-src/font-src).
  `<base href="/mockups/creator-shops/">` so relative assets resolve without a trailing slash.
- `app/mockups/creator-shops/[[...path]]/route.ts`: serves those files; **404 on any production host**
  via `isProductionHost()` (same request-host rule as robots.ts / X-Robots-Tag), path-traversal
  guard, extension allowlist, `x-robots-tag: noindex`, `cache-control: no-store`.
- `lib/mockupRoute.test.ts`: production host → 404 (both hostnames), staging host → 200 HTML + asset,
  `../../package.json` and `../../.env` → 404.

## Verification
- `npx vitest run lib/mockupRoute.test.ts`: 3 passed. **Negative control:** with the host check
  disabled, "404s on the production domain" FAILS; restored → 3 passed.
- `npx tsc --noEmit`: exit 0. eslint on the new files: clean.
- `npm test`: 1335 passed, 2 failed — `colourLeads.test.ts` and `unavailableProducts.test.ts`. Both
  fail identically on a clean worktree of `staging` HEAD without these files, so they pre-date this
  change: catalogue-data assertions that went stale when the refresh unfroze on 2026-10-02
  (+1427/-1361). Not fixed here.
- Staging check after deploy: see below.

## Notes / follow-ups
- When the real feature is built, delete `mockups/` and this route together.
- The two stale data tests above need a separate fix (likely just refreshing the two data files).
