# UTM campaign tags on every outbound brand link
**Date:** 2026-08-24 · **Status:** done

## Goal
Make the brands we feature able to SEE the traffic we send them.

The finding that motivated the shape of this: every outbound anchor on the site
carries `rel="noopener noreferrer sponsored"` (CLAUDE.md §6 — the `sponsored`
token is an FTC requirement). **`noreferrer` strips the `Referer` header**, so a
brand's analytics does not record our clicks as a referral from
themodestyhouse.com — it records them as *direct* traffic, indistinguishable
from someone typing the URL. We are not merely under-credited in their reports;
we are absent from them entirely.

UTM parameters survive that, because they travel in the URL rather than in a
header. `themodestyhouse.com / referral` is the exact source/medium pair a
browser-sent referrer would have produced, so this does not invent a new row in
a merchant's report — it restores the one `noreferrer` removes.

## What changed

**`lib/outbound.ts` (new)** — `withUtm(url, surface?)`, plus the `OUTBOUND_UTM`
constant and the `OutboundSurface` union. Tag:

    utm_source=themodestyhouse.com&utm_medium=referral&utm_campaign=directory&utm_content=<surface>

Three properties it is built around:
- **Never overwrites an existing `utm_source`.** A URL that already carries one
  belongs to whoever tagged it; clobbering it would corrupt the brand's own
  attribution, which is the opposite of the point. Also makes the function
  idempotent.
- **Returns anything unparseable or non-http(s) unchanged** — same contract as
  `lib/shopifyImage.ts`. Never mangle a URL we do not understand.
- **Runs at RENDER time, never at ingest.** `Product.url` in
  `data/raw-products.json` stays clean, so changing or removing the tag is one
  edit in one file and needs no re-scrape (CLAUDE.md §8 — raw rows are frozen at
  the logic that scraped them, which is how the §10.12 fix sat inert for weeks).

`utm_content` mirrors the `data-surface` value already on each anchor for
Pulse's `outbound_click` event, so our own analytics and the brand's tell the
same story about where a click came from.

**Wired into all eight outbound surfaces** (imports + one wrapped `href` each):
`components/ProductCard.tsx` (`product-card`), `components/QuickView.tsx`
(`quickview`), `components/EditorsRail.tsx` (`editors-rail` /
`product-page-related`, via its existing `surface` prop — whose type was
tightened from `string` to `OutboundSurface`), `components/BrandCard.tsx` and
`app/designers/page.tsx` (`designers`), `components/BrandMarquee.tsx`
(`marquee`), `components/PopularShowcase.tsx` (`popular-showcase`),
`app/designers/[slug]/page.tsx` (`brand-page`),
`app/product/[brandSlug]/[shopifyId]/page.tsx` (`product-page`).

In `ProductCard` and `QuickView` the wrap is on the `href` attribute, not the
state initialiser, so it covers the post-mount regional swap
(`pickRegionalUrl`) as well as the server-rendered URL.

**Deliberately NOT tagged:** `components/Markdown.tsx`. Its two outbound
anchors render arbitrary editorial links, which are not necessarily brand
destinations, and we cannot tell which are without a host lookup against
`BRANDS`. Left alone rather than tagging third parties who never featured here.

**`scripts/outbound-audit.mjs`** — two changes. First, a new permanent
assertion that the outbound href carries the tag. Its locator is structural (`a[rel~="sponsored"][data-brand]`,
both predating this change), so it cannot pass by selecting on its own fix
(§10.32 rule 2). It reports and continues rather than `continue`-ing, so an
untagged link cannot mask the tracking assertions below it.

Second, a **pre-existing harness bug fixed**: the `/modest-dresses` case opens
the quick-view modal and then clicked
`page.locator('a[rel~="sponsored"][data-brand]').first()` — which in DOM order
is a PRODUCT CARD's anchor, sitting behind the modal overlay. The click was
intercepted and timed out 15s later, in both engines, reporting a harness fault
as a product defect. It has done that since `ProductCard`'s root became an `<a>`
on 2026-08-11, so the quick-view surface has never actually been measured. The
locator is now scoped to `[data-surface="quickview"]` when the case opened the
modal. Confirmed pre-existing against pristine `origin/main` before touching it
(§10.38 rule 1) — see below.

## Verification

`lib/outbound.test.ts` — 10 tests, written before the implementation and watched
to fail on a missing module first. Covers: clean URL, existing query string
preserved, hash fragment kept after the query, existing `utm_source` untouched,
idempotence, `utm_content` omitted when no surface, unparseable/empty returned
unchanged, `mailto:` untouched, and the exact literal output string.

    Test Files  1 passed (1)
          Tests  10 passed (10)

