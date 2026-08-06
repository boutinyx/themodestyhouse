# Privacy policy and terms — controller identity + accuracy pass

**Date:** 2026-08-06 · **Status:** design approved, not yet implemented
**Relates to:** P0-D in `docs/launch-readiness.md`

## Context

`/privacy` and `/terms` already exist and are substantially complete
(`content/legal/privacy.md`, `content/legal/terms.md`, rendered through
`app/legal/LegalPage.tsx`). Two classes of defect block launch.

**1. The data controller is unnamed.** Both documents carry the literal string
`[OPERATOR NAME]` (privacy §1; terms §5 and §8). `lib/legal.ts` substitutes it from
`NEXT_PUBLIC_OPERATOR_NAME`, which is unset — it is absent from `.env` and is not
listed in `.env.example`. The consequence is visible in production: `LegalPage.tsx:16`
renders a brass **"Not ready to publish"** box to every visitor of `/privacy` and
`/terms`.

**2. Three factual claims do not match the code.** Verified against the repo on
2026-08-06:

| Claim | Reality |
|---|---|
| §4 lists Railway, Shopify, Pinterest as third parties | **Cloudflare is absent**, despite three distinct roles — see below |
| §2 enumerates what is collected | The contact form's **IP-based rate limiting** is not disclosed there (only obliquely in §3) |
| terms §2: the site "takes part in" Skimlinks, Awin, LTK | **None are live.** `NEXT_PUBLIC_SKIMLINKS_ID` is unset, so `app/layout.tsx:36` renders no script; Awin and LTK have zero references in the codebase |

Cloudflare's three roles, all traceable to code:
- **Edge / network layer** — `app/api/contact/route.ts:33` reads `CF-Connecting-IP`,
  which only exists because traffic is proxied through Cloudflare. It therefore sees
  every visitor's IP.
- **Turnstile** — `lib/contact.ts` / `verifyTurnstile`; already named in privacy §2,
  but Cloudflare itself is never named as the processor behind it.
- **Email delivery** — `lib/contact.ts` sends contact-form submissions through the
  Cloudflare Email Service REST API. Visitor **name, email address and message body**
  pass through a US processor. This is the most significant omission.

### Verified correct — deliberately unchanged

Checked so that a later reader does not re-open these:
- **No analytics of any kind.** Zero hits for gtag / Google Analytics / Plausible /
  PostHog / `@vercel/analytics`. Privacy §5's "we do not currently use advertising
  cookies, analytics, or invasive tracking" is true.
- **No Google Fonts disclosure needed.** `next/font` self-hosts; `next.config.ts`
  documents 9 woff2 files emitted to `.next/static/media` and `fonts.gstatic.com`
  deliberately absent from the CSP. Adding a Google Fonts clause would be false.
- **`tmh_favs` localStorage claim** — matches `components/QuickView.tsx:32,42`.
- **Railway as host** — matches the deployment target in `CLAUDE.md` §2.

## Decisions

### D1 — The data controller is the trade name alone

§1 will read:

```
The party responsible for this website and for your personal data is:

- **The Modesty House**, based in the Netherlands.
- Contact: **hello@themodestyhouse.com**
```

The sentence "If we later register as a business (eenmanszaak / KvK) we will update
this section…" is deleted.

**This was raised and decided by the owner.** The concern put to her: with no KvK
registration there is no legal entity named "The Modesty House", so under GDPR Art. 13
the document names no identifiable natural or legal person, and the controller is
legally the owner as a private individual. Three options were presented — legal name +
trade name, trade name only, or registering the eenmanszaak first. She chose **trade
name only**, with the alternatives understood. Recorded here so the residual Art. 13
exposure is a documented choice and not an oversight.

The Netherlands is confirmed correct, so privacy §9 (Autoriteit Persoonsgegevens) and
terms §10 (Dutch governing law) stand.

No postal address is published. Art. 13 conventionally expects one for an unregistered
individual, but publishing a home address carries a real personal-privacy cost; email
only is the accepted practice for small operators and was chosen knowingly.

