#!/usr/bin/env python3
"""
Translate non-English product titles to English (free, no paid API).

RULE: every title on the site is English. Some brands publish non-English titles
(e.g. Manzaram, Dutch). This script POPULATES data/title-translations.json; it is
scripts/build-data.mjs (via lib/publishTitle.ts) that APPLIES it. This script does
not write data/products.json at all.

That split is the fix for the 2026-08-26 double-translation bug (CLAUDE.md §10.46).
It used to read data/products.json — i.e. titles build-data had ALREADY translated —
and use the published title as both the translation input and the cache key. For an
already-translated row that meant sending ENGLISH to Google under the brand's source
language ("Ine's top", source=de -> "Ine's great") and caching the corruption under
the English key, which every later publish then reapplied. 52 chained entries, 40
corrupted titles, invisible because each publish looked ordinary.

So: the input and the cache key are now the RAW feed title from
data/raw-products.json, which is exactly the key lib/publishTitle.ts looks up. A
translation can no longer be fed back into itself. It reads:
  - retries (the free endpoint 500s intermittently),
  - strict validation (an error/garbage response NEVER overwrites a real title),
  - a persistent cache (data/title-translations.json) so re-runs are instant and
    survive re-scrapes (raw stays original; only the published titles are English).

TWO ENGINES, in order: Google first, MyMemory second. Google is what produced
every one of the existing cache entries and is kept first for consistency, but
it is a SCRAPED endpoint with no contract — on 2026-09-04, after ~190 titles in
one afternoon, it began answering every request on this machine with
TranslationNotFound, in both the project venv and a clean one, for strings it
had translated correctly an hour earlier. A GitHub runner's datacenter IP is a
likelier target for that than a laptop, so a CI step with only Google in it
would be a fix that does not work. MyMemory is a documented free API rather
than a scrape, and answered all four probe strings correctly at the moment
Google was refusing everything — including 'Fırfır Detaylı Transparan Bluz' ->
'Ruffle Detailed Transparent Blouse', byte-identical to what Google had given
earlier. It needs LOCALE codes (de-DE, not de), hence MYMEMORY_LOCALE.

Both engines go through the same looks_bad() validation, and a title neither can
translate is simply left uncached and retried tomorrow — never written wrong.

After caching new entries it re-runs the publish itself, so one command still
gets a new title onto the site. It invokes node_modules/.bin/tsx DIRECTLY rather
than `npm run build:data`, because that npm script has a postbuild:data hook that
calls this script — going through npm would recurse.

Usage:
  ./.venv-style/bin/python scripts/translate_titles.py --dry              # preview all
  ./.venv-style/bin/python scripts/translate_titles.py --only manzaram --dry
  ./.venv-style/bin/python scripts/translate_titles.py                    # apply
  ./.venv-style/bin/python scripts/translate_titles.py --no-republish     # cache only
"""
import argparse
import json
import re
import subprocess
import sys
import time
from pathlib import Path

APP = Path(__file__).resolve().parent.parent
RAW = APP / "data" / "raw-products.json"
PRODUCTS = APP / "data" / "products.json"
CACHE = APP / "data" / "title-translations.json"
BRANDS_FILE = APP / "data" / "translate-brands.json"

# THE RULE: brands that publish non-English product titles, mapped to their
# source language. Only these are translated — auto-detecting language per title
# is too noisy (short English fashion titles get mis-flagged). Giving the source
# language also fixes MIXED titles ("Comfy set met rok"). When you add a
# non-English brand to data/brands.ts, add its slug + language here.
# data/translate-brands.json = {"manzaram": "nl"}
DEFAULT_BRANDS = {"manzaram": "nl"}

# MyMemory rejects a bare "de" (LanguageNotSupportedException) and wants a
# locale. Only the languages data/translate-brands.json actually uses are here;
# a language with no entry simply has no fallback, which is reported, not
# guessed. Read off MyMemoryTranslator().get_supported_languages() on
# 2026-09-04 rather than assumed.
MYMEMORY_LOCALE = {
    "nl": "nl-NL", "fr": "fr-FR", "de": "de-DE",
    "tr": "tr-TR", "it": "it-IT", "da": "da-DK",
}
MYMEMORY_TARGET = "en-GB"


