# Stop deploying the curation tooling; add CI, lint gate and security headers (P0-A)

**Date:** 2026-08-05 · **Status:** done

## Goal

Close launch blocker **P0-A**: `/admin/curate`, `/api/curate` and `/api/curate/list` shipped
in the production build with **no authentication**. Anyone could read the full curation map
or POST `{id, decision:'cut'}` for every product.

## Method

A 6-agent `Workflow`: three researchers (route gating, CI, security headers) → two
adversarial reviewers → finalize. The adversarial phase paid for itself twice.

## What changed

Defence in depth, because the adversary broke the first design:

| Layer | Mechanism | Why it survives the others failing |
|---|---|---|
| 1 | `pageExtensions` in `next.config.ts` drops `.dev.*` files from a production build | The routes **do not exist** in the artifact — nothing to reach |
| 2 | Build-phase gate (`PHASE_DEVELOPMENT_SERVER`) + a tripwire that **refuses to build** with `NODE_ENV=development` | Phase comes from the Next CLI, not an env var |
| 3 | `proxy.ts` custom-regex matcher over `/admin*` and `/api/{curate,decisions,raw,admin}*` | Routing-level 404, covers prerendered pages too |
| 4 | `lib/rawData.ts` asserts a **filesystem sentinel** (`data/raw-products.json`, gitignored) | No env var can fake a file that isn't in the deploy |
| 5 | `scripts/verify-gate.mjs`, wired into CI | Makes a future Next upgrade break **loudly** |

Also landed: GitHub Actions CI (typecheck, test, build, gate), security headers with CSP in
**Report-Only** plus a `/api/csp-report` collector, and lint turned into a real gate.

## What the adversarial pass caught

**1. A working bypass of the original design.** Every layer keyed off
`process.env.NODE_ENV === 'development' && !process.env.VERCEL`. An agent proved on the real
Next binary that `NODE_ENV=development npx next build` flips **all four layers at once** and
emits the curate routes into the manifest. Fixed by moving layer 2 onto the build *phase*
and adding a tripwire; verified the build now dies before writing any manifest.

**2. Two proposed "fixes" that didn't work.** A suggested matcher
(`'/api/curate:path*'`) compiles — via Next's own `getMiddlewareMatchers` — to a regex
identical to the original, so `/api/curate-export` still slipped through. The working form
is a custom-regex param. A claimed breakage of `/admin` was also wrong: `app/[lane]/page.tsx`
already 404s unknown lanes.

**3. The strongest layer had no enforcement.** `pageExtensions` route matching is an
undocumented Next internal. `verify-gate.mjs` now asserts it post-build, and the negative
test (planting `app/api/curate/route.ts`) fails on four independent signals.

## Verification

```
$ npx tsc --noEmit           # exit 0
$ npx eslint --max-warnings 0 # exit 0  (was 6 problems; all fixed, not suppressed)
$ npx vitest run             # 10 files, 255 passed
$ npm run build && npm run verify:gate
  ok  no guarded routes in app-path-routes-manifest (18 routes total)
  ok  no guarded routes in routes-manifest
  ok  no curation source found in .next/server or .next/static
  ok  proxy built (nodejs) and matchers cover all 8 guarded paths
  ok  dev-only curation sources present in repo
  GATE CHECK PASSED
```

`/admin` is absent from `.next/server/app` entirely. `npm run dev` still serves
`/admin/curate` with real data, so local curation is unaffected.

## Correcting the workflow's own report

The finalize agent stated that **`data/decisions.json` "is already disclosed"** and that the
unauthenticated POST was "a genuine unauthenticated write" that had been exploitable.
**Both overstate what happened.** Verified directly:

```
themodestyhouse.com          HTTP=000   (does not resolve)
www.themodestyhouse.com      HTTP=000
/api/curate/list             HTTP=000
railway.json / nixpacks.toml / Procfile — none in repo
```

**The site has never been deployed.** P0-A was a latent hole closed *before* first deploy,
not a breach. Nothing was ever served, so nothing was disclosed. Recorded here because a
security log that overstates impact is as harmful as one that understates it.

## Notes / follow-ups

- **CI does not gate deploys.** Railway rebuilds on push, independently of GitHub Actions,
  and commits land straight on `main`. Until PRs + branch protection are adopted, CI is
  post-hoc notification. Add `verify` and `lint` as required checks when that happens.
- **CSP is Report-Only on purpose.** `NEXT_PUBLIC_SKIMLINKS_ID` is set only on Railway, so
  the Skimlinks script never renders locally and its host set is unverified. Soak it, read
  the `csp-violation` reports, then switch the header key to enforcing.
- **New `/admin/*` or `/api/{curate,decisions,raw,admin}*` routes will 404 in production
  while working locally.** Intentional, and an awful bug to debug cold — noted in `proxy.ts`.
- `@types/node` is `^20` while `.nvmrc` pins 24. Typechecks clean today; bump when convenient.
- Local gotcha: after the `.dev.*` rename, `rm -rf .next` once or a stale
  `.next/types/validator.ts` fails typecheck on the old route paths.
