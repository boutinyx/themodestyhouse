/**
 * Client-safe half of the contact module.
 *
 * `lib/contact.ts` holds the delivery code — it reads process.env and talks to
 * the Cloudflare API — so it must never be pulled into a 'use client' bundle.
 * The topic list is needed by both sides, so it lives here on its own. Same
 * split as lib/vibes.ts vs lib/products.ts.
 */
export const TOPICS = [
  { value: 'general', label: 'General enquiry' },
  { value: 'seal', label: 'Apply for the seal' },
  // Added 2026-08-25 for the homepage band, which became a marketing pitch that
  // was still deep-linking to `seal`. The LABEL IS A PLACEHOLDER — the plainest
  // functional string that makes the dropdown and the email subject work, not
  // chosen copy. Rename it freely; only `value` is referenced anywhere.
  { value: 'marketing', label: 'Marketing' },
  { value: 'brand', label: 'Submit a brand' },
  { value: 'press', label: 'Press' },
  { value: 'correction', label: 'Report a correction' },
] as const;

export type Topic = (typeof TOPICS)[number]['value'];