### D2 — Retire the placeholder machinery (Approach A)

Rejected alternatives:
- **B — keep it, set `NEXT_PUBLIC_OPERATOR_NAME`.** `NEXT_PUBLIC_*` is inlined at
  build time (`.env.example` warns about exactly this), so the value must be set both
  locally and in Railway's service variables. Forgetting Railway ships the
  "Not ready to publish" banner to production. That is a live launch footgun in
  exchange for indirection around a constant.
- **C — hardcode now, keep the env var as a future override.** Speculative. Registering
  a KvK means adding a *number* as well, which is a content edit either way.

**The guard is replaced, not dropped.** Its only job was to prevent launching with an
unfilled name. A new `lib/legal.test.ts` asserts no legal document contains an unfilled
`[PLACEHOLDER]`, which fails in CI rather than on a visitor's screen — strictly earlier
and strictly louder than the banner it replaces.

## Changes

### `content/legal/privacy.md`
1. **§1** — replaced per D1; KvK sentence deleted.
2. **§2** — the contact-form bullet gains the missing IP disclosure: the sending IP is
   held in memory for about a minute to stop one source flooding the form
   (`app/api/contact/route.ts:16-29`, `WINDOW_MS = 60_000`).
3. **§4** — new **Cloudflare** entry covering all three roles in D1's table, stating
   plainly that message contents pass through it, and cross-referencing §7.
4. **§7** — Cloudflare added to the partners processing outside the EEA.
5. **§8** — retention line for the rate-limit record (in memory, ~60 seconds, never
   written to disk).

### `content/legal/terms.md`
6. **§5, §8** — `[OPERATOR NAME]` removed; The Modesty House left as the sole named
   party, consistent with privacy §1.
7. **§2** — "takes part in" → "may take part in", matching the fact that no affiliate
   network is currently active.

### Code
8. **`lib/legal.ts`** — remove `OPERATOR_PLACEHOLDER`, the `NEXT_PUBLIC_OPERATOR_NAME`
   lookup, and `LegalDoc.incomplete`. Bump `LEGAL_LAST_UPDATED` to `'6 August 2026'`.
9. **`app/legal/LegalPage.tsx`** — remove the `doc.incomplete` banner and the now-unused
   `OPERATOR_PLACEHOLDER` import.
10. **`lib/legal.test.ts`** (new) — both documents load and are non-empty; neither
    contains an unfilled `[UPPERCASE]` placeholder; `LegalDoc` no longer exposes
    `incomplete`.

## Verification

- `npx vitest run lib/legal.test.ts` — new tests pass.
- `npm test` — full suite green, no regression.
- `npx tsc --noEmit` — clean (removing `incomplete` from `LegalDoc` is a breaking type
  change; this is what proves no consumer was missed). Delete `tsconfig.tsbuildinfo`
  first, per `CLAUDE.md` §8.
- `grep -rn "OPERATOR_NAME\|OPERATOR PLACEHOLDER\|\[OPERATOR" app lib content` — no hits.
- `npm run build` — 32 routes; `/privacy` and `/terms` still prerender.
- Read the rendered `/privacy` and confirm the "Not ready to publish" box is gone and
  §1 names The Modesty House.

## Out of scope — follow-ups

- **`components/Footer.tsx:82`** states site-wide that "Some links are affiliate links",
  which is not true while Skimlinks is switched off. Same defect class as terms §2.
  Raised with the owner and deliberately excluded from this change; revisit when
  `NEXT_PUBLIC_SKIMLINKS_ID` is set on Railway (P0-E).
- **`app/api/csp-report/route.ts:12,17`** — comments reference Vercel and
  `vercel logs`. The app deploys to Railway. Stale documentation, no behavioural
  effect.
- **Cookie consent** remains unbuilt. Acceptable only while no analytics or advertising
  cookies exist and the Skimlinks script is off — both true today, and both change the
  moment P0-E lands. P0-D is not fully closed by this change.
