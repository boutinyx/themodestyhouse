# Sitemap now covers /style/[vibe] and /editorial/[slug]
**Date:** 2026-08-09 · **Status:** done

## Goal
`app/sitemap.ts` declared 20 URLs while the site serves 25 crawlable pages. The five missing
ones were the three `/style/[vibe]` pages and both `/editorial/[slug]` posts — found by the
crawlability audit on 2026-08-08 (`docs/log/2026-08-08-robots-llmstxt-crawlability-audit.md`).

The `/style/*` pages were the acute case: their nav links live inside a closed Base UI popup
(`components/NavMenu.tsx` only renders Content on open), so they appeared in **no**
server-rendered HTML anywhere *and* in **no** sitemap. Nothing on the internet linked to them.

## What changed
`app/sitemap.ts` only. Imports `VIBES` from `lib/vibes.ts` and `getPosts()` from
`lib/posts.ts` alongside the existing `LANES`, and maps all three families.

The bug was structural, not an oversight: importing only `LANES` meant a new *lane* was
picked up automatically — so the file looked self-maintaining — while a new *vibe* or *post*
was automatically excluded. The comment block now says so, and names the two route families
deliberately left out (`/favourites`, which is client-state and wants a noindex instead; and
`/designers?page=2`, which is a canonical-tag problem).

`lastModified` is emitted **only** on the editorial posts, from the `date` in their
frontmatter that `getPosts()` already parses. Google ignores `<priority>`/`<changefreq>` and
uses `<lastmod>` only when it is verifiably accurate, so a made-up value is worse than none.
The comment records why file mtime must never be used for this: Railway builds from a fresh
clone and git does not preserve mtimes, so on the build server every mtime is the checkout
instant (measured 9.6h off on a test clone), and it would be wrong again on every deploy.

## Verification

```
$ rm -rf .next/dev/types tsconfig.tsbuildinfo && npx tsc --noEmit
=== tsc exit: 0 ===
```

(First typecheck attempt reported three errors in `.next/dev/types/validator.ts` referencing
`app/llms.txt/route.js` and `app/favourites/layout.js` — stale generated types left by the
audit's build-verification, which created and deleted those files. Cleared and re-run. Also
note `npx tsc --noEmit | tail -5; echo $?` reports *tail's* exit status, not tsc's — §10.20's
family of error.)

```
$ npm run build      # 35 routes, compiled successfully
● /editorial/[slug]  → /editorial/back-to-class-no-fuss, /editorial/still-boiling-feeling-fall
● /style/[vibe]      → /style/elegant, /style/streetwear, /style/maximalist
○ /sitemap.xml

$ .next/server/app/sitemap.xml.body
locs: 25  (was 20)    lastmod: 2  (was 0)

  https://themodestyhouse.com/style/elegant                        lastmod=-
  https://themodestyhouse.com/style/streetwear                     lastmod=-
  https://themodestyhouse.com/style/maximalist                     lastmod=-
  https://themodestyhouse.com/editorial/back-to-class-no-fuss      lastmod=2026-08-04
  https://themodestyhouse.com/editorial/still-boiling-feeling-fall lastmod=2026-08-04
```

Both `lastmod` values match the `date:` in the corresponding `content/editorial/*.md`
frontmatter exactly.

```
$ npm test
Test Files  20 passed (20)
     Tests  407 passed (407)
```

## Notes / follow-ups
- **Not deployed.** The working tree carries another session's Style-It work (24 modified
  files), so nothing was committed. `app/sitemap.ts` is not among their files — no conflict.
- **The sitemap is now the only thing linking 9 of these URLs.** `components/Footer.tsx`
  renders `CATEGORY_LANES.slice(0, 6)`, and `CATEGORY_LANES` is
  `LANES.filter(l => l.kind === 'category')` = 9 of 12 lanes. So `/modest-sets`,
  `/modest-swimwear` and `/modest-activewear` are dropped by the `slice`, and
  `/hijabi-outfits` (`community`), `/modest-wedding-guest` (`occasion`) and
  `/modest-summer-outfits` (`season`) are excluded by the filter before it. Together with the
  three `/style/*` pages that is 9 URLs with zero internal links. A sitemap gets them crawled;
  internal links are what pass ranking signal. Widening the footer is a visual change to the
  site, so it is Tina's call — explained to her, not applied.
- No ADR: this constrains nothing architecturally.
