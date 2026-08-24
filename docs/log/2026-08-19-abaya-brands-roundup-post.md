# First "best abaya brands" roundup post + Markdown bold-link bug fix
**Date:** 2026-08-19 · **Status:** done

## Goal
Tina approved the first of a "best X brands" roundup series (the query family a curated
directory is structurally qualified to win, per the marketing-audit content-gap finding —
existing posts named zero catalogue brands). Start with abayas: deepest category, 5,213
in-stock pieces across 91 houses.

## What changed
- **`content/editorial/best-abaya-brands-price-tiers.md`** — new post, 752 words. Computed
  fresh from `data/products.json` + `data/fx-rates.json` (not from any prior "fact pack" —
  none was present in this session's context, so it was rebuilt from scratch):
  - 5,213 in-stock abaya listings across 91 brands, medians converted to USD via the live
    fx table.
  - Checked whether "abayas are three separate markets" (a framing carried over from
    Tina's message) actually holds. It doesn't, cleanly — a full item-level histogram is a
    single long-tail decay, not trimodal. What IS real and verifiable: sorting all 91
    brand medians finds exactly one hard gap, $231 → $295, with zero brand medians inside
    it; 84 brands sit continuously below it, 7 sit clustered above it ($295–$517). Wrote
    the piece around that two-tier reality instead of forcing an unsupported third
    division — used three price *bands* as a reading structure but said explicitly, in
    copy, that only the top boundary is a real market gap.
  - 15 houses, 5 per band, picked for volume + price spread within each band, each with
    one specific real product (title, price, live URL) pulled from `data/products.json`
    near that brand's own median — not the cheapest/priciest cherry-pick.
  - No cover image: no existing `public/editorial/` asset matched the subject, and
    generating one was out of scope for this pass — flagged to Tina rather than reusing an
    unrelated photo or fabricating a path.
- **`components/Markdown.tsx`** — two fixes, found live-testing the new post:
  1. External links (`[text](https://...)`) were missing the `sponsored` rel token that
     every other outbound-link component in the codebase carries (`ProductCard`,
     `QuickView`, `BrandCard`, `EditorsRail`, `VerifiedSpotlight`, `BrandMarquee`,
     `/designers`, `/product/[brandSlug]/[shopifyId]`) — CLAUDE.md §6 requires it site-wide
     ("an FTC/SEO requirement, not decoration"). This post alone adds 15 outbound brand
     links, so the gap was no longer theoretical.
  2. `**[Brand Name](url)**` (bold-wrapped link, used for all 15 house names in the post)
     rendered as literal bracket text — the generic `\*\*[^*]+\*\*` bold rule matched the
     whole span first (`[^*]+` doesn't exclude `[`/`]`/`(`/`)`), so the link syntax inside
     was never interpreted, only wrapped in a `<strong>` as plain text. Added a bold-link
     alternative ahead of the plain bold rule in the split regex, matching the file's own
     stated policy ("deliberately small — extended only as real content needed it").

## Verification
- `npx tsc --noEmit` — clean.
- `npm run lint` — clean (`eslint --max-warnings 0`).
- `npx tsx -e "getPost('best-abaya-brands-price-tiers')"` — parses, found, 752 words.
- `app/sitemap.ts` already maps `getPosts()` — new post picked up with no further change.
- Rendered with Playwright against `next dev`:
  - Before the `Markdown.tsx` fix: all 15 bold brand-name links showed as raw
    `[Text](url)` text — screenshotted and confirmed via
    `document.querySelectorAll('article a')`, which returned only 17 anchors (the 15
    plain product links + the 2 lane links) where 32 were expected.
  - After the fix: same query returns all 32 anchors; spot-checked `rel`/`target` on the
    first several — every external one carries `target="_blank" rel="noopener noreferrer
    sponsored"`.
  - Footer's Editorial column lists the new post title, confirming `getPosts()` picks it
    up outside the direct-URL test too.

## Notes / follow-ups
- No cover image yet — Tina may want one generated (Higgsfield pipeline) or picked from
  an existing shoot.
- This establishes the format for the next two roundups Tina named (best abayas is done;
  swimwear and under-$100 are queued). The two-tier finding here (one real gap, not three)
  is specific to abayas — re-derive price segmentation per category rather than reusing
  this post's band cutoffs.
- The `Markdown.tsx` bold-link bug would have hit `content/legal/*.md` too if either legal
  page used that pattern — grepped, neither does, so no other page was silently broken by
  it.
