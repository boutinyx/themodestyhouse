# Launch readiness

Prioritized blockers for a public launch, each with the evidence it was found from and the
recommended fix. Assessed **2026-08-05** by a multi-agent audit with adversarial
fact-checking; the P0-A and P0-D findings were additionally confirmed by hand.

**Severity:** `P0` = do not launch without it · `P1` = fix in the first week ·
`P2` = quality debt, schedule it.

---

## P0-A · Security: the admin surface deploys publicly, unauthenticated — **RESOLVED**

> **Status: closed.** The curation routes are no longer emitted by `next build`.
> See "Local-only curation tooling" in `docs/architecture.md`. The record of the
> original finding is kept below because the exposure was live and the data it
> served must be treated as already disclosed.


**Evidence.** `npx next build` emits `/admin/curate` as a static route and `/api/curate` +
`/api/curate/list` as dynamic server functions — the only two in the app. Grepping
`app/` and `lib/` for auth/session/token/secret returns nothing. There is no
`middleware.ts` and no `vercel.json`. `app/robots.ts` disallows `/admin/` and `/api/`,
which is a crawler hint that also *advertises both paths*.

**What an anonymous user can do:**

- **Exfiltrate the curation IP.** `GET /api/curate/list` returns the full decisions map
  (~13.4k product ids across 39 brand prefixes, ~427 KB) with no auth and no rate limit.
  On any host where `raw-products.json` exists (local, Docker, VPS) the same request
  returns the entire 6.5 MB uncurated scrape — including everything deliberately cut.
- **Destroy the catalogue** wherever writes persist: enumerate ids from the list endpoint,
  `POST {"id":"…","decision":"cut"}` for each, and the next `build:data` publishes zero
  products. No audit trail — the file stores only the final value, no actor, no timestamp.
- **CSRF.** The admin UI POSTs with no `Content-Type`, making it a CORS *simple request* —
  no preflight, no Origin check, no token. Any page the owner visits can mutate decisions
  on a running dev server.
- **Write amplification.** `id` is validated only for truthiness — any string becomes a
  permanent key. Each request costs a 427 KB read + parse + ~480 KB write.
- **Non-atomic writes.** `loadDecisions()` → `writeFileSync()` with no lock and no
  temp-file-and-rename. An interrupted write truncates the JSON; `lib/rawData.ts` calls
  `JSON.parse` with **no try/catch**, so a truncated file 500s every curate route *and*
  crashes `build:data`. Recovery is git-only.
- **Silent failure on Vercel.** The admin page updates state optimistically and never
  checks `res.ok`. On Vercel the write throws EROFS (read-only filesystem) → 500 → the UI
  still shows success. An owner curating against production loses everything with no signal.

**Fix (cheapest first).** Delete `app/admin/curate` and `app/api/curate` from the deployed
build and curate only against `npm run dev` on localhost — nothing they write can reach the
site without a commit anyway. If keeping them: a `middleware.ts` gate on a shared secret,
**plus** an early `if (process.env.NODE_ENV === 'production') return notFound()` in both
handlers and the page. Server-side persistence on Vercel is impossible as designed; if it's
ever wanted, decisions must move to Vercel KV / Postgres / a git commit via API.

---

## P0-B · Durability: the business exists on one laptop

**Evidence.** `git remote -v` is **empty**. One branch, last commit 2026-08-03, with ~39
dirty/untracked paths on top. `data/raw-products.json` (6.5 MB — the only regenerable input
to `build-data.mjs`) is gitignored and unbacked.

This is the finding that already cost us: a destructive scrape permanently deleted
thousands of products because there was no backup.

**Fix, in order:**

1. Add `.cache/`, `.venv-style/`, `conversations/`, `tsconfig.tsbuildinfo` to `.gitignore`
   **first** — `git add -A` would otherwise try to stage ~3 GB.
