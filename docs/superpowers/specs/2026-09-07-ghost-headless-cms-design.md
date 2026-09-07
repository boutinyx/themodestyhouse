# Ghost as a headless CMS for `/editorial`, self-hosted on Railway

**Date:** 2026-09-07 · **Status:** approved by Tina, section by section, 2026-09-07
**Author:** Claude (Fable 5.1), from three research workflows (60 agents, every
load-bearing claim adversarially verified against Ghost v6.62.0 source, docs.ghost.org,
docs.railway.com, Mailgun's pricing page, and this repo). The verified findings are in the
session transcript; the facts this design rests on are restated here with their source.

## Goal

Tina writes and publishes editorial posts in Ghost's editor instead of committing markdown
files. The site keeps rendering `/editorial` in the house design, reading posts from Ghost's
Content API. A publish in Ghost is live on themodestyhouse.com within seconds. The footer
newsletter sign-up creates a Ghost member with double opt-in. The five existing posts move
into Ghost with identical URLs. Nothing about the site's SEO wiring, schema, sitemap, llms
feeds, or the homepage feature card is lost.

Decisions Tina made during brainstorming, in order:

1. Ghost is **headless**: the writing tool only. No visitor ever sees a Ghost-rendered page.
2. Publishes reach the site **via webhook, within seconds**, not by rebuild or timer alone.
3. The five markdown posts are **imported into Ghost and the markdown reader retired**.
4. The footer sign-up **is wired to Ghost members** (newsletter later, list now).
5. **Self-hosted on Railway Hobby with Mailgun for all Ghost mail**, over Railway Pro +
   Resend SMTP and over Ghost(Pro).
6. Editorial prose links **get the same affiliate/UTM tagging as product links** (a policy
   change: `components/Markdown.tsx` was deliberately exempt).
7. Existing addresses Tina has received by email are **not** imported into Ghost.

## Facts that shaped the design

Each of these would have produced a different design if false. All verified 2026-09-07.

| Fact | Consequence | Source |
|---|---|---|
| Railway blocks outbound SMTP on Free/Trial/Hobby plans; the project is on Hobby. | Ghost cannot use Resend SMTP. Ghost has no Resend HTTP transport (its transport list is smtp, mailgun, ses, sendmail, direct, stub). Mailgun's HTTP API is the only transactional path that also covers newsletters. | docs.railway.com/networking/outbound-networking, `@tryghost/nodemailer@2.3.1` |
| Ghost 6.62.0 is current; it needs Node `^22.23.1` and MySQL 8.0/8.4 in production. | Pin `ghost:6.62.0-alpine` (never a floating tag) and `mysql:8.4`. | GitHub releases, docs.ghost.org/faq/supported-databases |
| Railway's own Ghost guide deploys `ghost:5-alpine`; its one-click template deploys Ghost 4.47.4 on Node 16 with no volume. No Ghost template on Railway is verified. | Build from Railway API primitives (`serviceCreate`, `volumeCreate`, `variableCollectionUpsert`, `customDomainCreate`). | docs.railway.com/guides/ghost, Railway GraphQL `template(code:"ghost")` |
| Ghost must persist `/var/lib/ghost/content`; a Railway volume is the only way; a volume-bearing service cannot have replicas and has brief downtime on redeploy. | One volume per service; the site caches Ghost data so a Ghost restart is invisible. | docs.ghost.org/config, docs.railway.com/volumes |
| The Cloudflare cache rules on the zone have **no hostname condition** and were observed caching `/ghost` and `/ghost/api/admin/site` at the edge. | The Ghost hostname is **DNS-only** (grey cloud). Railway terminates TLS; the zone's SSL mode is already `Full`, which Railway requires. | Live probe against the zone's rulesets, `docs/log/2026-08-26-cloudflare-html-caching.md` |
| Production HTML is edge-cached for 3600 s. | "Live within seconds" requires the webhook to purge the affected URLs at Cloudflare, after the origin is confirmed fresh (§10.47). | Same log |
| `cacheComponents` is off in this repo, so `'use cache'`/`cacheTag` are unavailable; `fetch` is not cached by default in Next 16; `revalidateTag(tag, 'max')` deliberately serves stale to the next request; `updateTag()` throws in a Route Handler. | Cache with `fetch(url, { next: { tags, revalidate } })`; invalidate with `revalidateTag(tag, { expire: 0 })` + `revalidatePath(literal)`. | `next.config.ts`, nextjs.org/docs for 16.2 |
| Ghost 6 removed `?limit=all` and silently coerces any limit above 100 to 100. | The client paginates and reconciles the row count against `meta.pagination.total`. | Ghost `optimization.maxLimit` middleware |
| Ghost's public sign-up endpoint (`/members/api/send-magic-link/`) creates no member until the emailed link is clicked; needs an integrity token from `/members/api/integrity-token/`; is rate-limited **per IP**, nine requests then a 10-minute lockout escalating to 12 h; Ghost enables Express `trust proxy` by default so a forwarded `X-Forwarded-For` is honoured. The Admin API alternative creates the member instantly, auto-subscribed, with no confirmation. | Proxy through `/api/subscribe` and forward the visitor's IP. Double opt-in stays Ghost's. | Ghost source: `web/members/app.js`, `web/shared/middleware/brute.js`, `shared/express.js` |
| Ghost refuses a cross-origin `r`/`redirect` at magic-link redemption and lands the reader on the Ghost host's root. The **free tier's `welcome_page_url`** is honoured cross-origin (it returns before the `r` check) but arrives with no query parameters and gets a `/` appended. | Set the free tier's welcome page to `https://themodestyhouse.com/subscribed`, a path with no query string. Add that page to the site. | Ghost `services/members/middleware.js:426-465` |
| The redemption cookie (`ghost-members-ssr`) is host-only on the Ghost origin. | themodestyhouse.com receives no cookie from a sign-up; the P0-D cookie-consent gap is not widened. | Same |
| Ghost's default theme would serve every post publicly at the Ghost host. `{{ghost_head}}` is a gscan *warning*, not fatal; a theme may ship `robots.txt` and `sitemap.xml` and Ghost serves them in preference to its own; RSS on the collection is disabled via `routes.yaml`; taxonomy RSS cannot be disabled. "Private site" mode does not block the Content API but replaces the theme's robots.txt and walls the members landing page. | A six-file redirect theme, not private mode. | gscan v6 run against a candidate theme; Ghost `frontend/web/site.js` |
| Self-hosted Ghost's image size set is the **merge** of the active theme's `config.image_sizes` and ten built-ins (w600, w1000, w1600, w2400, and six internal ones). An unknown width **302s to the full-size original** rather than 404ing. WebP is a URL path segment (`/format/webp/`), never negotiated. | The theme declares the site's widths; the image helper is restricted to the declared set plus built-ins and a test reads the theme file. | Ghost `handle-image-sizes.js`, `overrides.json` |
| Ghost appends `?ref=<site>` to every external link in post HTML by default, and `withUtm()` never overwrites an existing key. `ref` is the affiliate parameter for losyana.shop. | Turn outbound link tagging off in Ghost **and** strip `?ref=` in the renderer before `withUtm()`. | Ghost Settings → Analytics; `lib/outbound.ts:77` |
| React 19.2 throws on a string `style` prop, drops string event handlers, neuters `javascript:` hrefs, but **does execute `<script>` elements** rendered as React nodes; `dangerouslySetInnerHTML` has none of those protections. Real Ghost HTML contains `<script src>` from HTML cards and `onerror=` on bookmark thumbnails. | Render Ghost HTML as React elements through an **explicit tag allowlist**; the allowlist is the sanitiser. | Verified against React 19.2.4 in this repo's `node_modules` |
| Ghost webhooks carry `X-Ghost-Signature: sha256={hex}, t={ms}` where hex = HMAC-SHA256(secret, rawBody + t); delivery timeout 2 s, 5 retries; **a 410 response deletes the webhook permanently**; `previous` holds only the changed keys, so `previous.slug` is the old slug on a rename and the only slug on a delete. | Verify signature over the raw body; answer 200 fast and do the work in `after()`; never return 410; revalidate both slugs. | Ghost `services/webhooks/` |
| Mailgun Free: $0, 100 emails/day, 1 custom sending domain, API sending. The sandbox domain sends to 5 pre-authorised addresses only. Ghost's docs quote a stale "600/month". Basic: $15/month, 10,000/month. | Free tier is enough for confirmation mail; a real newsletter needs Basic. | mailgun.com/pricing 2026-09-07 |
| Ghost's transactional Mailgun transport reads `mail__options__url` as an **origin only** (it url-joins `/v3/{domain}/messages`); the bulk `baseUrl` **carries `/v3`** (Ghost takes `.origin`). Setting `bulkEmail__mailgun__*` in config silently disables the Admin UI's Mailgun fields. | Transactional in env vars; bulk in Ghost Admin; the two URL shapes are written down here so they are never copied into each other. | Ghost `compose.dev.mailgun.yaml`, `mailgun-client.js`, `mailgun.js@8.2.2` |
| Member magic-link mail is sent from `members_support_address`, which defaults to `noreply@<host of config.url>`, i.e. `noreply@cms.themodestyhouse.com`. Everything else is sent from `mail.from`. | Both are set to addresses on the Mailgun-verified domain. | Ghost `email-address-service.ts`, `settings-helpers.js` |

## Architecture

```
Tina ── writes in ──▶ Ghost Admin  https://cms.themodestyhouse.com/ghost
                         │  (Railway service `ghost`, ghost:6.62.0-alpine, volume /var/lib/ghost/content)
                         │  MySQL 8.4 over private network (Railway service `mysql`, volume /var/lib/mysql)
                         │  Mailgun HTTP API (EU) for every email Ghost sends
                         │
          Content API    │    Webhook on publish / edit / unpublish / delete
          (key, https)   │    signed, one per environment
                         ▼                          ▼
   lib/ghost.ts ──▶ lib/posts.ts (async) ──▶ app/… consumers      app/api/ghost/revalidate
   (paginate, map)   Post type unchanged                          verify → 200 → after():
                                                                 revalidateTag + revalidatePath
                                                                 → regenerate at origin
                                                                 → purge Cloudflare URLs (prod only)

   Footer pill ──▶ /api/subscribe ──▶ Ghost /members/api/integrity-token + send-magic-link
                   (existing route,     with X-Forwarded-For = visitor IP, over the private network
                    honeypot, limiter)  ──▶ Ghost emails the confirmation ──▶ click ──▶ /subscribed
```

Ghost's own front end is a six-file theme whose only job is noindex + redirect to the site.

## Components

### Railway (new)

| Service | Image | Volume | Key variables |
|---|---|---|---|
| `mysql` | `mysql:8.4` (pinned) | `/var/lib/mysql` | `MYSQL_ROOT_PASSWORD`, `MYSQL_DATABASE=ghost`, `MYSQL_USER=ghost`, `MYSQL_PASSWORD` |
| `ghost` | `ghost:6.62.0-alpine` (pinned; re-pins are deliberate commits) | `/var/lib/ghost/content` | see below |

`ghost` variables, spellings verified against Ghost's own `compose.dev.mailgun.yaml`:

```
url=https://cms.themodestyhouse.com
NODE_ENV=production
database__client=mysql            # Ghost's documented value; self-normalises to mysql2 (verified in the 6.62.0 tarball)
database__connection__host=${{mysql.RAILWAY_PRIVATE_DOMAIN}}
database__connection__port=3306
database__connection__user=${{mysql.MYSQL_USER}}
database__connection__password=${{mysql.MYSQL_PASSWORD}}
database__connection__database=${{mysql.MYSQL_DATABASE}}
mail__transport=Mailgun
mail__from="The Modesty House" <hello@mail.themodestyhouse.com>
mail__options__auth__api_key=<Mailgun private API key>
mail__options__auth__domain=mail.themodestyhouse.com
mail__options__url=https://api.eu.mailgun.net     # ORIGIN ONLY. Never /v3 here.
```

Bulk (newsletter) credentials are entered in Ghost Admin → Settings → Email newsletter, with
base URL `https://api.eu.mailgun.net/v3`. They are **not** set as `bulkEmail__*` env vars,
because doing so silently disables the Admin fields.

Custom domain `cms.themodestyhouse.com` is created on the `ghost` service first; Railway
returns a unique `<random>.up.railway.app` CNAME target, which is then written to Cloudflare
as a **DNS-only** CNAME. Healthcheck path `/ghost/api/admin/site/`.

Both existing Next.js services gain: `GHOST_URL=https://cms.themodestyhouse.com`,
`GHOST_CONTENT_KEY`, `GHOST_WEBHOOK_SECRET` (different per service), and
`GHOST_INTERNAL_URL=http://ghost.railway.internal:2368` (runtime only; private networking is
unavailable during the build phase, so the build uses `GHOST_URL`). Production additionally
needs `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ZONE_ID` for the purge; staging must not have them.

### Cloudflare (DNS only)

- `cms` CNAME → Railway target, **grey cloud**.
- Mailgun's verification records for `mail.themodestyhouse.com` (TXT for SPF and DKIM, MX for
  inbound if Mailgun requires it), DNS-only.
