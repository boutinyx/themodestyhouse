# Recovered the terms.md fix onto main and aligned the affiliate disclosure
**Date:** 2026-08-06 · **Status:** done

## Goal
`/terms` was still rendering the "Not ready to publish" banner and carrying
`[OPERATOR NAME]`, while `/privacy` rendered clean. Establish why, restore the missing
work, and finish the accuracy pass on `content/legal/terms.md`.

## Root cause — a partial landing, not a missing fix

The terms fix was never lost; it never reached `main`. Concurrent sessions rebased three
legal commits onto `legal/privacy-controller-and-accuracy` (now `fdc1417`) and checked
this working copy out to `main`. Only `content/legal/privacy.md` and one log entry
landed on `main` — verified byte-identical to the branch with
`git diff main:content/legal/privacy.md legal/…:content/legal/privacy.md` (empty).

Missing from `main`, present on the branch:

```
$ git diff --stat main legal/privacy-controller-and-accuracy -- content/legal lib/legal.ts lib/legal.test.ts app/legal docs/superpowers/specs
 app/legal/LegalPage.tsx                          |  14 +-
 content/legal/terms.md                           |   6 +-
 docs/…/2026-08-06-privacy-policy-design.md       | 148 +++++++++++++++++
 lib/legal.test.ts                                |  90 +++++++++++
 lib/legal.ts                                     |  36 ++---
```

This is §10.17 in a second costume: a partial landing looks identical to a broken fix
from the outside. **The guard that would have caught it — `lib/legal.test.ts`, which
fails when any legal document contains a placeholder — was itself one of the files that
did not land.** A guard only protects the tree it actually reaches.

## What changed

**Recovered from the branch** (already designed, reviewed and tested — not rewritten):
`content/legal/terms.md`, `lib/legal.ts`, `app/legal/LegalPage.tsx`, `lib/legal.test.ts`,
and the design spec.

**`components/Footer.tsx`** — "Some links **are** affiliate links" → "**may be**".
The footer is the site-wide FTC disclosure and links to `/terms` as "Full disclosure",
so it and terms §2 are the same claim on two surfaces. Softening only §2 would have left
them contradicting each other. No affiliate network is live (`.env` has no
`NEXT_PUBLIC_SKIMLINKS_ID`, so `app/layout.tsx:27` renders no script; Awin and LTK have
zero code references), and over-disclosure is FTC-safe while under-disclosure is not —
so "may be" is correct now and stays correct the moment Skimlinks is switched on.

**`CLAUDE.md` §8** — corrected a stale landmine. It claimed prices render "with no FX and
no `Intl.NumberFormat`". Half true: there is still deliberately no FX conversion, but
`lib/price.ts::formatPrice()` has since become the single source of truth (ADR-0002) and
does use `Intl.NumberFormat`. Fixed per this file's own rule about stale facts.

## Terms accuracy audit — claims checked against code

| terms.md claim | Verdict |
|---|---|
| §2 "may take part in affiliate programs (Skimlinks, Awin, LTK)" | **Accurate** — none are live; softened wording now matches |
| §2 "does not influence whether a brand earns our seal" | Seal exists (`VerifiedSpotlight.tsx`, `/contact?topic=seal`); policy statement, fine |
| §3 prices "displayed in each brand's own currency… **not converted**" | **Accurate** — `lib/price.ts:7` states exactly this; no FX code anywhere |
| §3 prices "collected periodically" | **Accurate** — `npm run refresh` |
| §5, §8 party named | **Fixed** — `[OPERATOR NAME]` gone, The Modesty House is the sole named party |
| §10 Dutch governing law | **Accurate** — matches the country of establishment in privacy §1 |

## Verification

```
$ npm test
 Test Files  14 passed (14)
      Tests  342 passed (342)

$ rm -f tsconfig.tsbuildinfo && npx tsc --noEmit
TSC: clean

$ npm run build
✓ Generating static pages using 9 workers (34/34) in 691ms
├ ○ /privacy   └ ○ /terms

$ grep -c "Not ready to publish" .next/server/app/terms.html   → 0
$ grep -c "OPERATOR NAME"        .next/server/app/terms.html   → 0
$ grep -o "owned by <strong>The Modesty House</strong>" …      → owned by The Modesty House
$ grep -o "…is not liable[^<]*" …                              → The Modesty House is not liable for any loss or damage arising from:
$ grep -o "may take part in affiliate programs[^.]*\." …       → may take part in affiliate programs (such as Skimlinks, Awin, and LTK).
```

## Notes / follow-ups

- **Not deployed.** These changes are committed to local `main` but not pushed. Per
  CLAUDE.md §10.17 rule 2, "pushed" is not "deployed" — after pushing, assert with
  `git merge-base --is-ancestor <sha> origin/main`.
- **`legal/privacy-controller-and-accuracy` is now redundant** for the legal work; its
  content is on `main`. It still carries an unrelated brands commit (`fdc1417`), so do
  not delete it without checking that first.
- **P0-D remains open.** Cookie consent is still unbuilt. Defensible only while there is
  no analytics (verified: zero hits) and the Skimlinks script is off. Setting
  `NEXT_PUBLIC_SKIMLINKS_ID` makes this a live gap on the same day — and it also makes
  the footer's "may be affiliate links" become unconditionally true, so revisit both
  together.
- **`app/api/csp-report/route.ts:12,17`** still reference Vercel; the app deploys to
  Railway. Stale comments, no behavioural effect.
