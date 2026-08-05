import { NextResponse } from 'next/server';

/**
 * LAYER 2 — routing-level block for the local-only curation tooling.
 *
 * Next.js 16 renamed the `middleware` file convention to `proxy` (function
 * `middleware` -> `proxy`). Proxy runs before filesystem routing and before the
 * static/CDN cache, so this 404s prerendered pages as well as route handlers.
 *
 * This is a BACKSTOP for a layer-1 (next.config.ts pageExtensions) failure, not
 * the primary defence — per Vercel's CVE-2025-29927 postmortem, proxy/middleware
 * must never be the sole method of protecting a route. It also cannot protect
 * anything served from /_next/static, which is outside every matcher.
 */

// Inlined rather than imported from lib/devOnly: proxy is bundled separately
// from the app graph, and keeping it dependency-free avoids pulling node:fs in.
// Kept in sync with PLATFORM_MARKERS in lib/devOnly.ts. We host on RAILWAY, so
// a VERCEL-only check would be inert here — see lib/devOnly.ts for why this
// layer matters (it is the backstop for deploying with NODE_ENV=development).
const IS_LOCAL_DEV =
  process.env.NODE_ENV === 'development' &&
  !['RAILWAY_ENVIRONMENT', 'RAILWAY_PROJECT_ID', 'RAILWAY_SERVICE_ID', 'VERCEL',
    'RENDER', 'FLY_APP_NAME', 'DYNO', 'AWS_EXECUTION_ENV', 'K_SERVICE']
    .some((k) => Boolean(process.env[k]));

export function proxy() {
  if (!IS_LOCAL_DEV) {
    return new NextResponse(null, { status: 404 });
  }
  return NextResponse.next();
}

/**
 * Matcher notes — verified against Next 16.2.12's own matcher compiler
 * (`getMiddlewareMatchers` in next/dist/build/analysis/get-page-static-info.js):
 *
 * - '/admin:path*' and '/admin/:path*' compile to the SAME regex. Both cover
 *   bare /admin and /admin/anything. Neither covers a sibling like /admin-tools.
 * - Segment matchers therefore do NOT close the adjacent-prefix hole:
 *   '/api/curate/:path*' misses /api/curate-export. So does '/api/curate:path*'.
 * - The custom-regex param below is what actually closes it. Verified matching:
 *     /admin, /admin/curate, /api/curate, /api/curate/list,
 *     /api/curate-export, /api/decisions, /api/decisions-dump  -> matched
 *     /api/other, /directory                                    -> not matched
 *
 * Consequence to remember: any FUTURE public route under /admin* or under
 * /api/{curate,decisions,raw,admin}* will 404 in production while working
 * locally. That is intentional. Do not put a public route on those prefixes.
 */
export const config = {
  matcher: ['/admin:path*', '/api/:path((?:curate|decisions|raw|admin).*)'],
};
