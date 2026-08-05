# Architecture

Verified against the codebase on **2026-08-05**.

## What the system is

A curated women's modest-fashion affiliate directory. It ingests product feeds from ~34
independent Shopify storefronts, applies an editorial filter, and publishes a browsable
catalogue that links out to the brands. There is no cart, no checkout, and no user
accounts — every commercial action is an outbound link.

The consequence that shapes everything: **the site is read-only at runtime**. All catalogue
pages are prerendered at build time, so the data layer can be flat files rather than a
database. See [ADR-0001](./decisions/ADR-0001-flat-json-storage.md).

## Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 16.2.12, App Router | Turbopack; no `/pages` directory |
| UI | React 19.2.4 | Server Components by default |
| Language | TypeScript 5, `strict: true` | `@/*` alias → repo root |
| Styling | Tailwind v4 (CSS-first) + CSS custom properties | **No `tailwind.config.js`** |
| Tests | Vitest 4 (node env) | No jsdom, no component tests |
| Scripts | tsx (for `.mjs` importing `.ts`) | `build-data.mjs` runs under plain node |
| Hosting | **Railway**, deploy-on-push | Long-running `next start` container. Filesystem IS writable (ephemeral — lost on redeploy/restart) |

Node version is **not pinned** — no `engines`, no `.nvmrc`, no `packageManager`.

## Module map

### Data layer
| Path | Role |
|---|---|
| `data/brands.ts` | The 34 curated brands. Hand-edited source of truth. |
| `data/raw-products.json` | Everything ever scraped. **Gitignored, single copy.** |
| `data/decisions.json` | `{productId: 'keep' \| 'cut'}` — default-deny publish gate. |
| `data/exclusions.json` | The real editorial kill-list: patterns, urlPatterns, ids, brands. |
| `data/products.json` | The published catalogue. Generated — never hand-edit. |

### Ingest
| Path | Role |
|---|---|
| `scripts/scrape.mjs` | Full refresh of all brands. **Destructive**, no retry. |
| `scripts/add-brands.mjs` | Targeted upsert by product id. Safe, retries 429s, checkpoints per brand. |
| `lib/normalize.ts` | `normalizeProduct()` + `pickImage()` — the only Shopify→Product boundary. |
| `lib/tag.ts` | `tagDiscovery()` — garment/occasion/season/activity classification. |
| `scripts/build-data.mjs` | The publish step. Applies decisions + exclusions + `inStock`, interleaves brands. |

### Read layer
| Path | Role |
|---|---|
| `lib/products.ts` | The four accessors (see below). Node `fs` — server only. |
| `lib/lanes.ts` | `LANES` — drives routes, nav, footer, sitemap, `generateStaticParams`. |
| `lib/specialty.ts` | `isSwim` / `isActivewear` / `isSpecialty` — read-time segregation. |
| `lib/vibes.ts` | `VIBES` + `brandVibe`. Plain data, deliberately **client-safe**. |
| `lib/houses.ts` | Brand cards, `newlyVerified()`, `categoryCards()`, `HERO_OVERRIDE`. |
| `lib/posts.ts` | Editorial markdown from `content/editorial/`. |
| `lib/types.ts` | Central domain types. Derive from these; don't redeclare. |

## Read-side accessors — the segregation rules

These encode editorial policy. Picking the wrong one is a product bug, not a style choice.

```ts
getProducts()          // everything published. Rarely correct for a UI surface.
browseProducts()       // minus hijabs, minus specialty. Use for any mixed/"everything" grid.
productsForLane(slug)  // lane predicate; strips specialty unless lane.specialty === true
productsForVibe(vibe)  // browseProducts() ∩ brandVibe[brandSlug]
```

**Why:** hijabs are a real category (~1.9k items) but the owner does not want them
intermixed with clothing — they belong on `/modest-hijabs`. Swim and activewear are
similarly confined to `modest-swimwear` and `modest-activewear`, the only two lanes flagged
`specialty: true`.

`getProducts()` is **uncached** — it re-reads and re-parses 2.8 MB on every call, and
`app/page.tsx` triggers it three times per render. Memoizing it is cheap headroom.

