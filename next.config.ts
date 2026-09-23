import type { NextConfig } from 'next';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';
import { onManagedPlatform } from './lib/devOnly';
import { PRODUCTION_HOSTS } from './lib/deployEnv';
import { PUBLIC_ASSET_CACHE_CONTROL, PUBLIC_ASSET_SOURCE } from './lib/publicAssetCache';
import { HOMEPAGE_AGENT_LINKS } from './lib/agentPaths';

/* ------------------------------------------------------------------ *
 * LAYER 1 — build-time exclusion of the local-only curation tooling.
 * ------------------------------------------------------------------ *
 *
 * The curation files are named `page.dev.tsx` / `route.dev.ts`. Next only
 * treats a file as a route when its suffix is listed in `pageExtensions`
 * (node_modules/next/dist/server/lib/find-page-file.js builds
 * /(^|[\/])(page|route)\.(<pageExtensions>)$/). Registering the `dev.*`
 * suffixes only for the dev SERVER means that in any build those files are not
 * routes at all: never compiled, never bundled, absent from every manifest.
 * They ARE still type-checked by `next build`, so the tooling cannot rot.
 *
 * The gate keys off the Next build PHASE, not NODE_ENV. This is the important
 * part: phase is supplied by the Next CLI and is NOT an environment variable,
 * so it cannot be set from a deploy platform's project settings. Gating on
 * `NODE_ENV === 'development'` instead would let anyone who can set that one
 * variable on the host re-emit all three routes.
 */
const BASE_EXTENSIONS = ['ts', 'tsx', 'js', 'jsx'];
const DEV_ONLY_EXTENSIONS = ['dev.ts', 'dev.tsx', 'dev.js', 'dev.jsx'];

const isDev = process.env.NODE_ENV === 'development';

/* ------------------------------------------------------------------ *
 * Security headers.
 * ------------------------------------------------------------------ *
 * Every allowlisted origin below is traced to code in this repo:
 *   cdn.shopify.com      -> data/products.json, all 6409 `image` values are
 *                           cdn.shopify.com and nothing else (verified).
 *   s.skimresources.com  -> app/layout.tsx:37, rendered only when
 *                           NEXT_PUBLIC_SKIMLINKS_ID is set (Railway env only,
 *                           so it never renders on a dev laptop).
 *   *.skimlinks.com      -> Skimlinks link-lookup / pixels. UNVERIFIED host
 *   *.skimresources.com     set — this is the main reason the CSP ships
 *                           Report-Only. Mirrored across script/img/connect so
 *                           the policy is at least internally consistent.
 *
 * HOST NOTE: this app deploys to RAILWAY (long-running `next start` container),
 * not Vercel. Earlier drafts of this policy allowlisted vercel.live,
 * ws-us3.pusher.com and assets.vercel.com for the Vercel Toolbar. Those are
 * dead weight here and have been removed — every origin below is reachable
 * from this codebase on this host.
 *
 * Deliberately NOT allowlisted:
 *   fonts.gstatic.com / fonts.googleapis.com — next/font self-hosts. Verified:
 *     9 woff2 files emitted to .next/static/media, referenced by relative URL;
 *     `grep -rl gstatic .next` returns nothing. Adding them would be cargo cult.
 *   the ~30 brand domains in data/products.json — those appear only in `url`,
 *     i.e. outbound anchors. Top-level navigation is not governed by CSP.
 *   Cross-Origin-Embedder-Policy — cdn.shopify.com serves no CORP header, so
 *     COEP would blank all 6409 product images. Do not add it.
 */
