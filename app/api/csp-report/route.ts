import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Collector for Content-Security-Policy-Report-Only violations.
 *
 * Without this, report-only violations land only in the devtools console of
 * whoever happens to be looking — which is the same as having no policy. The
 * one thing that cannot be tested locally (the Skimlinks script, because
 * NEXT_PUBLIC_SKIMLINKS_ID is unset outside Vercel) is exactly the thing the
 * soak needs real-user data for.
 *
 * Violations are written to the server log. On Vercel, read them with
 * `vercel logs <deployment>` or in the dashboard's Runtime Logs, filtering for
 * "csp-violation".
 *
 * This is an unauthenticated POST endpoint, so it is deliberately minimal:
 * it caps the body size, never parses anything huge, never writes to disk, and
 * always returns 204. Worst case it is a log-spam target — which is why the
 * whole thing should be deleted once the CSP is flipped to enforcing and
 * stable.
 */

const MAX_BODY_BYTES = 8_192;

export async function POST(req: NextRequest) {
  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) {
      return new NextResponse(null, { status: 413 });
    }
    // Accept both the legacy report-uri shape ({"csp-report": {...}}) and the
    // Reporting API shape ([{type, body}, ...]). Log verbatim; do not trust it.
    console.error('csp-violation', raw);
  } catch {
    // Never let a malformed report surface as a 500.
  }
  return new NextResponse(null, { status: 204 });
}
