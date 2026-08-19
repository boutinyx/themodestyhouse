# Google Search Console API access restored, and a full index-coverage sweep
**Date:** 2026-08-19 · **Status:** done

## Goal
Tina asked to optimise the site for SEO and pointed at `GOOGLE_SEARCH_CONSOLE_API_KEY` in
`.env`. Establish real Search Console access, then audit what Google actually does with
the site — specifically which pages are not indexed.

## What changed
Nothing in the application code. This entry records credential setup + measurement.

- Installed `google-cloud-sdk` 581.0.0 via Homebrew (`gcloud`, on PATH at `/opt/homebrew/bin`).
- Tina authenticated ADC with the Search Console read scope:
  `gcloud auth application-default login --scopes=openid,…/userinfo.email,…/cloud-platform,…/webmasters.readonly`
- Set the ADC quota project: `gcloud auth application-default set-quota-project project-c18afb0a-80a5-42dd-97b`
- Enabled + key-scoped three APIs on "My First Project": Search Console, PageSpeed Insights,
  Chrome UX Report.

## Why the API key in `.env` never worked
`GOOGLE_SEARCH_CONSOLE_API_KEY` is an `AIzaSy…` **API key**. Two independent faults:

1. **Search Console does not accept API keys at all**, regardless of scoping:
   `401 — "API keys are not supported by this API. Expected OAuth2 access token or other
   credentials that assert a principal."` An API key identifies a *project*; GSC data is
   permissioned *per user*, so it requires a credential asserting **who** is asking.
2. The key was additionally restricted to one API, so PageSpeed/CrUX returned
   `403 API_KEY_SERVICE_BLOCKED` until the other two APIs were enabled and ticked.

A service account was created and then **deleted**: key creation is blocked on this project by
the org policy `constraints/iam.disableServiceAccountKeyCreation`. ADC as Tina (already
`siteOwner`) is simpler anyway — it needs no Search Console user-add step.

## Verification
```
$ gcloud auth application-default print-access-token | … /webmasters/v3/sites
{"siteEntry":[{"siteUrl":"sc-domain:themodestyhouse.com","permissionLevel":"siteOwner"}]}
```

### Search performance, 2025-08-19 → 2026-08-19
```
clicks=5   impressions=188   ctr=2.66%   avg position=35.1
```
Top query is branded: `modesty house` pos 2.7 (1 click). Every commercial query sits
pos 44–90 (`modest dresses` 7 imp @ 62.9; `hijab house` 2 imp @ 44.0).
Top page: `/` 4 clicks / 75 imp @ 18.4. Devices: desktop 133 imp, mobile 54.

### Sitemap (GSC `/sitemaps`)
```
path=https://themodestyhouse.com/sitemap.xml  submitted=25  errors=0  warnings=0
lastSubmitted=2026-08-08  lastDownloaded=2026-08-18
```
(`contents.indexed=0` is a deprecated field Google no longer populates — do not read it as
"nothing is indexed".)

### URL Inspection, all 25 sitemap URLs + 4 pagination variants
**20 of 25 sitemap URLs are `PASS / Submitted and indexed`. Five are not:**

| path | coverageState |
|---|---|
| `/modest-skirts` | URL is unknown to Google |
| `/modest-sets` | URL is unknown to Google |
| `/outerwear` | Discovered – currently not indexed |
| `/modest-swimwear` | Discovered – currently not indexed |
| `/modest-activewear` | Discovered – currently not indexed |

(The unknown/discovered split moved between two consecutive runs for `/modest-sets` and
`/outerwear`; the *set* of five is stable, the exact state per URL is not.)

`/favourites` **is indexed** — a localStorage page whose crawlable state is permanently empty.
`/designers?page=2,3,4` are each indexed separately.

## Root cause of the five — measured, not assumed
Two hypotheses tested:

1. **Orphaned / not internally linked — DISPROVEN.** All five carry a footer link from every
   one of the 25 pages (`grep -c 'href="/outerwear"'` = 1 per page × 25). They are not orphans.
2. **Thin — SUPPORTED, with exceptions.** Rendered word count per lane:
   ```
   activewear 2240 | swimwear 2510 | sets 3022 | layering-basics 3721 | outerwear 4652
   skirts 6460 | trousers 8764 | tops 11280 | dresses 13299 | hijabs 20998 | abayas 22189
   ```
   The five non-indexed are ranks 1,2,3,5,6 of 12 by size. **But `layering-basics` (3721) is
   indexed and `modest-skirts` (6460) is not**, so size is a strong correlate, not a rule.

