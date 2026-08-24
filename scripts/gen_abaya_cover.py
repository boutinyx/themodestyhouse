#!/usr/bin/env python3
"""
Generate cover-image options for content/editorial/best-abaya-brands-price-tiers.md
via Higgsfield Soul (text-to-image, API-key auth — no identity lock needed, so the
plain SDK path is fine; no image-reference upload, since that endpoint is known
broken, see docs/log/2026-08-14-higgsfield-soul-reference-upload-broken.md).

Brief from Tina: a group mirror-selfie of women in colorful abayas, in the style of
her reference photo (pastel silk abayas, lace-trimmed hijabs draped over one
shoulder, phones raised so faces are naturally out of frame, matcha drinks,
designer bags, bright boutique interior with white columns). 5 variations; 2 of
them close to house brand colors (aubergine #441943 / plum #6e4a6b / brass #a98a5b).

Usage:
  ./.venv-style/bin/python scripts/gen_abaya_cover.py
"""
import json
import os
import sys
import urllib.request
from pathlib import Path

APP = Path(__file__).resolve().parent.parent
OUT = APP / "public" / "hero-gen" / "abaya-cover"


def load_env():
    env = {}
    for line in (APP / ".env").read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    key = env.get("HIGGSFIELD_API_KEY2") or env.get("HIGGSFIELD_API_KEY")
    secret = env.get("HIGGSFIELD_API_SECRET2") or env.get("HIGGSFIELD_API_SECRET")
    if not key or not secret:
        sys.exit("Missing HIGGSFIELD_API_KEY2 / HIGGSFIELD_API_SECRET2 in .env")
    os.environ["HF_API_KEY"] = key
    os.environ["HF_API_SECRET"] = secret
    os.environ["HF_KEY"] = f"{key}:{secret}"


BASE = (
    "Editorial mirror-selfie photograph of a group of stylish women wearing flowing "
    "silk abayas, standing in a row in a bright boutique interior with white "
    "columns and ornate crown moulding. Each woman holds a phone raised in front of "
    "her face taking the photo, so faces are naturally hidden by the phones and "
    "raised arms. Lace-trimmed hijabs draped elegantly over one shoulder, matching "
    "the hijab lace to each abaya's color. Soft flowing silk fabric with visible "
    "movement and drape, catching the light. Designer handbags, iced matcha drinks "
    "in hand. Soft, bright natural daylight, shot on film, aspirational modest "
    "fashion editorial, shallow depth of field, no text, no watermark, no logos, "
    "no signage."
)

CONCEPTS = [
    ("brand-a", BASE + " Three women in a row: one in deep aubergine purple silk, "
                "one in dusty plum, one in cream with warm brass-gold embroidered "
                "trim on the lace — the palette rich and jewel-toned, on-brand "
                "aubergine and plum with gold accents."),
    ("brand-b", BASE + " Close three-quarter crop of two women: one in a deep "
                "aubergine abaya with a brass-gold trimmed hijab, one in a plum "
                "abaya with matching lace, warm gold jewelry visible on raised "
                "wrists, marble floor underfoot."),
    ("pastel-a", BASE + " Four women in a row in soft pastels: buttery yellow, "
                "sage mint, navy, and blush pink silk abayas, cream lace trim on "
                "each hijab, airy and light."),
    ("jewel-a", BASE + " Four women in a row in richer jewel tones: emerald green, "
                "sapphire blue, garnet red, and deep gold silk abayas, gold-thread "
                "lace trim, warmer moodier light."),
    ("sunset-a", BASE + " Three women in a row in warm sunset tones: terracotta, "
                "amber, and dusty rose silk abayas, golden-hour light through tall "
                "windows behind them, warm glow."),
]


def download(url, dest):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        dest.write_bytes(r.read())


def main():
    load_env()
    import higgsfield_client

    OUT.mkdir(parents=True, exist_ok=True)
    results = []

    for name, prompt in CONCEPTS:
        print(f"{name} — generating…", flush=True)
        try:
            res = higgsfield_client.subscribe(
                "higgsfield-ai/soul/standard",
                arguments={"prompt": prompt, "aspect_ratio": "16:9",
                           "resolution": "1080p", "camera_fixed": False},
            )
        except Exception as e:
            print(f"    ! failed: {e}", flush=True)
            results.append({"concept": name, "error": str(e)})
            continue
        imgs = (res or {}).get("images") or []
        if not imgs:
            print(f"    ! no images in response: {json.dumps(res)[:200]}", flush=True)
            results.append({"concept": name, "raw": res})
            continue
        url = imgs[0].get("url")
        dest = OUT / f"{name}.jpg"
        try:
            download(url, dest)
            print(f"    ✓ saved {dest.relative_to(APP)}", flush=True)
            results.append({"concept": name, "file": dest.name, "url": url, "prompt": prompt})
        except Exception as e:
            print(f"    ! download failed: {e} ({url})", flush=True)
            results.append({"concept": name, "url": url, "error": str(e)})

    (OUT / "results.json").write_text(json.dumps(results, indent=2))
    ok = sum(1 for r in results if r.get("file"))
    print(f"\n{ok}/{len(CONCEPTS)} saved to {OUT.relative_to(APP)}")


if __name__ == "__main__":
    main()
