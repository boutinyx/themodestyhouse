import type { NextConfig } from 'next';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';
import { onManagedPlatform } from './lib/devOnly';

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
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://s.skimresources.com https://skimresources.com https://*.skimresources.com https://skimlinks.com https://*.skimlinks.com`,
  // 118 style={{...}} props -> 146 inline style attributes, plus real inline
  // <style> elements in VerifiedSpotlight.tsx:66, EditMagazine.tsx:50,
  // MagnifierHero.tsx:66.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://cdn.shopify.com https://skimresources.com https://*.skimresources.com https://skimlinks.com https://*.skimlinks.com",
  // next/font self-hosts every woff2 under /_next/static/media (verified).
  "font-src 'self'",
  // localhost ws:// is for the Turbopack HMR socket. headers() applies to
  // `next dev` too, and Safari has historically not matched ws:// against
  // 'self'. Cheap insurance so the enforcing flip does not break dev.
  `connect-src 'self' https://skimresources.com https://*.skimresources.com https://skimlinks.com https://*.skimlinks.com${isDev ? ' ws://localhost:* http://localhost:*' : ''}`,
  "frame-src 'none'",
  // No <video>/<audio>/<source> exists today. Declared explicitly so that
  // adding a CDN-hosted one fails loudly against a real directive rather than
  // silently against the default-src fallback.
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  // mailto: is required by the newsletter form at components/Footer.tsx:65.
  // That form is itself broken (method="post" to mailto: does not work in
  // modern browsers) — when it is replaced with a real endpoint, tighten this
  // back to "form-action 'self'".
  "form-action 'self' mailto:",
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

    async headers() {
      return [
        { source: '/(.*)', headers: securityHeaders },
        {
          source: '/(admin|api)/:path*',
          headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
        },
      ];
    },
  };
}
