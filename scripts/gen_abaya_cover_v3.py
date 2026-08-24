#!/usr/bin/env python3
"""
Round 3 of cover-image options for content/editorial/best-abaya-brands-price-tiers.md.

Reverts to round 1's model/settings (API-key SDK, higgsfield-ai/soul/standard, 1080p)
-- Tina said the Soul 2.0 / 2k CLI results (round 2) "look so tacky" and asked to go
back to what was used before "2k" came up. Keeps round 2's prompt fixes, which were
never in question: satin fabric, blank drink cups (matcha, not a generic drink --
round 2 accidentally dropped "matcha" wording, restored here), minimal
undistorted jewelry, and cream/white abayas swapped for lilac.

Usage:
  ./.venv-style/bin/python scripts/gen_abaya_cover_v3.py
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


FABRIC = (
    "Luxurious glossy satin abaya fabric with a soft sheen that catches the light, "
    "fluid heavy drape, visible smooth satin highlights along the folds (not matte, "
    "not flat silk)."
)

HANDS_AND_PROPS = (
    "Each woman holds one plain iced matcha drink in a clear cup with NO text, no "
    "logo, no label, no writing of any kind on the cup or straw -- a completely "
    "blank plain cup. Designer handbags held in the other hand. Hands are "
    "anatomically correct with five clearly separated natural fingers each, no "
    "extra or fused fingers, no warped or melted shapes. Jewelry kept minimal and "
    "simple -- at most one thin plain gold bracelet on one wrist, no rings, no "
    "stacked bangles, nothing complex or distorted."
)

BASE = (
    "Editorial mirror-selfie photograph of a group of stylish women wearing flowing "
    "satin abayas, standing in a row in a bright boutique interior with white "
    "columns and ornate crown moulding. Each woman holds a phone raised in front of "
    "her face taking the photo, so faces are naturally hidden by the phones and "
    "raised arms. Lace-trimmed hijabs draped elegantly over one shoulder, matching "
    "the hijab lace to each abaya's color. " + FABRIC + " " + HANDS_AND_PROPS + " "
    "Soft, bright natural daylight, shot on film, aspirational modest fashion "
    "editorial, shallow depth of field, no text, no watermark, no logos, no "
    "signage anywhere in the image."
)

CONCEPTS = [
    ("brand-v3", BASE + " Three women in a row: deep aubergine purple satin, "
                 "dusty plum satin, and soft lilac satin with warm brass-gold "
                 "embroidered lace trim."),
    ("brand-v3-b", BASE + " Close three-quarter crop of two women, clearly "
                   "different colors: one in a deep aubergine satin abaya with "
                   "brass-gold trimmed lace, one in a much lighter dusty rose satin "
                   "abaya with matching lace, marble floor underfoot."),
    ("pastel-v3", BASE + " Four women in a row in soft pastel satin: buttery "
                  "yellow, sage mint, navy, and blush pink, cream lace trim on "
                  "each hijab, airy and light."),
    ("jewel-v3", BASE + " Four women in a row in richer jewel-tone satin: emerald "
                 "green, sapphire blue, garnet red, and deep gold, gold-thread "
                 "lace trim, warmer moodier light."),
    ("sunset-v3", BASE + " Three women in a row in warm sunset-tone satin: "
                  "terracotta, amber, and dusty rose, golden-hour light through "
                  "tall windows behind them."),
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

    (OUT / "results-v3.json").write_text(json.dumps(results, indent=2))
    ok = sum(1 for r in results if r.get("file"))
    print(f"\n{ok}/{len(CONCEPTS)} saved to {OUT.relative_to(APP)}")


if __name__ == "__main__":
    main()
