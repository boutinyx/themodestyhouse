# Eight more Pulse goals, behind one allowlist

**Date:** 2026-08-31 · **Status:** done

## Goal

Tina created six goals in Pulse's dashboard and sent a screenshot: `outbound_click`,
`favourite_add`, `currency_change`, `filter_apply`, `quick_view_open`,
`search_zero_results`. Two of those existed in code; four were declared and
emitted by nothing. Then: *"go on fix everything"*, after a Playwright sweep of
the live site turned up four more worth adding — `newsletter_signup`,
`contact_submit`, `faq_open`, `share_link_copy`.

Ten goals now, up from two.

## What changed

**`lib/pulse.ts` is now a registry.** `EVENT_PROPS` declares every goal and the
exact keys it may carry; `trackGoal(event, props)` filters against it. The
allowlist moved from the call site to the transport, so a component that hands
over a whole product — or a form value — cannot widen what leaves the browser.
`goalProps` drops anything undeclared, drops empty values (Pulse would otherwise
store the literal string `"undefined"`), and caps at 200 characters — 60 for the
one free-text property.

| goal | properties | fired from |
|---|---|---|
| `outbound_click` | brand, garment, surface | delegated listener (unchanged) |
| `favourite_add` | brand, garment, product, title | `toggleFav`, saves only |
| `quick_view_open` | brand, garment, product, title | `QuickViewProvider.open` |
| `share_link_copy` | brand, garment, product, title | quick view, on a successful copy |
| `currency_change` | currency, from | `CurrencyProvider.setPreference` |
| `filter_apply` | filter, value, lane | `FilterDropdown` in `IndexPanel` |
| `search_zero_results` | query | `useZeroResultSearch` on `/directory` |
| `newsletter_signup` | surface | `NewsletterSignup`, on acceptance |
| `contact_submit` | topic | `ContactForm`, on acceptance |
| `faq_open` | question | `HowBlocks`, opt-in via a `goal` prop |

**Every one is wired at a choke point, not at a call site.** `filter_apply` lives
inside `FilterDropdown`, which is the Brand / Colour / Category / Type / Sort
control on both grids — so a filter added later is measured because it was built
the normal way. `currency_change` lives in `setPreference`, which all three
switchers call, and which the mount-time restore of a saved preference does not
(that calls `setPref` directly, so a returning visitor is never counted as making
a fresh choice). Same reasoning as the delegated listener behind `outbound_click`.

## The judgement calls, because they decide what the numbers mean

- **`faq_open` is fired from the open STATE, not from `onClick`.** These blocks
  open on hover for a mouse (`HowBlocks`), so counting clicks would have recorded
  touch users only. A block must stay open 700 ms to count, which filters a
  pointer sweeping down the column, and each question counts once per page view.
- **`search_zero_results` only fires on an empty result set**, after the query
  has been still for 1.2 s, once per query, minimum three characters. Both grids
  filter live as you type, so "sh", "shi", "shir" are not three failed searches.
- **`share_link_copy` fires after the clipboard write resolves.** A refused copy
  is not a share.
- **`newsletter_signup` and `contact_submit` fire only once the API has accepted
  the submission**, and carry `surface` and `topic` respectively. The address,
  name and message are not in either allowlist, so they cannot travel even if
  passed here by mistake — asserted in `lib/pulse.test.ts`.
- **The hook is on `/directory` only.** Every lane and every edit passes
  `searchable={false}`, so `FilterableGrid` has no search field; the version of
  this that called the hook there was removed rather than shipped, because code
  that cannot run is not coverage. The header magnifier routes to
  `/directory?q=…`, so it is measured.

## Privacy

`content/legal/privacy.md` §2 gains two bullets: *Which controls you use*
(quick view, share link, currency, filters, newsletter, contact topic, FAQ) and
*Searches that find nothing*, which is the only goal on the site carrying words a
visitor typed and says so plainly — zero-result searches only, once each, 60
characters, and covered by the same Do Not Track / GPC opt-out as everything else.

`lib/legal.test.ts` now reads the goal names **out of `lib/pulse.ts`** and requires
a §2 disclosure for each. Adding a goal without disclosing it fails the build,
which is the coupling §10.19 exists to enforce, generalised from one event to ten.

## Verification

```
npx tsc --noEmit                       → exit 0
npx eslint app components lib scripts  → exit 0
npm test                               → 1033 passed, 1 failed (PRE-EXISTING, below)
BASE=http://localhost:3205 npm run audit:outbound → ALL PASS, both engines

filter_apply sort     chromium  ok {"filter":"sort","value":"newest","lane":"/modest-hijabs"}
search_zero_results   chromium  ok {"query":"zzzqqxnothinghere"}
negative search-hit   chromium  ok a search with results emitted nothing
currency_change       chromium  ok {"currency":"EUR","from":"USD"}
quick_view_open       chromium  ok {"brand":"niswa","garment":"dress","product":"niswa:10217348399402",…}
share_link_copy       chromium  ok {…same shape…}
faq_open              chromium  ok {"question":"Is The Modesty House a shop?"}
   … identical for webkit, alongside the nine unchanged outbound/favourite lines …
```

The one failing test is `lib/edits.test.ts` — the `everyday-lace` edit hand-picks
*Lace Flower Abaya in Sage*, which today's nightly saw go out of stock. It fails
identically on `origin/main` without any of this work and needs a re-pick in
`/staff/curate`, which is Tina's call, not a code fix.

**Negative controls, each a full rebuild (§10.28 rule 1).**

- `trackGoal` made a no-op → all six new checks report `PROBLEM no <goal>
  emitted`, in both engines, while `outbound_click` stays green (it goes through
  `track` directly) — which is the discriminator that says the control disabled
  what it meant to.
- The `countRef.current !== 0` guard removed → `PROBLEM a search WITH results
  emitted {"query":"hijab"}`. That check is what defends the sentence in the
  privacy policy, so it needed its own control.
- Legal guard: a goal added to `EVENT_PROPS` with no §2 entry → *no §2 disclosure
  mapped for the goal "scroll_depth"*. One disclosure sentence deleted → *§2 does
  not disclose the goal "currency_change"*.

**Three harness faults, each caught before it was believed (§10.26).**

1. `getByLabel('Search houses and pieces')` timed out on `/modest-hijabs` — a
   control that has never existed there, because lanes pass `searchable={false}`.
   It read like a broken search field. Retargeted at `/directory`.
2. `button[aria-expanded]` on `/faq` matched the header's phone-nav trigger
   first — 19 elements on that page carry the attribute — and Playwright waited
   15 s for something that is `display: none` above the `hdr` breakpoint. Now
   scoped to `h2 button[aria-expanded]`, the accordion's own heading.
3. The FAQ check CLICKED, and a click on a mouse opens the block on the way in
   and toggles it shut — the behaviour `HowBlocks.tsx` documents and the reason
   the goal is not fired from `onClick` at all. It reported `no faq_open
   emitted` on a component that works. It hovers now.
   Also: Chromium refuses `navigator.clipboard.writeText` without a permission
   grant, so `share_link_copy` could not fire there while WebKit passed — the
   context now grants `clipboard-write` for Chromium only, since WebKit does not
   know the permission name and allows the write anyway.

## Follow-up for Tina

Four goals still need creating in Pulse (Settings → Goals), exactly:
`newsletter_signup`, `contact_submit`, `faq_open`, `share_link_copy`. The site
emits them either way; they simply are not displayed until the name exists.
