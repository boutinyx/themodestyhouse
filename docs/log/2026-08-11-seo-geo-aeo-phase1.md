# SEO / GEO / AEO Phase 1 — structured data, canonicals, robots, llms.txt
**Date:** 2026-08-11 · **Status:** done

## Goal
Tina asked for an SEO/GEO/AEO analysis using
[`AgriciDaniel/claude-seo`](https://github.com/AgriciDaniel/claude-seo) specifically ("i want
you to use the repo"), an implementation plan, and implementation. Full analysis and the
phased plan (including what's deliberately deferred to her judgement) live in
`docs/seo-geo-aeo-plan.md`. This entry is the mechanics of what changed and how it was
verified.

## claude-seo install
Cloned the repo, read `install.sh` before running it (it's the documented "review before you
pipe it" path — no `curl | bash`). It writes only to `~/.claude/skills/seo`,
`~/.claude/agents`, and an isolated venv at `~/.claude/skills/seo/.venv`; nothing global,
nothing in this repo. System `python3` was 3.9.6 (too old — the tool needs 3.10+), so
`brew install python@3.12` and re-ran setup with `CLAUDE_SEO_PYTHON=/opt/homebrew/bin/python3.12`.
`claude-seo doctor` → `Runtime: ready · Python: 3.12 · Chromium: ready`.

Ran the tool's own scripts (not just its methodology) against `https://themodestyhouse.com`:
`sitemap_discovery.py` (clean), `agent_ux_check.py` on `/` and `/directory` (semantic-HTML
score 100/100 both — note this check doesn't catch "cards aren't real links", a different
class of finding my own manual audit caught), `preload_check.py` (flagged missing Speculation
Rules, score 75 → addressed below), `ucp_check.py` (no profile — tool itself calls this
"forward-looking", skipped), `content_quality.py` on a lane page and a post (no AI-pattern or
filler flags). `pagespeed_check.py`/`nlp_analyze.py` need a Google API key this environment
doesn't have — not run.

## What changed
- **`lib/schema.ts`** (new) — JSON-LD builders: `organizationSchema`, `websiteSchema` (with
  `SearchAction`), `breadcrumbSchema`, `collectionPageSchema` (ItemList capped at 24 items,
  never carries price/offers — ItemList entries use the outbound brand URL, the only URL a
  product currently has), `articleSchema`, `jsonLdGraph`.
- **`components/JsonLd.tsx`** (new) — renders one `<script type="application/ld+json">`.
- **`app/layout.tsx`** — title template (`%s | The Modesty House`), OG/Twitter default image
  (`/hero-poster.jpg`, an existing photo — no new art invented), `lang="en-GB"` (was `en`;
  copy and `formatDate` are already British), site-wide `Organization`+`WebSite` JSON-LD,
  Speculation Rules (`moderate` prefetch, same-origin, excludes `/api` and `/admin`).
- **`app/page.tsx`** — `alternates.canonical: '/'`.
- **`app/directory/page.tsx`** — converted static `metadata` to `generateMetadata`:
  `?q=` gets `noindex, follow` + canonical to the bare `/directory` (was neither); adds
  `BreadcrumbList` + `CollectionPage`/`ItemList` (only when `!q`, so the noindexed search view
  carries no schema).
- **`app/[lane]/page.tsx`** — canonical per lane; `BreadcrumbList` + `CollectionPage`/`ItemList`
  built from the same `encodeCatalogue`/`decodeCard` the grid already uses.
- **`app/editorial/page.tsx`, `app/editorial/[slug]/page.tsx`** — canonical; post pages get
  `og:type=article`, `article:published_time`, per-post OG/Twitter image, `Article` +
  `BreadcrumbList` JSON-LD.
- **`app/designers/page.tsx`** — `generateMetadata` reading `?page=`, self-referential
  canonical per page (page 1 → `/designers`, page N → `/designers?page=N`) — previously no
  canonical at all, on any page.
- **`app/favourites/layout.tsx`** (new) — `robots: { index: false, follow: true }`. The page
  itself is `'use client'` (localStorage-driven) and cannot export metadata; `sitemap.ts`'s
  own comment already said this route "wants a noindex (which it does not yet have)".
- **`app/robots.ts`** — explicit allow rules for GPTBot, ChatGPT-User, OAI-SearchBot,
  ClaudeBot, anthropic-ai, Claude-User, PerplexityBot, Google-Extended, CCBot (all already
  allowed under the `*` wildcard — this is a hedge against a future narrower `*` rule and
  documents the decision), plus `Host`.
- **`public/llms.txt`** (new) — site description + section list, built entirely from strings
  that already exist elsewhere (root metadata description, each lane's `title`/`intro`
  pulled verbatim via `npx tsx` rather than retyped).
- **11 page files** — title strings had the ` | The Modesty House` suffix stripped now that
  the root template adds it (see Verification — this was a bug caught during it, not planned
  up front).
- **`lib/schema.test.ts`** (new) — 12 tests: Organization/WebSite shape, breadcrumb
  positions, ItemList capped at 24 and never carrying `offers`/`price`, ItemList items use the
  outbound URL, Article image resolution (relative → absolute, absolute untouched, omitted
  when the post has none), the `@graph` envelope.

No changes to `data/`, `lib/products.ts`, `lib/normalize.ts`, or anything in the scrape/build
pipeline — this phase is entirely metadata/schema/robots at the page-template layer.

## Verification

```
$ rm tsconfig.tsbuildinfo && npx tsc --noEmit
(clean)
$ npm run lint
(clean — the one warning present is .fontprobe.tmp.mjs, untracked and pre-existing,
 not touched this session)
$ npx vitest run
 Test Files  25 passed (25)
      Tests  470 passed (470)
$ npm run build
✓ Compiled successfully
31 routes, unchanged from before this session
```

Then a **production** server (`npx next start -p 4177`, an isolated port — CLAUDE.md
§10.28 on why a shared/dev server lies), curled directly:

```
/            title: "The Modesty House — the archive for everything modest"
             canonical: https://themodestyhouse.com   og:image: .../hero-poster.jpg
             JSON-LD: Organization + WebSite (SearchAction target verified)
             speculationrules script present · <html lang="en-GB">

/modest-abayas   canonical: https://themodestyhouse.com/modest-abayas
                 JSON-LD types present: Brand, BreadcrumbList, CollectionPage, EntryPoint,
                 ItemList, ListItem, Organization, Product, SearchAction, WebSite
                 "position" count: 26 (2 breadcrumb + 24 ItemList — capped correctly)

/directory (no q)   canonical: /directory, no robots meta (indexable)
/directory?q=abaya  robots: "noindex, follow", canonical: /directory,
                     0 occurrences of CollectionPage schema (correctly suppressed)

/editorial/back-to-class-no-fuss
    canonical: .../editorial/back-to-class-no-fuss
    og:type: article   article:published_time: 2026-08-04

/favourites   robots: "noindex, follow"

/robots.txt   9 named AI-crawler blocks + the wildcard rule + Host + Sitemap, all rendered
/llms.txt     200
/sitemap.xml  22 <url> entries — unchanged count, confirms nothing broke it
```

**Bug caught by this pass, not by the test suite:** first render showed
`<title>Abayas | The Modesty House | The Modesty House</title>` — the new root template
(`%s | The Modesty House`) was wrapping page titles that already ended in
`| The Modesty House` by hand, because every page pre-dated the template
(`docs/launch-readiness.md` had flagged the missing template but not this consequence of
adding one). `grep -rn '| The Modesty House' app --include="*.tsx"` found all 11 offending
titles; stripped the manual suffix from each, re-ran typecheck/lint/tests (unchanged, still
green), rebuilt, and re-curled every route individually to confirm a single correctly-placed
suffix everywhere. `lib/schema.test.ts` couldn't have caught this — it tests the JSON-LD
builders, not the `<title>` composition, which lives in Next's metadata merge across
`app/layout.tsx` and each page. Re-ran `claude-seo run parse_html.py` against the local build
afterward to confirm the fix from a second, independent parser.

`claude-seo run agent_ux_check.py` against `localhost:4177` was blocked by the tool's own
SSRF guard (`url_safety: Blocked hostname: localhost`) — expected and correct; verification
against local routes used direct `curl`+`grep` instead, shown above.

## Notes / follow-ups
Phase 2 items (ProductCard linkability, FAQ/AEO content, stale editorial, `/hijabi-outfits`
duplication, footer social `sameAs`, product-level JSON-LD) are deliberately not implemented
here — each is a genuine judgement call, not a code decision, and is logged with the specific
fork in `docs/seo-geo-aeo-plan.md` rather than decided silently.

`claude-seo` is now available as a general-purpose audit tool for future sessions
(`~/.claude/skills/seo/bin/claude-seo run <script> ...`, `CLAUDE_SEO_PYTHON=/opt/homebrew/bin/python3.12`
needed since system `python3` is 3.9.6).
