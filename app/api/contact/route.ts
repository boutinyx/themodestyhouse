import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { validateContact, sendContactEmail, emailConfig, verifyTurnstile } from '@/lib/contact';

export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 16_384;

/**
 * Burst limiter. In-memory ON PURPOSE, with eyes open about what that means:
 * it resets on redeploy and is per-container, so it is a speed bump against a
 * naive flood, NOT a rate limit. The real limit belongs at the Cloudflare edge,
 * which sees every request regardless of how many containers exist.
 */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  // Bound the map so a spray of spoofed IPs cannot grow it without limit.
  if (hits.size > 5_000) {
    for (const [k, v] of hits) {
      if (!v.some((t) => now - t < WINDOW_MS)) hits.delete(k);
    }
  }
  return recent.length > MAX_PER_WINDOW;
}

function clientIp(req: NextRequest): string {
  // Cloudflare sets CF-Connecting-IP and it cannot be spoofed by the client on
  // a proxied hostname. x-forwarded-for is the fallback for direct Railway hits.
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
      { ok: false, error: 'Too many messages in a short time. Please try again in a minute.' },
      { status: 429 },
    );
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, error: 'That message is too long.' }, { status: 413 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, error: 'Malformed request.' }, { status: 400 });
  }

  const result = validateContact(body);
  if (!result.ok) {
    // A bot that tripped the honeypot gets the same 200 a human gets. Telling it
    // that it was detected only helps it try again differently.
    if (result.botDetected) return NextResponse.json({ ok: true });
    return NextResponse.json({ ok: false, errors: result.errors }, { status: 400 });
  }

  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
  if (turnstileSecret) {
    const token = typeof body.turnstileToken === 'string' ? body.turnstileToken : '';
    if (!token || !(await verifyTurnstile(token, turnstileSecret, ip === 'unknown' ? undefined : ip))) {
      return NextResponse.json(
        { ok: false, error: 'Could not verify that you are human. Please reload and try again.' },
        { status: 403 },
      );
    }
  } else {
    // Loud, not silent: the form still works, but nobody should discover the
    // spam gate was never switched on by finding the inbox full.
    console.warn('contact: TURNSTILE_SECRET_KEY is not set — spam protection is OFF');
  }

  const cfg = emailConfig();
  if (!cfg) {
    // Never pretend the message was delivered. A contact form that silently
    // drops mail is worse than one that is visibly down.
    console.error('contact: email is not configured (RESEND_API_KEY / CONTACT_TO_EMAIL / CONTACT_FROM_EMAIL)');
    return NextResponse.json(
      { ok: false, error: 'The contact form is not available right now. Please email us directly.' },
      { status: 503 },
    );
  }

  try {
    await sendContactEmail(result.fields, cfg);
  } catch (e) {
    console.error('contact: send failed', e);
    return NextResponse.json(
      { ok: false, error: 'We could not send that just now. Please try again, or email us directly.' },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
