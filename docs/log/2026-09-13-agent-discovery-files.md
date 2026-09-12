# Agent discovery files: /index.md, an Agent Skill, ARD catalog, Link header, 404 page
**Date:** 2026-09-13 · **Status:** partial (on staging; not merged)

## Goal
Tina, after orank reached 76/B: "can we make it even bettah". Take the remaining orank gaps that
are honest to close, and leave the ones that would advertise something the site does not have.

## Decisions (Tina's)
- **AI training crawlers stay allowed** ("Keep allowing"). orank's `robots-ai-policy-quality`
  wants CCBot/Bytespider blocked or `Content-Signal: ai-train=no` (~+3.7 est). Declined: training
  data is part of how future models learn the brand exists, and `app/robots.ts` allows CCBot on purpose.
- **MCP server: not decided.** Tina asked "are there any problems that can happen". Answered:
  load on the single Railway server (§8 uncached 11 MB parse), the curation becoming trivially
  copyable, wrong prices/titles surfacing in third-party apps, brand imagery rendered off-site,
  a young spec that breaks silently, affiliate still a stub (§11 P0-E), and ~20 orank MCP checks
  becoming applicable. Recommendation given: not before affiliate links are live.

## Not done, and why
| Check | Why not |
|---|---|
| `json-ld-entity-linking` (sameAs) | Already present (`instagram.com/themodestyhouse.hq`). orank does not count Instagram: yoast.com lists facebook/x/instagram/pinterest/youtube/tiktok/linkedin/wikipedia in the same `@graph` shape and orank credited only "linkedin.com, wikipedia.org". Needs a LinkedIn company page or a Wikidata item, which do not exist. |
| `schema-type-breadth` | The homepage has no FAQ, product offer, rating or breadcrumb to mark up. Structured data must describe visible content. |
| auth.md, OAuth PRM/AS metadata, WWW-Authenticate, Web Bot Auth, sandbox, A2A card, MCP server card, API catalog, NLWeb /ask | Each describes an API, login, agent or server this site does not have. |
| Markdown content negotiation on `/`, bot-UA markdown | Cloudflare caches homepage HTML for an hour and ignores `Vary: Accept` on HTML, so one variant would be served to everyone. Bot-UA serving is also cloaking by another name. |
| skills.sh, plugin manifest, agent configs repo, ChatGPT app listing | Need a public repo or an app. |

## What changed
- **`lib/agentGuidance.ts`** (new): the llms.txt body, moved out of `app/llms.txt/route.ts`, plus
  `skillMarkdown()`, `skillIndex()` (v0.2.0, digest = sha256 of the served bytes) and
  `ardCatalog()`. Server-only.
- **`lib/agentPaths.ts`** (new, import-free): the file URLs and the homepage `Link` value, so
  `next.config.ts` can read them.
- **`app/llms.txt/route.ts`**: calls `llmsTxtBody()`. Output is byte-identical to production
  except one added line pointing at the skill (diffed).
- **`app/index.md/route.ts`** (new): same body as llms.txt, `text/markdown`.
- **`app/.well-known/agent-skills/index.json/route.ts`**,
  **`…/find-modest-clothing/SKILL.md/route.ts`**, **`app/.well-known/ard.json/route.ts`** (new).
  The ARD catalog lists only the skill, with no `trustManifest`, because the site has no
  cryptographic identity to put in one.
- **`app/page.tsx`**: `alternates.types` → `<link rel="alternate" type="text/markdown" href="…/index.md">`,
  with the canonical kept.
- **`next.config.ts`**: `Link: </sitemap.xml>; rel="sitemap", </llms.txt>; rel="describedby",
  </index.md>; rel="alternate"` on `/` only.
- **`app/not-found.tsx`** (new): there was no 404 page. Heading, every site section by its own
  title, then sitemap.xml · llms.txt · index.md. Labels only (§10.18).
- **`lib/agentGuidance.test.ts`** (new): 6 tests.

## Verification (local production build, detached worktree, `next start -p 3292`)
```
/index.md                                   200 text/markdown     "# The Modesty House"
/.well-known/agent-skills/index.json        200 application/json  $schema …/discovery/0.2.0/schema.json
/.well-known/agent-skills/…/SKILL.md        200 text/markdown     "---\nname: find-modest-clothing"
/.well-known/ard.json                       200 application/json  access-control-allow-origin: *
index.json digest  sha256:796900c5…0abb  ==  sha256 of served SKILL.md  796900c5…0abb
homepage Link: sitemap / describedby / alternate present, AND Next's font + logo preload Link still present
homepage <link rel="alternate" type="text/markdown" href="https://themodestyhouse.com/index.md"/>, canonical unchanged
```
- `npx vitest run lib/agentGuidance.test.ts lib/webmcp.test.ts lib/llmsFull.test.ts`: 39 passed.
  **Negative control:** with the index digest computed over `skillMarkdown() + ' '`, the digest
  test failed; restored, 6/6.
- `npm test`: 1214 passed, 1 failed. The failure is the pre-existing `lib/colourLeads.test.ts`
  (`lameera-moda:8791781867688`), same as 2026-09-12. `npm run lint` exit 0, `tsc` exit 0.

## A 404 finding, and a change tried and reverted
Unknown **single-segment** paths (`/anything`) match `app/[lane]`, which calls `notFound()`. Next
serves that as `<html id="__next_error__">`: 404 status, but the not-found content arrives only
after JavaScript runs. It is the same on production today (`__next_error__=1`). Multi-segment
unknown paths (`/modest-dresses/nope`) render the new page into HTML (h1 "Page not found",
`href="/sitemap.xml"` present).
Tried `export const dynamicParams = false` on the lane route. Rebuilt and measured: no change
(`/this-path-does-not-exist-xyz` still `__next_error__=1`), every real lane still 200. **Reverted**
(`git checkout` to HEAD), because it did not do what it was for. Likely cause, unverified: the
lane route is ISR (`revalidate = 60`) while the root layout reads cookies. Follow-up only if
orank's 404 check shows it matters.

## Staging
(see addendum)

## Addendum: orank against staging (`9dd9fd6`)
Same ten checks as the production control, plus `webmcp` and `agent-instruction`:
```
                          production (before)   staging
agent-friendly-404        warning 1/2           warning 1/2
markdown-url-fallback     fail 0/2              pass 2/2   "Homepage markdown fallback works (/index.md)"
markdown-link-alternate   fail 0/1              warning 0/1 "target https://themodestyhouse.com/index.md returns text/html"
markdown-negotiation      fail 0/1              pass 1/1
link-headers-discovery    fail 0/1              pass 1/1   "sitemap, describedby, alternate(markdown)"
agent-discovery-file      fail 0/2              pass 2/2
agent-skills-index-v2     na                    pass 2/2   "verified SHA-256 of find-modest-clothing"
ard-catalog               fail 0/1              warning 0/1 "present but invalid: missing specVersion"
ard-entries-valid         na                    pass 2/2
ard-trust-manifest        na                    fail 0/2   "No entry carries a trustManifest"
```
- `markdown-link-alternate` on staging reads the ABSOLUTE alternate (`metadataBase` is production),
  and production has no `/index.md` until merge. Expected to pass once production serves it.
- `ard-trust-manifest` becomes applicable and fails. That is the cost of publishing the catalog.
  It stays failing because a trust manifest needs a cryptographic principal the site does not have.
- `ard-catalog`: added `specVersion: "0.91"`, then re-checked on staging (below).
- `agent-friendly-404` unchanged. orank's probe evidently hits the single-segment `__next_error__`
  case described above.
