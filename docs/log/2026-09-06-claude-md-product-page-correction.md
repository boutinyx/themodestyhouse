# CLAUDE.md §8 said products have no detail page — they have had one since 2026-08-15

**Date:** 2026-09-06 · **Status:** done

## Goal

Tina asked for the catalogue links to three garments in two of her own flat-lays, then
clarified: *"i mean on our website"*. Answering that required knowing whether a product
has a URL on themodestyhouse.com. CLAUDE.md §8 said flatly that it does not.

## What was stale

The §8 landmine read *"Products have no detail page and no description. … Either way no
product text of ours is indexable — there is no page of ours describing the product."*

`app/product/[brandSlug]/[shopifyId]/page.tsx` has existed since **2026-08-15**
(`94cb411`, *"feat: shareable product link, noindex"*) — three weeks before that line was
last relied upon. The "no description" half is still true; the "no detail page" half has
been false the whole time.

## What is actually true, verified live on production today

- `https://themodestyhouse.com/product/nihan/15000506827115` renders. 15 links sampled
  across brands from the 960 now in use: 15 live, 0 failed.
- Not in `app/sitemap.ts`. No `generateStaticParams` — rendered on demand, so the build's
  route count does not become one per product. No scraped description. Those three are
  what keep it clear of the 2026-08-05 thin-content revert.
- **The noindex is bot-scoped on purpose.** It emits `<meta name="googlebot">` and
  `<meta name="bingbot">` = `noindex, nofollow` and deliberately NOT the generic
  `<meta name="robots">`, because Tina found on 2026-08-17 that Pinterest would not render
  a preview for a pasted share link — link-preview crawlers have no reserved directive
  name, so the generic tag is the only one they read.
- Its only in-product link is `QuickView`'s desktop-only "Copy share link"
  (`components/QuickView.tsx:129`).

**The trap worth keeping:** my own production check looked for `<meta name="robots">`,
found none, and printed `robots: -`. Read naively that says the page is indexable. It is
not — the directives are under the bot-specific names. A checker that greps for the
generic tag will draw exactly the wrong conclusion about this route.

## What changed

`CLAUDE.md` §8 only — the bullet is struck through and replaced with the verified state,
in the house style for a corrected landmine. Per §10.19 the rest of the file was grepped
for anything else reasoning from "no product page"; the only other hit is Invariant 16's
reference to the 2026-08-05 log, which is about bulk text on `Product` and is unaffected.

**Note on where the edit lives.** `CLAUDE.md` is listed in `.git/info/exclude` under
*"Local-only working notes — never committed, never shared"*, alongside `HANDBOOK.md` and
`.claude/`. It has never been committed on any branch and is not on `origin/main`. That is
deliberate and was left alone — but it means this correction, and the whole 178 KB mistakes
log, exist on exactly one disk with no history. Raised with Tina rather than changed.

## Verification

```
grep -n "robots" app/product/[brandSlug]/[shopifyId]/page.tsx   -> googleBot + other.bingbot
grep -n "product" app/sitemap.ts                                -> no route entry
git log --diff-filter=A -- app/product                          -> 94cb411, 2026-08-15
curl https://themodestyhouse.com/product/nihan/15000506827115    -> googlebot: noindex, nofollow
                                                                    bingbot:   noindex, nofollow
```

## Notes / follow-ups

- **Proposal, not applied:** Invariant 16 says bulk text, if it ever returns, "belong[s] in
  a sidecar read only by the page that needs them". That page now exists. A one-line
  cross-reference there would make the invariant actionable, but it is part of the working
  agreement, so §1 says to raise it rather than edit it.
- All 238 notes in `The Virtual Edit` were repointed at these on-site URLs (brand link kept
  as a secondary), and rebuilt against `origin/main` after the nightly refresh delisted 8 of
  the 965 products they linked. → `docs/log/2026-09-05-thevirtualedits-outfit-recreations.md`
