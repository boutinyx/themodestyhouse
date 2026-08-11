# Keyword-facing metadata + FAQ/AEO content
**Date:** 2026-08-11 · **Status:** done

## Goal
Tina pointed out the earlier SEO pass covered technical SEO (schema, canonicals, crawlability)
but nothing about keywords — a fair miss. She then gave blanket authorization ("do whatever
you need to boost up seo geo and aeo... just report it in the end"). This entry is that
report.

## Research (honest about its limits)
No paid keyword-volume tool was available: `claude-seo run keyword_planner.py` needs Google
Ads API credentials this environment doesn't have, so there are no exact search-volume
numbers here — anyone citing precise numbers without that access is guessing. What's real:

- Actual competitor title tags (Aab: `"Modest Fashion Online – Aab"` — keyword phrase leads,
  brand trails), vs. this site's `"{Thing} | The Modesty House"` pattern, brand-first
  throughout.
- Real competitors already validate the category structure: Aab runs a dedicated "Wedding
  Guest" collection matching `/modest-wedding-guest`; dedicated modest-fashion marketplaces
  (Modasty, Modaire, The Modist) confirm the "curated multi-brand directory" positioning is a
  real, established category, not a niche invention.
- Search-behaviour research this session leaned toward "women's hijab" / "hijab fashion"
  outperforming "hijabi outfits" as a search term — relevant since `/hijabi-outfits` already
  had a separate, unrelated problem (98.8% catalogue overlap with `/directory`, CLAUDE.md §8).

## Decision: metadata layer only, not visible copy
Search-snippet copy (title tag, meta description) is conventionally more keyword-dense than a
site's own voice — that's normal, not a compromise. Given that, and given this file's own
extensive history of what happens when AI-written copy gets substituted for Tina's own
(§10.18, §10.29), the implementation deliberately keeps two layers separate:

- **`lib/seoCopy.ts`** — new. Keyword-forward `title`/`description` per path, used ONLY in
  `generateMetadata`/`metadata` exports (the `<title>` tag and `<meta name="description">`).
- **Visible on-page copy — untouched.** Every `<h1>`, every lane's `<p>{lane.intro}</p>`, the
  homepage hero ("The archive for everything modest.") — all exactly what they were before
  this session. Verified by curl after build (see below): the visible intro under
  `/modest-abayas`'s h1 is still the original "Open, closed, kimono and butterfly abayas —
  from plain-sharp to embellished-flowing," while the `<title>` is now keyword-forward.

This was a judgement call made in the direction of the site's established pattern, not a
literal reading of "do whatever" — happy to extend keyword language to the visible copy too
if that's what's actually wanted; flagging it rather than guessing silently.

## What changed
- **`lib/seoCopy.ts`** (new) — `SEO_COPY: Record<path, {title, description}>` for the
  homepage, `/directory`, all 12 lanes, `/designers`, `/editorial`, `/faq`.
- **`lib/seoCopy.test.ts`** (new) — asserts an entry exists for every `LANES` slug and every
  static path it's used on, every title ≤ 60 chars, every description 50–160 chars (normal
  SERP-snippet bounds), and no two paths share a title or description.
- **`app/page.tsx`, `app/directory/page.tsx`, `app/[lane]/page.tsx`, `app/designers/page.tsx`,
  `app/editorial/page.tsx`** — `generateMetadata`/`metadata` now read `title`/`description`
  from `SEO_COPY` instead of the bare lane title / hardcoded strings. Lane pages fall back to
  `lane.title`/`lane.intro` if a slug is ever added without a matching `SEO_COPY` entry (the
  test above is what actually prevents that from happening silently).
- **`lib/schema.ts`** — added `faqPageSchema()`, mapping `{question, answer}` pairs to
  `FAQPage`/`Question`/`Answer` JSON-LD.
- **`app/faq/page.tsx`** (new) — 10 questions, reusing the existing `HowBlocks` accordion
  component (already accessible — real `<button aria-expanded>`, keyboard/touch/mouse all
  handled, body stays in the DOM when collapsed so a crawler sees it) rather than building new
  markup. Every answer is either a plain factual definition (what modest fashion / an abaya
  is) or paraphrased from copy that already exists elsewhere on the site — the `HOW` steps on
  `/about` and the affiliate disclosure in the footer — not invented from nothing.
- **`app/sitemap.ts`** — `/faq` added to `staticPaths`.
- **`components/Footer.tsx`** — `FAQ` link added to the "The House" column.

## Verification

```
$ rm tsconfig.tsbuildinfo && npx tsc --noEmit && npm run lint && npx vitest run
(clean — 476/476 tests, 6 new in lib/seoCopy.test.ts, 1 new in lib/schema.test.ts)
$ npm run build
32 routes (was 31 — /faq is new, static)
```

Production server (`next start -p 4177`), curled directly:

```
/                title: "Modest Fashion Online — Shop Curated Modest Brands"
                 (no "| The Modesty House" suffix — see note below)
                 h1 (unchanged): "The archive for everything modest."

/modest-abayas   title: "Abayas Online — Shop Modest Abaya Dresses for Women | The Modesty House"
                 visible <p> under h1 (unchanged): "Open, closed, kimono and butterfly
                 abayas — from plain-sharp to embellished-flowing."

/directory       title: "Shop Modest Clothing Online — Dresses, Abayas & Hijabs | The Modesty House"
/designers       title: "Modest Fashion Brands & Designers — Curated Directory | The Modesty House"

/faq             title: "FAQ — How The Modesty House Works | The Modesty House"
                 canonical: https://themodestyhouse.com/faq
                 JSON-LD: 1 FAQPage, 10 Question nodes
                 "Is The Modesty House a shop?" present in the raw HTML (server-rendered,
                 not client-injected) — a crawler sees it without executing JS

/sitemap.xml     23 <url> entries (was 22) — includes /faq
```

**Note on the homepage title not getting the `| The Modesty House` suffix:** verified this is
real Next.js behaviour, not a bug — `app/page.tsx` shares the same route segment as the root
`app/layout.tsx` that defines the title template, and a page's own title at that exact segment
overrides rather than receives the template (every other page is a distinct child segment and
does get templated, confirmed above). Left as-is: a keyword-forward homepage title without a
redundant brand-name repeat is arguably better anyway, since Google shows the site name/favicon
next to the result regardless.

## Notes / follow-ups
- Not done: rewriting the visible hero h1 or lane intro paragraphs — deliberately held back,
  see "Decision" above. Say the word if the visible copy should carry keywords too.
- Not done: renaming `/hijabi-outfits`' visible label — its `SEO_COPY` title now reads "Hijab
  Fashion & Hijabi Outfits" as a middle ground (keyword coverage in the `<title>` only), but
  the lane's own duplicate-content problem (§8) is unrelated and still open.
- FAQ content covers the mechanics of the site (how buying works, currency, vetting) and two
  generic definitions (modest fashion, abaya). It does not cover garment-specific long-tail
  questions ("hijab vs shayla", sizing guides) — that's more content, same trade-off as
  everything else here: real value, but it's new copy, and I kept this batch to what's
  directly grounded in existing site language plus uncontroversial definitions.