const csp = [
  "default-src 'self'",
  // Next emits 17 inline <script> tags per page (RSC flight data), so
  // 'unsafe-inline' is unavoidable without nonces — and nonces would force
  // dynamic rendering on every page, killing static generation for a catalogue
  // site. Be honest about the consequence: this CSP is a third-party-origin and
  // exfiltration control, NOT meaningful XSS protection.
  // 'unsafe-eval' is dev-only (React's error overlay); prod bundles contain no
  // eval/new Function (verified by grep over .next/static/chunks: 0 hits).
  // js.ciphera.net -> app/layout.tsx, the Pulse analytics script (production
  // only). Served from BunnyCDN AMS1. Note its event endpoint is a DIFFERENT
  // host and belongs in connect-src, not here.
  // plausible-production-09f2.up.railway.app -> app/layout.tsx, a second,
  // self-hosted analytics script run alongside Pulse purely to compare the
  // two (Tina, 2026-09-23). Unlike Pulse, script and event endpoint are the
  // SAME host, so this one entry covers both script-src and connect-src.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://s.skimresources.com https://skimresources.com https://*.skimresources.com https://skimlinks.com https://*.skimlinks.com https://challenges.cloudflare.com https://js.ciphera.net https://plausible-production-09f2.up.railway.app`,
  // 118 style={{...}} props -> 146 inline style attributes, plus real inline
  // <style> elements in VerifiedSpotlight.tsx:66, EditMagazine.tsx:50,
  // MagnifierHero.tsx:66.
  "style-src 'self' 'unsafe-inline'",
  // WooCommerce brands (e.g. La Femme) serve images from their own domain, not a
  // shared CDN — each such host is allowlisted explicitly (kept in sync with
  // ALLOWED_IMAGE_HOSTS in lib/catalogue.test.ts).
  "img-src 'self' data: blob: https://cdn.shopify.com https://cms.themodestyhouse.com https://lafemmecollectie.nl https://kimodesty.com https://chador.nl https://i0.wp.com https://www.aneesaitaly.com https://vivizubedi.com https://abayasboutique.com https://skimresources.com https://*.skimresources.com https://skimlinks.com https://*.skimlinks.com",
  // next/font self-hosts every woff2 under /_next/static/media (verified).
  "font-src 'self'",
  // localhost ws:// is for the Turbopack HMR socket. headers() applies to
  // `next dev` too, and Safari has historically not matched ws:// against
  // 'self'. Cheap insurance so the enforcing flip does not break dev.
  // pulse-api.ciphera.net -> where js.ciphera.net/script.js POSTs to
  // (/api/v1/events). Verified by reading the script, not assumed: the CDN host
  // that serves the script is NOT the host that receives the beacons, so
  // omitting this would let the script load and then drop every event silently.
  `connect-src 'self' https://skimresources.com https://*.skimresources.com https://skimlinks.com https://*.skimlinks.com https://pulse-api.ciphera.net https://plausible-production-09f2.up.railway.app${isDev ? ' ws://localhost:* http://localhost:*' : ''}`,
  // Turnstile renders its widget in an iframe on challenges.cloudflare.com;
  // with frame-src 'none' the challenge silently fails to appear and every
  // submission is then rejected server-side.
  "frame-src https://challenges.cloudflare.com",
  // No <video>/<audio>/<source> exists today. Declared explicitly so that
  // adding a CDN-hosted one fails loudly against a real directive rather than
  // silently against the default-src fallback.
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  // Tightened from "'self' mailto:" once /api/contact replaced the broken
  // mailto: form in components/Footer.tsx. Every form on the site now posts
  // to our own origin.
  "form-action 'self'",
  "frame-ancestors 'none'",
  // NOTE: per CSP3 this directive is IGNORED while the policy is Report-Only.
  // It becomes active on the flip to enforcing.
  'upgrade-insecure-requests',
  // Without a collector, report-only violations land only in the devtools
  // console of whoever happens to look. This routes them to the server log.
  'report-uri /api/csp-report',
  'report-to csp-endpoint',
].join('; ');

const securityHeaders = [
  // ENFORCING. Held in Report-Only until the allowlist could be checked against
  // the real deployment; verified 2026-08-05 against https://themodestyhouse.com:
  // every <script src> and stylesheet on /, /directory, /editorial,
  // /editorial/[slug], /designers and /privacy is same-origin, there are zero
  // iframes, and the only cross-origin subresource is cdn.shopify.com (images).
  //
  // Skimlinks was NOT rendering at the time of the flip (NEXT_PUBLIC_SKIMLINKS_ID
  // unset on Railway — 0 occurrences in the served HTML), which is what made the
  // flip safe to make now. Its hosts stay allowlisted in script/img/connect so
  // that setting the key later does not silently break the affiliate script —
  // but re-verify this policy the first time that script actually ships.
  { key: 'Content-Security-Policy', value: csp },
  { key: 'Reporting-Endpoints', value: 'csp-endpoint="/api/csp-report"' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Enforcing from minute one (frame-ancestors is inert while report-only).
  // Nothing legitimately frames this site — on Railway there is no dashboard
  // preview iframe to worry about — so DENY is unambiguously correct.
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  // One-way door: commits every subdomain to HTTPS for 2 years in any browser
  // that has visited. Deliberately no `preload` — that is baked into browser
  // binaries and is painful to reverse.
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains',
  },
];

