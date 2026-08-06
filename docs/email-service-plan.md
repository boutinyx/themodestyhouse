# Plan — email on The Modesty House (Cloudflare Email Service)

**Date:** 2026-08-06 · **Status:** proposed, not implemented

Verdict: **yes, Cloudflare Email Service fits** — but it is two different products with
different maturity, different prices and different prerequisites, and only one of them
solves the newsletter. Read §4 before agreeing to the whole thing.

---

## 1. What is broken right now

Verified 2026-08-06 against the live domain and the repo.

| Finding | Evidence |
|---|---|
| **`hello@themodestyhouse.com` cannot receive mail.** No MX records exist for the domain. Every message sent to it bounces. | `dig MX themodestyhouse.com` → empty |
| The address is published in four places, so this is user-visible today | `components/Footer.tsx:59`, `app/page.tsx:129`, `content/legal/privacy.md:112`, `content/legal/terms.md:70` |
| **No SPF, no DMARC.** Anyone can send mail claiming to be from the domain. | `dig TXT themodestyhouse.com` and `dig TXT _dmarc…` → empty |
| **The newsletter form cannot work, twice over.** `action="mailto:" method="post"` is not supported by modern browsers, *and* the `<input>` has no `name` attribute, so the address would not be in the payload even if it were. | `components/Footer.tsx:65-73` |

The first row is the urgent one and it is free to fix.

## 2. What Cloudflare actually offers

Two separate things, often conflated:

**Email Routing — inbound.** Generally available, free on all plans. Forwards
`hello@yourdomain` to a real mailbox (Gmail etc.). This is what makes the published
address work.

**Email Sending — outbound transactional.** **Public beta since 2026-04-16.** Callable
three ways: a Workers binding, an authenticated SMTP endpoint, or a REST API at
`POST /accounts/{account_id}/email/sending/send`. **The REST API works from any backend**,
so Railway can call it directly — no Workers runtime needed.

Pricing, and the detail that decides our design:

- Sending **to a verified destination address** (i.e. to ourselves) is **free on every
  plan**, and does not count against any quota.
- Sending to **arbitrary recipients** requires the **Workers Paid plan ($5/mo)**, includes
  3,000 emails/month, then **$0.35 per 1,000**.

Hard prerequisite: **the sending domain must use Cloudflare DNS.** We already do —
`themodestyhouse.com` is on `kay.ns.cloudflare.com` / `bowen.ns.cloudflare.com`.

## 3. Why this splits the work in two

A contact form only ever emails **us**. That is a verified destination, so it is free and
needs no paid plan.

A newsletter emails **subscribers** — arbitrary recipients. That needs the paid plan, and
much more importantly it needs things Cloudflare Email Service does not provide: a
subscriber list, double opt-in, consent records, and one-click unsubscribe. It is a
transactional sending API, not a newsletter platform.

We also have nowhere to *put* a subscriber list. Per ADR-0001 the catalogue is a
build-time artifact and **Railway's filesystem is ephemeral** — anything written at runtime
is lost on the next deploy. A subscriber who signs up and is then wiped by a redeploy is
worse than no form at all.

## 4. Recommendation

Do phases 0–2. **Do not** build the newsletter on this stack yet — see phase 3.

### Phase 0 — Make the published address work (free, no code, ~15 min)
Enable **Email Routing** in the Cloudflare dashboard; forward `hello@themodestyhouse.com`
to Tina's real mailbox. Cloudflare adds the MX records automatically. Verify with
`dig MX themodestyhouse.com` and by sending a real message from an outside account.

This alone fixes the live bug. Everything below is optional; this is not.

### Phase 1 — Domain auth (free, no code)
Onboard the domain under Compute → Email Service → Email Sending. Cloudflare writes the
SPF, DKIM and DMARC records itself. Start DMARC at `p=none` and only tighten to
`quarantine`/`reject` after reports look clean — going straight to `reject` can silently
bin our own mail.

Fixes the spoofing gap independently of whether we ever send anything.

### Phase 2 — Real contact form (free tier, ~half a day)
- `app/contact/page.tsx` — name, email, message, plus a topic select so "apply for the
  seal" stops being a `mailto:` link.
- `app/api/contact/route.ts` — POST handler; server-side validation; calls the Cloudflare
  REST API with `from: noreply@themodestyhouse.com`, `to: hello@…` (the verified
  destination, hence free), `reply_to` set to the submitter.
- **Spam:** Cloudflare Turnstile — free, invisible, and we are already behind Cloudflare.
  Verify the token server-side; a form with no spam control on a public affiliate site
  will be found within days.
- **Rate limit** per IP at the Cloudflare edge, not in app code.
- **Secrets:** `CLOUDFLARE_ACCOUNT_ID` and a scoped API token (`Email Sending: Edit`) as
  Railway environment variables. Never `NEXT_PUBLIC_*` — that inlines at build time and
  ships the token to every visitor.
- **CSP:** once a real endpoint exists, tighten `form-action 'self' mailto:` back to
  `form-action 'self'` in `next.config.ts:92`.
- Replace the broken footer form and the four `mailto:` links.

### Phase 3 — Newsletter (deferred; needs a decision, not just code)
Two honest options:

1. **Use a real ESP** (Buttondown, Kit, Resend Audiences). They own list storage, double
   opt-in, unsubscribe headers and deliverability reputation. Fastest correct path, and it
   keeps us out of GDPR list-management work.
2. **Build it on Cloudflare**: Workers Paid + D1 or KV for subscribers, our own double
   opt-in and unsubscribe flow. Cheaper per email, materially more work and more legal
   surface.

Given an EU/UK audience (9 GBP and 2 EUR brands in `data/brands.ts`), consent records and
one-click unsubscribe are legal requirements, not niceties. **Recommendation: option 1**,
and until it is chosen, the footer form should be removed or replaced with a plain
"email us" link rather than left silently broken.

### Phase 4 — Legal
`content/legal/privacy.md` currently describes no form processing. Adding a contact form
means stating what is collected, the lawful basis, retention, and that it is processed by
Cloudflare. Must ship **with** phase 2, not after.

## 5. Risks

- **Email Sending is in public beta.** Cloudflare's own docs say the API may change before
  GA. Acceptable for a contact form; a reason not to build billing-critical mail on it.
- **Beta pricing may move.** The free-to-verified-destination rule is what makes phase 2
  cost nothing — if that changes, phase 2 starts costing $5/mo.
- **Deliverability of our own sends** is untested. Phase 2 sends only to us, so a
  reputation problem shows up immediately and harmlessly.
- The site is on **Railway**, not Cloudflare Workers. Everything above uses the REST API
  deliberately so that stays true.

## 6. Sources
- <https://developers.cloudflare.com/email-service/>
- <https://developers.cloudflare.com/email-service/platform/pricing/>
- <https://developers.cloudflare.com/email-service/get-started/send-emails/>
- <https://developers.cloudflare.com/email-service/api/send-emails/rest-api/>
- <https://blog.cloudflare.com/email-service/>