- Whether the token in `.env` can write DNS is unknown (it reads DNS, rulesets and settings;
  the staging CNAME has been an open step since 2026-08-24). Probe with a throwaway TXT record
  that is deleted in the same script. If the probe fails, the records are handed to Tina.

### Mailgun (Tina creates)

Account on the Free plan, sending domain `mail.themodestyhouse.com` in the **EU region**, one
private API key. The design does not depend on the region beyond the two URL strings above;
if EU is unavailable on Free, the US URLs are `https://api.mailgun.net` and
`https://api.mailgun.net/v3` and the privacy fact list changes (Mailgun/Sinch, US).

### Ghost settings (after Tina completes owner setup at `/ghost`)

| Setting | Value | Why |
|---|---|---|
| Owner display name | The Modesty House | Bylines read `primary_author.name`; today every post says "The Modesty House". |
| Settings → Analytics → outbound link tagging | off | `?ref=` collides with losyana.shop's affiliate key. |
| Email newsletter → open tracking, click tracking | off | The site is cookieless and its privacy policy says so; per-subscriber tracking is a different promise. |
| Membership → Access → subscription access | Anyone can sign up | The public endpoint returns 400 otherwise. |
| Membership → Tiers → Free → Welcome page | `https://themodestyhouse.com/subscribed` | The only cross-origin landing Ghost honours. Path only, no query string or fragment. |
| Email newsletter → support address (`members_support_address`) | `hello@mail.themodestyhouse.com` | Otherwise confirmation mail is sent from `noreply@cms.themodestyhouse.com`, which Mailgun will reject as an unverified domain. |
| Make site private | **off** | It would wall the members landing route and replace the theme's robots.txt. |
| Integrations → Custom integration "themodestyhouse.com" | Content key, Admin key, two webhooks | See webhook section. |

