# Added Pulse analytics, with the CSP and privacy policy changed in the same step
**Date:** 2026-08-06 · **Status:** done

## Goal
Ship the Pulse (`js.ciphera.net`) analytics script. The snippet as supplied would not
have worked, and shipping it alone would have made the privacy policy false.

## What the supplied snippet would have done

The snippet was a whole `RootLayout` that replaced the existing one — dropping the three
`next/font` families, `Header`, `Footer`, `QuickViewProvider`, all `metadata`, and the
Skimlinks script. Integrated into the existing layout instead.

Beyond that, three findings from reading `script.js` (16,347 bytes) rather than assuming:

| Finding | Consequence |
|---|---|
| Script is served from `js.ciphera.net` but POSTs to **`https://pulse-api.ciphera.net/api/v1/events`** | Two different hosts. The enforcing CSP allowlisted neither — and allowlisting only the script host loads the script and then silently drops **every** event |
| **No `localhost` exclusion** (0 occurrences, unlike Plausible) | Every `npm run dev` page view would have been counted in production stats |
| No `document.cookie`; `localStorage` used only for an `IGNORE_KEY` self-exclusion flag; `sessionStorage` only for a `{p: path, t: timestamp}` dedup record; honours `doNotTrack` **and** `globalPrivacyControl`; no canvas/userAgent fingerprinting | This is what makes the no-consent-banner position defensible |

## What changed

**`app/layout.tsx`** — `<Script>` added alongside Skimlinks, gated on
`process.env.NODE_ENV === 'production'`. Gated on NODE_ENV rather than a `NEXT_PUBLIC_*`
variable on purpose: `NEXT_PUBLIC_*` is inlined at build time and is precisely what left
`NEXT_PUBLIC_SKIMLINKS_ID` unset on Railway.

**`next.config.ts`** — `https://js.ciphera.net` added to `script-src`,
`https://pulse-api.ciphera.net` to `connect-src`, each with a comment tracing it to the
code that needs it, per the existing convention in that file.

**`content/legal/privacy.md`** — the policy previously said *"We do **not** currently use
advertising cookies, analytics, or invasive tracking"* and promised to *"ask for your
consent through a cookie banner first"*. Both would have become false on deploy.
- §2 — new bullet describing what Pulse records, that it sets no cookies and stores no
  identifier, and that DNT/GPC suppress recording entirely.
- §3 — legal basis is now legitimate interest, Art. 6(1)(f), with the reasoning stated
  (no cookies, no identifier) and a commitment to seek consent if that ever changes.
- §4 — **Pulse (ciphera.net)** named as a processor.
- §5 — rewritten: no advertising or analytics cookies; the three things actually stored
  on the device (favourites, the dedup record, the opt-out flag); why no banner is shown.
- §7 — Pulse added to partners that may process outside the EEA.
- §8 — analytics retention.

**`lib/legal.test.ts`** — two new guards.

## Decisions

**Consent banner: no.** Owner's decision, on the technical evidence above — no cookies,
no persistent identifier, session-scoped storage only, DNT and GPC honoured. This matches
the CNIL-style exemption for first-party audience measurement. The strict ePrivacy reading
(any device storage requires prior consent, including the dedup record) was presented and
declined.

**Pulse is a third party**, not self-hosted — owner's answer. It is therefore disclosed
as a processor in §4 and listed in §7.

## Verification

```
$ npx vitest run lib/legal.test.ts   →  15 passed
$ npm test                           →  14 files, 344 passed
$ rm -f tsconfig.tsbuildinfo && npx tsc --noEmit  →  clean
$ npm run lint                       →  exit 0
$ npm run build                       →  34/34 static pages
```

The script reaches the production output (`grep -c "js.ciphera.net"
.next/server/app/privacy.html` → 2).

CSP verified against a real `next start`, not by reading the source:

```
script-src  … https://challenges.cloudflare.com https://js.ciphera.net
connect-src … https://skimlinks.com https://*.skimlinks.com https://pulse-api.ciphera.net
```

The new guards were checked against the pre-change text to prove they are not vacuous:

```
OLD tripped no-analytics assertion: true   (guard fires)
OLD tripped banner-promise assert:  true   (guard fires)
CURRENT trips either:               false  (clean)
```

## Notes / follow-ups

- **Get a DPA from Ciphera.** GDPR Art. 28 requires a written data processing agreement
  with any processor. This is the one outstanding compliance item from this change and it
  is not something code can satisfy.
- **Confirm Pulse's retention period and backend location.** §8 currently says only that
  we receive aggregated statistics; §7 lists Pulse conservatively as a possible non-EEA
  processor because the *origin* behind BunnyCDN could not be determined from outside
  (both hostnames answer from BunnyCDN AMS1, Amsterdam). If Ciphera confirms EU-only
  processing, §7 can be narrowed.
- **The guard now couples code to disclosure.** `lib/legal.test.ts` reads `app/layout.tsx`
  and `next.config.ts`: if `js.ciphera.net` appears in either, the policy must name Pulse
  and must not claim there is no analytics. This is the check that was missing when
  outbound email moved to Resend and §4 silently went stale.
- **P0-D:** the "no cookie consent" gap is now narrower, not wider — analytics is
  cookieless. It reopens the moment `NEXT_PUBLIC_SKIMLINKS_ID` is set, because Skimlinks
  *does* set third-party cookies.
