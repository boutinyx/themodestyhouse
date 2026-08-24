# Staging branch + un-indexable staging environment
**Date:** 2026-08-24 · **Status:** done, except the DNS record for the vanity hostname

## Goal
Tina set a new standing protocol: **implement → staging → verify on staging → merge to
`main` after her approval.** Local dev is no longer where work gets signed off. That needs
three things: the branch, the deployed environment at `staging.themodestyhouse.com`, and a
guarantee that the environment never reaches Google's index.

## What changed

### 1. The protocol, written down
`CLAUDE.md` §1 gains **"Ship through staging — never straight to main"**: `staging` is
long-lived and never force-pushed, verification happens against the deployed staging URL and
not localhost, merging to `main` requires Tina's explicit approval every time, and the one
standing exception is `.github/workflows/refresh.yml`, which pushes nightly catalogue data
commits straight to `main` (→ §10.35, which is also why `staging` has to be kept merged up
from `main`).

Note `CLAUDE.md` is listed in `.git/info/exclude`, so it is untracked by an earlier
deliberate decision and this edit lives only in the working copy. Not changed here — that is
someone else's call to reverse.

### 2. The branch
`staging` was cut from `a9115f5` (the local HEAD), the 254 uncommitted working-tree changes
were committed onto it, and `origin/main` was merged in.

- `195660e` — the accumulated homepage / header-nav / hero / content-pipeline work that had
  been sitting uncommitted in the shared tree. Excluded deliberately: the root-level scratch
  `.html` files, `.lcp-pc-verifier.mjs`, `scripts/__pycache__`, `docs/myDocuments.cannedSearch`.
  Some of those belong to other sessions (§10.37) and none are part of the site.
- `47cedc2` — merge of `origin/main`. Clean: the only conflict surface was the outbound-UTM
  work, and 11 of its 12 files were **byte-identical** in the working tree to what
  `cc0e181` had already pushed, so the merge touched data files only (6 files, all
  `data/*.json` from four nightly refreshes).
- `10a78a9` — the noindex guard below.

### 3. Staging is un-indexable, by host and not by env var
`lib/deployEnv.ts` owns `PRODUCTION_HOSTS` and `isProductionHost()`. Two mechanisms consume it:

- **`app/robots.ts`** now reads the `Host` header and returns a total `Disallow: /` for any
  non-production host. Reading `headers()` makes the route dynamic, which is the point: one
  build artifact is deployed to both environments, so the answer cannot be baked in at build
  time. Confirmed in the build output — `/robots.txt` moved from `○ (Static)` to `ƒ (Dynamic)`.
- **`next.config.ts`** stamps `X-Robots-Tag: noindex, nofollow, noarchive` on every response
  whose Host is not production, via `missing: [{ type: 'host', … }]`.

**Why the host and not an environment variable.** An env var fails OPEN — forget `IS_STAGING=1`
on a new service and that service is silently indexable, with nothing in the build output
saying so. That is the §10.28 shape: a guard whose "did not run" is indistinguishable from
its "passed". The host fails CLOSED: staging, a `*.up.railway.app` default domain, a future
preview environment and localhost are all covered before anyone configures them. The cost is
that pointing production at a NEW hostname would de-index the live site until that hostname
is added to `PRODUCTION_HOSTS` — a loud, one-line failure, and the right side of the trade.

`lib/deployEnv.test.ts` asserts the two halves cannot drift apart, plus the ordinary host
cases (case-insensitivity, ports, and that it is an exact match rather than a substring one,
so `themodestyhouse.com.evil.com` is not production).

## Verification

**Negative control first (§10.28 rule 1)** — swap `next.config.ts`'s host list for a
hardcoded single entry and the coupling test must fail:

```
AssertionError: expected [ { type: 'host', …(1) } ] to deeply equal [ { type: 'host', …(1) }, …(1) ]
      Tests  1 failed | 5 passed (6)
--- restored, re-run ---
 Test Files  1 passed (1)
      Tests  6 passed (6)
```

**Runtime, against a real production build** (`next build` + `next start` in a detached
worktree on :3199, so the running dev server's shared `.next` was not clobbered — §10.28
rule 4; `node_modules` hardlinked with `cp -al`, never symlinked, because Turbopack panics on
a symlink pointing out of the project root — §10.38):

```
########## PRODUCTION HOST (themodestyhouse.com)
--- /robots.txt
User-Agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
--- X-Robots-Tag on /
(absent — correct)

########## STAGING HOST (staging.themodestyhouse.com)
--- /robots.txt
User-Agent: *
Disallow: /
--- X-Robots-Tag on /
X-Robots-Tag: noindex, nofollow, noarchive
--- X-Robots-Tag on a lane page
X-Robots-Tag: noindex, nofollow, noarchive
--- X-Robots-Tag on sitemap.xml
X-Robots-Tag: noindex, nofollow, noarchive

########## RAILWAY DEFAULT DOMAIN
X-Robots-Tag: noindex, nofollow, noarchive
```

Compiled rule, from `.next/routes-manifest.json`:

