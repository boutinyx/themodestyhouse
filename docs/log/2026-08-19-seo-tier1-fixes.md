# SEO Tier 1 — subtype pages made indexable, link starvation fixed, payload trimmed
**Date:** 2026-08-19 · **Status:** done (on branch `seo/tier1-fixes`, NOT merged or deployed)

## Goal
Act on Tier 1 of the 2026-08-19 SEO audit (75 agents, 67 findings, **45 refuted** under
adversarial verification, 22 survived), with real Search Console data now available
(see `docs/log/2026-08-19-gsc-api-access-and-index-coverage.md`).

The data reframes the work and is worth restating: **5 clicks / 188 impressions over
12 months, average position 35.1**, only the brand query ranking, and 5 of 25 lanes not
indexed. Technical SEO is *not* the constraint here — content depth and domain authority
are. Everything below is real, and none of it will produce traffic on its own.

## What changed

### Commit 1 — `8c94d3d` seo(meta): per-page openGraph/twitter + /about canonical
`lib/seoCopy.ts` gains `buildMetadata()` / `pageMetadata()`; every page routes through them.
Next does not deep-merge `openGraph` with the parent layout, so a page that sets it at all
must set it in full — 23 of 25 pages were falling through to one generic card. `/about` also
had **no canonical at all**, the only sitemap URL without one.

This was the **metadata half of an uncommitted batch** that had been sitting in the shared
working tree since 2026-08-13. The copy half is deliberately still uncommitted — see below.

### Commit 2 — `6237f64` seo: subtype pages, link starvation, payload
- **`lib/laneSubtypes.ts` (new)** — the 14 `?type=` subtypes in one place, derived from
  `lib/specialty.ts` so page / metadata / sitemap cannot drift.
- **`app/[lane]/page.tsx`** — `generateMetadata` reads `searchParams` and emits a per-subtype
  canonical + title; subtype chips render as real server-side `<a>`; `listedItems`,
  `collectionPageSchema` and `breadcrumbSchema` are scoped to the FILTERED set.
  Before: `/outerwear?type=blazer` canonicalised to `/outerwear`, carried the parent's title,
  and emitted `CollectionPage{name:"Outerwear"}` whose ItemList opened with a **vest**.
  `resolveSubtype` validates against `lib/specialty.ts`, never the encoded catalogue —
  building it inside `generateMetadata` would re-parse 10.9 MB uncached (§8).
- **`app/sitemap.ts`** — +10 subtype URLs. The 4 thinnest (9–21 products) are linked but
  **not** submitted: five lanes are already "Discovered – currently not indexed" and adding
  nine-product pages to that queue earns the same verdict.
- **`lib/laneAnswers.ts`** — 3 `related` swaps. `layering-basics`, `outerwear` and
  `modest-summer-outfits` were each the target of **zero** contextual links while
  `modest-hijabs` was the target of 7 of 28. No lane is now at zero.
- **`components/Footer.tsx`** — new column for non-category lanes. `/modest-summer-outfits`
  had zero internal links anywhere. `/hijabi-outfits` stays excluded on purpose.
  The heading "More" is the plainest functional label available, **not** brand voice (§10.18).
- **`lib/compactCatalogue.ts`** — omit any subtype column that is all `-1` on a given page,
  and make `altUrl` a sparse map. `occasionMask` was **left alone**: the audit called it dead,
  but `docs/log/2026-08-12-occasion-filter-removed.md` documents it as deliberately retained
  for a pending restore, and overriding that is not mine to do.
- **`components/ProductCard.tsx`** — optional `priority`; first 4 cards get
  `loading="eager"` + `fetchPriority="high"`.
- **`lib/designerPaging.ts` (new, 9 tests)** — `/designers?page=99` served page 4's content
  under a canonical echoing `99`. Metadata and body now clamp through one helper.
- **`lib/schema.ts`** — `brandListSchema()`; `/designers` was the least structured page on the
  site. `collectionPageSchema` could not be reused (it hardcodes `'@type': 'Product'`).
- **`app/llms.txt/route.ts` (new)** replaces `public/llms.txt`, which listed 12 of 14 lanes.

### Commit 3 — `scripts/interaction-audit.mjs`
See "A dead check" below.

## Verification

```
npx tsc --noEmit                    exit 0
npx vitest run                      708/708 pass (43 files)
npm run build                       35/35 static pages
npm run audit:interaction           0 problems, 4 widths x 2 engines
npm run audit:mobile                chromium 0/9 overflow, a11y 0, stacked 0, aspect 0
                                    webkit   0/9 overflow, a11y 0, stacked 0, aspect 0
```

