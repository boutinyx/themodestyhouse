# Contact form on Cloudflare Email Service
**Date:** 2026-08-06 · **Status:** done — **live and verified end to end**

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

## Amendment — sender switched to Resend
The Cloudflare docs state that sending to a verified destination address is free
on every plan, but **onboarding a domain to Email Sending is gated behind the
Workers Paid plan ($5/mo)**, so the free path is not reachable in practice. Tina
hit the paywall in the dashboard.

Switched the outbound leg to **Resend** (free tier: 3,000/month, 100/day, one
domain). Only `sendContactEmail` and `emailConfig` changed — validation,
escaping, honeypot, Turnstile, rate limiting and the route are untouched.

**Inbound is unaffected**: `hello@themodestyhouse.com` still arrives through
Cloudflare Email Routing. Cloudflare Turnstile is also unchanged.

**Verify a SUBDOMAIN in Resend, not the apex.** A domain may have only one SPF
record, and the apex already carries Cloudflare's
(`v=spf1 include:_spf.mx.cloudflare.net ~all`). Verifying the apex in Resend
would require merging both includes into that single record; two SPF records is
a permanent error that breaks authentication outright. `send.themodestyhouse.com`
keeps them separate.

Known limit: the free tier caps at **100 sends/day**. Far above normal contact
traffic, but it is a cap — sends fail with a 502 rather than silently.

## Notes / follow-ups
- **Inert until Railway env vars are set**: `RESEND_API_KEY`,
  `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL`, plus
  `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY`.
- `NEXT_PUBLIC_*` is inlined at **build** time — setting it in Railway does
  nothing until the next deploy.
- **`reply_to` is unverified** against the live API. The sender's address is
  repeated in the message body so it cannot be lost if the field is ignored.
  Confirm on the first real send.
- The newsletter is deliberately not built — it needs subscriber storage,
  double opt-in and unsubscribe. See `docs/email-service-plan.md` §3.


---

## Bringing it live — and what the delay actually was

Delivery is confirmed working. A real submission to the live endpoint returned
`{"ok":true}` (HTTP 200) and arrived through
form → server → Resend → Cloudflare Email Routing → inbox.

Getting there took far longer than the work warranted, for two reasons worth
recording.

### 1. A push that silently did nothing
The Resend switch was committed while this checkout sat on a branch another
session had created (`legal/privacy-controller-and-accuracy`). `git push origin
main` pushes the local `main` ref — not `HEAD` — so it pushed nothing and exited
0. Production kept serving the **Cloudflare** version of `lib/contact.ts`, so
`RESEND_API_KEY` was never read and the endpoint kept returning 503.

Several rounds were spent testing a build that did not contain the code under
test. The fix was to cherry-pick the four email commits onto `main` in a
separate worktree, leaving the other session's in-progress legal work untouched.

**Rule:** after any push, verify the commit is an ancestor of the remote branch
(`git merge-base --is-ancestor <sha> origin/main`). "Pushed" is not the same as
"deployed", and `git push origin main` from a detached or differently-named
branch is a silent no-op.

### 2. A config error indistinguishable from the above
Underneath that, `CONTACT_FROM_EMAIL` was `noreply@themodestyhouse.com` while
the domain verified in Resend was `send.themodestyhouse.com`. Resend accepts the
API key and then rejects the send:

```
403 {"statusCode":403,"message":"The themodestyhouse.com domain is not verified…"}
```

A 503 (config missing) and a 502 (send rejected) look identical from outside.

### What ended it
A temporary `GET /api/contact` probe reporting, as booleans, which variables the
**running container** could see, plus the commit it was built from, plus the
last upstream error. `builtFrom` immediately exposed the stale-deploy problem;
`lastSendError` gave Resend's own diagnosis verbatim.

The probe has since been removed. Building a diagnostic beats reading a
dashboard over someone's shoulder — but it should have come out at round two,
not round six.

### Still open
- **Turnstile is not configured.** Both keys unset, so spam protection is
  honeypot + validation + rate limiting only. No code change needed to enable —
  set the two variables and redeploy.
