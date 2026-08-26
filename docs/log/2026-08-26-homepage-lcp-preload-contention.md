# Homepage LCP: four below-fold images were preloaded ahead of the hero
**Date:** 2026-08-26 · **Status:** done

## Goal
Tina: *"we really need to do something about the caching because it takes a
gazillion years for it to load the website. maybe cloudflare cdn?"*

Investigate before implementing (§1). This entry covers the **image half** of
what was found. The caching half is a separate piece of work — see
`docs/log/2026-08-26-cloudflare-html-caching.md`.

## What was measured

Production, Playwright + CDP, iPhone-sized viewport (390x844, DPR 3), throttled
to 9 Mbps / 40 ms RTT with a 4x CPU slowdown — i.e. a mid-range phone on decent
mobile data, not this laptop on fibre.

| | `/` | `/directory` |
|---|---|---|
| TTFB | 688 ms | 586 ms |
| **LCP** | **3956 ms** | 1116 ms |
| HTML transferred / decoded | 38 KB / 442 KB | 675 KB / **2.56 MB** |
| total page weight | **3.49 MB across 61 requests** | — |

The homepage LCP element is `/hero-home-mobile-1290.webp` (376 KB), and it took
**3.0 s to download**. The server was not the problem: the document was complete
at 821 ms.

## Root cause

`<link rel="preload" as="image">` for four images that are nowhere near the fold:

```
/category/dresses-2-*.webp
/category/coord-sets-2-*.webp
/category/skirts-3-*.webp
/editorial/mirror-selfie-abayas-4-*.webp   (262 KB)
```

Nothing in this repo renders a preload tag — `grep -rn preload app/ components/
lib/` returns nothing. **React 19 hoists an eager `<img>` from the SSR shell
into a `<head>` preload by itself.** So "no `loading` attribute" does not mean
"normal priority"; it means "fetched at high priority before the parser reaches
the body".

Where those four images actually sit, measured on the live page:

| image | y (390px phone, fold 844) | y (1440 desktop, fold 900) |
|---|---|---|
| `dresses-2` | 3012 | 4238 |
| `coord-sets-2` | 3012 | 4238 |
| `skirts-3` | 3350 | 4179 |
| `mirror-selfie-abayas-4` | 5420 | 7270 |

They were competing with the LCP hero for a 9 Mbps pipe, alongside
`edit-lace-hero-mobile-v2-1170.webp` (516 KB) and
`edit-jersey-hero-mobile-1170.webp` (211 KB).

The category tiles were `loading={i < 3 ? undefined : 'lazy'}` — the standard
"never lazy-load the first row" habit. That rule is correct when the row is at
the top of the **document**. This row is 3000 px down it.

## What changed

- `app/page.tsx` — all six `CATEGORY_SHOWCASE` tiles are now `loading="lazy"`;
  the `i` index is no longer needed and was dropped from the `.map()`.
- `app/page.tsx` — the `feature.image` editorial card is now `loading="lazy"`.

Both carry a comment recording the measured y-position, so the next person to
reach for "don't lazy the first row" sees why it does not apply here.

## Verification

```
$ npx tsc --noEmit            # exit 0
$ npm run lint                # exit 0
$ npm test                    # Test Files 48 passed (48) · Tests 791 passed (791)
```

Staging verification of the before/after LCP is recorded below once deployed.

## Notes / follow-ups

- **Cloudflare was already in front of the site.** `server: cloudflare` +
  `cf-ray` on every response, and images come back `cf-cache-status:
  REVALIDATED` with `cache-control: public, max-age=14400`. Adding a CDN is not
  the fix; the CDN is there and is caching images correctly. What it is not
  allowed to cache is HTML — separate entry.
- Still open, not addressed here: `/directory` ships **2.56 MB of decoded HTML**
  (675 KB brotli) and takes 1.8 s just to download the document on the same
  connection. That is the columnar payload of ~20k rows (CLAUDE.md §8) and
  needs an editorial decision about how much of the catalogue a single page
  should carry.
- Also unaddressed: `edit-lace-hero-mobile-v2-1170.webp` is **516 KB**, the
  largest single asset on the homepage, larger than the hero it sits below.