`npx tsc --noEmit` — exit 0. `npm run lint` — exit 0.

Full suite: 1323 passed, 2 failed — both failures are in
`.claude/worktrees/jiggly-hugging-honey/` (another session's worktree, picked up
from the repo root), in `aboutStats.test.ts` and `devOnly.test.ts`. Neither
touches anything in this change.

**Rendered HTML, against the running dev server** — every outbound anchor on
each route, counted, not sampled:

| route | `rel="…sponsored"` anchors | tagged |
|---|---|---|
| `/` | 19 | 19 (12 `editors-rail`, 7 `popular-showcase`) |
| `/directory` | 24 | 24 (`product-card`) |
| `/designers` | 25 | 25 (`designers`) |
| `/designers/veiled` | — | 1 `brand-page` + 24 `product-card` |
| `/product/niswa/10217348399402` | — | 1 `product-page` + 6 `product-page-related` |

**QuickView** is a client modal, invisible to any static render (§10.25), so it
was driven with Playwright — open `/directory`, click the quick-view button,
read the modal's outbound href:

    https://niswafashion.com/products/huda-gold-accent-dress-pink-copy-3?utm_source=themodestyhouse.com&utm_medium=referral&utm_campaign=directory&utm_content=quickview

**Negative control for the new audit check (§10.28 rule 1)** — `withUtm` was
temporarily neutered to `return url`, the audit re-run, and the check fired on
all three of its surfaces:

    utm/designers        chromium  PROBLEM /designers: outbound href carries no campaign tag — https://www.hautehijab.com
    utm/modest-dresses   chromium  PROBLEM /modest-dresses: … — https://niswafashion.com/products/huda-gold-accent-dress-pink-copy-3
    utm/                 chromium  PROBLEM /: … — https://bemutr.com/products/polka-dot-maxi-skirt-black

and was silent with the helper restored. The helper was then restored from a
backup and its tests re-run (10 passed).

## Deploy

Shipped from a detached worktree off `origin/main`, NOT from the working tree:
`seo/tier1-fixes` has a large amount of other uncommitted work in it from
concurrent sessions, and `git add <path>` stages the file rather than my change
to it (§10.30). Local `HEAD` was also three nightly `refresh.yml` commits behind
`origin/main` (§10.35), so the worktree was based on freshly-fetched `b18cae9`.

`components/PopularShowcase.tsx` is **deliberately excluded**: it is another
session's UNTRACKED new component, so shipping my one-line change to it would
have shipped their whole in-progress file. Its `popular-showcase` value stays in
the `OutboundSurface` union and starts working the moment they land it.

Verification in that worktree, all on the pristine-main base plus this diff only:

- `npx tsc --noEmit` — exit 0
- `npm run build` — succeeded, all routes
- full suite — 731 passed, 1 failed: `lib/nonApparel.test.ts`'s "every test
  string still exists in the raw catalogue". That is §10.19 — an authoring aid
  over data a bot rewrites nightly; last night's refresh delisted 77 products and
  two fixture titles went with them. It skips when `CI` is set (confirmed:
  `CI=1` → 149 passed, 1 skipped) so it is not a deploy gate, and its import
  graph (`lib/nonApparel.ts` + `data/raw-products.json`) touches nothing in this
  change.
- `BASE=http://localhost:3199 npm run audit:outbound` against `next start` —
  **ALL PASS**, chromium and webkit, all three surfaces plus the permanent
  internal-link negative control.
- **Negative control on the production build (§10.28 rule 1):** the same audit
  run against pristine `origin/main` reported the new tag check firing on all
  three surfaces in both engines, and reported the `/modest-dresses` timeout
  identically — which is how that failure was established as pre-existing rather
  than mine.

## Notes / follow-ups

- Verified on a production build before deploy — see the deploy section above.
  The three WebKit "page not interactive" lines seen in the first (dev-server)
  run were exactly the dev-mode artifact the audit's own header warns about
  (§10.24: WebKit never reaches networkidle against `next dev`); they are absent
  from `next start`.
- **The known unknown, unchanged from the pre-work advice:** a minority of
  merchants run in-house last-click attribution that reads `utm_source`. At those
  stores the tag could theoretically cause the sale to be credited to
  "themodestyhouse.com referral" instead of the affiliate network — a visible
  click with no commission. Untestable until an affiliate programme is actually
  live (P0-E is still a stub). If commissions ever look short against click
  volume, this file is the first place to look, and removing the tag is one edit.
- The alternative route to the same visibility is dropping `noreferrer` from
  outbound anchors (`target="_blank"` already implies `noopener` in every current
  browser). That restores true referral attribution but leaks the full referring
  URL to every brand, and it was not done here — the UTM achieves the goal
  without changing the `rel`.
