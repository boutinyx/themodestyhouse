# Product share links weren't picking up on Pinterest — the noindex tag was the blocker

**Date:** 2026-08-17 · **Status:** done

## Goal
Tina: "we have a link creator when you click on the view icon on a product
but i see that some pages like pinterest dont pick up on it when i put in
the link" — the "Copy share link" button in `components/QuickView.tsx`
(the eye icon opens QuickView; the share link points at
`app/product/[brandSlug]/[shopifyId]`), pasted into Pinterest, wasn't
generating a preview/thumbnail.

## Investigation
Confirmed the page's Open Graph tags were present and correct (`og:title`,
`og:description`, `og:image`) and the image itself was a plain, publicly
fetchable Shopify CDN URL (200, `image/jpeg`, no auth wall) — so the usual
Pinterest failure causes (missing OG tags, gated image) weren't it.

`generateMetadata` also set `robots: { index: false, follow: false }` —
deliberate, per the file's own comment: this page carries no scraped
description and is never in the sitemap, so it stays out of search
indexes to avoid repeating the 2026-08-05 thin-content mistake
(`docs/log/2026-08-05-product-pages-and-descriptions.md`). That produces
Next's generic `<meta name="robots" content="noindex, nofollow">`.

Researched whether Pinterest's crawler (Pinterestbot) treats that generic
tag as a blanket "don't crawl me" — documentation is inconsistent on this
point specifically, but the generic `robots` meta name is the ONLY
robots-style directive a non-search crawler (Pinterestbot,
facebookexternalhit, Twitterbot, etc.) would ever read, since none of them
have a reserved name of their own the way Google (`googlebot`) and Bing
(`bingbot`) do. A blanket noindex there risks being read by exactly the
crawlers it was never meant for.

## Fix
Scoped the noindex directive to the two search engines it was actually
meant for, instead of the generic tag:
```ts
robots: { googleBot: { index: false, follow: false } },
other: { bingbot: 'noindex, nofollow' },
```
Next.js only emits the generic `<meta name="robots">` tag when the
top-level `index`/`follow` fields are set (verified by reading
`resolveRobotsValue`/`createMetadataElements` in
`node_modules/next/dist/lib/metadata/`) — omitting them and using
`googleBot` plus a manual `other.bingbot` tag instead means ONLY
`<meta name="googlebot">` and `<meta name="bingbot">` are emitted, which
Google and Bing specifically honour and everyone else — Pinterest
included — has no reason to. This preserves the original goal (kept out
of Google's and Bing's indexes) without collaterally hiding the page from
the one thing it exists to do: be shared.

Also added `og:url` and `og:site_name`, both absent before — not the
reported bug, but standard, cheap hygiene for link-preview reliability
(some validators expect `og:url`).

## Verification
- `npx tsc --noEmit` — clean.
- `npx vitest run --exclude '**/.claude/**'` — 694/694 passing.
- `npx eslint "app/product/[brandSlug]/[shopifyId]/page.tsx"` — clean.
- Real dev server (`next dev`), fetched the actual rendered HTML for a live
  product page: confirmed no generic `<meta name="robots">` tag is
  emitted, `<meta name="googlebot" content="noindex, nofollow">` and
  `<meta name="bingbot" content="noindex, nofollow">` are both present,
  and `og:title`/`og:description`/`og:image`/`og:url`/`og:site_name` are
  all correctly formed.
- Could not verify end-to-end against Pinterest's own crawler directly (no
  Pinterest account/session in this environment) — this fix is based on
  documented, standard practice for "keep a page out of search indexes
  without hiding it from social/link-preview crawlers," not a confirmed
  before/after Pinterest test. If the preview still doesn't appear after
  this ships, the next step is Pinterest's own URL debugger
  (developers.pinterest.com/tools/url-debugger, requires a Pinterest
  account) to see exactly what their crawler reports.

## Notes / follow-ups
- The `notFound()` branch of `generateMetadata` still uses the generic
  `robots: { index: false, follow: false }` — left as-is deliberately,
  since a 404 page has no reason to be crawled or shared by anyone.
- This does not add Pinterest Product Rich Pins (which need
  `og:type="product"` plus price/availability meta and a Pinterest
  approval step) — that's a bigger, separate feature, not what was asked.
  If Tina wants the fuller Pinterest product-card treatment later, that's
  a new task.
