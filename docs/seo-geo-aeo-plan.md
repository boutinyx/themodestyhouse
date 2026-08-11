# SEO / GEO / AEO — analysis and phased plan

**Date:** 2026-08-11 · **Status:** Phase 1 done, Phase 2 pending Tina's calls

Tooling used: [`claude-seo`](https://github.com/AgriciDaniel/claude-seo) (installed manually
to `~/.claude/skills/seo`, isolated Python 3.12 runtime + Playwright Chromium — see
`docs/log/2026-08-11-seo-geo-aeo-phase1.md` for the install), plus a direct manual audit of
every metadata export, JSON-LD occurrence, robots/sitemap file, heading, alt text and content
page in the repo.

## Where the site stood, 2026-08-11

- **Zero structured data anywhere.** No `application/ld+json`, no `schema.org` reference in
  any rendered page. `docs/launch-readiness.md` already recorded the intent
  (`BreadcrumbList + CollectionPage/ItemList`, holding off on `Product` schema until price
  freshness is solved) — it had just never been built.
- **Canonical tags on 3 of ~20 routes** (`/contact`, `/privacy`, `/terms` only). Every
  commercial route — `/`, `/directory`, all 12 lanes, `/designers`, both editorial posts — had
  none. `/directory?q=` had no canonical and no noindex, so every search string was an
  indexable near-duplicate.
- **No title template.** Every page hand-wrote `| The Modesty House` — noted in
  `docs/launch-readiness.md` as `"No title.template"`.
- **No OG/Twitter images anywhere** — `twitter.card: summary_large_image` rendered a blank
  card.
- **`/favourites` had no noindex**, despite `app/sitemap.ts`'s own comment saying it "wants a
  noindex (which it does not yet have)" — a crawler only ever sees its empty localStorage
  state.
- **`robots.ts` had a single wildcard rule**, no AI-crawler-specific entries, no `Host`.
- **No Speculation Rules, no `llms.txt`.**
- **`ProductCard` still has no `<a>`/`<Link>`** — confirmed unchanged since 2026-08-05.
  Verified live: `curl /directory | grep -c 'href=.*products/'` → 0. This is the single
  biggest lever left and is **not** part of Phase 1 — see "Needs your call" below.
- **`components/Footer.tsx` social icons point at `https://instagram.com` and
  `https://tiktok.com`** — the bare platform homepages, not real account URLs. Found while
  deciding whether Organization schema could carry `sameAs`; it can't, honestly, without the
  real handles.
- **Editorial: 2 posts, both dated 2026-08-04** — over a year stale as of today, and that
  date is the sitemap's only `<lastmod>` value.
- **No FAQ / Q&A content anywhere** — nothing structured for answer-engine extraction.

Full findings (file:line evidence for all of the above) are in the audit transcript this plan
was built from; ask if you want it re-run and re-attached.

## Phase 1 — shipped 2026-08-11 (mechanical, reversible, no content authored)

| Change | Where |
|---|---|
| `Organization` + `WebSite` (+ `SearchAction`) JSON-LD, site-wide | `app/layout.tsx`, `lib/schema.ts` |
| `BreadcrumbList` + `CollectionPage`/`ItemList` JSON-LD on `/directory` and all 12 lanes | `app/directory/page.tsx`, `app/[lane]/page.tsx` |
| `Article` + `BreadcrumbList` JSON-LD on editorial posts | `app/editorial/[slug]/page.tsx` |
| Canonical tags on every route that lacked one | `app/page.tsx`, `/directory`, `/[lane]`, `/editorial`, `/editorial/[slug]`, `/designers` (self-referential per paginated page) |
| `/directory?q=` gets `noindex, follow` + canonical to the bare `/directory` | `app/directory/page.tsx` |
| `/favourites` gets `noindex, follow` via a new route-segment layout | `app/favourites/layout.tsx` |
| Title template (`%s \| The Modesty House`) at root; every page's hand-written suffix removed | `app/layout.tsx` + 10 page files |
| `lang="en-GB"` (was `en`; site copy and `formatDate` are already British) | `app/layout.tsx` |
| Default OG/Twitter image (`/hero-poster.jpg`, an existing photo, not new art); per-post OG image + `article:published_time` on editorial | `app/layout.tsx`, `app/editorial/[slug]/page.tsx` |
| Explicit AI-crawler allow rules (GPTBot, ChatGPT-User, OAI-SearchBot, ClaudeBot, anthropic-ai, Claude-User, PerplexityBot, Google-Extended, CCBot) + `Host` | `app/robots.ts` |
| Speculation Rules (`moderate` prefetch, same-origin, excludes `/api` `/admin`) | `app/layout.tsx` |
| `llms.txt` — site description and section list, built entirely from strings that already exist elsewhere on the site (metadata description, lane `intro` copy) | `public/llms.txt` |

**No product-level JSON-LD.** Per `docs/launch-readiness.md`'s existing decision: stale
prices in structured data risk a Google manual action, and nothing in this phase changed
price freshness. `ItemList` entries carry `name`/`url`/`image`/`brand` only — the test suite
(`lib/schema.test.ts`) asserts no `offers` or `price` field ever reaches a listed item.

**ItemList is capped at 24 items per page** — matching what the grid paints before
client-side reveal (`STEP = 24`), not the full lane (which can run into the thousands). A
crawler gets the same signal from 24 as from 2,400; shipping the full lane would meaningfully
add to page weight for no indexing benefit.

