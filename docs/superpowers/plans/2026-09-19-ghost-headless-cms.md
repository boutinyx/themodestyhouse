# Ghost headless CMS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Writers (Tina as Owner, others as Author) publish `/editorial` posts in a self-hosted Ghost; the site renders them in the house design and updates within seconds of a publish; the footer sign-up creates Ghost members with double opt-in.

**Architecture:** Ghost is headless (Railway `ghost` + `mysql`, Mailgun EU for mail). The site reads the Ghost Content API through `lib/ghost.ts` behind an unchanged `Post` type (`body` becomes `html`), renders HTML through an explicit-allowlist React renderer, and a signed webhook revalidates pages and purges Cloudflare.

**Tech Stack:** Next.js 16.2.12 (App Router), React 19.2.4, TypeScript strict, Vitest 4 (node env), `html-react-parser`, Ghost 6.62.0, MySQL 8.4, Mailgun HTTP API.

## Global Constraints

Source of truth: `docs/superpowers/specs/2026-09-07-ghost-headless-cms-design.md` plus `docs/superpowers/specs/2026-09-19-ghost-multi-author-addendum.md`. Read the relevant spec section before each task; exact values below are copied from it.

- Pin `ghost:6.62.0-alpine` and `mysql:8.4`; never a floating tag.
- Ghost hostname `cms.themodestyhouse.com` is **DNS-only** at Cloudflare (grey cloud). Staging URL is `https://themodestyhouse-staging-production.up.railway.app`.
- Writers are invited as **Author** role only, and only after a Mailgun test email is delivered.
- `Post` keeps every field except `body`, which becomes `html` (plus new `plaintext`), so every consumer fails to compile until updated.
- Content API: header `Accept-Version: v6.62`; page size 100; never `?limit=all`; never `?fields=`; reconcile `rows.length === meta.pagination.total` or throw.
- Ghost HTML is rendered as React elements through a tag allowlist. Never `dangerouslySetInnerHTML`.
- External links: `withUtm(href, 'editorial')`, `target="_blank"`, `rel="noopener noreferrer sponsored"`, `data-surface="editorial"`; strip `?ref=` when its value is our hostname; classify by `new URL(href, origin).origin`, never `startsWith('/')`.
- Ghost image widths are `[400, 900, 1440]` and must be declared in `ghost-theme/package.json`.
- Webhook: HMAC-SHA256(secret, rawBody + t) over `X-Ghost-Signature: sha256={hex}, t={ms}`; one generic 401 for every failure; answer 200 before work; **never return 410**; revalidate `previous.slug` and `current.slug`; Cloudflare purge only when `CLOUDFLARE_ZONE_ID` is set, after origin regeneration (§10.47).
- Revalidate floor `export const revalidate = 3600` on the three editorial routes and three text routes.
- Colour, border and shadow via `var(--token)` inline; icons Phosphor only; no invented user-facing copy (CLAUDE.md §10.18). `/subscribed` reuses the pill's existing line.
- Ship through `staging`: **do not push to `staging` until Ghost is live and seeded** — the build-time assertion fails on an empty Ghost. Develop on branch `feature/ghost-cms`. Never merge to `main` without Tina's approval.
- Stage files by explicit path, review `git diff --cached --name-only`, commit with `git commit -F <file> -- <paths>` (CLAUDE.md §10.20, §10.30, §10.39, §10.55).
- Commit trailer: `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.
- Every phase ends with `docs/log/2026-09-19-<slug>.md`. Address Tina by name in every reply.

## File Structure

| Path | Responsibility |
|---|---|
| `lib/ghost.ts` | Content API client: `ghostFetch`, `fetchAllPosts`, `fetchPostBySlug`, `ghostPostToPost` |
| `lib/ghostImage.ts` | `GHOST_IMAGE_WIDTHS`, `ghostImageVariant`, `ghostImageSrcSet` |
| `components/GhostHtml.tsx` | Allowlist HTML → React renderer |
| `lib/posts.ts` | `Post`, `seo()`, `formatDate()`, async `getPosts()`/`getPost()` over `lib/ghost.ts` |
| `app/api/ghost/revalidate/route.ts` (+ `lib/ghostWebhook.ts`) | Signature verify, slug collection, revalidate, purge |
| `lib/subscribe.ts` | `validateSubscribe()` kept; new `subscribeViaGhost()` |
| `app/subscribed/page.tsx` | Confirmation landing |
| `ghost-theme/` | Six-file redirect theme + `routes.yaml` |
| `scripts/ghost-theme.mjs`, `scripts/ghost-import.mjs`, `scripts/ghost-infra.mjs` | Theme upload, one-off migration, Railway provisioning |
| `.github/workflows/ghost-backup.yml` | Nightly content export |

---

### Task 1: Branch and dependency

**Files:** Modify `package.json`, `package-lock.json`

- [ ] **Step 1:** `git checkout -b feature/ghost-cms` (from `staging` at `c61083e`).
- [ ] **Step 2:** `npm install html-react-parser`. Expected: adds one dependency, no peer errors.
- [ ] **Step 3:** `git add package.json package-lock.json && git diff --cached --name-only`, then commit `chore(deps): add html-react-parser for the Ghost renderer`.

### Task 2: `lib/ghost.ts` — mapper and client

**Files:** Create `lib/ghost.ts`, `lib/ghost.test.ts`, `lib/__fixtures__/ghost-post.json`

**Interfaces — Produces:**
```ts
export type GhostRaw = { slug: string; title: string; custom_excerpt: string | null; excerpt: string;
  published_at: string; feature_image: string | null; feature_image_alt: string | null;
  html: string; plaintext: string; meta_title: string | null; meta_description: string | null;
  primary_tag: { name: string } | null; primary_author: { name: string } | null };
