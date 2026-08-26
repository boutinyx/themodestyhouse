# IndexNow on every push, and a new key

**Date:** 2026-08-27 · **Status:** done (verified as far as staging allows — see Status)

## Goal
Tina supplied a new IndexNow key (`e6157f9adb3540d189cd0b9a92a08aa9`) and asked for a
workflow so that every push reaches IndexNow.

## What already existed
`scripts/indexnow-notify.mjs` and `public/cee9f84f266c58db70309c208ab4496a.txt` have been
in the repo since 2026-08-11 (`03635ea`) and the old key file is live on production
(HTTP 200). What was missing was the automation — its own header said so: *"nothing wires
it into automation today ... Deliberately NOT hooked into postbuild:data/postrefresh."*
So this is wiring, plus a key change, not a new integration.

## What changed
**`public/e6157f9adb3540d189cd0b9a92a08aa9.txt`** (new) — Tina's key, 32 bytes, no
trailing newline, byte-shaped exactly like the existing one. **The old key file is kept.**
IndexNow permits multiple keys per host and deleting a key an engine has already validated
buys nothing; the cost of keeping it is 32 bytes.

**`scripts/indexnow-notify.mjs`** — same sitemap-driven design, four additions:
- **Key-file preflight.** Fetches `https://<host>/<key>.txt` and asserts the body equals
  the key *before* submitting. This is the whole reason the script can be trusted in CI:
  a missing or stale key file returns HTTP 403, or a 202 "validation pending" that never
  resolves and **reads as success in every log**. It also covers the exact case this change
  creates — the new key ships in the same commit as the workflow, so the first run could
  otherwise fire before the file is deployed.
- **`--dry`** — lists the URLs and submits nothing, so the workflow can be exercised
  without pinging four search engines.
- **Host and size guards.** A URL from another host makes the endpoint 422 the *whole
  batch*, and 10,000 is the documented per-request ceiling. Both are now caught locally,
  where the message can name the offender, instead of at the endpoint.
- **`INDEXNOW_KEY` / `INDEXNOW_HOST` env overrides**, so a future key rotation is not a
  code change.

**`.github/workflows/indexnow.yml`** (new) — three triggers:
- `push` to `main`, with `paths-ignore` for `docs/**`, `**/*.md`, `.github/**`, `.claude/**`.
  Documentation changes nothing a crawler would want, and repeatedly submitting unchanged
  URLs is what earns a 429.
- `workflow_call`, used by `refresh.yml` — see below.
- `workflow_dispatch`, with `wait_seconds` and `dry_run` inputs.

