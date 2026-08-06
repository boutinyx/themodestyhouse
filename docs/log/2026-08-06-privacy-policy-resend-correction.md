# Corrected the privacy policy after outbound email moved to Resend
**Date:** 2026-08-06 · **Status:** done

## Goal
`ec2dce8` ("fix: send contact mail via Resend instead of Cloudflare Email Sending")
changed which processor handles contact form messages. §2 of the privacy policy was
updated to match, but §4 and §7 were not — so the document named **Cloudflare** as the
service that "delivers contact form messages to us by email", which was no longer true,
and **Resend**, which actually receives visitors' names, email addresses and message
bodies, was disclosed nowhere.

This is a correction to `2026-08-06-privacy-policy-controller-and-accuracy.md`, whose
§4 wording this supersedes.

## What changed

**`content/legal/privacy.md`**
- §4 — the Cloudflare entry no longer claims outbound delivery. It now describes what
  Cloudflare actually does: network/security layer (`app/api/contact/route.ts` reads
  `CF-Connecting-IP`), Turnstile, and **inbound** routing for
  `hello@themodestyhouse.com` via Cloudflare Email Routing (`lib/contact.ts:10-11`).
- §4 — new **Resend** entry for the outbound leg (`lib/contact.ts:139` posts to
  `api.resend.com`), stating that form contents pass through it, US company, cross-ref
  to §7.
- §7 — Resend added to the partners processing outside the EEA.

**`lib/legal.test.ts`**
- Renamed the Cloudflare test to describe what Cloudflare now does.
- New test pinning the **outbound** email provider disclosure (`**Resend**`).
- New negative test: the policy must not claim Cloudflare delivers contact form
  messages.

## Verification

```
$ npx vitest run lib/legal.test.ts
 Test Files  1 passed (1)
      Tests  13 passed (13)

$ npm test
 Test Files  14 passed (14)
      Tests  332 passed (332)

$ rm -f tsconfig.tsbuildinfo && npx tsc --noEmit
TSC: clean

$ npm run build
✓ Generating static pages using 9 workers (34/34) in 604ms
├ ○ /privacy    └ ○ /terms
```

The negative test was checked against the wording it is meant to catch, per CLAUDE.md
§10.5 / §10.10 (every regex tested against a known positive *and* negative):

```
$ node -e '…'
matches the OLD (wrong) text: true
matches the CURRENT text:     false
current names Resend:         true
```

Rendered output confirms the fix reaches the page:

```
$ grep -c "delivers contact form messages" .next/server/app/privacy.html
0
$ grep -o "<strong>Resend</strong>[^<]*" .next/server/app/privacy.html
<strong>Resend</strong>, our email delivery provider — we do …
```

## Notes / follow-ups

- **Root cause worth naming: the privacy policy is a downstream consumer of the
  processor list, and nothing connected the two.** Swapping an email provider is a
  routine infrastructure change that silently invalidated a legal document — the code
  change was correct and complete on its own terms, and the policy simply drifted. The
  new tests are the link: changing the outbound provider now fails CI until §4 is
  updated. **Any future third-party service that touches visitor data needs the same
  treatment — add the disclosure and pin it with a test in the same commit.**
- Still not deployed. These commits are on `legal/privacy-controller-and-accuracy`,
  ahead of `origin/main`; Railway deploys `main`, so themodestyhouse.com is unchanged
  until this is merged and pushed.
- Everything in the previous entry's follow-ups still stands: P0-D is not closed
  (no cookie consent), `components/Footer.tsx:82` still overstates affiliate links, and
  the Vercel references in `app/api/csp-report/route.ts` are stale.
