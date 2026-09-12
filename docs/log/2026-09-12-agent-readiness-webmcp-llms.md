# Agent readiness: WebMCP tools, llms.txt guidance, and a stale-search-grid fix
**Date:** 2026-09-12 · **Status:** partial (on staging, awaiting Tina's approval to merge; origin-trial token not yet registered)

## Goal
Tina pasted an orank scan of themodestyhouse.com: 63/100, grade C, five gaps. Fix the ones that can
honestly be fixed in code.

| Gap | Pts lost | Outcome |
|---|---|---|
| Agent instruction / when-to-use | 3 | **Done**: `/llms.txt` has "When to use this site" and "How to use it" |
| WebMCP support | 5 | **Done in code**. Only active for real visitors once an origin-trial token is added (below) |
| MCP Apps support | 4 | **Not built, Tina's call ("Not now")**. Needs a public MCP server, which is a new API to maintain on top of the §11 launch blockers |
| Agent auth discovery metadata | 3 | **Declined.** The site has no accounts and no API an agent authenticates to. RFC 9728/8414 metadata would advertise an authorization server that does not exist. That is placeholder data shipped as real (§1) |
| Wikipedia / Wikidata entity | 4 | **Not a code change.** Writing our own Wikipedia article breaks its conflict-of-interest rules and needs independent press coverage first. A Wikidata item has a lower bar but still needs independent references and is an outward-facing edit under Tina's account |

Best case after rescan is +8 (68/100). Whether orank credits WebMCP depends on its bundle scanner
finding the registration: its own finding said it "scanned 8 of 13 same-origin script bundles".

## What changed
- **`lib/siteSections.ts`** (new): New In + every lane + Designers / The Edit / About, moved out of
  `app/llms.txt/route.ts` because a second consumer appeared. Client-safe (imports only
  `lib/lanes.ts`, which `Nav.tsx` already ships).
- **`lib/webmcp.ts`** (new): four tools and the registration helper.
  - `search_catalogue {query}`: navigates to `/new-in?q=`, the same URL the header search uses.
  - `list_sections`: read-only.
  - `open_section {slug}`: `slug` is an enum of `SITE_SECTIONS`.
  - `get_visible_products {limit?}`: read-only plus `untrustedContentHint`. Reads the rendered cards
    (`a[data-surface="product-card"]` and its sibling `.brand-label` / `.card-title` / `.price`), so
    the URLs are the card's own UTM-tagged outbound links.
  - Nothing writes. No tool touches favourites, currency, or anything staff-only.
- **`components/WebMcpTools.tsx`** (new), mounted once in **`app/layout.tsx`**. Registers with an
  `AbortController`; unmount aborts. A tool that fails to register is `console.warn`ed, never swallowed.
- **`app/llms.txt/route.ts`**: uses `SITE_SECTIONS`; adds the two guidance sections. The tool names
  in it come from `WEBMCP_TOOL_NAMES`, so the file cannot name a tool that does not exist. Every
  sentence is a plain functional statement taken from `lib/faq.ts`, the page code, or the tools
  themselves. **No brand voice was written (§10.18).** If Tina wants different wording, it is hers to give.
- **`app/new-in/page.tsx`**: `key={q ?? ''}` on `DirectoryBrowser`. See the bug below.
- **`lib/webmcp.test.ts`** (new): 24 tests.

## What the real browser showed that the spec page did not
Playwright's bundled Chromium is 151, and it exposes the real API under `--enable-features=WebMCP`
(`--enable-features=WebMCPTesting`, `--enable-blink-features=WebMCP` and
`--enable-experimental-web-platform-features` also work). Without a flag, `document.modelContext`
is `undefined`. Measured before and during the build:
1. **`inputSchema` is not enforced.** `{}` reached `execute()` for a schema with a required field.
2. **A duplicate name throws** `InvalidStateError: Duplicate tool name`.
3. **Aborting the signal unregisters.** `getTools()` returned `[]` afterwards.
4. **A thrown `execute()` error never reaches the agent.** The agent got
   `UnknownError: Tool was executed but the invocation failed…` and our message became an uncaught
   page error. The first build threw; the tools now RETURN `{ error }`.
5. **URL changed ≠ page ready.** After the search URL and h1 updated there were 0 cards, and 18
   arrived ~250 ms later. `navigate` now waits for the URL, then for `<main>` to go 400 ms without a
   DOM mutation (5 s cap).
6. `navigator.modelContext` is the same object and logs a deprecation warning when read. So it is
   read only if `document.modelContext` is absent.

## Bug found on the way: a second search kept the first search's grid (pre-existing, production)
Running `search_catalogue` twice returned the FIRST query's products for the second. Reproduced
on production with the header search alone, no WebMCP involved:
```
before                   h1 "Results for “Kimono Abaya”"  cards 18  first "Black Linen Cotton Kimono Abaya…"
after header search      h1 "Results for “linen dress”"   cards 18  first "Black Linen Cotton Kimono Abaya…"   <- wrong
fresh load (control)     h1 "Results for “linen dress”"   cards 24  first "Ayah Linen Dress by Modista…"
```
**Cause:** Next keeps `DirectoryBrowser` mounted across a soft navigation to the same route, and
`initialQuery` only seeds `useState` on mount. **Fix:** key the component by the query. Same
three steps against the fixed local build: `cards 24, first "Ayah Linen Dress by Modista"`.
`FilterableGrid` (lane pages, `?type=`) already re-syncs its `initialType` and does not have this bug.

## Verification
Local production build in a detached worktree (`/tmp/tmh-webmcp-wt`, `cp -al` node_modules, §10.28
rule 4), `next start -p 3291`, Chromium 151 with `--enable-features=WebMCP`. CSS asserted loaded
(`font-family: Jost, …`); tools registering is itself proof of hydration.
```
toolsOnHome          = [get_visible_products, list_sections, open_section, search_catalogue]
list_sections        = 18 sections, new-in … about
badSearch            = {"error": "search_catalogue needs a non-empty \"query\" string."}   url stays "/"
badSection ../staff  = {"error": "open_section needs \"slug\" to be one of: new-in, …"}
badLimit 0           = {"error": "\"limit\" must be a whole number from 1 to 100."}
search "Kimono Abaya" 857ms -> /new-in?q=Kimono%20Abaya  18 cards, 0 not matching the phrase
search "linen dress"  719ms -> /new-in?q=linen%20dress   24 cards, 0 not matching the phrase
open_section modest-hijabs 507ms -> 24 cards: Urban Modesty | Ombré Jersey Hijab | $20 …
tools after 3 soft navs + reload = same 4, no duplicate-name warnings
console (webmcp|modelContext|deprecated|pageerror|error) = []
NO FLAG: document.modelContext = undefined, console = []
```
- `npx vitest run lib/webmcp.test.ts lib/llmsFull.test.ts`: 32 passed. **Negative control:** with
  the `open_section` enum check and the query length cap removed, 3 tests failed; restored, 24/24.
- `npx tsc --noEmit`: exit 0. `npm run lint`: exit 0.
- `npm test`: **1207 passed, 1 failed**, and the failure is not this change:
  `lib/colourLeads.test.ts` "every listed id is one this catalogue has actually seen", expected
  `['lameera-moda:8791781867688']` to equal `[]`. It fails identically in a clean detached worktree
  at HEAD `0230c8d` without any of these files. Left for a separate fix.
- Staging: see the addendum at the end.

## Notes / follow-ups
- **Origin-trial token (Tina).** Register `https://themodestyhouse.com` for the WebMCP trial at
  https://developer.chrome.com/origintrials/#/register_trial/4163014905550602241 (Google account
  needed). The token is public by design; it goes in a `<meta http-equiv="origin-trial">` tag. The
  trial covers Chrome 149–156 and ends 2026-11-16; shipping is targeted for 157. Until then the
  tools exist only for browsers with the flag.
