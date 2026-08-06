/**
 * Contact form — validation and delivery.
 *
 * WHY RESEND AND NOT CLOUDFLARE: Cloudflare's docs say sending to a verified
 * destination address is free on every plan, but onboarding a domain to Email
 * Sending is gated behind the Workers Paid plan ($5/mo), so the free path is
 * not actually reachable. Resend's free tier (3,000/month, 100/day, one domain)
 * covers a contact form many times over at no cost.
 *
 * Inbound mail is unaffected — hello@themodestyhouse.com still arrives via
 * Cloudflare Email Routing. Only the outbound leg is Resend.
 *
 * The daily cap is 100. That is far above normal contact-form traffic, but it
 * is a cap: a determined spammer past the honeypot, Turnstile and the rate
 * limiter could exhaust it. Sends fail loudly (502) rather than silently.
 */

import { TOPICS, type Topic } from '@/lib/contactTopics';

export { TOPICS };
export type { Topic };

export interface ContactInput {
  name?: unknown;
  email?: unknown;
  topic?: unknown;
  message?: unknown;
  /** Honeypot. Real users never see it, so any value means a bot. */
  website?: unknown;
}

export interface ContactFields {
  name: string;
  email: string;
  topic: Topic;
  message: string;
}

export type ValidationResult =
  | { ok: true; fields: ContactFields }
  | { ok: false; errors: Record<string, string>; botDetected?: boolean };

const LIMITS = { name: 100, email: 254, message: 5000 } as const;
const MIN_MESSAGE = 10;

// Deliberately permissive. Email syntax validation cannot prove deliverability,
// and every strict regex rejects addresses that are actually valid. The real
// check is that a reply reaches them.
const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

export function validateContact(input: ContactInput): ValidationResult {
  // Honeypot first — a filled hidden field means a bot, and there is no point
  // reporting field errors to it.
  if (str(input.website)) {
    return { ok: false, errors: { form: 'Rejected.' }, botDetected: true };
  }

  const name = str(input.name);
  const email = str(input.email);
  const topic = str(input.topic) || 'general';
  const message = str(input.message);
  const errors: Record<string, string> = {};

  if (!name) errors.name = 'Please tell us your name.';
  else if (name.length > LIMITS.name) errors.name = `Please keep this under ${LIMITS.name} characters.`;

  if (!email) errors.email = 'Please give us an email address so we can reply.';
  else if (email.length > LIMITS.email) errors.email = 'That address is too long.';
  else if (!EMAIL.test(email)) errors.email = "That doesn't look like an email address.";

  if (!TOPICS.some((t) => t.value === topic)) errors.topic = 'Please choose a subject.';

  if (!message) errors.message = 'Please write a message.';
  else if (message.length < MIN_MESSAGE) errors.message = 'Please add a little more detail.';
  else if (message.length > LIMITS.message) errors.message = `Please keep this under ${LIMITS.message} characters.`;

  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, fields: { name, email, topic: topic as Topic, message } };
}

/** Escape before interpolating submitted text into the HTML part of an email. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Strip CR/LF from anything that lands in a header-like field. Without this a
 * submitted name containing a newline could inject additional headers.
 */
export function sanitizeHeader(s: string): string {
  return s.replace(/[\r\n]+/g, ' ').trim();
}

export function buildEmail(f: ContactFields) {
  const label = TOPICS.find((t) => t.value === f.topic)?.label ?? f.topic;
  const subject = sanitizeHeader(`[${label}] ${f.name}`);
  // The sender's address is repeated in the body on purpose: reply_to is set
  // below, but if the field is ever ignored the address must not be lost.
  const text = [
    `Topic:   ${label}`,
    `From:    ${f.name} <${f.email}>`,
    '',
    f.message,
  ].join('\n');
  const html =
    `<p><strong>Topic:</strong> ${escapeHtml(label)}<br>` +
    `<strong>From:</strong> ${escapeHtml(f.name)} &lt;${escapeHtml(f.email)}&gt;</p>` +
    `<hr><p style="white-space:pre-wrap">${escapeHtml(f.message)}</p>`;
  return { subject, text, html };
}

export interface EmailConfig {
  apiKey: string;
  to: string;
  from: string;
}

/**
 * Reads config from the environment. Returns null when unset so callers can
 * fail loudly with a 503 rather than silently pretending a message was sent.
 */
export function emailConfig(env: Record<string, string | undefined> = process.env): EmailConfig | null {
  const apiKey = env.RESEND_API_KEY;
  const to = env.CONTACT_TO_EMAIL;
  const from = env.CONTACT_FROM_EMAIL;
  if (!apiKey || !to || !from) return null;
  return { apiKey, to, from };
}

export async function sendContactEmail(f: ContactFields, cfg: EmailConfig): Promise<void> {
  const { subject, text, html } = buildEmail(f);
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: cfg.from,
      to: [cfg.to],
      // Puts the sender one keypress away: replying to the notification
      // replies to them, not to the noreply address.
      reply_to: sanitizeHeader(f.email),
      subject,
      text,
      html,
    }),
  });
  if (!res.ok) {
    // Include the body: Resend puts the actionable reason (unverified domain,
    // bad key, daily cap reached) there, not in the status code.
    const body = await res.text().catch(() => '');
    throw new Error(`Resend send failed: ${res.status} ${body.slice(0, 500)}`);
  }
}

/** Server-side Turnstile verification. Never trust the client's token alone. */
export async function verifyTurnstile(token: string, secret: string, ip?: string): Promise<boolean> {
  const form = new URLSearchParams({ secret, response: token });
  if (ip) form.set('remoteip', ip);
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