## Rendering model

Build output is 32 routes:
- **Static** — `/`, `/about`, `/designers`, `/editorial`, `/favourites`, `/privacy`,
  `/terms`, `/robots.txt`, `/sitemap.xml`
- **SSG** — `/[lane]` (×12), `/style/[vibe]` (×3), `/editorial/[slug]`
- **Dynamic (server functions)** — `/directory`, `/api/csp-report`

**Not in the build at all:** `/admin/curate`, `/api/curate`, `/api/curate/list`. Those
are local-only tooling. Their source files are named `page.dev.tsx` / `route.dev.ts`,
and `next.config.ts` registers the `dev.*` page extensions only in
`PHASE_DEVELOPMENT_SERVER` — so under `next dev` they are ordinary routes, and in any
build they are not routes at all. See "Local-only curation tooling" below and
`scripts/verify-gate.mjs`, which asserts this against the real build output in CI.

Routes are **data-driven**: adding a lane to `LANES` produces a route, nav entry, footer
link, sitemap entry and static params. Never hand-write a route file for a lane or vibe.

### The payload problem

Server pages pass **full product arrays** as props into `'use client'` components
(`DirectoryBrowser`, `FilterableGrid`). React serializes every record into the RSC flight
payload embedded in the HTML. Cost is ~471 bytes per record, paid twice (HTML + `.rsc`),
to render 24 visible cards.

Measured: `/hijabi-outfits` ≈ 2.4 MB, `/directory` ≈ 1.5 MB + 1.3 MB `.rsc`.

**This — not the JSON file — is the real scaling ceiling.** See
[`launch-readiness.md`](./launch-readiness.md) P1-A.

## Styling system

Four mechanisms, used deliberately:

1. **Tailwind utilities — layout only.** `flex`, `grid`, `max-w-[1220px]`, `md:` breakpoints.
2. **Semantic classes in `globals.css`** — `.serif`, `.eyebrow`, `.nav-link`, `.btn-pill`,
   `.badge`, `.chip`, `.aubergine-band`, `.no-scrollbar`, `.rail-arrow*`, `.tmh-cat-*`.
3. **Inline `style={{}}` with `var(--token)`** for all colour, border and shadow. This is
   the dominant mechanism; colour is never a Tailwind class.
4. **Raw `<style>` blocks** — only `VerifiedSpotlight`, `EditMagazine`, `MagnifierHero`.
   Global and unscoped. Don't add more.

**Tokens:** `--aubergine #441943` · `--plum #6e4a6b` · `--parchment #faf7f1` ·
`--brass #a98a5b` (badges/graphic only) · `--ink #241b24` · `--bone #fbfaf6` ·
`--muted #8a7d6b` (labels, not body) · `--hairline #e4ddcf`.
Radii: image 2px, card 6px, button 999px, input 8px.

**Fonts:** `--font-display` (Bodoni Moda) · `--font-label` (Marcellus) · `--font-ui` (Jost).
Never a family literal.

Two mobile breakpoints coexist: hand-written CSS uses **820px**, Tailwind `md:` is **768px**.

## Server/client boundary

Server by default. A component goes `'use client'` only for: state-driven filtering, DOM
measurement/refs, `usePathname`, context + localStorage, or timers.

`lib/products.ts`, `lib/rawData.ts` and `lib/posts.ts` use Node `fs` and **must never be
imported from a client component**. `lib/vibes.ts` exists as the client-safe data source.

Server components importing icons must use `@phosphor-icons/react/dist/ssr`.

## Known structural weaknesses

- **`/hijabi-outfits` matches everything** — its predicate is `community === 'hijabi'` and
  every product has that value. It prerenders the whole catalogue.
- **Zero `next/image`** — ~5k images hotlinked from `cdn.shopify.com` via raw `<img>` with
  no dimensions, causing layout shift on every grid.
- **Curation API has no auth** and deploys publicly (P0-A).
- **No runtime schema validation** on third-party feed JSON — it's cast `as Product[]`.
- **No caching layer** on the read accessors.
