# /creators built as real site pages (staging only)
**Date:** 2026-10-04 · **Status:** done (staging only — off on production by design)

## Goal
Tina chose "Real page in the site" for the agreed creator-shops design: real pages at /creators with
the site's header, menu, footer, product cards and favourites, not a standalone mockup.

## What changed
- `lib/creators.ts` — the three FICTIONAL creators (Layla @laylaelamrani, Amira @ammiri,
  Yasmin @yaszzmi_x), each with three collections of real catalogue ids + a note per pick; `MOMENTS`
  (wedding guest / everyday / abayas / fall layers) and `LATEST`; `creatorsEnabled(host)` =
  not a production host; `resolvePicks()` returns live picks only, in order, as `CardProduct`.
- `components/creators/CreatorParts.tsx` — `requireCreators()` (notFound on production), avatar,
  crumbs, section head, collection card, pick grid (the site's own `ProductCard` + her note).
  `CreatorRail.tsx` — swipe row with arrows for mouse users.
- Pages: `/creators` (hero, Loved by creators, Shop by moment, All creators rail, Latest collections,
  "Be seen by brands" → /contact), `/creators/[creator]`, `/creators/[creator]/[collection]`,
  `/creators/moments/[moment]`. All `force-dynamic` (they read the request host) and
  `robots: noindex`.
- Photos are NOT in public/: they are served from `mockups/creator-shops/` by the host-gated route
  added earlier today, so on production even the image files 404.
- The Follow button is deliberately not a link — the handles are made up and must not send anyone to
  a stranger's account.
- No menu item: the header row is measured to just fit (§10.51); reachable by URL.
- `lib/creators.test.ts` — gate off for both production hostnames (incl. upper case + port), on for
  staging/localhost; every pick id is known to raw (§10.54, so nightly delistings shorten rather than
  fail); slugs unique; moments/latest resolve; photos never from public/.

## Verification
- `npx vitest run lib/creators.test.ts lib/mockupRoute.test.ts`: 8 passed. Negative control: gate
  forced on → "is off on the production domain" FAILS; restored → passes.
- `npx tsc --noEmit` exit 0; eslint `--max-warnings 0` on all new files: clean.
- `npm run build`: the four routes build as ƒ (dynamic).
- `next start` locally: all four pages 200; with `Host: themodestyhouse.com` every page AND
  `/mockups/creator-shops/layla.jpg` → 404; unknown creator → 404.
- Playwright at 1440 and 390 on all four pages: 0 broken images, 0 horizontal overflow, 0 console
  errors; screenshots inspected.
- `npm test`: 1340 passed, 2 failed — the same two pre-existing catalogue-data tests noted in
  `2026-10-04-creator-shops-mockup-on-staging.md`, unrelated.

## Notes / follow-ups
- Before this is ever enabled on production: replace the fictional records with real creators (their
  consent, words, photos), move photos into public/ with variants, flip `creatorsEnabled`, add to the
  sitemap and decide where it lives in the nav.
- Mistake caught in my own verification: a zsh loop variable named `path` overwrote PATH and every
  curl "failed". Renamed; same family as §10.48.
