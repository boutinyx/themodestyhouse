# A Pulse goal for saved pieces — `favourite_add`

**Date:** 2026-08-30 · **Status:** done

## Goal

Tina: *"create a goal event when users favorite products so we can see which
products they favorite in pulse."*

The site has had a favourites feature since long before it had any analytics,
and nothing measured it — the heart wrote to `localStorage` and the information
stopped there. `outbound_click` (2026-08-10) answers *which brands* readers go
to; nothing answered *which pieces they want*, which is the signal that decides
what gets featured and which houses are worth more of the catalogue.

## What changed

- **`lib/pulse.ts`** — `FAVOURITE_EVENT` (`'favourite_add'`), `FAVOURITE_PROPS`
  and `favouriteProps()`. Four properties: `brand`, `garment`, `product` (the
  `${brandSlug}:${shopifyId}` id, Invariant 1) and `title`.
- **`components/QuickView.tsx`** — `toggleFav` emits the event on a SAVE. It is
  the single choke point: the card heart, the homepage rails' heart, the
  quick-view button and `/favourites` all call it, so a call site added later is
  measured without anyone remembering this file. Same self-maintaining reasoning
  as the delegated listener behind `outbound_click`.
- **`app/favourites/page.tsx`** — "Clear all" now passes an explicit arrow (a
  bare `forEach(toggleFav)` would pass the array INDEX as the new options
  argument), and "Undo" passes `{ silent: true }`.
- **`content/legal/privacy.md` §2** — a new *Pieces you save* bullet, and a
  correction to the existing favourites bullet.
- **`lib/legal.test.ts`, `lib/pulse.test.ts`** — guards, below.
- **`scripts/outbound-audit.mjs`** — the script now covers both goals.
- **`lib/legal.ts`** — `LEGAL_LAST_UPDATED` → 30 August 2026.

## Why this event names the product and `outbound_click` does not

`OUTBOUND_PROPS` is deliberately three low-cardinality dimensions and no product
at all. This one carries `product` and `title`, which is the whole reason it
exists — "which products" was the question. Both are facts about **our own
catalogue**: the id joins the answer back to `data/products.json`, the title
makes the Pulse dashboard readable without a lookup, and neither says anything
about the visitor. Pulse stays cookieless with no visitor id to attach them to,
so what accumulates is a count per piece across everyone, not anybody's list.

Still excluded, by allowlist rather than by intention: the product url (which
would drag in whatever query string a brand appends), the price, the image.
`favouriteProps()` builds its object key by key from a frozen list — passing it
a whole `CardProduct` cannot leak the rest.

## Two decisions that shape what the numbers mean

**Only saves are tracked, never removals.** `/favourites`' "Clear all" removes
the whole list one `toggleFav` at a time, so a remove event would be dominated
by single taps and would make "most saved" unreadable. The question is which
pieces people want, not which they tidied away.

**Undo is silent.** Undoing a "Clear all" puts back pieces that were already
counted when they were first hearted. Counting them again would turn the goal
into a measure of undo taps.

**And a React ordering point:** `toggleFav` used to decide add-vs-remove inside a
`setFavs(prev => …)` updater. React runs that updater during the next render,
not at dispatch, and may run it twice in StrictMode — so it can neither report
back synchronously nor host an analytics call without making it a render side
effect. The map now also lives in a ref that is written before the state, which
is both synchronous and correct across two fast taps on the same heart.

## Verification

```
npx tsc --noEmit                       → exit 0
npx eslint app components lib scripts  → exit 0
npm test                               → 58 files, 1029 tests passed
BASE=http://localhost:3199 npm run audit:outbound   → ALL PASS (both engines)

favourite card        chromium  ok {"brand":"niswa","garment":"dress","product":"niswa:10217348399402","title":"Aurelia Linen Convertible Dress - Blush"}
negative unfavourite  chromium  ok removing a piece emitted nothing
favourite quickview   chromium  ok {"brand":"zahraa","garment":"dress","product":"zahraa:7508377337943","title":"Reyana Paisley Long Sleeve Maxi Dress"}
   … identical for webkit, alongside the six unchanged outbound_click lines …
```

Built and served from a throwaway worktree on port 3199 — another session has
owned `next start -p 3188` and the shared `.next` since yesterday (§10.28 rule 4).

**Every new check was run against deliberately broken code first (§10.28 rule 1).**

- Legal guard, three controls: a 5th key in `FAVOURITE_PROPS` → fails; the
  *Pieces you save* bullet removed → fails; the old "It never reaches our
  servers" sentence restored → fails.
  The bullet control **passed on the first attempt and should not have** — the
  assertion was `/Pieces you save/`, which the cross-reference *inside the
  favourites bullet* satisfies, so it would have gone green with the disclosure
  itself deleted. Re-anchored on `- **Pieces you save.**`, then it fires.
- Audit, two controls, each a full rebuild: the `track()` call deleted →
  `PROBLEM no favourite_add after saving a piece (saw=[])` on both surfaces in
  both engines; the `added &&` guard dropped so removals track too →
  `PROBLEM removal emitted {…}`. Restored → ALL PASS.

**One harness fault, caught before it was believed (§10.26).** The first run
reported `heart did not become saved` and `removal emitted {…}` for a *different
brand's* product — which reads exactly like a broken toggle. The heart was a
Playwright **locator**, which re-resolves on every use: the click flips
`aria-label` to "Remove from favourites", so `.first()` afterwards pointed at the
NEXT card's heart. Both lines were one fault, in the check. It is an
`elementHandle` now, and it is pinned to a node whose attribute React updates in
place. The `aria-label` flip is also the interactivity assertion for this widget
(§10.28 rule 2): it is React state, so a label that changes proves the provider
is live — and it predates this change, so the check cannot pass by selecting on
the thing it is meant to prove (§10.32 rule 2).

## Verified on staging

`f30216f`, deployed ~220 s after the push and confirmed by a discriminator that
is present with the change and absent without it — the *Pieces you save* bullet
on `/privacy` (§10.47 rule 3). `x-robots-tag: noindex, nofollow, noarchive`
still served.

```
$ BASE=https://themodestyhouse-staging-production.up.railway.app npm run audit:outbound
favourite card        chromium  ok {"brand":"niswa","garment":"dress","product":"niswa:10217348399402","title":"Aurelia Linen Convertible Dress - Blush"}
negative unfavourite  chromium  ok removing a piece emitted nothing
favourite quickview   chromium  ok {"brand":"zahraa","garment":"dress","product":"zahraa:7508377337943","title":"Reyana Paisley Long Sleeve Maxi Dress"}
   … identical for webkit, alongside the six unchanged outbound_click lines …
ALL PASS
```

Note this run was not inert: staging builds with `NODE_ENV=production`, so the
real Pulse script loads and the harness chains to it, which means **4 genuine
`favourite_add` events (2 per engine) were sent** under `data-domain
themodestyhouse.com`. Two products, four events, on a goal that does not exist
in the dashboard yet.

## Follow-up for Tina

**The goal has to be created in Pulse before anything shows.** Settings → Goals →
a custom event named exactly `favourite_add`. Pulse's docs are explicit that an
event whose name has not been created there is not displayed; the site will emit
it either way, so nothing is lost in the meantime, but the panel stays empty
until it exists.

Pulse is production-only (`NODE_ENV` gate in `app/layout.tsx`), so the event
cannot be seen locally at all — the audit above reads what *would* have been
sent, off `window.pulseQueue`.
