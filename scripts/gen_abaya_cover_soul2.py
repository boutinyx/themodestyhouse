#!/usr/bin/env python3
"""
Round 2 of cover-image options for content/editorial/best-abaya-brands-price-tiers.md
via the official Higgsfield CLI, text2image_soul_v2 ("Soul 2.0", OAuth-authenticated,
already logged in on this machine — see docs/log/2026-08-14-fina-generation-pipeline-
working.md). Not the SDK/API-key path used for round 1 (scripts/gen_abaya_cover.py) —
Tina asked specifically for Soul 2.0.

Carries forward the three fixes confirmed on the brand-a reshoot:
  - satin fabric, explicit sheen (round 1 read as flatter silk, not satin)
  - blank drink cups, no text/logo
  - minimal jewelry + an explicit correct-hands instruction (round 1's rings/bracelets
    were visibly warped)
  - any cream/white abaya becomes lilac (Tina's call on the brand-a reshoot)

Usage:
  ./.venv-style/bin/python scripts/gen_abaya_cover_soul2.py
"""
import json
import subprocess
import sys
import urllib.request
from pathlib import Path

APP = Path(__file__).resolve().parent.parent
OUT = APP / "public" / "hero-gen" / "abaya-cover"
CLI = ["npx", "--yes", "-p", "@higgsfield/cli", "higgsfield"]

FABRIC = (
    "Luxurious glossy satin abaya fabric with a soft sheen that catches the light, "
    "fluid heavy drape, visible smooth satin highlights along the folds (not matte, "
    "not flat silk)."
)

HANDS_AND_PROPS = (
    "Each woman holds one plain iced drink in a clear cup with NO text, no logo, no "
    "label, no writing of any kind on the cup or straw -- a completely blank plain "
    "cup. Designer handbags held in the other hand. Hands are anatomically correct "
    "with five clearly separated natural fingers each, no extra or fused fingers, no "
    "warped or melted shapes. Jewelry kept minimal and simple -- at most one thin "
    "plain gold bracelet on one wrist, no rings, no stacked bangles, nothing complex "
    "or distorted."
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
    ("brand-satin", BASE + " Three women in a row: deep aubergine purple satin, "
                    "dusty plum satin, and soft lilac satin with warm brass-gold "
                    "embroidered lace trim."),
    ("brand-satin-b", BASE + " Close three-quarter crop of two women: one in a deep "
                      "aubergine satin abaya with brass-gold trimmed lace, one in a "
                      "plum satin abaya with matching lace, marble floor underfoot."),
    ("pastel-satin", BASE + " Four women in a row in soft pastel satin: buttery "
                     "yellow, sage mint, navy, and blush pink, cream lace trim on "
                     "each hijab, airy and light."),
    ("jewel-satin", BASE + " Four women in a row in richer jewel-tone satin: "
                    "emerald green, sapphire blue, garnet red, and deep gold, "
                    "gold-thread lace trim, warmer moodier light."),
    ("sunset-satin", BASE + " Three women in a row in warm sunset-tone satin: "
                     "terracotta, amber, and dusty rose, golden-hour light through "
                     "tall windows behind them."),
]


def download(url, dest):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        dest.write_bytes(r.read())


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    results = []

    for name, prompt in CONCEPTS:
        print(f"{name} — generating…", flush=True)
        cmd = CLI + [
            "generate", "create", "text2image_soul_v2",
            "--prompt", prompt,
            "--aspect_ratio", "16:9",
            "--quality", "2k",
            "--wait", "--wait-timeout", "3m",
        ]
        proc = subprocess.run(cmd, capture_output=True, text=True)
        url = proc.stdout.strip().splitlines()[-1] if proc.stdout.strip() else ""
        if proc.returncode != 0 or not url.startswith("http"):
            print(f"    ! failed: {proc.stderr.strip() or proc.stdout.strip()}", flush=True)
            results.append({"concept": name, "error": proc.stderr.strip() or proc.stdout.strip()})
            continue
        ext = ".png" if url.endswith(".png") else ".jpg"
        dest = OUT / f"{name}{ext}"
        try:
            download(url, dest)
            print(f"    ✓ saved {dest.relative_to(APP)}", flush=True)
            results.append({"concept": name, "file": dest.name, "url": url, "prompt": prompt})
        except Exception as e:
            print(f"    ! download failed: {e} ({url})", flush=True)
            results.append({"concept": name, "url": url, "error": str(e)})

    (OUT / "results-satin.json").write_text(json.dumps(results, indent=2))
    ok = sum(1 for r in results if r.get("file"))
    print(f"\n{ok}/{len(CONCEPTS)} saved to {OUT.relative_to(APP)}")


if __name__ == "__main__":
    main()