export default function nextConfig(phase: string): NextConfig {
  // `onManagedPlatform()` (lib/devOnly.ts) checks Railway/Vercel/Render/etc
  // marker env vars. We host on RAILWAY, so a `!process.env.VERCEL` check would
  // be inert here. The phase check is the load-bearing half; this is belt.
  const isDevServer =
    phase === PHASE_DEVELOPMENT_SERVER && !onManagedPlatform();

  // TRIPWIRE. `NODE_ENV=development next build` would otherwise flip every
  // NODE_ENV-keyed guard in the codebase at once. Verified: this throws before
  // any manifest or chunk is written — `.next/app-path-routes-manifest.json`
  // does not even exist after the failed build.
  if (!isDevServer && process.env.NODE_ENV === 'development') {
    throw new Error(
      'Refusing to build with NODE_ENV=development: this would deploy the ' +
        'local-only curation routes (/admin/curate, /api/curate). ' +
        'Unset NODE_ENV or set it to "production".',
    );
  }

  return {
    pageExtensions: isDevServer
      ? [...BASE_EXTENSIONS, ...DEV_ONLY_EXTENSIONS]
      : BASE_EXTENSIONS,

    // data/decisions.json is a committed 434 KB artifact that no runtime code
    // path needs (only scripts/*.mjs and the dev-only curation tool read it).
    // Keep it out of the deployed function bundle entirely.
    outputFileTracingExcludes: {
      '/**': ['data/decisions.json', 'data/rejected.json', 'data/review.json'],
    },

    /**
     * Permanent redirects for retired routes.
     *
     * /hijabi-outfits was retired 2026-08-19. It was one of the original four
     * lanes and its idea was sound — "shop hijabi-owned brands" — but the
     * premise dissolved as the catalogue grew: 112 of 113 brands carry
     * `community: 'hijabi'`, so the lane resolved to the whole directory minus
     * one house (HUM Clothing), at 3.2 MB. It was Google-indexed and carried a
     * handful of impressions, so it gets a 308 to the page it had become a copy
     * of, rather than a 404 that throws that signal away.
     *
     * 308 (permanent: true) rather than 307: this is not coming back, and a
     * permanent redirect is what tells Google to transfer signal and drop the
     * old URL from the index.
     *
     * NOTE the /style/* pages deleted on 2026-08-09 deliberately get NO redirect
     * and still 404 — correct, because no page replaced them. A redirect is only
     * right when a genuine destination exists, which is the case here.
     */
    async redirects() {
      return [
        /*
         * /directory ("All Clothing") was replaced by /new-in on 2026-09-01 at
         * Tina's request. A 308 rather than a 404 because it was the site's
         * highest-intent indexed URL and one of the entries in sitemap.xml; a
         * 404 discards whatever ranking it holds instead of passing it on.
         *
         * /hijabi-outfits's own 308 below was repointed from /directory to
         * /new-in in the SAME change, so that URL does not become a chain of
         * two redirects — a chain loses signal at every hop and is slower for
         * anyone who still holds the old address.
         */
        { source: '/directory', destination: '/new-in', permanent: true },
        { source: '/hijabi-outfits', destination: '/new-in', permanent: true },
        /*
         * /modest-wedding-guest was retired 2026-08-27 (see lib/lanes.ts). It
         * is sent to /modest-dresses rather than /directory — Tina's choice
         * between the two — because that is the closest thing the site still
         * has to what the URL promised: the lane matched
         * `occasion: 'wedding' | 'formal'`, and dresses is where most of those
         * 775 products live.
         *
         * A redirect rather than a 404 because Google had the URL indexed: it
         * was one of the 35 entries in sitemap.xml. A 404 discards whatever
         * ranking it held instead of passing it on.
         */
        { source: '/modest-wedding-guest', destination: '/modest-dresses', permanent: true },
        /*
         * Prayer wear moved from Layering Basics to Hijabs & Scarves on
         * 2026-08-26 (Tina: "put prayer sets under hijabs"), so
         * /layering-basics?type=prayer-set no longer describes anything.
         *
         * Without this it does not 404 — resolveSubtype() returns null for an
         * unknown type and the page falls back to the plain Basics lane — which
         * is WORSE than a 404 for a URL that was in sitemap.xml: Google would
         * keep an indexed address that now shows unrelated products. The 308
         * sends it to the same filter on its new lane.
         *
         * `has` is required because Next matches redirects on pathname only;
         * without it every /layering-basics visit would be redirected.
         */
        {
          source: '/layering-basics',
          has: [{ type: 'query', key: 'type', value: 'prayer-set' }],
          destination: '/modest-hijabs?type=prayer-set',
          permanent: true,
        },
        /*
         * /outerwear was split into blazers-vests, cardigans-sweaters and
         * jackets-coats on 2026-08-21 (Tina, comparing H&M's category names:
         * "i want outerwear gone"). Nobody added a redirect, so for five days
         * it simply 404ed — and it was NOT a dead URL. Checked in Search
         * Console on 2026-08-26: `/outerwear` is `Submitted and indexed`, and
         * so are `?type=blazer`, `?type=vest`, `?type=cardigan` and
         * `?type=coat`. `/outerwear` also holds **position 22.0** over the last
         * 28 days, the best position of any lane on the site. A 404 throws all
         * of that away.
         *
         * SUBTYPE-BY-SUBTYPE, not one blanket redirect to a lane. Each of the
         * four indexed `?type=` URLs has an exact successor, and sending them
         * all to one lane would hand Google four addresses that resolve to
         * content they did not describe — the same fault the prayer-set entry
         * above exists to avoid.
         *
         * The `(?<t>…)` named capture is load-bearing. Next passes source query
         * params through to the destination UNLESS the destination consumes
         * them, so matching on a literal value and writing `?type=blazer` by
         * hand yields `?type=blazer&type=blazer`. Capturing and re-using `:t`
         * marks the param as used, and one value comes back.
         *
         * `?type=sweater` is the one variant Google has never seen, and it is
         * covered anyway — it costs nothing and the URL is real.
         *
         * `coat` names `/jackets-coats` with no query, and Next appends
         * `?type=coat` anyway — MEASURED on staging, not assumed: the pass-through
         * described above applies to a literal `has` value too, not only to a
         * capture. It is harmless and was left alone rather than fought: that lane
         * is entirely coats and has no LANE_SUBTYPES entry, so `?type=coat`
         * resolves to null and renders the plain lane (h1 "Jackets & Coats"), and
         * the page's canonical is the clean `https://themodestyhouse.com/jackets-coats`,
         * so Google consolidates the two addresses itself. Verified live.
         *
         * Bare `/outerwear` goes to `/jackets-coats` as the closest single
         * match to what an "outerwear" query means. It must come LAST: Next
         * takes the first matching rule, and a source with no `has` matches
         * every /outerwear request including the four above.
         */
        {
          source: '/outerwear',
          has: [{ type: 'query', key: 'type', value: '(?<t>blazer|vest)' }],
          destination: '/blazers-vests?type=:t',
          permanent: true,
        },
        {
          source: '/outerwear',
          has: [{ type: 'query', key: 'type', value: '(?<t>cardigan|sweater)' }],
          destination: '/cardigans-sweaters?type=:t',
          permanent: true,
        },
        {
          source: '/outerwear',
          has: [{ type: 'query', key: 'type', value: 'coat' }],
          destination: '/jackets-coats',
          permanent: true,
        },
        { source: '/outerwear', destination: '/jackets-coats', permanent: true },
      ];
    },
    async headers() {
      return [
        { source: '/(.*)', headers: securityHeaders },
        {
          source: '/(admin|api|staff)/:path*',
          headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
        },
        /*
         * public/ photographs become cacheable at the Cloudflare edge. Without
         * this Next sends them `max-age=0`, and Cloudflare re-checks every one
         * with Railway on every request (`REVALIDATED`, never `HIT`). The
         * reasoning, and the directives that must never be added, live in
         * lib/publicAssetCache.ts.
         */
        /*
         * Agent discovery on the homepage only (RFC 8288): where the sitemap,
         * the llms.txt description and the markdown twin live, so an agent
         * gets all three from the response headers of one request.
         * docs/log/2026-09-13-agent-discovery-files.md
         */
        {
          source: '/',
          headers: [{ key: 'Link', value: HOMEPAGE_AGENT_LINKS }],
        },
        {
          source: PUBLIC_ASSET_SOURCE,
          headers: [{ key: 'Cache-Control', value: PUBLIC_ASSET_CACHE_CONTROL }],
        },
        /*
         * NON-PRODUCTION HOSTS ARE NEVER INDEXABLE.
         *
         * staging.themodestyhouse.com runs the same code, the same catalogue
         * and the same 30k-URL sitemap as the live site, from a public
         * hostname. Left alone that is a duplicate-content competitor to the
         * real domain, and it is specifically the copy that is allowed to be
         * broken.
         *
         * The condition is `missing` rather than `has`, i.e. it matches every
         * host that is NOT production, rather than naming staging. That is the
         * load-bearing detail: a Railway default *.up.railway.app domain, a
         * future preview environment, or a staging service someone forgets to
         * configure are all covered the moment they exist. Naming staging
         * explicitly would protect exactly the one host we already remembered.
         *
         * A `missing` array is AND-ed, and a request has exactly one Host, so
         * this fires only when the host is neither entry in PRODUCTION_HOSTS.
         *
         * `noarchive` is in there because a cached copy of a staging page is
         * still a public copy of an unreleased page.
         *
         * Verify with:
         *   curl -sI https://staging.themodestyhouse.com/ | grep -i x-robots-tag
         *   curl -sI https://themodestyhouse.com/       | grep -i x-robots-tag   # nothing
         */
        {
          source: '/(.*)',
          missing: PRODUCTION_HOSTS.map((value) => ({ type: 'host' as const, value })),
          headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }],
        },
      ];
    },
  };
}
