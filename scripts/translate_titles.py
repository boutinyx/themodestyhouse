#!/usr/bin/env python3
"""
Translate non-English product titles to English (free, no paid API).

RULE: every title on the site is English. Some brands publish non-English titles
(e.g. Manzaram, Dutch). This runs AFTER `npm run build:data`, over data/products.json,
detects non-English titles and translates them via the free Google endpoint, with:
  - retries (the free endpoint 500s intermittently),
  - strict validation (an error/garbage response NEVER overwrites a real title),
  - a persistent cache (data/title-translations.json) so re-runs are instant and
    survive re-scrapes (raw stays original; only the published titles are English).

Usage:
  ./.venv-style/bin/python scripts/translate_titles.py --dry              # preview all
  ./.venv-style/bin/python scripts/translate_titles.py --only manzaram --dry
  ./.venv-style/bin/python scripts/translate_titles.py                    # apply
"""
import argparse
import json
import re
import time
from pathlib import Path

APP = Path(__file__).resolve().parent.parent
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
    args = ap.parse_args()

    from deep_translator import GoogleTranslator

    conf = json.loads(BRANDS_FILE.read_text()) if BRANDS_FILE.exists() else DEFAULT_BRANDS
    brand_lang = conf if isinstance(conf, dict) else {s: "auto" for s in conf}  # tolerate a plain list
    only = {args.only} if args.only else set(brand_lang)
    products = json.loads(PRODUCTS.read_text())
    cache = json.loads(CACHE.read_text()) if CACHE.exists() else {}

    translators = {lang: GoogleTranslator(source=lang, target="en") for lang in set(brand_lang.values())}
    changed = attempted = failed = 0
    samples = []

    for p in products:
        slug = p.get("brandSlug")
        if slug not in only:
            continue
        t = p.get("title") or ""
        if not t:
            continue
        if t in cache:                      # cache holds only clean results (identity or translated)
            new = cache[t]
        else:
            attempted += 1
            new = t
            got_clean = False
            translator = translators.get(brand_lang.get(slug, "auto"), translators.get("auto"))
            for attempt in range(3):        # the free endpoint 500s intermittently
                try:
                    r = translator.translate(t)
                    if r and not looks_bad(r, t):
                        new = r.strip()
                        got_clean = True
                        break
                except Exception:
                    pass
                time.sleep(0.6 * (attempt + 1))
            if got_clean:
                cache[t] = new              # cache ONLY clean results; failures retry next run
            else:
                failed += 1
            time.sleep(0.25)                # be gentle on the free endpoint
        if new != t:
            changed += 1
            if len(samples) < 12:
                samples.append((t, new))
        p["title"] = new

    print(f"brands: {sorted(only)}")
    print(f"attempted API translations: {attempted} | titles changed: {changed} | failed(kept original, retried next run): {failed}")
    for o, n in samples:
        print(f"  {o!r}\n   -> {n!r}")

    if args.dry:
        print("\n(dry run — nothing written)")
        return
    # indent=2 MATCHES scripts/build-data.mjs:176, which writes this same file
    # with JSON.stringify(..., null, 2) moments earlier. Without it this hook
    # re-serialised the whole catalogue onto one line, so a publish that added
    # six products produced a 189,462-line deletion and a 198-line insertion —
    # a diff nobody can review, on the largest tracked file in the repo.
    #
    # Worse, it was INTERMITTENT: `npm run translate` is guarded on
    # `[ -x .venv-style/bin/python ]`, so a machine with the venv minified the
    # file and a machine without it left build-data's pretty output alone. The
    # committed format therefore flipped depending on who published last, which
    # is the same trap CLAUDE.md §8 records for decisions.json (add-brands
    # writes it minified, app/api/curate pretty-printed) — undocumented for this
    # file until 2026-08-10.
    PRODUCTS.write_text(json.dumps(products, ensure_ascii=False, indent=2))
    CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=0))
    print(f"\nwrote {PRODUCTS.relative_to(APP)} and cached {len(cache)} translations")


if __name__ == "__main__":
    main()
