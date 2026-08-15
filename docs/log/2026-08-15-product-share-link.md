# Shareable product link (noindex product pages)
**Date:** 2026-08-15 · **Status:** done

## Goal
Tina: "when i want to share the product via my own website i cant because it immideaty
goes to the companies website... make when you make the screen bigger a shareable link or
something." Every path to a product (the product-card anchor, quick-view's "Shop at
{brand}") leaves the site immediately — there was no URL on themodestyhouse.com that
addressed a single product to share.

This overlaps a feature built and deliberately reverted on 2026-08-05
(`docs/log/2026-08-05-product-pages-and-descriptions.md`) — not for technical reasons, but
because mass-submitting ~7,700 pages of verbatim brand-copy descriptions to Google Search
Console risked burying real problems in thin-content noise. Researched that history first
(Explore agent) rather than repeating it blindly, then confirmed the approach with Tina
before building: no scraped description, page marked `noindex,nofollow`, never added to the
sitemap — a real working link, invisible to search engines.

## What changed
- `app/product/[brandSlug]/[shopifyId]/page.tsx` — new dynamic route, **no
  `generateStaticParams`** (rendered on demand, same reasoning the reverted attempt used to
  keep `npm run build`'s route count from exploding). Looks up the product via
  `getProducts()` by reconstructing `id = ${brandSlug}:${shopifyId}` — no new field added to
  `Product` (Invariant 15: a new field costs size × every row × every grid render; this
  needed none). Renders image/brand/title/price/outbound link only — no description, same
  omission that avoids the 2026-08-05 problem entirely. `generateMetadata` sets
  `robots: { index: false, follow: false }`.
- `lib/schema.ts` — exported the existing `SITE_URL` constant instead of duplicating it.
- `components/QuickView.tsx` — new "Copy share link" button next to "Shop at {brand}",
  `hidden md:inline-flex` (desktop-only, per Tina's "when you make the screen bigger" —
  matches the modal's existing `md:grid-cols-2` split, which already has empty space on
  wider screens and none on mobile). Copies
  `${SITE_URL}/product/${brandSlug}/${shopifyId}` to the clipboard, 2s "Link copied"
  confirmation, falls back to showing the raw URL as text if `navigator.clipboard` fails.

## Verification
- `npx tsc --noEmit` and `npm run lint` clean on all changed/new files.
- `npx vitest run --exclude '.claude/**'`: 653/653 passing (no new tests added — confirmed
  first that this codebase has **no existing precedent** for testing `app/**/page.tsx` or
  `components/*.tsx` files, only `lib/` and `app/api/**/route.ts`; adding a new test
  paradigm for one page would be inconsistent with the rest of the suite).
- `npm run build`: new route listed as `ƒ /product/[brandSlug]/[shopifyId]` (dynamic,
  on-demand) — confirmed no static-generation explosion.
- **Real end-to-end verification** against a `next start` production build, not mocks:
  - Real product → `200`, correct `<title>`, `<meta name="robots" content="noindex,
    nofollow">`, correct title/brand/price rendered, outbound anchor with the product's real
    URL and `rel="noopener noreferrer sponsored"`.
  - Unknown shopify id → `404`. Unknown brand slug → `404`.
  - `curl /sitemap.xml | grep -c "/product/"` → `0`, confirmed absent.
  - Server stopped and port freed afterward.
- Browser-extension click-through of the "Copy share link" button wasn't possible (Chrome
  extension not connected this session) — verified by code review instead: the URL
  construction matches the route's own lookup logic exactly (`brandSlug` +
  `id.slice(brandSlug.length + 1)` on both sides), and the desktop-only class mirrors the
  modal's existing, already-working `md:grid-cols-2` breakpoint.

## Notes / follow-ups
- No product JSON-LD added — `lib/schema.ts`'s own header comment says that's deliberately
  held off pending a separate price-freshness decision (`docs/launch-readiness.md`),
  unrelated to this work and not reopened here.
- No change to `lib/pulse.ts` outbound-click tracking — a clipboard copy never leaves the
  browser, so it isn't an "outbound" event and needed no new tracked property.
