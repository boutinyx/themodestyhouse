import { emailConfig, escapeHtml, sanitizeHeader, type EmailConfig } from '@/lib/contact';

/**
 * Newsletter sign-up.
 *
 * SCOPE, deliberately small: this notifies the site owner of an address. It is
 * NOT a mailing-list platform. There is no subscriber database — per ADR-0001
 * the catalogue is flat files and the host's filesystem is ephemeral, so a list
 * written at runtime would be lost on the next deploy (docs/email-service-plan.md §4).
 *
 * The addresses therefore collect in the owner's inbox until a real ESP is
 * wired up, at which point THAT system owns double opt-in, consent records and
 * one-click unsubscribe. Until then the form copy must not promise a newsletter
 * is already running, and the privacy policy must say where the address goes.
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

export function buildSubscribeEmail(email: string) {
  const safe = escapeHtml(email);
  return {
    subject: `Newsletter sign-up: ${sanitizeHeader(email)}`,
    text: `New newsletter sign-up.\n\nEmail: ${email}\n\nAdd them to the list when the ESP is set up.`,
    html: `<p>New newsletter sign-up.</p><p><strong>${safe}</strong></p><p>Add them to the list when the ESP is set up.</p>`,
  };
}

export async function sendSubscribeEmail(email: string, cfg: EmailConfig): Promise<void> {
  const { subject, text, html } = buildSubscribeEmail(email);
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: cfg.from,
      to: [cfg.to],
      reply_to: sanitizeHeader(email),
      subject,
      text,
      html,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Resend send failed: ${res.status} ${body.slice(0, 500)}`);
  }
}

export { emailConfig };