**`.github/workflows/refresh.yml`** — the nightly catalogue job now calls the IndexNow
workflow as a second job, gated on a new `pushed` output so a refresh that finds no changes
announces nothing. **This is not redundant with the `push` trigger:** a push made with
`GITHUB_TOKEN` does not trigger `on: push` workflows (GitHub's recursion guard), so the
nightly commit — the one push per day that reliably changes every lane page — would
otherwise never be announced at all.

## The deploy wait, and why it is not a sleep
Railway builds on the same push that triggers the workflow, so production is still serving
the previous deploy when it starts. Nothing in the response identifies the build: no
`buildId`, no commit header, and the `/_next/static/chunks/*.js` names are content-hashed,
so a data-only deploy leaves them unchanged.

Rather than sleep a guessed number of seconds, the workflow **fingerprints `/` and
`/directory` before the deploy can land and polls until the bytes change**, with the
timeout as a *fallback* rather than the mechanism. `/directory` carries the whole
catalogue so a data push always moves it; `/` moves on any template or copy change.

Two properties, both measured rather than assumed:

```
stable within a build   production /directory, two reads 20s apart:
                        9c4821b437ac / 9c4821b437ac  → SAME
discriminates builds    same page, production vs staging (staging carries today's
                        10 Beyza cuts and the title fixes, production does not):
                        run 1: prod 9c4821b437acc6a6  staging 63ff529e67c0d6c9  DIFFER
                        run 2: prod 9c4821b437acc6a6  staging 63ff529e67c0d6c9  DIFFER
```

So the fingerprint does not flicker on an unchanged build, and does move for exactly the
kind of change a deploy delivers. The fallback branch was also exercised directly (20s
window, no deploy in flight): `NOTE: neither page changed within 20s. Submitting anyway.`

**Not claimed:** it has not yet been observed firing on a real production deploy — that
only happens on the first merge to `main`, and the Actions log will print
`DEPLOY DETECTED after Ns` when it does.

## Verification
**Negative control first** (§10.28 rule 1) — the new key file is not deployed yet, which is
precisely the state CI is in until this merges. The preflight must refuse:

```
$ npm run --silent seo:indexnow -- --dry
IndexNow: key file https://themodestyhouse.com/e6157f9adb3540d189cd0b9a92a08aa9.txt
returned HTTP 404. It must be live BEFORE submitting, or the endpoint answers 403.
Check public/e6157f9adb3540d189cd0b9a92a08aa9.txt is committed and deployed.
exit=1
```

Positive path, pointed at the key that *is* live:

```
$ INDEXNOW_KEY=cee9f84f266c58db70309c208ab4496a npm run --silent seo:indexnow -- --dry
IndexNow: key file verified at https://themodestyhouse.com/cee9f84f266c58db70309c208ab4496a.txt
IndexNow: 132 URLs from https://themodestyhouse.com/sitemap.xml
  ...
(--dry — nothing submitted)
exit=0
```

Both workflow files parse as YAML (`yaml.safe_load`); `indexnow.yml` resolves to one job,
five steps; `refresh.yml` to two jobs with the `pushed` output wired to the push step.
`node --check` clean, `npm run lint` exit 0, 856 tests pass.

**No submission has been sent.** Every run above was `--dry`.

## Incidental findings
- **`sitemap.xml` is 132 URLs, not 35.** CLAUDE.md §8 recorded 35 as of 2026-08-19; the
  `/designers/<slug>` and `/edits/<slug>` families and a fourth editorial post have landed
  since. Corrected in CLAUDE.md.
- **Production HTML is not cached at the Cloudflare edge.** `/` and `/modest-abayas` both
  return `cache-control: private, no-cache, no-store, max-age=0, must-revalidate` and
  `cf-cache-status: DYNAMIC`, on three consecutive fetches with no `age` header. This
  matters here because a crawler arriving after an IndexNow ping gets the fresh page, not
  an hour-old one — and it means the standing §12 suggestion ("purge Cloudflare after
  every merge") does not currently describe how production behaves. Reported as an
  observation of the `cf-cache-status` header, not read off a directive (§10.23).

## Status
On `staging`. **The workflow cannot run from `staging`** — it triggers on pushes to `main`,
which is correct, since staging is `noindex` and must never be announced to a search
engine. So the first real execution is the merge to `main`, and it will be the thing that
verifies it end to end.

Suggested first move after merging: run it once via **workflow_dispatch with
`dry_run: true`**, which exercises checkout, node, the deploy wait, the liveness gate and
the key-file preflight against the real deployed key file, and submits nothing. Then let
the push trigger do it for real.

## Staging verification (added after deploy)
The workflow itself cannot run from `staging`, but the two things that decide whether it
works on `main` — is the key file served, and does the preflight read it — can be, and were.

**The new key file is served correctly**, 120s after the push:

```
HTTP 200 | content-type: text/plain; charset=UTF-8
body: e6157f9adb3540d189cd0b9a92a08aa9
MATCHES the key exactly
```

**Preflight and host guard, end to end** against staging. Staging serves the key file but
its `sitemap.xml` hardcodes `https://themodestyhouse.com` (`app/sitemap.ts:BASE`), so this
is a real case where the preflight must pass and the host guard must then fire:

```
$ INDEXNOW_HOST=themodestyhouse-staging-production.up.railway.app npm run --silent seo:indexnow -- --dry
IndexNow: key file verified at https://themodestyhouse-staging-production.up.railway.app/e6157f9adb3540d189cd0b9a92a08aa9.txt
IndexNow: sitemap contains 132 URL(s) not on themodestyhouse-staging-production.up.railway.app,
e.g. https://themodestyhouse.com — the endpoint 422s the whole batch.
exit=1
```

So the preflight is proven to pass on a live key file as well as to fail on a missing one,
and the host guard is proven to catch a whole-batch 422 before it reaches the endpoint.
Both halves of each check have now been observed, rather than only the failing half.

Still unproven until the merge, and only then: the `push` trigger firing, the deploy
detector printing `DEPLOY DETECTED after Ns`, and a real submission returning HTTP 200.
