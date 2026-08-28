# The seventh untranslated title, and two sessions doing the same job at once

**Date:** 2026-08-28 · **Status:** done

## Goal
Two consecutive publishes had ended with `N in non-English brands NOT in the cache`. Seven
live products were serving French, Turkish and German titles on an English site. Tina pointed
at the venv — `source .venv-style/bin/activate` — which is the one thing those messages need,
since `translate_titles.py` requires network + Python and cannot run in CI.

## What actually happened: duplicated work, caught at the push
This session translated all seven and committed. The push to `staging` was **rejected as
non-fast-forward**: another session had done the same job minutes earlier and landed
`3df7c62` "data: translate 6 remaining non-English titles and republish".

Rather than merge blind, the two caches were compared key by key:

```
cache size — mine: 10770 | theirs: 10769
identical  "Strickweste Mit Knebelverschluss"
THEY LACK  "Hijab prêt à nouer Jersey premium greige"
identical  "Bonnet tube Jersey crème"
identical  "Beli Bağcıklı Bol Pantolon - Bej"
identical  "Kol Detaylı Oversize Pamuk Gömlek - Amazon"
identical  "Düğme Detaylı Poplin Pamuk Etek - Amazon"
identical  "Taş Detaylı Pantolon Ceket Takım - Siyah"

keys only in mine: 1 | keys only in theirs: 0 | keys where we DISAGREE: 0
```

**Six of seven byte-identical, zero disagreements, and exactly one key they lacked.** So this
session's real contribution is one title, and the correct resolution was to throw away my
`products.json` entirely, `git reset --hard origin/staging`, and add that single key on top —
not to merge two independently-rebuilt copies of a 10 MB generated file.

## What changed
- `data/title-translations.json` — +1 entry, `"Hijab prêt à nouer Jersey premium greige"` ->
  `"Hijab ready to tie Jersey premium greige"` (chic-modesty, fr). 10,769 -> 10,770.
- `data/products.json` — republished on top of theirs. 18,713 rows, **exactly 1 title
  rewritten**.

## Verification
Diffed against **their** build, not against the pre-translation one:

```
rows: 18713 -> 18713 | gone: 0 | added: 0
titles changed vs their build: 1
rows differing in any NON-title field: 0
```

The publish now prints `Titles: 4021 translated from cache | cache covers every non-English
title` — the gap message is gone.

## Notes / follow-ups
- **Hand-editing the cache reflowed the whole file, and the script writes it correctly.** The
  first attempt added the key with a small Python snippet and produced a **10,771-insertion /
  10,770-deletion** diff — §8's "formatting is contested" trap, hit by using
  `ensure_ascii=False` where the canonical writer does not. Reverted and re-run as
  `translate_titles.py --only chic-modesty --no-republish`, which produced a **2-line** diff.
  When a generated file has an owner, let the owner write it.
- **The endpoint 500s intermittently and that is not a failure.** The German title reported
  `failed(retried next run): 1` twice and succeeded on the third attempt with nothing changed.
  "N failed" in this script means *retry later*, never a lost title.
- **These are machine translations and read like it.** `"Beli Bağcıklı Bol Pantolon"` is
  literally "waist-tie loose trousers"; the endpoint returned `"Wide Waist Wide Trousers"`,
  which loses the drawstring and repeats "wide". Honest English, better than Turkish on an
  English site — but hand-editable in `data/title-translations.json` if Tina wants them in her
  own voice. The cache is keyed by the raw feed title, so an edit there survives every refresh.
- A naive count of "titles not in the cache" over `raw-products.json` gives **3,931** and is
  the wrong number: the script only considers titles behind **published** rows. The other
  ~3,900 are cut, out of stock, delisted or filtered, and cost nothing while unpublished.