```
/(.*) | missing: [{'type':'host','value':'themodestyhouse.com'},{'type':'host','value':'www.themodestyhouse.com'}] | ['X-Robots-Tag']
```

`npx tsc --noEmit` exit 0. `npx vitest run`: **733 passed, 1 failed** — the failure is
`lib/nonApparel.test.ts > every test string still exists in the raw catalogue`, two fixture
titles that a nightly refresh delisted. `lib/nonApparel.test.ts`, `lib/nonApparel.ts` and
`data/raw-products.json` are all byte-identical to `origin/main`, so it is pre-existing and
not caused by anything here. This is exactly the failure mode §10.19 describes; it is skipped
under `CI`.

## A mistake worth recording
The first build measured nothing. A pointless `git stash --staged` / `git stash pop` sanity
check I ran between staging and committing left `next.config.ts` and `app/robots.ts`
unstaged, so `10a78a9`'s predecessor contained only the two new files, and the worktree built
from it had neither the header rule nor the dynamic robots. Both "failures" I then measured
were real measurements of code that did not contain the change — and I spent three rounds
diagnosing a non-existent Turbopack bug ("Turbopack drops `has`/`missing` on header rules")
before checking `git show <sha>:next.config.ts`. §10.20 again, in a new costume. Caught by
verifying the built artifact rather than trusting the commit.

## The Railway environment

Created via the public GraphQL API (`https://backboard.railway.com/graphql/v2`) with the
account token in `.env`, in the existing project `distinguished-expression`
(`a923e5d7-a5c4-4d59-a1e3-eece1f9b68ce`), environment `production`:

| thing | value |
|---|---|
| service | `themodestyhouse-staging` · `ba96c159-baab-4991-a007-93c1e32d27e4` |
| source | `boutinyx/themodestyhouse`, builder RAILPACK (mirrors production) |
| deploy trigger | branch **`staging`** · `4a45d62f-6bf6-4824-ab3e-7a73519ecec5` |
| Railway URL | `themodestyhouse-staging-production.up.railway.app` |
| custom domain | `staging.themodestyhouse.com` · `d6c3e0df-67ea-413f-87b8-2d07b649ad63` |
| CNAME required | `staging` → `lw9o2rme.up.railway.app` |

Env vars copied from the production service: `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`,
`CONTACT_FROM_EMAIL`, `CONTACT_TO_EMAIL`, `RESEND_API_KEY`. `NEXT_PUBLIC_SKIMLINKS_ID` is
unset on production too, so staging cannot fire real affiliate links either.

**Two API gotchas worth keeping.** Railway's API sits behind a WAF that 403s Python's default
`urllib` User-Agent while accepting the identical request from `curl` — the first attempt
looked like an auth failure and was not one. And the token originally in `.env` was a
*project* token, which authenticates with a `Project-Access-Token` header and can read a
project but returns `Bad Access` on `deploymentTriggerCreate`; Tina swapped it for an
account-level token, which uses `Authorization: Bearer` and, being a team token, returns
`Not Authorized` for `query { me }` while working fine for everything else. Do not read a
failing `me` query as a bad token.

## Verification, against the deployed service

First deploy: BUILDING → DEPLOYING → SUCCESS in ~90s. Then, on the real Railway hostname —
not localhost, so this is evidence about what the deployment actually serves (§10.21):

```
### HTTP status                200
### /robots.txt
User-Agent: *
Disallow: /
### X-Robots-Tag on /          x-robots-tag: noindex, nofollow, noarchive
### X-Robots-Tag on a lane     x-robots-tag: noindex, nofollow, noarchive
### production unaffected
User-Agent: *
Allow: /
Disallow: /admin/
(absent on production — correct)
```

That is the fail-closed case working with **zero configuration on the service**: nobody set a
staging flag anywhere, and the Railway default domain is already un-indexable.

Playwright, 1440x900, staging vs production homepage:

```
staging    {"h1":"Every modest brand. | One place.","sections":7,"anchors":98,"imgs":31,"broken":0,"height":6761}
production {"h1":"The archive for | everything modest.","sections":7,"anchors":61,"imgs":25,"broken":0,"height":6062}
```

Different by design — staging carries the unmerged homepage rebuild. Zero broken images on
either. The run also reported five `requestfailed` events for `?_rsc=` prefetches, which were
**the harness, not the site**: curling the same URLs returns 200 on staging and on production
alike. In-flight prefetches abort when the browser closes (§10.26).

## Notes / follow-ups
- **Only remaining step:** the CNAME `staging → lw9o2rme.up.railway.app` at Cloudflare, DNS-only
  (grey cloud) so Railway can issue the certificate and so no CDN cache sits between staging and
  whoever is verifying it. `CLOUDFLARE_API_TOKEN` in `.env` is dead (`1000 Invalid API Token`),
  so this needs a fresh token or a dashboard click. Until then staging is reachable at the
  Railway URL, which is already fully un-indexable.
- Once the hostname resolves, re-run the same curls against `staging.themodestyhouse.com`.
- Consider adding `staging.` to Search Console purely to watch that it never gains an impression.
