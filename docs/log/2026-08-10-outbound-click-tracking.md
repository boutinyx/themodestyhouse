# Measure the click that earns the money — Pulse `outbound_click`

**Date:** 2026-08-10 · **Status:** done

## Goal

Tina asked whether to implement Pulse Goals
(`https://help.ciphera.net/docs/pulse/goals`). Pulse was already installed and
disclosed, but **nothing called `pulse.track()`** — so the site knew its traffic
and knew nothing about which of the 107 houses it actually sends people to.
That outbound click is the entire revenue model (§11 P0-E) and was unmeasured.

One goal: `outbound_click`, with `brand`, `garment` and `surface`.

## What changed

- **`lib/pulse.ts`** (new) — client-safe. `outboundProps(el)` reads the three
  disclosed dimensions off an anchor's `data-*`; `track()` calls
  `window.pulse.track` or falls back to the documented `window.pulseQueue`.
  Never throws: it runs on the click that earns the commission, so a
  measurement failure must never interfere with the navigation.
- **`components/OutboundTracking.tsx`** (new) — ONE delegated listener on
  `a[rel~="sponsored"]`, mounted in `app/layout.tsx`.
- **Six outbound anchors annotated** with `data-brand` / `data-garment` /
  `data-surface`: `QuickView`, `EditorsRail`, `VerifiedSpotlight`,
  `BrandMarquee`, `BrandCard`, `app/designers/page.tsx`.
- **`lib/compactCatalogue.ts`** — `CardProduct` gains `brandSlug` and `garment`.
- **`content/legal/privacy.md` §2** — discloses the new event.
- **`scripts/outbound-audit.mjs`** (new) + `npm run audit:outbound`.

## Why delegation, not onClick

Three of the six components that render an outbound link — `BrandCard`,
`BrandMarquee`, `VerifiedSpotlight` — are **server** components. An `onClick`
would force all three `'use client'`, pushing their data back into the RSC
payload that `3ae4453` had just taken 2.9x out of. A delegated listener costs
one listener for the whole site, works in server and client components alike,
and keys off `rel~="sponsored"` — which §6 already makes mandatory on outbound
links, so a link added later is tracked because it is marked up correctly, not
because someone remembered this file.

Adding `brandSlug`/`garment` to `CardProduct` costs **zero payload bytes**:
both are derived at decode time from `brandIdx` / `garmentIdx`, which the
columnar encoding already carries.

## Privacy

Pulse's docs are explicit: *"Do not include personally identifiable information
in event properties."* Only three low-cardinality dimensions are sent, all of
which describe the SITE, not the visitor — brand slug (~107 values), garment (8),
surface (~6). No product id, no title, no destination url (which would drag in
whatever query string a brand appends). `OUTBOUND_PROPS` is an allowlist, and a
test asserts the emitted object can never contain a key outside it.

The site shows no consent banner and runs Pulse under legitimate interest, so
the policy has to be accurate rather than broad. §2 previously enumerated
exactly what Pulse collects and outbound clicks were not in that list — leaving
it unchanged would have made a published legal document quietly false.

`lib/legal.test.ts` now couples the two: if `lib/pulse.ts` still emits
`'outbound_click'`, the policy MUST carry the disclosure, and `OUTBOUND_PROPS`
must still be exactly three keys. This is the §10.15 / §10.19 lesson — an
assumption stated only in prose is not enforced.

## Verification

```
npm test                    → 22 files, 447 tests (was 436)
npx tsc --noEmit            → exit 0
npx eslint app components lib scripts → exit 0
npm run build               → 0
npm run audit:outbound      → ALL PASS, 3 surfaces x 2 engines
   outbound /designers        chromium  ok {"brand":"veiled","surface":"designers"}
   outbound /modest-dresses   chromium  ok {"brand":"niswa","garment":"dress","surface":"quickview"}
   outbound /                 chromium  ok {"brand":"niswa","garment":"dress","surface":"editors-rail"}
   outbound /designers        webkit    ok {"brand":"veiled","surface":"designers"}
   outbound /modest-dresses   webkit    ok {"brand":"niswa","garment":"dress","surface":"quickview"}
   outbound /                 webkit    ok {"brand":"niswa","garment":"dress","surface":"editors-rail"}
```

**Every new check was run against deliberately broken input first (§10.28).**

- The legal guard: added a 4th key to `OUTBOUND_PROPS` → fails. Deleted the
  disclosure from the policy → fails. Restored → 16 passed.
- The audit: removed `<OutboundTracking />` from the layout, rebuilt →
  **6 PROBLEM(S), "no outbound_click queued"** at every surface in both engines.
  Restored, rebuilt → ALL PASS. Without this the audit would have been trusted
  on the strength of a green it might not have been able to lose.

Because Pulse is production-only (`NODE_ENV` gate in `app/layout.tsx`),
`window.pulse` is absent locally and `track()` takes its QUEUE path — which is
what makes this verifiable offline at all: the audit clicks a real link and
reads back what *would* have been sent.

## Two harness faults hit on the way, both already in the log

1. **WebKit reported "CSS did not load" on all three pages** — §10.24 verbatim.
   The site sends HSTS and `upgrade-insecure-requests`; over plain-http
   localhost WebKit honours both, rewrites every subresource to `https://`, and
   renders with no CSS while still looking like a successful run. Chromium
   exempts localhost. Fixed the way `scripts/interaction-audit.mjs` already
   does: strip those headers, WebKit-only, local-only.
2. **`npm run build` failed in the worktree** with
   `Symlink [project]/node_modules is invalid, it points out of the filesystem
   root`. Turbopack rejects a symlinked `node_modules`; vitest and tsc had
   tolerated it, so three earlier worktrees in this session never noticed. A
   worktree that must run `next build` needs a real `npm ci`.

## Notes / follow-ups

- **`components/BrandCard.tsx` is dead code** — imported nowhere; `/designers`
  renders its own `Tile`. I annotated it anyway (correct if it is ever revived)
  but it should probably be deleted. Found only because the rendered HTML had
  zero `data-brand` after annotating it — the reason to check output rather
  than trust a grep of the source.
- **Nothing is tracked for the newsletter or the contact form.** Both are real
  conversions and both already have client components; a second goal each is
  cheap once the dashboard shows this one working.
- **The goal must still be created in Pulse** (Settings → Goals) with the event
  name `outbound_click` exactly, or the events are collected but not surfaced
  as a conversion. Per the docs an event name cannot be edited after creation.
- Skimlinks rewrites outbound URLs at click time; this listener fires on the
  same click and reads only `data-*`, so the two do not interact.
