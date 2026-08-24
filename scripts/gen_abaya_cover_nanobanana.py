#!/usr/bin/env python3
"""
5 variations of the nano_banana_flash cover shot for
content/editorial/best-abaya-brands-price-tiers.md.

Tina picked the nano_banana_flash structural fix (public/hero-gen/abaya-cover/
brand-nanobanana.png -- real body shape under the fabric, no blobby/melted satin,
unlike the soul/standard and soul_v2 rounds) and asked for 5 more takes at
"exactly like this one" -- same satin, same 4-color palette (aubergine / dusty
rose / magenta / lilac+gold), same mirror-selfie phone-raised pose. Her own
reference screenshot of that composition is fed in as an image reference so the
model is matching a real image, not a re-typed description of one.

Usage:
  ./.venv-style/bin/python scripts/gen_abaya_cover_nanobanana.py
"""
import json
import subprocess
import sys
import urllib.request
from pathlib import Path

APP = Path(__file__).resolve().parent.parent
OUT = APP / "public" / "hero-gen" / "abaya-cover"
CLI = ["npx", "--yes", "-p", "@higgsfield/cli", "higgsfield"]

REFERENCE_IMAGE = Path(
    "/Users/tina/Desktop/Scherm­afbeelding 2026-08-19 om 21.23.28.png"
)

PROMPT = (
    "Editorial mirror-selfie photograph of four stylish women wearing flowing "
    "satin abayas, standing in a row in a bright boutique interior with white "
    "columns and ornate crown moulding, matching the composition, poses and "
    "camera angle of the reference image exactly. Each woman holds a phone "
    "raised in front of her face taking the photo, so faces are naturally "
    "hidden by the phones and raised arms, same hand/arm pose as the "
    "reference. Lace-trimmed hijabs draped elegantly over one shoulder, "
    "matching the hijab lace to each abaya's color. Left to right, the same "
    "four colors as the reference: a deep aubergine purple satin abaya, a "
    "dusty rose-gold satin abaya, a deep magenta/burgundy satin abaya, and a "
    "soft lilac satin abaya with warm brass-gold embroidered lace trim. "
    "Luxurious glossy satin fabric with a soft realistic sheen that catches "
    "the light. The abaya on each woman drapes following the natural shape "
    "of her body underneath -- shoulders, waist and arm positions clearly "
    "readable through the fabric, not a shapeless inflated or melted "
    "silhouette. Fabric folds are physically plausible, following gravity "
    "naturally down the body. Each woman holds one plain iced matcha drink "
    "in a clear cup with NO text, no logo, no label, no writing of any kind "
    "on the cup or straw -- a completely blank plain cup. Designer handbags "
    "held in the other hand, with NO text, no logo, no wordmark of any kind "
    "on the bags either -- plain unbranded bags. Hands are anatomically "
    "correct with five clearly separated natural fingers each, no extra or "
    "fused fingers, no warped or melted shapes. Jewelry kept minimal and "
    "simple -- at most one thin plain gold bracelet on one wrist, no rings, "
    "no stacked bangles, nothing complex or distorted. Soft, bright natural "
    "daylight, shot on film, aspirational modest fashion editorial, shallow "
    "depth of field, no text, no watermark, no logos, no signage anywhere "
    "in the image."
)


def download(url, dest):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=300) as r:
        dest.write_bytes(r.read())


def main():
    if not REFERENCE_IMAGE.exists():
        sys.exit(f"Reference screenshot not found: {REFERENCE_IMAGE}")

    OUT.mkdir(parents=True, exist_ok=True)
    results = []

    for i in range(1, 6):
        name = f"nanobanana-{i}"
        print(f"{name} — generating…", flush=True)
        cmd = CLI + [
            "generate", "create", "nano_banana_flash",
            "--prompt", PROMPT,
            "--image-references", str(REFERENCE_IMAGE),
            "--aspect_ratio", "16:9",
            "--resolution", "2k",
            "--wait", "--wait-timeout", "4m",
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
            results.append({"concept": name, "file": dest.name, "url": url})
        except Exception as e:
            print(f"    ! download failed: {e} ({url})", flush=True)
            results.append({"concept": name, "url": url, "error": str(e)})

    (OUT / "results-nanobanana.json").write_text(
        json.dumps({"prompt": PROMPT, "results": results}, indent=2)
    )
    ok = sum(1 for r in results if r.get("file"))
    print(f"\n{ok}/5 saved to {OUT.relative_to(APP)}")


if __name__ == "__main__":
    main()
