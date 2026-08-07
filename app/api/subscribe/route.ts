import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { validateSubscribe, sendSubscribeEmail, emailConfig } from '@/lib/subscribe';

export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 4_096;

/**
 * Burst limiter. In-memory ON PURPOSE and with the same caveat as
 * app/api/contact/route.ts: it resets on redeploy and is per-container, so it
 * is a speed bump against a naive flood, not a real rate limit. The real limit
 * belongs at the Cloudflare edge.
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
  if (rateLimited(clientIp(req))) {
    return NextResponse.json({ ok: false, error: 'Too many attempts. Try again shortly.' }, { status: 429 });
  }

  const raw = await req.text().catch(() => '');
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, error: 'Request too large.' }, { status: 413 });
  }
  let body: unknown;
  try {
    body = JSON.parse(raw || '{}');
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request.' }, { status: 400 });
  }

  const result = validateSubscribe(body as { email?: unknown; website?: unknown });
  if (!result.ok) {
    // A bot that tripped the honeypot gets a 200 and no hint that it was caught.
    if (result.botDetected) return NextResponse.json({ ok: true });
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  const cfg = emailConfig();
  if (!cfg) {
    // Fail loudly rather than pretending. A silent success here would lose the
    // address AND tell the visitor they had signed up.
    console.error('subscribe: email is not configured (RESEND_API_KEY / CONTACT_TO_EMAIL / CONTACT_FROM_EMAIL)');
    return NextResponse.json({ ok: false, error: 'Sign-up is unavailable right now.' }, { status: 503 });
  }

  try {
    await sendSubscribeEmail(result.email, cfg);
  } catch (err) {
    console.error('subscribe: send failed', err);
    return NextResponse.json({ ok: false, error: 'Sign-up is unavailable right now.' }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
