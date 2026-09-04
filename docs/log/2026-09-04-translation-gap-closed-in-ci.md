# The nightly can translate now — and it has a second engine, because the first one blocked us mid-session
**Date:** 2026-09-04 · **Status:** done

## Goal

Tina, after being shown that 186 published titles were reading in Turkish, Dutch, French and
German: *"fix the translating shit for next time"*.

## Why it kept happening

Not a bug — a split that was correct on 2026-08-10 and left one half unreachable:

- `scripts/build-data.mjs` **applies** `data/title-translations.json`. Pure lookup, no
  network, so it runs everywhere including CI.
- `scripts/translate_titles.py` **populates** it. Needs the network, and the only thing that
  invoked it was the `postrefresh` npm hook, guarded on `[ -x .venv-style/bin/python ]` — a
  venv that exists on Tina's laptop and on no GitHub runner.

So every 04:10 refresh added arrivals whose titles had never been seen, published them raw,
printed the count and waited for a human to read a log line. Nobody ever did. Verified rather
than assumed: `deep_translator` is the script's **only** third-party import; everything else
is stdlib, so the whole CI dependency is one `pip install`.

## What changed

**`.github/workflows/refresh.yml`** — `Set up Python` + `Translate new titles`, placed
between `Refresh catalogue` and `Summarise` so the summary reflects the post-translate state
and the new titles land in the same nightly commit.

`continue-on-error: true`, deliberately: the endpoints are free and unofficial, and a bad
night must not red a run whose catalogue is otherwise correct. Failure is **not** silent —
see the summary block below.

`data/title-translations.json` **added to the push step's `git add` list.** Without it the
cache would be rebuilt from nothing every night: the same titles re-sent for ever, and no
record of the ones already right.

**`scripts/translate_titles.py` — a second engine.** This is the part that was not planned,
and it is the reason the fix works at all. Google's is a scraped endpoint with no contract.
Mid-session, after ~190 titles in one afternoon, it began answering **every** request from
this machine with `TranslationNotFound` — in the project venv and in a clean one, for strings
it had translated correctly an hour earlier:

```
de 'Blaues Kleid mit Gürtel'   -> EXCEPTION TranslationNotFound
nl 'Rode rok met knopen'       -> EXCEPTION TranslationNotFound
fr 'Chemise blanche en coton'  -> EXCEPTION TranslationNotFound
de 'Comfy Kleid'               -> EXCEPTION TranslationNotFound     <- cached OK hours earlier
```

A GitHub runner's datacenter IP is a likelier target for that than a laptop, so a CI step
with only Google in it would have been a fix that does not work — and would have looked fine
until someone checked the titles again. MyMemory, a documented free API rather than a scrape,
answered all four correctly at the same moment:

```
MyMemory de-DE 'Blaues Kleid mit Gürtel'        -> 'Blue belted dress'
MyMemory nl-NL 'Rode rok met knopen'            -> 'Red Buttoned Skirt'
MyMemory tr-TR 'Fırfır Detaylı Transparan Bluz' -> 'Ruffle Detailed Transparent Blouse'
```

That last one is **byte-identical** to what Google produced earlier today, which is the best
available evidence the fallback is not a quality downgrade.

Google stays first (it produced all 11,460 existing entries; keeping it primary keeps the
cache consistent), MyMemory second. Both go through the same `looks_bad()` validation, and a
title neither can translate is left uncached and retried tomorrow — never written wrong
(§10.46's rule, unchanged). MyMemory needs locale codes, so `MYMEMORY_LOCALE` maps the six
languages `data/translate-brands.json` actually uses; it was read off
`get_supported_languages()`, not guessed. A language with no entry gets Google only, and that
is reported rather than silently substituted.

The run now prints which engine did the work — `engines: google 0 | mymemory 1` is the line
that says Google is being refused again.

**`scripts/build-data.mjs` + `lib/refreshSummary.ts`** — the untranslated count rides into
`data/refresh-report.json` as `untranslatedTitles` and becomes a warning block in the GitHub
Step Summary, beside the frozen-brand block:

```
> ⚠️ **186 published product title(s) are still in their source language** — the cache did
> not cover them, so visitors see Dutch, French, German or Turkish. Run
> `python3 scripts/translate_titles.py`. If this number is non-zero on consecutive nights the
> workflow's translate step is failing, not just lagging.
```

The number has always existed. It was printed into a log nobody reads; now it is in the place
someone looks, with the sentence that distinguishes lagging from broken.

## Verification

**The CI path was executed, not reasoned about.** A throwaway `python3 -m venv` with nothing
but `pip install deep-translator==1.11.4` — i.e. exactly what the workflow does, with
`.venv-style` untouched:

```
raw titles behind published rows: 4609 | already cached: 4609 | attempted: 0 | newly cached: 0
No new translations, so products.json is already correct — not republishing.
products.json byte-identical after the rerun
```

That proves the wiring but translates nothing, so one cache entry was **deleted** to force a
real translation — a negative control for the whole feature, run while Google was refusing
everything:

```
attempted: 1 | newly cached: 1 | failed(retried next run): 0
engines: google 0 | mymemory 1
  'Comfy Kleid'
   -> 'Comfy Dress'
Republishing with 1 new translations
```

Google 0, MyMemory 1 — the fallback carried it end to end from a clean interpreter. The cache
was then restored from git and republished, and `data/products.json` came back
**byte-identical** with the title at its committed `"Comfy dress"`, so the experiment left no
trace and publishing twice is still a no-op (§10.46 rule 3).

**Negative control for the summary block** (§10.28 rule 1) — with
`report.untranslatedTitles` hard-coded to 0:

```
× flags published titles still in their source language
  Tests  1 failed | 11 passed (12)
```

Restored: `12 passed`.

**Workflow YAML parsed and the step order asserted** rather than eyeballed:

```
5. Refresh catalogue
6. Set up Python
7. Translate new titles   [continue-on-error]
8. Summarise
9. Commit and push
git add line includes the cache: True
```

**Suite / lint:** `1104 tests passed` (1100 at the start of the day, +4). `npm run lint` exit 0.

## Notes / follow-ups

- **Nothing here has run on a real GitHub runner yet.** The first proof is tomorrow's 04:10
  run: its step summary should either say nothing about titles, or name a number. If Google
  is blocked there too, `engines: google 0 | mymemory N` in that step's log is where it shows.
- **MyMemory's anonymous quota is per-IP and modest** (~5k characters/day). A nightly adding
  ~200 short titles sits near it. If the fallback starts carrying whole runs, the next step is
  an email-identified MyMemory key (50k/day, still free), not a paid API.
- The `translate` npm script is still venv-guarded and still correct for local use; the
  workflow calls the Python directly rather than going through it, so the two paths do not
  have to agree about where the interpreter lives.
