# Pulse interaction capture — the setting was on, the tag was missing
**Date:** 2026-09-12 · **Status:** done (on staging, awaiting Tina's approval to merge)

## Goal
Tina relayed advice: *"you should turn on interaction tracking in your settings & ask claude
to add it to your script on your website"* — then clarified: **pulse**.

## What was found first

**The setting is already ON.** Pulse → Site settings shows four toggles live: Scroll depth,
Outbound links, File downloads, and **Interaction capture** (with its three sub-toggles Clicks,
Copies and Form submits all on). Its own label states the consequence: *"adds a second script
tag to your snippet."*

**The second tag was never added.** `app/layout.tsx` carried exactly one Pulse tag,
`https://js.ciphera.net/script.js`. So interaction capture has been enabled server-side and
collecting nothing — the toggle changes what the dashboard will accept, not what the browser
sends.

Established by reading the scripts rather than the dashboard copy:
- `script.js` (6,576 B) reads only `data-api`, `data-domain`, `data-no-downloads`,
  `data-no-outbound`, `data-no-scroll`. Outbound, downloads and scroll are therefore **on by
  default and already working** — nothing to add for those, and the existing
  `components/OutboundTracking.tsx` `outbound_click` goal is a separate, custom event on top.
- `https://js.ciphera.net/script.interactions.js` (2,309 B) is the missing half. It emits
  `pulse_click`, `pulse_copy` and `pulse_form_submit`, and nothing else.

Probing for it: `interactions.js`, `interaction.js`, `events.js`, `capture.js`, `clicks.js`
and `pulse-interactions.js` all 404; `script.interactions.js` returns 200.

## What changed

- **`app/layout.tsx`** — second `<Script>`, production-gated exactly like the first.
- **`content/legal/privacy.md` §2** — a new bullet disclosing it. Required: §2 enumerates
  every counted action, and generic click capture is **broader than that list**. The layout's
  own comment already said to keep the two in sync.

Redaction, read out of the script source rather than the marketing copy: a click sends the
element's `aria-label` or text, capped at 60 chars with `/[^\s@]+@[^\s@]+\.[^\s@]+/` → `[email]`
and `/\d[\d\s-]{5,}\d/` → `[number]`, **applied in the browser before the event is sent**; a copy
sends length and page, never the text; a form submit sends the form's `name` and its field
COUNT, never a value or a field name. `data-pulse-ignore` opts a subtree out.

**No CSP change needed** — `js.ciphera.net` is already in `script-src` and the events leave via
the main script's existing `pulse-api.ciphera.net` connection (`next.config.ts:70,88`).

**Ordering is not a race.** The interactions script calls `window.pulse.track`, reading it at
EVENT time, not load time. An event fired before the main script arrives is silently dropped;
after that, order is irrelevant.

## Verification
```
git merge origin/main          # f45caa9, the 11 Sep nightly — staging was 1 behind (§10.53)
npx tsc --noEmit               # exit 0
npm run lint                   # exit 0
npm test                       # 1183 passed, 1 failed — NOT this change, see below
```

**The one failing test is pre-existing and does not gate CI.**
`lib/colourLeads.test.ts > every listed id is one this catalogue has actually seen` reports
`lameera-moda:8791781867688`. That row is `Rana Stripe Abaya Set- Taupe`, present in
`data/raw-products.json`, `inStock: false`, `delistedAt: null` — so it left `products.json` for
being out of stock, in the nightly this branch just merged. The test is `it.skipIf(!!process.env.CI)`,
so `main` is not red.

Not fixed here, because it is not this task and the fix is a judgement call. Worth raising:
**the assertion contradicts its own comment**, which says *"Absence is NOT a failure… an unknown
id is worth surfacing locally as a probable typo"* — and then fails on absence. With the 04:10
refresh moving stock nightly, any out-of-stock lead will trip it again. `lib/dressSubtypes.test.ts`
was rewritten for exactly this reason (§10.54) to assert *known to raw and not cut* rather than
*published today*; the same change applies here.

### Verified on staging, end to end

`https://themodestyhouse-staging-production.up.railway.app/`, in Chrome, 2026-09-12,
~120 s after the push.

```
scripts in DOM   js.ciphera.net/script.js
                 js.ciphera.net/script.interactions.js     <- new, present
window.pulse     object · window.pulse.track  function     <- dependency satisfied
click on the header currency button
  -> pulse_click {text:"Prices in USD. Change currency", tag:"button",
                  page_path:"/", id:"base-ui-_R_1pcilb_"}
```

**Nothing reached Tina's analytics.** `window.pulse.track` was monkey-patched to record the
call and deliberately NOT forward it before anything was clicked — staging sends
`data-domain="themodestyhouse.com"`, so an un-intercepted test click would have landed in the
production figures as a real visitor action.

Two things the payload shows that the dashboard copy does not:
- **The label is the `aria-label`, not the visible text** — "Prices in USD. Change currency"
  rather than "$ USD". More useful, and it means an aria-label is what ends up in reports.
- **It carries a React-generated `id`** (`base-ui-_R_1pcilb_`). Not a privacy problem, but it
  changes per render, so it is noise in any grouping. Worth knowing before reading the reports.

## Notes / follow-ups
- After the merge to `main`, confirm a real `pulse_click` lands in the Pulse dashboard on
  production — staging proves the wiring, not the ingest.
- Consent is untouched and remains as §11/P0-D describes it: this adds no cookie and no
  identifier, and honours Do Not Track and Global Privacy Control like the rest of Pulse, so it
  does not by itself create the consent-banner obligation that switching Skimlinks on would.

---

## Merged to production, 2026-09-12

Tina: *"push to main"*. `origin/main` fast-forwarded `f45caa9 → 09acb14` (pushed as
`origin/staging:main`, so the shared working tree was never checked out — another session is
active). Confirmed with `git merge-base --is-ancestor 09acb14 origin/main`.

It also carried `61e2d17`, a different session's log entry, because `staging` is the shared
integration branch. Flagged to Tina rather than left as a surprise.

**Deploy and purge, in the order §10.47 requires.**

```
before deploy, cache-busted   cf-cache-status: MISS · interactions present: False
                              ^ establishes the marker as a real DISCRIMINATOR
origin polled, cache-busted   NEW BUILD after ~120s
Cloudflare purge_everything   success: true          ^ purge AFTER the origin is current
canonical GET #1              MISS · 444,407 B · interactions: True
canonical GET #2              HIT · age: 0 · 444,407 B · interactions: True
```

Both verification requests are real `GET`s of the canonical URL, not `HEAD` and not
cache-busted — §10.47 rule 4. The zone id was read via `/zones?name=`, and the token by
grepping the single key out of `.env` rather than sourcing it (§10.48).

**Live on `https://themodestyhouse.com`.** From here the events are real; nothing further is
needed for collection to start.