export function ghostPostToPost(raw: GhostRaw): Post;          // Post from lib/posts.ts (html, plaintext, no body)
export async function fetchAllPosts(): Promise<GhostRaw[]>;    // paginates, throws on total mismatch
export async function fetchPostBySlug(slug: string): Promise<GhostRaw | undefined>;
```

- [ ] **Step 1:** Write failing tests: mapper (dek falls back custom_excerpt → excerpt; category `'Story'` when no tag; author from `primary_author.name`, `'The Modesty House'` when absent; date `yyyy-mm-dd` UTC; empty `meta_title` → `undefined`); pagination over a mocked `fetch` with `total: 250` in 3 pages returns 250; negative control where page 2 is short throws; `fetchPostBySlug` 404 → `undefined`, 500 throws.
- [ ] **Step 2:** `npx vitest run lib/ghost.test.ts` → FAIL (module missing).
- [ ] **Step 3:** Implement per spec "Site: data layer". `ghostFetch` builds `${GHOST_URL}/ghost/api/content/${path}?key=${GHOST_CONTENT_KEY}&…` with `next: { tags: ['ghost-posts'], revalidate: 3600 }`; throws a descriptive error on non-2xx or missing env.
- [ ] **Step 4:** Run tests → PASS. Commit `feat(ghost): Content API client and post mapper`.

### Task 3: `lib/ghostImage.ts` and the theme manifest

**Files:** Create `lib/ghostImage.ts`, `lib/ghostImage.test.ts`, `ghost-theme/package.json`

- [ ] **Step 1:** Failing tests: `ghostImageVariant('https://cms.themodestyhouse.com/content/images/2026/09/a.jpg', 900)` → `https://cms.themodestyhouse.com/content/images/size/w900/format/webp/2026/09/a.jpg`; foreign host → `undefined`; width 500 → `undefined`; every width in `GHOST_IMAGE_WIDTHS` is a key in `ghost-theme/package.json` `config.image_sizes`.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement (`GHOST_IMAGE_WIDTHS = [400, 900, 1440]`, host compared to `new URL(process.env.GHOST_URL ?? 'https://cms.themodestyhouse.com').host`) and write the theme `package.json` per spec.
- [ ] **Step 4:** Run → PASS. Commit `feat(ghost): image variants restricted to the theme's declared widths`.

### Task 4: `components/GhostHtml.tsx`

**Files:** Create `components/GhostHtml.tsx`, `components/GhostHtml.test.tsx`; Modify `lib/outbound.ts` (add `'editorial'` to `OutboundSurface`)

- [ ] **Step 1:** Failing test with the fixture from the spec's Testing section (script, `onerror`, `javascript:`, protocol-relative link, `style`, losyana `?ref=` link, internal link, image card, callout, button). Assert every listed outcome via `renderToStaticMarkup`.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement the `replace()` hook per spec "Site: rendering" (allowlist, link classifier, image host check, card mapping).
- [ ] **Step 4:** Run → PASS. Commit `feat(ghost): allowlist HTML renderer`.

### Task 5: `lib/posts.ts` async and every consumer

**Files:** Modify `lib/posts.ts`, `lib/posts.test.ts`, `app/page.tsx`, `app/editorial/page.tsx`, `app/editorial/[slug]/page.tsx`, `app/sitemap.ts`, `app/llms.txt/route.ts`, `app/llms-full.txt/route.ts`, `app/globals.css` (`.editorial-prose`, `--prose`), `next.config.ts` (`img-src`), `.env.example`