2. `git add -A`, then verify `git status` shows nothing from those directories.
3. Decide on `public/inbox-preview.png` — already tracked, 1.2 MB, mode 0600, referenced by
   nothing. By name and permissions it looks like a private screenshot committed by
   accident. **This is a bigger disclosure risk than the untracked directories because it
   is already in history and goes up with the first push.**
4. Create a **private** GitHub repo and push.
5. `git gc --prune=now` to reclaim the ~2.5 GB of loose blobs.
6. Back up `raw-products.json` somewhere durable (or gzip and track it).

Note `conversations/` is 74 MB of local tooling session transcripts, mode 0600. Do not
commit it.

---

## P0-C · The repo at HEAD does not build

**Evidence.** Files that `app/` already imports are untracked: `content/` (both editorial
posts), `public/style-it/` (16 PNGs rendered above the fold on the homepage),
`public/hero-archive.jpg`, `components/{StyleIt,EditorsRail,VerifiedSpotlight,MagnifierHero,Markdown,EditMagazine}.tsx`,
`lib/{posts,specialty,stylePieces}.ts`, `lib/exclude.test.ts`, `data/exclusions.json`,
`scripts/add-brands.mjs`, `app/editorial/[slug]/`.

A fresh clone is missing all of it, so the first clean deploy fails.

**Fix.** Commit everything `git status` shows as untracked *except* `.cache/`,
`.venv-style/` and `conversations/`, then prove it with a clean-clone build:

```bash
git clone . /tmp/verify && cd /tmp/verify && npm ci && npm run build
```

`raw-products.json` will be absent in the clone — that's expected and is exactly what the
check is for.

---

## P0-D · Legal and compliance: zero surface, EU/UK audience

**Evidence.** No `/privacy`, no `/terms`, no FTC affiliate disclosure anywhere in `app/` or
`components/`, and no cookie consent. `components/Footer.tsx` prints "Privacy · Terms" as
**inert text**, so it already looks like the pages exist. The Skimlinks `<Script>` in
`app/layout.tsx` fires unconditionally on every page load with no consent gate.
`data/brands.ts` carries 9 GBP and 2 EUR brands — an EU/UK audience, which is precisely
what triggers GDPR/ePrivacy.

**Fix.**
- Ship `/privacy` and `/terms`; wire the footer links.
- Add a persistent affiliate disclosure: a site-wide footer line, a statement on `/about`,
  and one at the top of each editorial post.
- Gate the Skimlinks script behind consent for EU/UK traffic.
- Add `sponsored` to the outbound link in `components/Markdown.tsx` — editorial body links
  are the highest-converting affiliate placement and exactly what an FTC or Google reviewer
  inspects. (Verified: 4 outbound links carry `rel="noopener noreferrer sponsored"`, 4 omit
  `sponsored`.)

---

## P0-E · Monetization is a stub

**Evidence.** Grepping the tree for `skimlink|affiliate|utm_|tag=|ref=` returns two hits
outside the README: `app/layout.tsx` reads `NEXT_PUBLIC_SKIMLINKS_ID` and injects the
script. **Nothing rewrites hrefs, appends params, or wraps outbound URLs.** Product URLs
are plain `${brand.homepage}/products/${handle}` built in `lib/normalize.ts`. With the env
var unset, the site ships ~5,000 free referrals and earns nothing.

Skimlinks only monetizes merchants in its network — small independent Shopify stores
(mariam-col.com, glowmodesty.com, jawda.co.uk, lumosmodesty.com) are unlikely to be in it.

**Trap:** `NEXT_PUBLIC_*` is inlined **at build time** and every page is static — setting
the key in the Vercel dashboard does nothing until a fresh deploy. It's easy to add the
key, see no script in the page source, and conclude it's broken.

