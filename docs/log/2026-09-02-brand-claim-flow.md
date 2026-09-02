# "Is this your house?" — the claim flow

**Date:** 2026-09-02 · **Status:** done (phase 1)

## Goal

Tina: *"i wanted to add a claim a page page where brands can claim theirs, friend
of mine said that that would have less churn and more signup rate"*, then
*"okay lets build on staging"*.

The mechanism the friend is describing is real, and it works because of WHERE
the offer appears rather than because of the word "claim": a brand owner who
Googles their own name lands on our page for them. Search Console has 356
impressions across the Merrachi spellings alone, at position 6.5. That arrival
is the entire feature; everything else is plumbing.

## What shipped

**Free, manual, no accounts.** A quiet line at the foot of every
`/designers/<slug>` — *Is this your house? Claim this page* — linking to
`/contact?topic=claim&brand=<slug>`. The form pre-selects the subject, carries
the house in a hidden field, and shows a clickwrap naming the house. It arrives
in Tina's inbox through the Resend path every other message already uses.

Nothing is stored and nothing publishes automatically. The record of a claim IS
the email.

- **`lib/brandClaim.ts`** (new) — the evidence, not the decision.
  `claimSignal(slug, email)` compares the sender's domain to the storefront's
  and writes the verdict into the notification, so the check is already done
  when Tina opens it.
- **`lib/contactTopics.ts`** — `claim`, distinct from the existing `brand`
  ("someone proposing a house") because the two need different handling.
- **`lib/contact.ts`** — claim-only validation (a real house, and the box
  ticked), the house in the subject line, and the verification + acceptance
  block in the body.
- **`app/brand-terms/page.tsx`** (new) — what a claimant agrees to. Noindex.
- **`components/ContactForm.tsx`, `app/contact/page.tsx`,
  `app/designers/[slug]/page.tsx`** — the entry point and the clickwrap.

## Why the domain check is a signal and never a gate

The obvious rule — "the email must be at the brand's own domain" — is wrong
here, and Tina said why: *"some of these brands are small so they dont even have
real mails."* A large share of these houses are one person on Shopify with a
Gmail address published on their own contact page. A domain rule would exclude
exactly the brands most likely to claim while admitting nobody it shouldn't.

So `claimSignal` ranks rather than refuses:

```
VERIFIED BY DOMAIN — hello@bymerrachi.com is MERRACHI's own storefront domain.

NOT VERIFIED BY DOMAIN — wrote from gmail.com, storefront is bymerrachi.com.
Many small houses use a free address, so this is not a rejection: check whether
bymerrachi.com publishes that address on its own site, or ask them to put a code
on the store.
```

Two further routes are written down for when volume justifies automating them:
the address the storefront itself publishes (we already fetch their site
nightly), and a token pasted anywhere on the store, which is unfakeable without
admin access.

`sameSite()` accepts `mail.bymerrachi.com` and rejects
`bymerrachi.com.evil.net`, which a naive `endsWith` would not — that is the
whole trick behind a lookalike domain, and it has its own test.

## On the terms, and on charging

Tina relayed: *"make them accept any terms so they cant later sew you about
anything on the page."* The clickwrap is worth having and is now there, with the
version, timestamp and IP recorded in the email. What it does not do was said
plainly rather than sold: it binds only the houses that claim, it is not
retroactive, and a blanket waiver does not survive EU unfair-terms rules.

So `/brand-terms` contains only clauses that are plainly true of what the site
already does — authority, a licence for what they send, editorial discretion,
listing is not endorsement, their prices and orders stay theirs, affiliate
disclosure, removal on request, Dutch law. **No liability cap and no indemnity**,
because whether those hold is a question for a lawyer, and a clause a court
strikes out is worse than no clause. `CLAIM_TERMS_VERSION` moves when that
review lands. The page is `noindex` until then.

She also asked whether claiming could be paid. The line drawn, and the reason:
selling placement or the seal would destroy the only asset the directory has —
the brand book's own positioning is *a curator, not a catalogue; the seal does
the endorsing* — so `/brand-terms` states outright that placement is not for
sale. What can be sold sits above a free claim, and the strongest candidate
already exists: since 2026-08-30 `outbound_click` records every visitor sent to
each house, so *"we sent you 340 people last month"* is a real product that
touches no editorial decision.

## Verification

```
npx tsc --noEmit                              → exit 0
npx eslint app lib components                 → exit 0
npx vitest run lib/brandClaim.test.ts …       → 43 passed
npm test                                      → 1079 passed, 2 failed (PRE-EXISTING)
npm run build                                 → exit 0
```

Driven end to end in Chromium against a real build, as a brand owner would:

```
landed on                          /contact?topic=claim&brand=merrachi
topic preselected                  claim
brand hidden field                 merrachi
names the house                    I am authorised to act for MERRACHI and I accept the brand terms.
unticked -> sent?                  no — blocked client-side
error shown                        yes
ticked -> payload                  {"topic":"claim","brand":"merrachi","accepted":true}
general: checkbox                  0
claim w/o brand: warning           1
```

**A real defect, found by driving it rather than reading it.** The first run
reported `unticked -> request sent? YES`. The form carries `noValidate` — it
renders its own field errors — so the browser never enforces `required` on the
checkbox, and an unticked claim posted to the API, which rejected it. Safe, but
wrong: the client now refuses it first, and the error appears where every other
field error does.

The two failing tests are `lib/edits.test.ts`, red on `main` from the nightly
data and importing nothing this work touches.

## Follow-up

- **Watch `contact_submit` in Pulse.** It already carries `topic`, so the number
  of claims is measurable without building anything. That is the honest test of
  the friend's hypothesis, and phase 2 — verification automation, self-serve
  editing, a paid tier — should wait for it.
- **A claim's output is a hand-written description**, which is the biggest
  remaining lever on the brand pages (`docs/log/2026-08-31-brand-page-search-fix.md`).
- `/brand-terms` needs a lawyer's read before it comes out of `noindex`.