Per-item, against a real `next start` build:

| check | result |
|---|---|
| `/outerwear?type=blazer` canonical | `…/outerwear?type=blazer` ✓ |
| its `<title>` | `Modest Blazers \| The Modesty House` ✓ (all 14 under 60 chars) |
| its `CollectionPage` | `name:"Blazers"`, first item `Blazer with wide sleeves`, 24 items ✓ |
| crawlable `?type=` links on `/outerwear` | 4 (was **0** sitewide) ✓ |
| sitemap URLs | **35** (was 25) ✓ |
| `/designers?page=99` canonical | `?page=4` ✓ (also `1e9`) |
| `/designers` JSON-LD | Organization, WebSite, BreadcrumbList, CollectionPage(30 brands) ✓ |
| `/llms.txt` | 200 `text/plain`, contains `outerwear` + `layering-basics`; `public/llms.txt` gone ✓ |
| `fetchpriority="high"` on `/directory` | 4 cards eager, 20 lazy, + 4 React-generated `<link rel=preload>` ✓ |
| `/directory` uncompressed | 2,599,644 → **2,391,628 B (−8.0%)** ✓ |
| dead columns on `/directory` | all four now **0** occurrences ✓ |
| columns retained where filters read them | `/outerwear` outerwearIdx ✓, `/modest-hijabs` hijabIdx+typeIdx ✓, `/layering-basics` layeringIdx ✓ |
| `?type=` filtering still correct | blazer/coat/vest/cardigan all return 24 correct items ✓ |
| per-page `og:title` | distinct on `/`, `/modest-abayas`, `/about`, `/designers`, subtypes ✓ |

## A dead check, proven dead rather than assumed

`audit:interaction` reported `outerwear-flyout-navigate — TYPE FILTER DID NOT PRE-SELECT
BLAZERS ON LANDING` at both desktop widths in both engines. It looked exactly like a
regression I had just caused.

It was not. The check searched for a `<button>` whose text starts "Blazers" — a subtype
filter-dropdown trigger. **No such control has ever existed.** `FilterableGrid` renders three
dropdowns: Brand, a hijab-fabric "Type" (only where `cat.hijabTypeFilters` is non-empty), and
Sort. The subtype is reflected in the `h1` and the grid contents, never in a chip.

Proven, not argued: built `origin/main` (`7c6a80f`) in a clean detached worktree with a
hardlinked `node_modules`, served it on :3198, and probed `/outerwear?type=blazer` with
Playwright. Result — `buttonsStartingWithBlazers: []`, `h1: "Blazers"`, first card
`"Blazer with wide sleeves"`. Byte-identical failure to my build. The check has been failing
since the day it was written (§10.28 rule 3 — a check that never passes is a check you do
not have; §10.32 — same family).

Rewritten to assert the two things that genuinely evidence a pre-filtered landing: the `h1`
reads the subtype label, and the visible grid holds that subtype. Both are server-rendered
and both predate this work, so neither selects on anything my fix introduced (§10.32 rule 2).
The new subtype `<a class="chip" aria-current="page">` is deliberately **not** what it
measures.

**Negative control run before trusting it** (§10.28 rule 1):
```
POSITIVE  /outerwear?type=blazer -> PASSES: h1="Blazers" first="Blazer with wide sleeves"
NEGATIVE  /outerwear (unfiltered) -> FAILS (null)
NEGATIVE  /outerwear?type=vest    -> FAILS (null)
```

Turbopack note for the next person doing this: it **panics** on a symlinked `node_modules`
pointing outside the project root (`Symlink [project]/node_modules is invalid, it points out
of the filesystem root`). Use `cp -al` for a hardlink clone instead.

## Not done, and why
- **Tier 2 is untouched** — it is copy, taxonomy and product-strategy decisions (hero h1,
  FAQ currency answer, `/directory` prose, what `/hijabi-outfits` is FOR, editorial cadence,
  per-brand copy). §10.18: brand copy is Tina's, and inventing 14 lane voices is exactly the
  mistake that section exists to prevent. The 14 subtype titles are deliberately **templated**
  (`Modest ${label}`) and flagged in `lib/laneSubtypes.ts` as replaceable.
- **Tina's uncommitted copy changes remain uncommitted** — 7 files. Committing another
  session's user-visible copy under my message is §10.30 verbatim. A full backup of the
  original 13-file working tree, plus the complete patch, is in the session scratchpad.
- **`occasionMask` left in place** — see above.
- **Nothing is deployed.** Work is on `seo/tier1-fixes`; pushing to `main` auto-deploys via
  Railway, which is Tina's call.