Conclusion: this is not a technical defect. `Discovered – currently not indexed` on a domain
with 5 clicks/year is Google declining to spend crawl budget on pages it judges low-value —
an authority + page-value judgement. No robots, canonical, redirect or fetch fault exists on
any of the five (`robotsTxtState`/`pageFetchState` are `*_UNSPECIFIED` because Google never
fetched them, not because a fetch failed).

## Notes / follow-ups
- **A false alarm I raised and then killed:** a first sweep reported "NONE DECLARED" canonical
  on 17 URLs. That was my script misreading an **absent** `userCanonical` field in the
  inspection response, not a missing tag. `/` returns `googleCanonical=https://themodestyhouse.com/`
  and the live HTML carries a canonical. §10.26 — check what the harness would have to be doing
  wrong before believing a whole category of failure.
- **§10.20 recurred:** passing 25 sitemap URLs as `python3 - "$TOK" "$PID" $SM` sent them as
  ONE argument — zsh does not word-split unquoted parameters. It surfaced as a bogus
  `HTTP 403`. Fixed by fetching the sitemap inside Python. Use `${=var}` when splitting is wanted.
- Cloudflare 403s `urllib`'s default User-Agent; fetch site HTML with `curl` or set a UA.
- **CrUX has no data for the origin** (`404 chrome ux report data not found`) — traffic is below
  Google's reporting threshold. Independent confirmation of the traffic picture.
- ADC credentials live in `~/.config/gcloud/application_default_credentials.json`, outside the
  repo. Revoke with `gcloud auth application-default revoke`.

---

## Addendum — the 5 were submitted for indexing (2026-08-19, later)

Done through the Chrome extension driving Tina's own Search Console session,
once she connected it. Google exposes **no API** for this at any scope — the
Indexing API v3 is documented for JobPosting/BroadcastEvent only, and
`sitemaps.submit` returns `403 insufficient authentication scopes` under the
`webmasters.readonly` grant this session holds.

All five now return **"Indexering aangevraagd — URL is toegevoegd aan een
prioriteitscrawlwachtrij"** (added to a priority crawl queue):

| lane | state at submission |
|---|---|
| `/modest-skirts` | Discovered – currently not indexed |
| `/modest-sets` | URL unknown to Google |
| `/outerwear` | URL unknown to Google |
| `/modest-swimwear` | Discovered – currently not indexed |
| `/modest-activewear` | Discovered – currently not indexed |

**Three of the five failed first with "Er is iets misgegaan / probeer het later
opnieuw" and succeeded on an immediate retry.** That is a known-flaky GSC
endpoint, not a site problem — worth knowing so nobody diagnoses it as one. The
button also runs a live-URL test first, which takes 30-90 s before the request
is actually queued; a screenshot taken too early shows the spinner, not a result.

Two of the five (`/modest-sets`, `/outerwear`) reported "Geen verwijzende
sitemaps gevonden" and "Geen gedetecteerde verwijzende pagina" at submission
time — stale, from before today's deploy. Both are in `sitemap.xml` and both now
carry footer links.

### Also found: the full non-indexed picture is 11, not 5

The Pages report (last updated 2026-08-14, so it lags) breaks the 11 down as:

| reason | pages |
|---|---|
| Gevonden – momenteel niet geïndexeerd | 5 ← the ones above |
| Niet gevonden (404) | 2 |
| Gecrawld – momenteel niet geïndexeerd | 2 |
| Pagina met omleiding | 1 |
| Alternatieve pagina met correcte canonieke tag | 1 |

**The two 404s are `/style/streetwear` and `/style/elegant`** — the deleted
`/style/[vibe]` pages (removed 2026-08-09,
`docs/log/2026-08-09-remove-style-vibe-feature.md`). **No action needed:** a 404
is the correct response for a genuinely removed page with no equivalent
destination, and Google drops such URLs on its own. Recording it so the next
person who opens this report does not treat it as a defect. The redirect
question only becomes real if `/hijabi-outfits` is ever retired, which is Tier 2
item D.