**Fix.** Audit which of the 34 brands are actually monetizable (Skimlinks lookup, plus
Awin/ShareASale for the UK/EU names). Add an optional per-brand `affiliate` field in
`data/brands.ts`. Introduce **one** `buildOutboundUrl()` helper used by `ProductCard`,
`QuickView`, `EditorsRail`, `BrandCard` and `VerifiedSpotlight`, and instrument outbound
clicks there. Note `noreferrer` strips the Referer header — fine for Skimlinks' redirector,
but a direct Awin/ShareASale link would silently lose attribution.

---

## P1-A · Page weight: Core Web Vitals failure on the two commercial pages

**Evidence (measured from built output).**

| Route | HTML | Records carried | Cards visible |
|---|---|---|---|
| `/hijabi-outfits` | 2,439,164 B | 4,760 | 24 |
| `/directory` | 1,520,928 B (+1,339,306 B `.rsc`) | 2,842 | 24 |
| `/modest-hijabs` | 976,443 B | 1,918 | 24 |
| `/` | 84,848 B | — | — |

**Cause.** Server pages hand the full array to a `'use client'` component, so React
serializes every record into the RSC flight payload embedded in the HTML — ~471 B/record,
paid twice.

**Fix.** Interim: `slice(~300)` before passing down in `app/[lane]/page.tsx` and
`app/directory/page.tsx` — that alone takes `/hijabi-outfits` from 2.44 MB to roughly
150 KB. Proper: pass only the first page plus a compact facet index (garment/occasion/
brand/vibe counts) and move filtering to server-handled `searchParams`, which also makes
filters shareable and back-button-correct (they currently are not).

**Separately: fix or retire the `hijabi-outfits` lane.** Its predicate is
`p.community === 'hijabi'` and *every* product in the catalogue has that value, so the lane
is a no-op that renders the entire catalogue.

---

## P1-B · Images

**Evidence.** Zero `next/image` usages. All ~5,000 images are hotlinked from
`cdn.shopify.com` via raw `<img>` with **no width/height** (unbounded CLS across every
grid), no srcset, no AVIF/WebP. Only `ProductCard` sets `loading="lazy"` — EditorsRail,
QuickView, StyleIt, Header and the home mosaic are eager. `VerifiedSpotlight` and
`EditMagazine` use CSS `background-image`, invisible to the preloader.
`next.config.ts` has no `images.remotePatterns`.

**Fix.** Add explicit width/height (or `aspect-ratio`) to stop layout shift;
`fetchpriority="high"` on the first row and `loading="lazy"` below; add
`images.remotePatterns` for `cdn.shopify.com` so `next/image` can be adopted incrementally.
**Price the transformation quota first** — Vercel bills per source image and there are ~5k.

**Asset cleanup:** delete `public/hero.mp4` (11 MB, referenced by nothing — the live hero is
`header.mp4`) and `public/hero-poster.jpg` (340 KB). Convert `public/style-it/*.png`
(8.2 MB across 16 files) to WebP. Resize `logo.png` to its rendered 48 px. `app/icon.png`
is 315 KB and coexists with `favicon.ico`, so every page requests a 315 KB icon.

---

## P1-C · No monitoring

No analytics, no speed insights, no error tracking, no `vercel.json`, no middleware. On
launch day there is no record of visits, page mix, errors — or **outbound clicks**, which
for an affiliate business is the single most important metric and is recorded nowhere.

**Fix.** Instrument in the same `buildOutboundUrl()` helper from P0-E. Add Vercel Analytics
and an error tracker.

---

## P1-D · SEO: the long tail is entirely on the floor

**Evidence.** ~5,000 products and 34 brands produce **16 sitemap URLs** and **zero
indexable product or brand-detail pages** — products live only in a client-side modal.
Zero `ld+json` / schema.org anywhere. No `alternates.canonical` on any route.
`twitter.card: 'summary_large_image'` is set with **no images key and no
`opengraph-image`**, so every social share renders a blank card. The sitemap omits
`/designers`, all three `/style/*` and both editorial posts, and sets
`changeFrequency: 'weekly'` with no `lastModified` (a freshness claim the pipeline doesn't
guarantee).

