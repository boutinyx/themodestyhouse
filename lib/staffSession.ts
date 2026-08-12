import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isValidSession, COOKIE_NAME } from '@/lib/adminAuth';

/**
 * Thin `next/headers` wrapper around lib/adminAuth's pure session check.
 * Split out so lib/adminAuth.ts stays framework-free and unit-testable —
 * `cookies()` only works inside a real request context, which vitest doesn't
 * provide.
 */
export async function hasStaffSession(): Promise<boolean> {
  const jar = await cookies();
  return isValidSession(jar.get(COOKIE_NAME)?.value);
}

/** Guard for /api/staff/* route handlers — a 401 body, not a bare 404: these
 *  routes are intentionally public knowledge (they're what powers a page
 *  Tina is logged into), unlike the dev-only /api/curate* routes, which 404
 *  to look like they don't exist at all. */
export async function requireStaffSession(): Promise<NextResponse | null> {
  if (await hasStaffSession()) return null;
  return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
}