Webhooks (both in the one integration; a given `(event, target_url)` pair cannot be registered
twice, so each host needs its own):

| Event | Target | Secret |
|---|---|---|
| `post.published`, `post.published.edited`, `post.unpublished`, `post.deleted` | `https://themodestyhouse.com/api/ghost/revalidate` | production secret |
| same four | `https://themodestyhouse-staging-production.up.railway.app/api/ghost/revalidate` | staging secret |

Not `post.edited`: it fires on every draft keystroke save and is a superset of the four.

### The redirect theme — `ghost-theme/` in the repo

Six files. Verified with gscan v6 to activate with zero fatal findings while omitting
`{{ghost_head}}` and `{{ghost_foot}}` (each costs one non-blocking warning).

| File | Content |
|---|---|
| `package.json` | `name: "modesty-house-headless"`, semver `version`, `author.email`, `engines.ghost: ">=6.0.0"`, `keywords: ["ghost-theme"]`, `config.posts_per_page: 1`, `config.card_assets: false`, `config.image_sizes: { xs: {width: 400}, m: {width: 900}, xl: {width: 1440} }` — the three widths `lib/staticImage.ts::EDITORIAL_WIDTHS` uses today. No `engines.ghost-api`. |
| `default.hbs` | `<meta name="robots" content="noindex, nofollow, noarchive">`, `{{{block "redirect"}}}`, a one-line body with a plain link to the target for anyone with scripting off. No `{{ghost_head}}`. |
| `index.hbs` | `{{#contentFor "redirect"}}` → meta refresh + `location.replace("https://themodestyhouse.com/")`. |
| `post.hbs` | same, to `https://themodestyhouse.com/editorial/{{slug}}/`. |
| `page.hbs` | to the site root (without it, pages render through `post.hbs`). |
| `error.hbs` | noindex + link home, so a 404 on the Ghost origin is not an un-noindexed built-in page. |
| `robots.txt` | `User-agent: *` / `Disallow: /`. **Cached for one year** by Ghost's theme static handler, so it is verified live once and never edited casually. |
| `sitemap.xml` | An empty `<urlset>`; shipping the file suppresses Ghost's generated one. |