- [ ] **Step 1:** Change `Post` (`body` → `html`, add `plaintext`); run `npx tsc --noEmit` and confirm the error list is exactly the consumers above (the compile-break is the test).
- [ ] **Step 2:** Rewrite `getPosts()`/`getPost()` async over `lib/ghost.ts`; delete the markdown parser; `formatDate` accepts bare dates and full ISO. Restructure `lib/posts.test.ts` to fixtures.
- [ ] **Step 3:** Update each consumer (`await`, `html`, `GhostHtml`, Ghost image helpers, `revalidate = 3600`, drop `force-static` on llms routes, `generateStaticParams` from `fetchAllPosts()` with the ≥1 and total assertion and no-`custom_excerpt` warning list).
- [ ] **Step 4:** Add `.editorial-prose` and `--prose`; switch the eleven `#4c4048` hardcodes to the token.
- [ ] **Step 5:** `npx tsc --noEmit`, `npm run lint`, `npx vitest run` → clean. Commit.

### Task 6: Webhook

**Files:** Create `lib/ghostWebhook.ts`, `lib/ghostWebhook.test.ts`, `app/api/ghost/revalidate/route.ts`; Modify `lib/adminAuth.ts` (export `safeEqual`)

- [ ] **Step 1:** Failing tests: valid signature accepted; wrong secret, missing header, stale `t` (>5 min), unset env → same result; delete payload with empty `current` yields the previous slug; rename yields both slugs.
- [ ] **Step 2:** Implement `verifySignature(rawBody, header, secret, now)` and `collectSlugs(payload)` as pure functions; the route reads raw text, returns 200 immediately, runs revalidate → local regeneration → optional Cloudflare purge in `after()`.
- [ ] **Step 3:** Tests PASS. Commit.

### Task 7: Sign-up through Ghost

**Files:** Modify `lib/subscribe.ts`, `lib/subscribe.test.ts`, `app/api/subscribe/route.ts`; Create `app/subscribed/page.tsx`

- [ ] **Step 1:** Failing tests for `subscribeViaGhost(email, ip)` over mocked `fetch`: request 1 GET integrity-token; request 2 POST send-magic-link with `{ email, emailType: 'subscribe', integrityToken, honeypot: '' }`, `X-Forwarded-For`, `X-Forwarded-Proto: https`; 201 → ok, 400 → generic error, 429 → "Too many attempts".
- [ ] **Step 2:** Implement; route calls it with `clientIp(req)`. `/subscribed` is noindex and reuses the pill's existing confirmation string.
- [ ] **Step 3:** Tests PASS. Commit.

### Task 8: Theme, scripts and backup workflow

**Files:** Create `ghost-theme/{default,index,post,page,error}.hbs`, `ghost-theme/{robots.txt,sitemap.xml,routes.yaml}`, `scripts/ghost-theme.mjs`, `scripts/ghost-import.mjs`, `.github/workflows/ghost-backup.yml`

- [ ] **Step 1:** Write the theme files exactly per spec "The redirect theme".
- [ ] **Step 2:** `scripts/ghost-theme.mjs`: zip, upload, activate, upload routes, then assert noindex and redirect on the Ghost origin; non-zero exit on any failure.
- [ ] **Step 3:** `scripts/ghost-import.mjs`: per spec "Migration" (frontmatter, markdown → HTML for the five-file grammar, cover upload, post create with `source=html`, Content-API read-back diff, `Guide` → `Guides`). Admin JWT HS256, hex-decoded secret, `aud: "/admin/"`.
- [ ] **Step 4:** `ghost-backup.yml` nightly export to `data/ghost-export.json`, committed only if changed; members never exported.
- [ ] **Step 5:** `node --check` each script; commit.

### Task 9: Infra (needs Tina for Mailgun and Ghost owner setup)

**Files:** Create `scripts/ghost-infra.mjs`

- [ ] **Step 1:** Using `RAILWAY_API_KEY`, create `mysql` and `ghost` services with pinned images, volumes, variables and the custom domain, per spec "Railway (new)". Report each created id.
- [ ] **Step 2:** Probe Cloudflare DNS write with a throwaway TXT record; create the `cms` CNAME (grey cloud) or hand the record to Tina.
- [ ] **Step 3:** **Tina:** create the Mailgun EU account and domain, give me the API key; complete Ghost owner setup at `/ghost`.
- [ ] **Step 4:** Apply Ghost settings, create the Custom Integration, set the site variables on both Next.js services.

### Task 10: Seed, verify, document

- [ ] **Step 1:** Run `scripts/ghost-theme.mjs`, then `scripts/ghost-import.mjs`; all five posts diff clean.
- [ ] **Step 2:** Push `feature/ghost-cms` to `staging`; verify on the staging URL with Playwright per spec "Staging verification", including a real Mailgun sign-up email.
- [ ] **Step 3:** Invite the writers as **Author** after the Mailgun test email lands.
- [ ] **Step 4:** Write `docs/log/2026-09-19-ghost-cms.md` and `docs/decisions/ADR-0003-ghost-headless-cms.md`. Ask Tina to approve the merge to `main`.
