#!/usr/bin/env python3
"""
Three Y2K-elegant outfit looks via Higgsfield's plain soul/standard (text-to-image, no
character lock) using credential pair 1 (HIGGSFIELD_API_KEY1/SECRET1) -- a different
Higgsfield account than Fina's trained Soul ID (pair 2), so no custom_reference_id here.
Identity consistency relies on the shared text anchor only, same as the very first
soul-standard-tina generations earlier this session.

Reuses the standing style rules from fina_generate.py (identity text, pose, framing,
lighting, film look, skin/makeup) so these match the established Fina look as closely as
text-only generation allows.
"""
import json
import sys
import urllib.request
from pathlib import Path

APP = Path(__file__).resolve().parent.parent
OUT = APP / "public" / "hero-gen" / "fina"

sys.path.insert(0, str(APP / "scripts"))
from fina_generate import (  # noqa: E402
    FINA_IDENTITY, POSE, FRAMING, GARMENT_DETAIL, SETTING_INDEPENDENT,
    FLASH_LIGHTING, FILM_LOOK, SKIN_MAKEUP, BODYSUIT_NOTE, AWRAH_LAYER_NOTE,
)

ONE_SHOULDER_HIJAB = (
    "Wearing a {color} hijab draped dramatically to one side -- wrapped around her head "
    "and the lower face/neck area, with one long tail of fabric cascading down over a "
    "single shoulder, NOT symmetrically over both shoulders. Her neck is visible. Hair, "
    "hairline, and ears fully covered."
)

SCENE = (
    "A candid night-time event photo, warm ambient string lights and candlelight in the "
    "background, softly blurred but still busy and detailed -- architecture, greenery, "
    "other guests softly visible."
)

LOOKS = [
    (
        "look1-blazer",
        "black",
        "camel wide-leg trousers, a fitted burgundy ribbed turtleneck, a chocolate brown "
        "leather blazer draped over her shoulders rather than worn through the sleeves, "
        "layered thin gold necklaces, small gold hoop earrings, pointed-toe brown leather "
        "heels, a small quilted brown leather bag",
    ),
    (
        "look2-slipskirt",
        "chocolate brown",
        "an ivory bias-cut silk slip skirt with a subtle sheen, a fitted cream cashmere "
        "sweater, a tan suede jacket draped over one shoulder, a delicate thin gold "
        "necklace, nude kitten heels, a small tan leather bag",
    ),
    (
        "look3-trench",
        "deep burgundy",
        "a chocolate brown satin midi skirt with a subtle sheen, a fitted champagne "
        "long-sleeve top, a camel trench coat worn open, gold hoop earrings, camel block "
        "heels, a small structured black bag",
    ),
]


def build_prompt(hijab_color, outfit):
    return (
        f"Ultra-realistic editorial fashion photograph of {FINA_IDENTITY} "
        f"{ONE_SHOULDER_HIJAB.format(color=hijab_color)} "
        f"{BODYSUIT_NOTE} On top of that base layer, the outfit: {outfit}. {GARMENT_DETAIL} "
        f"{AWRAH_LAYER_NOTE} "
        f"{POSE} "
        f"Setting: {SCENE} {SETTING_INDEPENDENT} {FRAMING} "
        f"{FLASH_LIGHTING} {FILM_LOOK} "
        f"{SKIN_MAKEUP} "
        f"No text, no watermark, no logos."
    )


def load_env():
    env = {}
    for line in (APP / ".env").read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    key = env.get("HIGGSFIELD_API_KEY1")
    secret = env.get("HIGGSFIELD_API_SECRET1")
    if not key or not secret:
        sys.exit("Missing HIGGSFIELD_API_KEY1 / HIGGSFIELD_API_SECRET1 in .env")
    import os
    os.environ["HF_API_KEY"] = key
    os.environ["HF_API_SECRET"] = secret
    os.environ["HF_KEY"] = f"{key}:{secret}"


def download(url, dest):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=120) as r:
        dest.write_bytes(r.read())


def main():
    load_env()
    import higgsfield_client

    OUT.mkdir(parents=True, exist_ok=True)
    results = []
    for tag, hijab_color, outfit in LOOKS:
        prompt = build_prompt(hijab_color, outfit)
        print(f"[{tag}] generating…", flush=True)
        try:
            res = higgsfield_client.subscribe(
                "higgsfield-ai/soul/standard",
                arguments={
                    "prompt": prompt,
                    "aspect_ratio": "2:3",
                    "resolution": "1080p",
                    "camera_fixed": False,
                },
            )
        except Exception as e:
            print(f"    ! failed: {e}", flush=True)
            results.append({"tag": tag, "error": str(e)})
            continue
        imgs = (res or {}).get("images") or []
        if not imgs:
            print(f"    ! no images in response: {json.dumps(res)[:300]}", flush=True)
            results.append({"tag": tag, "raw": res})
            continue
        url = imgs[0].get("url")
        dest = OUT / f"{tag}.jpg"
        try:
            download(url, dest)
            print(f"    ✓ saved {dest.relative_to(APP)}", flush=True)
            results.append({"tag": tag, "file": str(dest), "url": url, "prompt": prompt})
        except Exception as e:
            print(f"    ! download failed: {e} ({url})", flush=True)
            results.append({"tag": tag, "url": url, "error": str(e)})

    (OUT / "key1-y2k-results.json").write_text(json.dumps(results, indent=2))
    ok = sum(1 for r in results if r.get("file"))
    print(f"\nDone. {ok}/{len(LOOKS)} saved to {OUT.relative_to(APP)}/", flush=True)


if __name__ == "__main__":
    main()