`routes.yaml` (uploaded via `POST /ghost/api/admin/settings/routes/yaml`) sets `rss: false`
on the collection. Tag and author RSS cannot be disabled; robots.txt covers them.

`scripts/ghost-theme.mjs` zips the folder, uploads it (`POST /ghost/api/admin/themes/upload/`,
multipart field `file`), activates it (`PUT /ghost/api/admin/themes/modesty-house-headless/activate/`),
uploads `routes.yaml`, and then fetches `robots.txt`, `/`, and one post URL from the Ghost
origin and asserts the noindex meta and the redirect target. Ghost's own upload validation
is the gscan run; a 422 fails the script loudly.

### Site: data layer

**`lib/ghost.ts`** (server-only, Node)

- `ghostFetch<T>(path, params)` → `${GHOST_URL}/ghost/api/content/${path}?key=…&…` with
  `Accept-Version: v6.62`, `next: { tags: ['ghost-posts'], revalidate: 3600 }`.
  Throws a descriptive error on any non-2xx.
- `fetchAllPosts()` → `posts/?include=tags,authors&formats=html,plaintext&limit=100&page=N`
  until `meta.pagination.next === null`; asserts `rows.length === meta.pagination.total`,
  throwing otherwise (the §10.52 shape: a truncated page must never read as a small dataset).
  Never uses `?fields=` (it silently drops `primary_tag`/`primary_author`).
- `fetchPostBySlug(slug)` → `posts/slug/${slug}/?include=tags,authors&formats=html,plaintext`;
  404 → `undefined`, anything else throws. Tagged `['ghost-posts', 'ghost-post:<slug>']`.
- `ghostPostToPost(raw): Post` — the pure mapper, exported for tests:

| `Post` field | Ghost field | Rule |
|---|---|---|
| `slug` | `slug` | as is |
| `title` | `title` | as is |
| `dek` | `custom_excerpt` | required in practice: falls back to `excerpt` (Ghost's first 500 chars of plaintext), and the build-time assertion (below) reports posts with no `custom_excerpt` so Tina sees them. |
| `category` | `primary_tag.name` | `'Story'` when there is no tag (today's default). |
| `author` | `primary_author.name` | |
| `date` | `published_at` | normalised to `yyyy-mm-dd` (UTC). Sorting is done on the full ISO `published_at` inside `getPosts()` before mapping, so two posts on one day keep their order. |
| `image` | `feature_image` | absolute URL on `cms.themodestyhouse.com`, or `undefined`. |
| `imageAlt` | `feature_image_alt` | |
| `html` | `html` | **new name.** `body` is removed so every consumer fails to compile until it is updated — a markdown-only regex running over HTML would otherwise be a silent no-op. |
| `plaintext` | `plaintext` | for the llms-full feed. |
| `seoTitle` | `meta_title` | `undefined` when empty. |
| `seoDescription` | `meta_description` | `undefined` when empty. |

**`lib/posts.ts`** keeps `Post`, `seo()`, `formatDate()` (now tolerant of both the bare date
and a full ISO string), `getPosts()` and `getPost()` — the last two async, backed by
`lib/ghost.ts`. The markdown parser and the `content/editorial` read are deleted.
`getPosts()` no longer returns `[]` when something is missing; it throws.

**Consumers**, each gaining an `await` and the field rename: `app/page.tsx` (feature card and
`moreStories`), `app/editorial/page.tsx`, `app/editorial/[slug]/page.tsx`, `app/sitemap.ts`
(becomes `async function sitemap()`; the metadata route already awaits it),
`app/llms.txt/route.ts`, `app/llms-full.txt/route.ts` (uses `plaintext`; the heading-demotion
regex and its guarded test are retired).

### Site: rendering

**`components/GhostHtml.tsx`** — a Server Component. Dependency: `html-react-parser`
(MIT, 12 packages, ~1.8 MB, resolves its htmlparser2 build under Node). The `replace()` hook
is the whole renderer:

- **Allowed elements:** `p h2 h3 h4 ul ol li blockquote hr strong em b i code pre br a img
  figure figcaption` and Ghost's `kg-image-card`, `kg-callout-card`, `kg-button-card`,
  `kg-bookmark-card` wrappers (`div`/`figure`/`a` with those classes). Everything else —
  `script`, `style`, `iframe`, `svg`, `video`, `audio`, `form`, `input`, gallery, toggle,
  embed, HTML and Markdown cards, the `<!--members-only-->` neighbourhood — is dropped with
  its children. No `style`, `on*`, `id` or `data-*` attribute survives.
- **Links:** classify with `new URL(href, SITE_ORIGIN).origin === SITE_ORIGIN`, never
  `startsWith('/')` (Ghost emits protocol-relative `//host/…`). Same-origin → `<Link>`.
  External http(s) → delete `ref` when its value is our hostname, then `withUtm(href, 'editorial')`
  (`'editorial'` is added to `OutboundSurface`), `target="_blank"`,
  `rel="noopener noreferrer sponsored"`, `data-surface="editorial"`. Any other scheme → the
  text without a link.
- **Images:** Ghost's own `srcset` (`/size/w600/`, `/w1000/`, `/w1600/`, original) and
  `sizes="(min-width: 720px) 720px"` are kept as emitted — 720px is exactly the editorial
  column width. `loading="lazy"` kept, `decoding="async"` added, `width`/`height` kept.
  Only `img` whose `src` is on `GHOST_URL` is allowed; hotlinked images are dropped (the CSP
  would block them anyway and a broken image should not ship).
- **Cards:** `kg-button-card` renders as `.btn-pill`; `kg-callout-card` as a bordered
  parchment block; `kg-bookmark-card` as title + description + a link, no thumbnail
  (its thumbnail carries an `onerror=` handler and a third-party host).
- **Typography:** one unlayered `.editorial-prose` block in `app/globals.css` with today's
  exact values from `components/Markdown.tsx`: p/li `17px/1.72` on the prose colour, 20px and
  8px bottom margins; `ul { list-style: disc; padding-left: 22px }` (Tailwind's Preflight
  removes bullets); h2 serif `clamp(22px,2.6vw,30px)/1.15`, margin `38px 0 14px`; h3 serif
  `clamp(18px,2vw,22px)/1.2`, margin `30px 0 10px`; hr `1px solid var(--hairline)`, margin
  `34px 0`; a `var(--aubergine)` underlined at 2px offset; code as today's chip. The body
  colour `#4c4048` becomes `--prose` in `globals.css`; the eleven existing hardcodes across
  `app/` and `components/` are switched to the token in the same change so the new block is
  not a twelfth.
- `components/Markdown.tsx` stays for `content/legal/*.md` via `app/legal/LegalPage.tsx`.

### Site: images

**`lib/ghostImage.ts`**

- `ghostImageVariant(url, width)` → inserts `/size/w${width}/format/webp/` after
  `/content/images/` **only** when the URL's host is `GHOST_URL`'s host and `width` is in
  `GHOST_IMAGE_WIDTHS`; otherwise returns `undefined`, so the JSX falls back to the original
  exactly as `editorialVariant` does today.
- `ghostImageSrcSet(url)` over `[400, 900, 1440]`.
- `GHOST_IMAGE_WIDTHS` is `[400, 900, 1440]` — the theme's declared set. Ghost's ten
  built-ins (`w600 w1000 w1600 w2400` and six internal) also resolve but are not used.
- `lib/ghostImage.test.ts` reads `ghost-theme/package.json` and asserts every width in
  `GHOST_IMAGE_WIDTHS` is declared there, because an undeclared width does not 404 — it 302s
  to the full-size original, a silent page-weight regression.
- `next.config.ts` `img-src` gains `https://cms.themodestyhouse.com`.
- The four render sites (`app/page.tsx` feature card and side rail, `app/editorial/page.tsx`,
  `app/editorial/[slug]/page.tsx`) switch from `editorialVariant`/`editorialSrcSet` to the
  Ghost helpers. OpenGraph, Twitter and `articleSchema` already accept an absolute image URL.
- After the migration lands on production, `public/editorial/` and its WebP variants are
  deleted, `EDITORIAL_WIDTHS`/`editorialVariant`/`editorialSrcSet` are removed from
  `lib/staticImage.ts`, and `lib/staticImage.test.ts` drops its editorial-directory
  assertion (it currently crashes if the directory is empty). The about and edits families
  are untouched.

### Site: freshness

- The three editorial-bearing page routes (`/`, `/editorial`, `/editorial/[slug]`) and the
  three text routes (`/sitemap.xml`, `/llms.txt`, `/llms-full.txt`) carry
  `export const revalidate = 3600`. `force-static` is removed from the two llms routes.
  The floor equals the Cloudflare edge TTL, so a lost webhook degrades to one hour, never to
  "until the next deploy".
- `/editorial/[slug]` keeps `generateStaticParams` (from `fetchAllPosts()`; it **throws** on
  any error rather than returning `[]`) and keeps `dynamicParams` at its default `true`, so a
  post published after the last deploy renders on first request.
- **Build-time assertion** in `generateStaticParams`: post count ≥ 1 and equal to Ghost's
  reported total; posts with no `custom_excerpt` are printed as a warning list. An empty blog
  cannot ship silently through `app/editorial/page.tsx`, `sitemap.ts`, `llms.txt`.

**`app/api/ghost/revalidate/route.ts`**

1. Read the **raw** body text. Parse `X-Ghost-Signature` as `sha256=<hex>, t=<ms>`.
   Recompute HMAC-SHA256(`GHOST_WEBHOOK_SECRET`, rawBody + t). Compare with the existing
   constant-time `safeEqual` in `lib/adminAuth.ts` (exported for reuse). Reject if the secret
   env is unset, the header is missing, the digest differs, or `|Date.now() - t| > 5 min`,
   with one identical generic 401 for every failure (the `app/api/staff/login` pattern).
2. Parse the event. For `post.published`, `post.published.edited`, `post.unpublished`,
   `post.deleted`: collect `post.current?.slug` and `post.previous?.slug` (on delete
   `current` may be empty; `previous` is the only source).
3. Respond `200 {ok:true}` immediately. **Never 410.**
4. In `after()`: `revalidateTag('ghost-posts', { expire: 0 })`; `revalidatePath` for `/`,
   `/editorial`, `/editorial/<slug>` for each collected slug, `/sitemap.xml`, `/llms.txt`,
   `/llms-full.txt`; then GET each of those paths from the local origin
   (`http://127.0.0.1:${PORT}`) so they regenerate now rather than on the next visitor; then,
   **only when `CLOUDFLARE_ZONE_ID` is set** (production), purge those URLs by URL at
   Cloudflare — after the origin GETs, per §10.47. Log one line per step; a purge failure is
   logged, not swallowed.
5. The route lives under `/api/ghost/`, which `proxy.ts` does not 404 in production
   (`/api/admin*`, `/api/curate*`, `/api/decisions*`, `/api/raw*` are blocked).

Ghost retries up to five times on non-2xx; the handler is idempotent.

### Site: sign-up

`lib/subscribe.ts` keeps `validateSubscribe()`; `buildSubscribeEmail()` and the Resend send
are removed from this path (`emailConfig()` stays for `/api/contact`). New
`subscribeViaGhost(email, visitorIp)`:

1. `GET ${GHOST_INTERNAL_URL ?? GHOST_URL}/members/api/integrity-token/` → plain-text token
   (5-minute TTL).
2. `POST …/members/api/send-magic-link/` with JSON
   `{ email, emailType: 'subscribe', integrityToken, honeypot: '' }` and headers
   `X-Forwarded-For: <visitorIp>`, `X-Forwarded-Proto: https`. No `redirect` field (Ghost
   discards it) and no `newsletters` field (Ghost subscribes to every
   `subscribe_on_signup` newsletter, which is the default one).
3. `201` → `{ok:true}`. `400` (blocked domain, sign-ups closed, mail failure) → `{ok:false,
   error: 'Something went wrong. Please try again.'}` with the Ghost body logged server-side.
   `429` → the existing "Too many attempts" message.

`app/api/subscribe/route.ts` is unchanged apart from calling the new function with
`clientIp(req)`, which it already computes. The honeypot (`website`), the in-memory limiter,
the `{ok, error}` contract and the Pulse goal stay exactly as they are. The CSP is untouched
because the browser still posts to `'self'`.

**Two empirical checks on staging, written into the plan, with the fallback decided now:**

- Does Ghost, reached over the private network, accept the call (no `Host`/`X-Forwarded-Proto`
  redirect)? If not, use `GHOST_URL` for this call.
- Do ten sign-ups with ten distinct forwarded IPs stay under the limiter (the tenth from one
  IP must 429, the tenth across ten IPs must not)? If Railway's edge overwrites
  `X-Forwarded-For` when going via `GHOST_URL`, the fallback is a **browser-direct** POST to
  Ghost, which needs `https://cms.themodestyhouse.com` added to `connect-src` and the
  honeypot field renamed to Ghost's `honeypot`. That is the only design change the check can
  force, and it is bounded.

**`app/subscribed/page.tsx`**: noindex, renders the confirmation line the pill already uses
("Thank you — you're on the list.") and a link home. No new copy is composed; if Tina wants
different words there, they are hers to write (§10.18). Next's trailing-slash redirect turns
Ghost's appended `/subscribed/` into `/subscribed` with one 308.

### Migration — `scripts/ghost-import.mjs` (run once, locally, under `tsx`)

For each `content/editorial/*.md`:

1. Parse frontmatter with the existing rules (moved into the script, since `lib/posts.ts`
   loses them).
2. Convert the body to HTML with the same grammar `components/Markdown.tsx` implements —
   `##`/`###`, paragraphs, `- ` lists, `---`, `**bold**`, `*italic*`, `[text](url)`,
   `` `code` `` — nothing more, because nothing more is in the five files (verified).
3. Upload the cover from `public/editorial/` via `POST /ghost/api/admin/images/upload/`
   (multipart `file`, `purpose=image`); use the returned URL as `feature_image`.
4. `POST /ghost/api/admin/posts/?source=html` with `slug`, `title`, `html`,
   `custom_excerpt` (dek, ≤ 300 chars — the current deks fit), `meta_title`,
   `meta_description`, `feature_image`, `feature_image_alt`, `tags: [category]`,
   `published_at: <date>T09:00:00.000Z`, `status: 'published'`, `authors: [<owner email>]`.
   Category normalised: `Guide` → `Guides`.
5. Read the post back through the **Content** API and diff its `plaintext` against the
   source rendered to text; any difference is printed and fails the script.

Admin API auth: JWT `HS256`, `kid = key id`, `aud = "/admin/"`, `exp ≤ 5 min`, secret
hex-decoded before signing. Webhooks fire during this import (it is not Ghost's importer);
that is harmless because the site is not yet reading Ghost when it runs.

### Backup — `.github/workflows/ghost-backup.yml`

Nightly, after the catalogue refresh: `GET /ghost/api/admin/db/` with the Admin key from a
GitHub secret, written to `data/ghost-export.json`, committed to `main` only if changed.
Content and settings only. **Members are never exported to the repo.** A members backup is an
open item (below).

### Privacy policy — facts for Tina to word (copy is hers, §10.18)

The published policy currently states, in §2, that the newsletter address is not stored in a
database on this website and reaches us by email; §4/§7 name Resend and not Mailgun; §8 has no
newsletter retention row. Once this ships, the true facts are:

- A subscriber record (email, sign-up time, newsletter subscription, unsubscribe state) is
  stored in a database we control, hosted by Railway.
- Mailgun (Sinch), EU region, receives the address in order to send the confirmation email
  and any newsletter, and holds delivery logs for one day on the current plan.
- Consent is double opt-in: nothing is stored until the confirmation link is clicked. Ghost
  records the sign-up time.
- No open or click tracking in any email.
- Retention: until the reader unsubscribes (one-click link in every newsletter) or asks for
  erasure via the contact form.
- Resend remains the processor for the contact form only.

Engineering side, same commit as the wording: `lib/legal.test.ts` gains pins for `Mailgun`
and `Ghost`; the existing pins (`**Resend**`, "signing up to the newsletter", "never your
email address") must survive; `LEGAL_LAST_UPDATED` in `lib/legal.ts` is bumped by hand.

## Data flow, end to end

**Publish:** Tina clicks Publish → Ghost writes the post → fires `post.published` to both
hosts → each host verifies the signature, answers 200, invalidates the `ghost-posts` tag and
the affected paths (`/`, `/editorial`, the post's current and previous slug, `/sitemap.xml`,
`/llms.txt`, `/llms-full.txt`), regenerates them locally → production purges those URLs at
Cloudflare → the next visitor to `/`, `/editorial` or the post sees it. Expected wall-clock:
under ten seconds.

**Sign-up:** reader submits the pill → `/api/subscribe` validates, rate-limits, calls Ghost
with the reader's IP → Ghost sends "Confirm your subscription" from
`hello@mail.themodestyhouse.com` via Mailgun EU → reader clicks → Ghost creates the member,
subscribed to the default newsletter, sets a cookie on the Ghost host only, and 302s to
`https://themodestyhouse.com/subscribed/` → the site 308s to `/subscribed` and shows the
confirmation line.

**Build:** `next build` on Railway calls `GHOST_URL` (public) for `generateStaticParams`
and the prerender of `/editorial`; it fails if Ghost is unreachable or reports zero posts.

## Error handling

| Failure | Behaviour |
|---|---|
| Ghost down at build | Build fails with the fetch error in the log. Nothing deploys. |
| Ghost down at runtime | Cached data is served (ISR keeps the last good render for the hour and serves stale while regenerating). A cold container with no cache renders the error boundary; there is no silent empty blog. |
| Webhook secret unset or wrong | 401, identical body for both cases, logged. |
| Webhook after Ghost's 2 s timeout | Cannot happen for the response (it is sent before the work); Ghost may retry and the handler is idempotent. |
| Cloudflare purge fails | Logged with the API response; the hourly floor still applies. |
| Mailgun rejects a From address | Ghost logs `Failed to send email` and the sign-up returns 400 → the pill shows the generic error. The plan's first live test is a real send. |
| Unknown image width requested | Cannot happen: the helper refuses widths outside the tested set. |
| Ghost HTML contains a card outside the allowlist | Dropped silently in the render; the migration diff catches it for the five imported posts. A future post using an unsupported card simply shows nothing there — listed as an open item, not a defect. |

## Testing

All tests run against fixtures; CI never reaches Ghost.

- `lib/ghost.test.ts`: `ghostPostToPost` over a recorded Content API response (a real
  `v6.62` object with all 38 keys); date normalisation; `'Story'` default; the pagination loop
  over a mocked `fetch` that returns `total: 250` with three pages, and a negative control
  where the second page is short (must throw).
- `components/GhostHtml.test.tsx` (render to static markup): the fixture contains a
  `<script src>`, `onerror="…"`, `href="javascript:…"`, `href="//evil.example"`, a
  `style="white-space: pre-wrap;"` run, a `?ref=themodestyhouse.com` link to losyana.shop,
  an internal `/modest-dresses` link, a Ghost image card, a callout, a button. Assertions:
  no `<script>`, no `onerror`, no `javascript:`, the protocol-relative link is external and
  `target="_blank"`, the losyana link carries its affiliate `ref` and UTM and not Ghost's,
  the internal link is a `<Link>`, the image keeps `srcset` and `loading="lazy"`, the button
  has `btn-pill`.
- `lib/ghostImage.test.ts`: variant URL shape; refusal of foreign hosts and undeclared
  widths; widths ⊆ `ghost-theme/package.json` `config.image_sizes`.
- `app/api/ghost/revalidate/route.test.ts`: valid signature → 200; wrong secret, missing
  header, stale `t`, unset env → identical 401; delete payload with empty `current` still
  yields the previous slug.
- `lib/subscribe.test.ts`: existing validation cases stay; `subscribeViaGhost` over a mocked
  `fetch` asserts the two-request sequence, the forwarded IP header, and the 201/400/429
  mapping.
- `lib/posts.test.ts`: restructured — the top-level synchronous `getPosts()` feeding
  `describe.skipIf` is replaced by fixture-based tests of `seo()` and the mapper.
- `lib/legal.test.ts`: the new pins.
- `scripts/outbound-audit.mjs` gains `/editorial/<first sitemap slug>` and asserts
  `a[data-surface="editorial"][rel~="sponsored"]`.
- `scripts/visual-audit.mjs:39` derives its two post slugs from the deployed `sitemap.xml`.

**Staging verification (Playwright against the staging URL, evidence in the log):**
`/editorial` lists five posts with covers from `cms.`; a post page renders headings, lists,
links with the right `rel` and UTM; `/` shows the newest post as the feature; publish a test
post in Ghost and watch it appear on staging within ten seconds, then unpublish it and watch
it vanish; sign up with a real inbox, receive the Mailgun email from the right address, click,
land on `/subscribed`, see the member in Ghost Admin; the two rate-limit probes; `robots.txt`
and a post URL on `cms.` return noindex and the redirect; `npm run audit:interaction`,
`audit:visual`, `audit:outbound`, `tsc`, `lint`, `test` all clean.

## Sequencing (each phase ends with a `docs/log/` entry)

1. **Infra.** Railway `mysql` + `ghost` + volumes + variables + domain; Cloudflare DNS probe
   and records; Tina creates Mailgun (EU domain) and completes Ghost owner setup; Ghost
   settings and the Custom Integration; keys into Railway variables for both site services.
2. **Theme.** `ghost-theme/`, `routes.yaml`, `scripts/ghost-theme.mjs`; upload, activate,
   verify robots/noindex/redirect live.
3. **Migration.** Import the five posts and covers into Ghost; diff each against its source.
   This runs before any site code is pushed, because the build-time assertion in phase 4
   fails on an empty Ghost. Only Ghost changes; the site is untouched.
4. **Site.** On `staging`: `lib/ghost.ts`, `lib/posts.ts`, `GhostHtml`, `ghostImage`, CSP,
   `.editorial-prose` + `--prose`, consumers, freshness exports, webhook route, subscribe
   proxy, `/subscribed`, tests, audits. Pushed to `staging` once local `tsc`, `lint` and
   `test` are clean; verified on the staging URL.
5. **Verification** as above; then Tina's privacy wording lands with its test pins.
6. **Merge** to `main` on Tina's approval; purge Cloudflare; IndexNow runs on push; delete
   `public/editorial/` and the markdown family in a follow-up commit once production is
   confirmed serving Ghost covers.
7. **ADR** `docs/decisions/ADR-0003-ghost-headless-cms.md` and the nightly export workflow.

## Open items (not in this build, written down so they are not forgotten)

- **Members backup.** Railway Hobby has no volume backups and members must not go into the
  repo. Options: a periodic CSV export Tina downloads from Ghost Admin, or a `mysqldump` to
  private object storage. Decide before the list is large enough to hurt.
- **Embeds, galleries, video and toggle cards** are dropped by the renderer. Each needs its
  own hand-written CSS (Ghost's card CSS does not travel with the HTML) and the last two need
  JavaScript. Add when a post needs one.
- **Ghost version bumps.** The image is pinned; Ghost raises its Node floor inside a major
  and changes API limits between majors. Re-pin deliberately, re-run the theme upload and the
  staging checks.
- **Volume size.** 5 GB on Hobby, images only (posts live in MySQL). Watch it in Railway
  metrics; moving to R2 later needs a resizing layer in front, not just a bucket.
- **Draft previews in the house design.** The Content API never returns drafts. Ghost's own
  preview shows the redirect theme. If Tina wants to preview a draft on staging, that is an
  Admin-API read behind the staff session — a separate small feature.
- **`ghost.railway.internal` for Content API reads** at runtime (faster than the public
  round trip). Not needed for five posts; revisit if editorial grows.
- **Tag and author RSS** on the Ghost origin cannot be disabled; robots.txt disallows them.