**Every `ItemList` item's URL is the outbound brand URL** (`p.url`), the same field
`EditorsRail` already uses — because that is the only URL a product currently has. This is
honest, not a workaround, but it means the schema is describing a product on a page that
itself has no internal link to it (see below).

Verification: `npx tsc --noEmit` clean, `npm run lint` clean, `npx vitest run` — 470/470
passing (25 new assertions in `lib/schema.test.ts`), `npm run build` — 31 routes, unchanged.
Then a `next start` production server on an isolated port, curled directly (not `next dev` —
CLAUDE.md §10.24/§10.28 on why dev servers and other sessions' ports lie): confirmed
canonical, title, OG tags, JSON-LD, robots meta and `robots.txt`/`llms.txt` output on every
route above. Full command/output log in
`docs/log/2026-08-11-seo-geo-aeo-phase1.md`.

**One bug caught by that verification, not by the test suite:** the title template initially
double-appended — `"Abayas | The Modesty House | The Modesty House"` — because every page
already hand-wrote the suffix the template now also adds. Fixed by stripping the manual
suffix from all 11 affected pages; re-verified single-suffix titles on every route
afterward.

## Phase 1.5 — ProductCard linking, decided and shipped same day

Tina chose "card → outbound link" (of the three options put to her). Implemented and
verified same session:

- `components/ProductCard.tsx`'s root is now `<div className="group relative ...">` holding
  a real `<a href={p.url} target="_blank" rel="noopener noreferrer sponsored"
  data-surface="product-card">` covering the whole card (image + brand/title/price) at
  `z-10`. Quick view (now a small icon button, top-left of the image, `Eye` from Phosphor)
  and the favourites heart are siblings of the anchor, not nested inside it — a `<button>`
  nested inside an `<a>` is exactly the `nested-interactive` axe violation this file was
  already rewritten once to remove, so the sibling-with-z-index structure that made the old
  overlay button accessible carries over unchanged; only the overlay itself changed from a
  `<button onClick>` to a real `<a href>`.
- Verified with a real Playwright click against a `next start` build (not a unit test — this
  needed actual browser stacking-context/z-index behaviour, which jsdom can't exercise):
  clicking the anchor opens the correct outbound brand URL in a new tab; clicking quick view
  opens the modal without navigating; clicking the heart toggles the favourite without
  navigating. `elementFromPoint` at the price-text position (the bottom of the card,
  furthest from both corner buttons) resolves to the anchor, confirming the whole card is
  clickable, not just the image.
- `lib/schema.ts`'s `ItemList` entries already used `p.url` (the outbound URL) as
  `item.url`, on the reasoning that it was "the only URL a card currently has" — that's
  now also literally what the card itself links to, so the schema and the rendered page
  agree.
- CLAUDE.md's landmine entries under §8 "Frontend" updated in the same session — the
  "zero products are hyperlinked" finding is marked fixed with the new structure explained,
  and a second stale landmine (the homepage "Edit" section, found to already be real posts
  as of some earlier session) is corrected too.

Full command/output evidence: `docs/log/2026-08-11-seo-geo-aeo-productcard-link.md`.

## Phase 2 — still needs your call

These are genuine forks, not code decisions — logged here rather than done silently, per
CLAUDE.md §1.

1. **FAQ / AEO content.** Nothing on the site is structured for answer-engine extraction
   (no "What is an abaya vs a jilbab", no sizing/fabric glossary, no comparison content).
   Building this means writing real copy — CLAUDE.md §10.18 is explicit that I don't invent
   brand voice or marketing copy unversioned by you. If you want this, it needs either your
   copy or your sign-off on drafted copy before it ships with `FAQPage` schema.
2. **Stale editorial (2 posts, both 13+ months old).** Not a code fix — a content pipeline
   question. `docs/launch-readiness.md`'s homepage rail already expects a 3rd post
   (`app/page.tsx:20`, `posts.slice(1, 4)`) and resolves itself the moment one exists.
3. **`/hijabi-outfits` is still a near-duplicate of `/directory`** (98.8% catalogue overlap).
   Already flagged in CLAUDE.md as "an editorial/SEO call, not a code change" — fixing or
   retiring it is still open.
4. **Footer social links** (`Footer.tsx:47-48`) point at the bare `instagram.com`/
   `tiktok.com` homepages, not real account URLs. I didn't add `sameAs` to the Organization
   schema because of this — happy to once real handles exist.
5. **Product-level JSON-LD** — still deliberately held off, per the existing
   `docs/launch-readiness.md` decision on price freshness. Revisit if/when the catalogue
   gets a freshness guarantee tighter than "last refresh".

## Not done, lower priority

- `getProducts()` is still uncached (3x re-parse of ~5.6 MB per home render) — a performance
  landmine, not really an SEO one at current traffic, and already tracked in CLAUDE.md §8.
- `PageSpeed`/CrUX field data (`claude-seo run pagespeed_check.py`) needs a Google API key
  this environment doesn't have — not run. Worth doing once a key exists; Core Web Vitals
  are a confirmed ranking input.
- UCP profile (`/.well-known/ucp`) — `claude-seo`'s own tool calls this "forward-looking
  opportunity", not yet a real discovery mechanism any agent consumes. Skipped.
