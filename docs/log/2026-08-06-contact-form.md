# Contact form on Cloudflare Email Service
**Date:** 2026-08-06 · **Status:** done (code) — **inert until env vars are set**

## Goal
Replace the site's broken email surfaces with a working contact form, per
`docs/email-service-plan.md` phase 2.

## What was broken
- `hello@themodestyhouse.com` was published in four places but the domain had
  **no MX records** — every message to it bounced. (Fixed outside the repo, via
  Cloudflare Email Routing.)
- The footer newsletter form was broken twice over: `action="mailto:"
  method="post"` is not supported by modern browsers, **and** its `<input>` had
  no `name` attribute, so the address was never in the payload.

## What changed
- **`lib/contactTopics.ts`** — client-safe topic list. Split out so the client
  bundle never pulls in the delivery code (same rule as `lib/vibes.ts`).
- **`lib/contact.ts`** — validation, HTML escaping, header sanitisation, the
  Cloudflare REST send, Turnstile verification.
- **`lib/contact.test.ts`** — 28 tests.
- **`app/api/contact/route.ts`** — POST handler: body cap, per-IP burst limiter,
  validation, Turnstile, send.
- **`components/ContactForm.tsx`** / **`app/contact/page.tsx`** — the form and page.
- **`components/Footer.tsx`** — broken form replaced with a link; added a Contact link.
- **`app/page.tsx`** — "Apply for the seal" now goes to `/contact?topic=seal`.
- **`next.config.ts`** — CSP: added `challenges.cloudflare.com` to `script-src`
  and `frame-src` (was `'none'`, which would have blocked the Turnstile iframe
  outright), and tightened `form-action` from `'self' mailto:` to `'self'`.
- **`content/legal/privacy.md`** — what the form collects, lawful basis,
  retention, and the Turnstile disclosure. Shipped with the form, not after.
- **`app/sitemap.ts`**, **`.env.example`**, **`.gitignore`** (un-ignore the template).

## Design notes
- **REST API, not a Workers binding** — this app is a `next start` container on
  Railway. The REST endpoint is callable from any backend.
- **Free tier by construction.** Mail goes only to `CONTACT_TO_EMAIL`, a
  *verified destination*; Cloudflare bills those at zero on every plan. Sending
  to arbitrary recipients is a different tier — do not reuse this module for a
  newsletter without re-reading the pricing.
- **Fails loudly.** Missing env vars → 503 plus a log naming the missing keys.
  A contact form that silently drops mail is worse than one that is visibly down.
- **Honeypot returns 200.** A bot that trips it sees success; telling it it was
  caught only helps it retry differently.
- **The burst limiter is in-memory and says so in a comment** — it resets on
  redeploy and is per-container, so it is a speed bump, not a rate limit. The
  real limit belongs at the Cloudflare edge.
- Submitted text is HTML-escaped, and CR/LF is stripped from anything reaching a
  header field so a crafted name cannot inject email headers.

## Verification
`npx tsc --noEmit` clean · `vitest` **299 passed (12 files)** · `next build`
compiled, emitting `ƒ /contact` and `ƒ /api/contact`.

Exercised against a real `next start` server on :3100:

| Case | Result |
|---|---|
| `/contact` renders with all fields incl. honeypot | `name`, `email`, `topic`, `message`, `website` |
| Valid submission, **email not configured** | `503` — "not available right now", does **not** claim success |
| Invalid submission | `400` with per-field errors |
| Honeypot filled | `200 {"ok":true}` — bot sees success, no mail sent |
| Malformed JSON | `400` |
| 6th request in 60s from one IP | `429` |

## Notes / follow-ups
- **Inert until Railway env vars are set**: `CLOUDFLARE_ACCOUNT_ID`,
  `CLOUDFLARE_EMAIL_TOKEN`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL`, plus
  `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY`.
- `NEXT_PUBLIC_*` is inlined at **build** time — setting it in Railway does
  nothing until the next deploy.
- **`reply_to` is unverified** against the live Cloudflare API. The sender's
  address is repeated in the message body so it cannot be lost if the field is
  ignored. Confirm on the first real send.
- Email Sending is in **public beta**; the API may change before GA.
- The newsletter is deliberately not built — it needs subscriber storage,
  double opt-in and unsubscribe. See `docs/email-service-plan.md` §3.
