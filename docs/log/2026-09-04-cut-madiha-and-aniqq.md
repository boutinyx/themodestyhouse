# Cut madiha and aniqq — two dead storefronts — and stopped the cut needing a blunt override
**Date:** 2026-09-04 · **Status:** done

## Goal

Tina, on the 718-dead-links finding from `docs/log/2026-09-03-weak-site-hypothesis-failed-and-718-dead-links.md`:
*"yes get them out if they arent online anymore"*.

## The number was 718 yesterday and is 14 today — re-measured, not quoted

`npm run audit:storefronts`, run before touching anything:

```
 11 published products   madiha   www.madiha.co.uk   HTTP 402  Shopify: store frozen / unpaid
  3 published products   aniqq    aniqq.nl           HTTP 409  Shopify: store unavailable
 14 published products link to a storefront that does not work.
```

**`nour-al-houda` — 704 of yesterday's 718 — came back.** It was `NO DNS` on 2026-09-03 and
answers `200` today, with its feed reached `2026-09-04`. That log guessed it might be a
lapsed renewal and declined to cut on the spot; it was right, and cutting 5.9% of the
catalogue on one day's DNS failure would have been the mistake.

The two that remain are not hiccups. Confirmed on the FEED, not just the homepage, and both
codes are Shopify's own:

```
https://www.madiha.co.uk/products.json  402      feed last reached 2026-08-21  (2 weeks)
https://aniqq.nl/products.json          409      feed last reached 2026-08-11  (3 weeks)
```

## What changed

**The cut is two edits per brand** (§7), both made:

- `data/brands.ts` — both records removed, so nothing fetches either feed again.
- `data/exclusions.json.brands` — `madiha`, `aniqq` appended. Re-adding either to
  `brands.ts` without removing it here is a silent no-op, which is the point.

**`lib/edits.ts`** — dropped `'madiha:14817368047999'` (The Trench Abaya In Camel) from the
Fall Essentials picks. A cut brand's pick cannot resolve, and a dead pick silently subtracts
a card rather than announcing itself (§10.54 rule 2). It was 1 of 274, well under the
missing-picks threshold, so nothing would have gone red.

**`data/products.json`** — republished, 19,169 -> 19,155.

## The part worth keeping: the override that would have taken 107 rows with it

§7 documents the ritual — the publish refuses once, and `ALLOW_LARGE_DIFF=1` is "the
documented way through it". Run here, that produced:

```
Published 19048 products (mixed across 112 brands)     <- -121, not -14
```

`ALLOW_LARGE_DIFF` turns the guard off for **every** brand at once. Two unrelated brands were
sitting frozen at the time — `glow-modesty` 165 -> 112 and `voile-chic` 126 -> 72, first seen
in this session's earlier publish and not investigated by anyone yet — and the override
accepted their collapse too. 107 rows of two live brands, gone, inside a commit whose message
would have said "cut two dead brands, 14 products". The counts are the only place it shows,
and -121 against an intended -14 is exactly the kind of number that reads as plausible.

**Fixed rather than worked around.** `brandDropViolations` now takes an optional
`intentionallyCut` set, and `scripts/build-data.mjs` passes `new Set(excl.brands)`. A slug in
`exclusions.json.brands` is a human saying the drop is intended — which is the single thing
the guard's own comment says it cannot work out for itself — so it is no longer a "collapse".
Everything else stays guarded in the same publish.

Cutting a brand now needs no override at all:

```
⚠️  2 brand(s) collapsed and were FROZEN at their previous published state:
  glow-modesty: 165 -> 112 (-32%), frozen at 165
  voile-chic: 126 -> 72 (-43%), frozen at 126
Published 19155 products (mixed across 112 brands, 2 frozen)
```

## Verification

```
rows 19169 -> 19155 (delta -14, expected -14)

brands whose count moved:
  madiha: 11 -> 0
  aniqq:   3 -> 0            <- and nothing else

controls, the two frozen brands must be UNCHANGED:
  glow-modesty: 165 -> 165
  voile-chic:   126 -> 126

controls from OUTSIDE the change (§10.53 rule 2) — rows last night's refresh added:
  present  vivi-zubedi:89044   veiled:7639107797097
  present  merrachi:15233279590783   jawda:16069871075708

brands 114 -> 112 | madiha/aniqq rows left: 0
```

**Negative control run before the new tests were trusted** (§10.28 rule 1). With the one
guard line deleted:

```
× does not flag a brand that was deliberately blocklisted
  Tests  1 failed | 54 passed (55)
```

Restored: `55 passed`. The second new test is the other half — a collapse for a brand that is
NOT blocklisted is still flagged, so the escape hatch cannot widen past the slug it names.

**Suite / lint:** `62 files, 1102 tests passed` (1100 before, +2 new). `npm run lint` exit 0.

`npx tsc --noEmit` prints two errors, both `Cannot find module '../../app/directory/page.js'`
from `.next/types/validator.ts` dated **Aug 29** — stale generated route types for a page
deleted on 2026-09-01, i.e. another session's build output, not this change. `app/directory`
does not exist.

## Shipped

`staging` verified, then `main` fast-forwarded `25bfa24..023899b` (carrying this cut and the
CI translation fix), Cloudflare purged, production verified.

Origin confirmed serving the new build with a cache-buster BEFORE the purge (§10.47 rule 1),
then the canonical URLs GET twice — MISS then HIT, identical bodies:

```
404  madiha:14817368047999          cut
404  aniqq:9436069036347            cut
200  glow-modesty:9334093840600     CONTROL — the frozen brand ALLOW_LARGE_DIFF would have taken
200  voile-chic:8648687747325       CONTROL — the other one
200  nour-al-houda:7781509070896    CONTROL — the brand that came back
200  vivi-zubedi:89044              CONTROL — last night's addition
200  parladusa:15644355723590       CONTROL — a translated title

200  /  /new-in  /edits/fall-essentials  /modest-abayas
     no "madiha" or "aniqq" anywhere in any of the four
```

The two frozen-brand controls are the ones that matter here: they are the rows the blunt
override would have deleted, and they are the reason the guard fix is in this commit rather
than a `ALLOW_LARGE_DIFF=1` in the shell history.


## Notes / follow-ups

- **`glow-modesty` and `voile-chic` are still frozen** — 32% and 43% of their rows stopped
  publishing and nobody has looked at why. A dead feed and an over-reaching filter look
  identical from here. This is now the oldest unexamined thing in the data.
- Raw rows for both cut brands are untouched (Invariant 12), so the decision is reversible:
  remove the slug from `exclusions.json.brands`, restore the `brands.ts` record, republish.