**Fix, in priority order:** OG image + per-route canonicals → `/designers/[slug]` brand
pages (34 pages of unique content, highest-value quick win) → complete the sitemap with
`lastModified` → BreadcrumbList + CollectionPage/ItemList JSON-LD.
**Hold off on Product JSON-LD until price freshness is solved** — stale prices in structured
data risk a Google manual action.

---

## P2 · Accessibility

- **No focus styling exists anywhere** — `globals.css` has zero `:focus`/`:focus-visible`
  rules. Keyboard users get UA defaults over custom backgrounds.
- **Navigation is keyboard- and touch-unreachable.** All three dropdowns open only via
  `hidden group-hover:block`, so inner links are `display:none` and un-Tabbable. No
  `aria-haspopup`/`aria-expanded`, no click or Escape handling. Nav's "Styles" trigger is a
  non-focusable `<span>`, so the entire `/style/[vibe]` section is unreachable from the
  header. **Do not propagate this pattern.**
- **`ProductCard`'s root is a `<div onClick>`** with no role, tabIndex or key handler — the
  primary interaction on three route families is mouse-only.
- **`QuickView`'s modal** has no `role="dialog"`, `aria-modal`, focus trap or focus restore.
- **Contrast failures (WCAG AA, normal text):** `.eyebrow` at 10px is ≈**3.8:1** and it's
  the most-used label class on the site; `.badge` ≈**3.1:1**; footer copyright ≈**4.2:1**.
- **No reduced-motion handling** except one rule in `VerifiedSpotlight`; the autoplay hero
  and StyleIt's shuffle both animate unconditionally.
- **No `not-found.tsx`, `error.tsx`, `global-error.tsx` or `loading.tsx`** anywhere —
  `notFound()` falls through to the unstyled Next default.
- **No skip link, and the home page has no `<main>`** (every other page has one).

## P2 · Visibly broken UI

- The footer newsletter is `<form action="mailto:…" method="post">` with an input that has
  **no `name`** — mailto+POST does nothing in any modern browser.
- Social links point at bare `pinterest.com` / `instagram.com` / `tiktok.com`.
- The homepage "Edit" section advertises **four hardcoded headlines that don't exist**, with
  thumbnails borrowed from product images; the two real posts are never surfaced.
- `lib/stylePieces.ts` hardcodes brands not in `BRANDS`, including **PrettyLittleThing** — a
  fast-fashion label in the second homepage section of a curated modest directory.

## P2 · Engineering guardrails

- **No CI.** Nothing runs tests/typecheck/lint/build on push, and Vercel deploys on push —
  so an untested commit ships. Add `"typecheck": "tsc --noEmit"` **and fix the
  `lib/normalize.test.ts` fixture** (missing `category`/`city`/`vibe`) before wiring it.
- **`npm run lint` is unusable as a gate** — `globalIgnores` in `eslint.config.mjs` replaces
  the preset's ignores, so ESLint descends into `.venv-style/`'s torch install: 72 of 76
  problems come from there. Add `.venv-style/**` and `.cache/**`. The 4 real issues are
  `react-hooks/set-state-in-effect` (DirectoryBrowser, FilterableGrid, QuickView) and
  `@next/next/no-html-link-for-pages` (StyleIt).
- **No pre-commit hooks, no prettier, no `.editorconfig`, no pinned Node version.**
- **No security headers** — empty `next.config.ts`, no `vercel.json`, no middleware. Add a
  `headers()` block; keep CSP report-only at first (Skimlinks, Google Fonts and
  `cdn.shopify.com` all need allowlisting).
- **Test coverage is thin**: only `tag.ts`, `normalize.ts` and `lanes.ts` have any. Zero
  component, script or API-route tests; no coverage tooling.
