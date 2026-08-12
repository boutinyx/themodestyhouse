import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyPassword, createSessionCookie } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

/**
 * Burst limiter against password guessing. In-memory ON PURPOSE — same
 * caveat as app/api/contact/route.ts: resets on redeploy, per-container, a
 * speed bump not a real rate limit. There is exactly one password to guess
 * here, so this is meaningfully more important than on the contact form.
 */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5_000) {
    for (const [k, v] of hits) {
      if (!v.some((t) => now - t < WINDOW_MS)) hits.delete(k);
    }
  }
  return recent.length > MAX_PER_WINDOW;
}

function clientIp(req: NextRequest): string {
  return (
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    'unknown'
  );
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (rateLimited(ip)) {
    return NextResponse.json(
      { ok: false, error: 'Too many attempts. Try again in a minute.' },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Bad request.' }, { status: 400 });
  }
  const password = (body as { password?: unknown })?.password;
  if (typeof password !== 'string' || password.length === 0 || password.length > 500) {
    return NextResponse.json({ ok: false, error: 'Wrong password.' }, { status: 401 });
  }

  // Deliberately the same generic error for "unset env var" and "wrong
  // password" — a distinguishable response would tell an attacker whether
  // the deployment is even configured.
  if (!verifyPassword(password)) {
    return NextResponse.json({ ok: false, error: 'Wrong password.' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.headers.set('Set-Cookie', createSessionCookie());
  return res;
}
