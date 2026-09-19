/**
 * Newsletter sign-up, through Ghost's members API.
 *
 * Ghost owns the subscriber record and the double opt-in: `send-magic-link` creates NO
 * member until the emailed link is clicked, and Ghost mails the confirmation itself
 * (via Mailgun). This file only validates the address and relays it.
 *
 * Ghost rate-limits that endpoint PER IP (nine requests, then a 10-minute lockout that
 * escalates). Every reader would otherwise share this server's IP, so the visitor's own
 * address is forwarded in `X-Forwarded-For` (Ghost trusts the proxy header by default).
 * Two staging checks in the plan confirm that survives Railway's edge; the fallback if it
 * does not is a browser-direct POST, which needs `connect-src` widened.
 *
 * Replaces the Resend "notify the owner" path (ADR-0001's "no subscriber database" no
 * longer holds for this list). `emailConfig` stays in lib/contact for /api/contact.
 */

// Same permissive rule as the contact form: strict regexes reject valid addresses,
// and the real proof of deliverability is that mail arrives.
const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;
const MAX_EMAIL = 254;

export type SubscribeResult =
  | { ok: true; email: string }
  | { ok: false; error: string; botDetected?: boolean };

export function validateSubscribe(input: { email?: unknown; website?: unknown }): SubscribeResult {
  // Honeypot: the field is hidden from real users, so any value means a bot.
  // Reported separately so the route can return 200 and not teach bots anything.
  if (typeof input.website === 'string' && input.website.trim() !== '') {
    return { ok: false, error: 'Rejected.', botDetected: true };
  }
  const email = typeof input.email === 'string' ? input.email.trim() : '';
  if (!email) return { ok: false, error: 'Enter your email address.' };
  if (email.length > MAX_EMAIL) return { ok: false, error: 'That email address is too long.' };
  if (!EMAIL.test(email)) return { ok: false, error: 'That does not look like an email address.' };
  return { ok: true, email };
}

export type GhostSubscribeResult = { ok: true } | { ok: false; status: number; error: string };

const GENERIC = 'Something went wrong. Please try again.';

export async function subscribeViaGhost(email: string, visitorIp: string): Promise<GhostSubscribeResult> {
  const base = process.env.GHOST_INTERNAL_URL || process.env.GHOST_URL;
  if (!base) {
    console.error('subscribe: neither GHOST_INTERNAL_URL nor GHOST_URL is set');
    return { ok: false, status: 503, error: 'Sign-up is unavailable right now.' };
  }
  try {
    // 1. A short-lived (5 min) token Ghost requires on the sign-up request.
    const tokenRes = await fetch(`${base}/members/api/integrity-token/`);
    if (!tokenRes.ok) {
      console.error(`subscribe: integrity-token returned ${tokenRes.status}`);
      return { ok: false, status: 502, error: GENERIC };
    }
    const integrityToken = await tokenRes.text();

    // 2. No `redirect` (Ghost discards it) and no `newsletters` (Ghost subscribes to every
    //    `subscribe_on_signup` newsletter, which is the default one).
    const res = await fetch(`${base}/members/api/send-magic-link/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': visitorIp,
        'X-Forwarded-Proto': 'https',
      },
      body: JSON.stringify({ email, emailType: 'subscribe', integrityToken, honeypot: '' }),
    });
    if (res.status === 201) return { ok: true };
    if (res.status === 429) return { ok: false, status: 429, error: 'Too many attempts. Try again shortly.' };
    // 400 covers a blocked domain, sign-ups closed, and a mail failure. The body says which;
    // the reader gets one generic line and the log gets the reason.
    const body = await res.text().catch(() => '');
    console.error(`subscribe: Ghost send-magic-link returned ${res.status}: ${body.slice(0, 500)}`);
    return { ok: false, status: 502, error: GENERIC };
  } catch (err) {
    console.error('subscribe: Ghost request failed', err);
    return { ok: false, status: 502, error: GENERIC };
  }
}