## Follow-ups
- Request indexing by hand for the 5 unindexed lanes (no API exists for this).
- `/favourites` already carries `noindex, follow` and is live — GSC's "indexed" verdict is a
  stale pre-recrawl reading, not a defect.
- The four thin subtypes are linked but unsubmitted; revisit if their counts grow.

---

# Addendum — Tier 2, done same day at Tina's instruction

She read the Tier 2 list and said "do the 2 things left yourself". What that
covered, and what it did not.

## Done

**Indexing submission.** `scripts/indexnow-notify.mjs` rewritten to read URLs
from the DEPLOYED `sitemap.xml` rather than a hardcoded list — it had drifted to
12 of 14 lanes (missing `/layering-basics`, `/outerwear`) and knew nothing about
the 10 new `?type=` pages: the same drift, cause and fix as `public/llms.txt`.
Now refuses to submit an empty set. **Submitted 35 URLs, accepted HTTP 200.**
Covers Bing / Yandex / Naver / Seznam — Bing being what feeds Microsoft Copilot.

**Tier 2 A — the seven copy changes** (`9bbe0c8`). Two were factually FALSE on
the live site since the 2026-08-12 currency default changed: the FAQ currency
answer and the footer affiliate disclosure both still claimed "we don't convert".
The hero h1 was verified verbatim against `app/about/page.tsx:45` and against
live `/about` before shipping — her sentence, not a composed one.

**Tier 2 B — `/directory` prose.** It had 359 words of which exactly one sentence
was its own, and was the only page besides `/designers` with **no `<h2>` at all**,
on the site's highest-intent URL. `DIRECTORY_ANSWER` added to `lib/laneAnswers.ts`
(151 words, inside the same 100-180 band the lane test enforces) and rendered
after the grid in the identical pattern. Every fact in it already existed
elsewhere on the site — the per-brand sizing/shipping/returns split and the
approximate-conversion behaviour are FAQ answers, "craft and design" is /about's
own definition of the seal, the hijab/swim/activewear segregation is §7. It
consolidates; it does not pitch.

**Tier 2 G — the footer's phantom sections.** "Guides" and "Interviews" both
pointed at `/editorial` and named sections that have never existed (2 posts, one
Guide, one Styling, zero interviews). Replaced with the posts by name, which
takes each post from **2 inbound internal links to 35**. Deliberately did NOT
build `/editorial/guides` and `/editorial/interviews` — 2 posts yields a one-post
page and an empty one, plus a hand-edit to `app/sitemap.ts` each (§8).

## Not done, deliberately

**Tier 2 C — lane answer depth.** The plan's own recommendation is "low priority,
and don't do it as a blanket rule; grow 2-3 lanes you actually care about". Which
lanes is a commercial judgement. Also confirmed there: the proposed first-party
stats paragraph MUST NOT be built as specified — `firstSeen` only starts
2026-08-05, so "added in the last 30 days" currently computes to 70.9% of the
catalogue, and 16 currencies make a single price range an ADR-0002 violation.

**Tier 2 D — what `/hijabi-outfits` is for.** Retire vs rebuild-as-editorial is a
decision about what the page is FOR, which is hers. Retiring is a six-file change
plus a redirect that does not exist yet; rebuilding needs editorial content that
only she can write. Left linked exactly once, as it was.

**Tier 2 E and F — per-brand copy and editorial posts.** ~6,500 words of curation
rationale about 113 real businesses, and brand-roundup posts under her byline.
The plan's own author wrote "an agent cannot do this — §10.18 at scale", and that
is right for a reason beyond style: these are evaluative claims about named third
parties, published as her editorial judgement. Fabricating them would put
assessments of real companies in her voice that she never made. Offered to draft
from catalogue facts for her to rewrite; not shipped unasked.

**Google indexing requests for the 5 unindexed lanes.** No public API exists —
the Indexing API v3 is documented for JobPosting and BroadcastEvent only, and
using it for lane pages is outside its stated scope. Attempted via the Chrome
extension so it could be driven through her own session; the extension is not
connected. So this genuinely remains a manual click, or needs the extension
enabled.

## Verification (addendum)
```
npx tsc --noEmit          exit 0
npx vitest run            708/708
npm run build             35/35 static
audit:mobile              chromium 0/9 overflow, a11y 0, stacked 0, aspect 0
                          webkit   0/9 overflow, a11y 0, stacked 0, aspect 0
audit:interaction         0 problems
/directory                <h2> count 0 -> 1; prose block server-rendered
footer                    "Guides"/"Interviews" gone; both posts linked by name
each editorial post       2 -> 35 inbound internal links
IndexNow                  35 URLs, HTTP 200 accepted
```