- **No runtime schema validation** on third-party Shopify JSON — it's cast `as Product[]`,
  so a feed shape change produces type-clean wrong data.

## P2 · Pipeline hardening

- Add `build:data` to the `build` script (or a prebuild hook) so `next build` can never
  ship a stale catalogue.
- Add a **`renormalize`** script that re-applies current normalize/tag rules to existing raw
  rows. Today every tagger fix needs a full destructive rescrape — which is why ~29
  `garment: 'other'` products are published and unfilterable.
- Gate `scrape.mjs` behind a confirmation flag; port `add-brands.mjs`'s backoff and
  per-brand incremental write into it; exit non-zero when any brand fails.
- Add integrity checks beyond the exclusion guard: product count must not drop >N%, every
  `BRANDS` slug must have rows, every published id must exist in decisions.
- Add word boundaries to exclusion patterns, plus a **dry-run tool** reporting what a new
  pattern would remove.
- Add a pruning step for dead `decisions.json` keys.
- Add a `scrapedAt` timestamp and show "price checked <date>" near prices — also good FTC
  hygiene. Schedule the refresh (Vercel Cron or a GitHub Action that opens a PR).
- **Rewrite the README.** It claims step 2 is "open /admin/curate, keep/cut with your eye";
  in reality `add-brands.mjs` auto-keeps everything and the real filter is
  `exclusions.json` + `inStock`. It also omits which files to commit — `data/products.json`
  is the only one that reaches the site.
- **Wire or delete the CLIP branch** (`scripts/tag_style.py`, `data/archetypes*.json`). It
  is documented but never connected, and accumulates 3+ MB of untracked JSON plus 2.5 GB of
  cached images.

---

## Scaling: when to leave flat JSON

**The flat-file store is not the bottleneck — the RSC payload is.** Get the framing right or
you'll optimize the wrong thing.

- ~5,000 products × ~453 B = 2.8 MB on disk, parsed only at build; 32 pages generate in
  ~370 ms. Comfortable.
- The real ceiling is **~471 B of payload per record**. A defensible 150 KB-gzip page budget
  is exhausted at roughly **3,000 products on one page** — and `/directory` (2,842) and
  `/hijabi-outfits` (4,760) are already at or past it.

**Sequence:**

1. **Fix the props problem first** (P1-A). Once payload is decoupled from catalogue size,
   flat files comfortably carry ~15,000–20,000 products.
2. Beyond that, memoize `getProducts()` (today it re-parses 2.8 MB on every call, three
   times per home render) — that buys a lot more headroom before any migration.
3. **Row count is the wrong migration trigger.** Move to Postgres (Supabase/Neon) or Turso
   the moment you need **any per-request write**, because Vercel's filesystem is read-only.
   Specifically: outbound click/commission tracking (you want this in week one),
   cross-device favourites (today `localStorage` only), brand self-submission, user
   accounts, or price freshness better than weekly. **Any one of those is the real
   threshold** — not the number of products.

**What stays static regardless:** the lane and vibe taxonomies (`lib/lanes.ts`,
`lib/vibes.ts` — data-driven route generation is the right shape), `data/brands.ts` (34
hand-curated rows edited by a human — belongs in git), `data/exclusions.json` (editorial
source, not runtime state), the editorial markdown, and the prerendering model itself. A
CDN-served static site is exactly right for an affiliate directory; the goal is to keep it
static while making the payload proportional to what's on screen.

**What should move regardless of scale:** `raw-products.json` needs a durable off-repo
backup. And `decisions.json` in its current form — thousands of keys, all `keep`, many
orphaned or pointing at blocked brands, reformatted wholesale by whichever writer touched it
last — is a file pretending to be a database. Either prune it and freeze the writer, or
drop the concept and make `build-data.mjs` default-allow-minus-exclusions, since
`exclusions.json` + `inStock` is what actually shapes the catalogue. This needs an ADR.
