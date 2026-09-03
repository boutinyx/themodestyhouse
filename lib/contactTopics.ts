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
  // Relabelled 2026-09-03 — Tina: "i want to change apply for the seal to
  // soething for sign your brand up". Only `label` moved; `value` is still
  // 'seal' because it is referenced by ?topic=seal in the footer and on
  // /about, and is the key the inbox has been filing these under since the
  // form existed. Renaming the value would break both links silently.
  { value: 'seal', label: 'Sign your brand up' },
  // Added 2026-08-25 for the homepage band, which became a marketing pitch that
  // was still deep-linking to `seal`. The LABEL IS A PLACEHOLDER — the plainest
  // functional string that makes the dropdown and the email subject work, not
  // chosen copy. Rename it freely; only `value` is referenced anywhere.
  { value: 'marketing', label: 'Marketing' },
  // Renamed from "Submit a brand" 2026-09-03, one message after 'seal' became
  // "Sign your brand up" — which made the two read as the same thing, so a house
  // wanting the seal could pick either and land in the inbox under two different
  // subjects. This one is a SHOPPER recommending a house she loves; 'seal' is the
  // house itself getting in touch. "house" rather than "brand" is the word the
  // rest of the site uses ("Claim a house", "See the houses").
  // Label only — `value` stays 'brand', the key the inbox files under.
  { value: 'brand', label: 'Suggest a house' },
  // Added 2026-09-02 for the claim flow. Distinct from 'brand' on purpose:
  // 'brand' is a stranger proposing a house, 'claim' is a house saying one of
  // these pages is theirs, and the two need different handling in the inbox.
  { value: 'claim', label: 'Claim a house' },
  { value: 'press', label: 'Press' },
  { value: 'correction', label: 'Report a correction' },
] as const;

export type Topic = (typeof TOPICS)[number]['value'];