def looks_bad(result: str, original: str) -> bool:
    if not result or not result.strip():
        return True
    if re.search(r"\berror\b|https?://|that.?s an error|\b500\b|try again later", result, re.I):
        return True
    # a translation shouldn't balloon in length — that signals a garbage/error page
    if len(result) > max(70, len(original) * 3):
        return True
    return False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry", action="store_true", help="preview, don't write")
    ap.add_argument("--only", default="", help="limit to a brandSlug (testing)")
    ap.add_argument("--no-republish", action="store_true",
                    help="populate the cache but don't re-run the publish")
    args = ap.parse_args()

    from deep_translator import GoogleTranslator, MyMemoryTranslator

    conf = json.loads(BRANDS_FILE.read_text()) if BRANDS_FILE.exists() else DEFAULT_BRANDS
    brand_lang = conf if isinstance(conf, dict) else {s: "auto" for s in conf}  # tolerate a plain list
    only = {args.only} if args.only else set(brand_lang)
    raw = json.loads(RAW.read_text())
    raw_rows = raw if isinstance(raw, list) else raw.get("products", [])
    raw_title_by_id = {r.get("id"): (r.get("title") or "") for r in raw_rows}
    # products.json is read for its ID LIST ONLY — never for its titles, which
    # are the already-translated ones that caused CLAUDE.md §10.46. Scoping to
    # published rows is deliberate: raw carries every row ever scraped,
    # including cut and delisted ones, and translating those is 4,091 extra
    # calls to a free endpoint for titles no visitor will ever see.
    published = json.loads(PRODUCTS.read_text())
    published_rows = published if isinstance(published, list) else published.get("products", [])
    cache = json.loads(CACHE.read_text()) if CACHE.exists() else {}

    def engines_for(lang: str):
        """Google first, MyMemory second. Order is deliberate — see the module
        docstring. A language with no MyMemory locale gets Google only."""
        chain = [("google", GoogleTranslator(source=lang, target="en"))]
        locale = MYMEMORY_LOCALE.get(lang)
        if locale:
            try:
                chain.append(("mymemory", MyMemoryTranslator(source=locale, target=MYMEMORY_TARGET)))
            except Exception:
                pass  # never let a fallback's construction break the primary
        return chain

    translators = {lang: engines_for(lang) for lang in set(brand_lang.values())}
    by_engine = {"google": 0, "mymemory": 0}
    added = attempted = failed = skipped = 0
    samples = []

    # Iterate the RAW rows, not the published ones. These titles are what the
    # feed said; lib/publishTitle.ts looks the cache up under exactly this key
    # (and under normalizeTitle() of it). Deduplicated, because a repeated title
    # across colourways is one translation, not twenty.
    seen = set()
    for p in published_rows:
        slug = p.get("brandSlug") or (p.get("id") or "").split(":")[0]
        if slug not in only:
            continue
        t = raw_title_by_id.get(p.get("id"), "")
        if not t or t in seen:
            continue
        seen.add(t)
        if t in cache:                      # already known — never re-send it
            skipped += 1
            continue
        attempted += 1
        new = t
        got_clean = False
        chain = translators.get(brand_lang.get(slug, "auto")) or translators.get("auto") or []
        for engine_name, translator in chain:
            for attempt in range(3):        # the free endpoints 500 intermittently
                try:
                    candidate = translator.translate(t)
                    if candidate and not looks_bad(candidate, t):
                        new = candidate.strip()
                        got_clean = True
                        by_engine[engine_name] = by_engine.get(engine_name, 0) + 1
                        break
                except Exception:
                    pass
                time.sleep(0.6 * (attempt + 1))
            if got_clean:
                break
        if got_clean:
            cache[t] = new                  # cache ONLY clean results; failures retry next run
            added += 1
            if new != t and len(samples) < 12:
                samples.append((t, new))
        else:
            failed += 1
        time.sleep(0.25)                    # be gentle on the free endpoint

    print(f"brands: {sorted(only)}")
    print(
        f"raw titles behind published rows: {len(seen)} | already cached: {skipped} | "
        f"attempted: {attempted} | newly cached: {added} | "
        f"failed(retried next run): {failed}"
    )
    # Which engine did the work is worth printing: if google is 0 and mymemory
    # carried the whole run, google is being refused again and the fallback is
    # the only reason this step still works.
    if attempted:
        print("engines: " + " | ".join(f"{k} {v}" for k, v in by_engine.items()))
    for o, n in samples:
        print(f"  {o!r}\n   -> {n!r}")

    if args.dry:
        print("\n(dry run — nothing written)")
        return

    # indent=0 is this file's existing on-disk format and is left alone. The
    # indent=2 note that used to live here was about data/products.json, which
    # this script no longer writes — see CLAUDE.md §8 and the 2026-08-10 log for
    # why that mattered. build-data.mjs is now the only writer of products.json,
    # so the format can no longer flip depending on whether the publishing
    # machine has .venv-style.
    CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=0))
    print(f"\nwrote {CACHE.relative_to(APP)} — {len(cache)} translations cached")

    if added == 0:
        print("No new translations, so products.json is already correct — not republishing.")
        return
    if args.no_republish:
        print("--no-republish: run `npm run build:data` to publish the new titles.")
        return

    # Republish so the new cache entries reach the site in one command, the way
    # they did when this script wrote products.json itself. tsx is invoked
    # DIRECTLY: `npm run build:data` has a postbuild:data hook that runs this
    # script, so going through npm would recurse.
    tsx = APP / "node_modules" / ".bin" / "tsx"
    if not tsx.exists():
        print(f"No {tsx} — run `npm run build:data` yourself to publish the new titles.")
        return
    print(f"\nRepublishing with {added} new translations: {tsx} scripts/build-data.mjs")
    result = subprocess.run([str(tsx), str(APP / "scripts" / "build-data.mjs")], cwd=APP)
    if result.returncode != 0:
        print("Republish FAILED — the cache is written but products.json is stale.")
        sys.exit(result.returncode)


if __name__ == "__main__":
    main()