- **MCP server + MCP Apps**: deferred by Tina ("Not now"). Revisit after the §11 blockers.
- Rescan: `POST https://ora.ai/api/scan {"url":"themodestyhouse.com"}`. Only meaningful after the
  merge to main, since orank scans production.

## Addendum: verified on staging
`0ddca2c` deployed to `https://themodestyhouse-staging-production.up.railway.app` at 22:43 (found by
polling `/llms.txt` for "## When to use this site", a string production does not have). The same
harness was run against that URL:
```
flag on:  toolsOnHome = [get_visible_products, list_sections, open_section, search_catalogue]
          badSearch = {"error": "search_catalogue needs a non-empty \"query\" string."}  url stays "/"
          "Kimono Abaya" -> 18 cards, 0 not matching | "linen dress" -> 24 cards, 0 not matching
          open_section modest-hijabs -> 24 cards, UTM-tagged brand URLs
          tools after soft navs + reload = same 4 | console = []
flag off: document.modelContext = undefined | console = []
header search twice: after = 24 cards, first "Ayah Linen Dress by Modista" (production: 18 kimono abayas)
/llms.txt: both new sections present; x-robots-tag: noindex, nofollow, noarchive
```
Not merged to main. That needs Tina's approval (§1).

## Addendum 2: merged to main, rescanned, and why orank still missed WebMCP
**Merged** at Tina's instruction ("merge to main"): `git push origin origin/staging:main`, a
fast-forward `0230c8d..26d2655` carrying only this change's two commits. The origin was confirmed
new via cache-busted `/llms.txt` before purging Cloudflare (§10.47). After the purge, `/` and
`/new-in` went `MISS` then `HIT` (age 6, age 1). The full harness then passed on
`https://themodestyhouse.com`, with the same results as staging, including the header search twice
(24 cards, "Ayah Linen Dress by Modista").

**orank.** A plain `POST /api/scan` returned 63 with `servedFromCache: true, resultAgeSeconds: 4318`,
a stored result from before the deploy. The API takes `"force": true`. The forced scan gave:
```
score 66 (was 63)   Access 33/40 (was 30)
Agent instruction / when-to-use   pass 3/3   "When-to-use guidance found in llms.txt"
WebMCP support                    fail 0/5   "no document.modelContext / navigator.modelContext usage found
                                              (scanned 8 of 13 same-origin script bundle(s))"
```
**Why WebMCP was missed.** Production's 13 `<script src>` chunks, in document order: the
registration is in #8, `2crbwysm4i717.js` (modelContext ×1, registerTool ×2), so it was probably
inside the 8 scanned. But the minifier had inlined `modelContextOf(document, navigator)` to
`(e=document,t=navigator,(o=e=>{let t=e?.modelContext;…})(e)??o(t))`. The bundle contained
**neither `document.modelContext` nor `navigator.modelContext` as text** (both counts 0), which
matches what orank's finding says it searches for. The tools worked; the scanner could not see them.

**Fix (`components/WebMcpTools.tsx`, `lib/webmcp.ts`):** both reads are written literally,
`asModelContext((document as …).modelContext) ?? asModelContext((navigator as …).modelContext)`.
The casts are erased, `??` still skips the navigator read when the document one exists, and
`modelContextOf` is replaced by `asModelContext`, which takes the value. A new test asserts the
source spells both literally with document first. **Negative control:** with the two lines swapped
it fails; restored, 25/25. `tsc` exit 0, `eslint` exit 0.
**Control for the orank recheck:** `POST /api/scan/checks {"checkIds":["webmcp"]}` against
production before this fix: `fail 0/5`.
