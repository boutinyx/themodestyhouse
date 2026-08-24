#!/usr/bin/env python3
"""
Locked, modular prompt template for TikTok/Pinterest hijabi OOTD posts, built
2026-08-16 after a long trial-and-error session (see docs/tiktok/HANDOFF.md for the
full story). Replaces one-off tiktok_outfit_*.py scripts with a single reusable
generator across 4 shot-type presets matching Tina's real reference grid.

Usage:
  ./.venv-style/bin/python scripts/tiktok_generate.py \\
      --outfit "a deep burgundy fitted vest buttoned at the waist over a cream \\
                long-sleeve blouse tied in a bow at the neck, falling to hip length, \\
                with a flowing burgundy pleated maxi skirt" \\
      --hijab-color "cream ivory" \\
      --shot-type standing-door \\
      --scene "a sunlit stone courtyard with terracotta potted plants" \\
      --tag burgundy-test

--shot-type: candid-crop | mirror-selfie | standing-door | candid-walk
"""
import argparse
import json
import os
import sys
import urllib.request
from pathlib import Path

APP = Path(__file__).resolve().parent.parent
OUT = APP / "public" / "hero-gen" / "tiktok"

FACE_ANCHOR = (
    "a young Middle Eastern woman in her mid-20s, warm tan-olive skin with a "
    "natural sheen, straight-to-slightly-arched full dark brows, brown eyes, a "
    "straight nose, full glossy rose-pink lips, an oval face -- maintain these "
    "exact facial proportions, skin tone, brow shape, and features consistently, "
    "this is the same woman throughout"
)

ANTI_FAKE_BLOCK = (
    "A real un-edited phone snapshot, OOTD outfit post style exactly like a real "
    "Instagram/TikTok/Pinterest photo -- not a professional photoshoot. Deep focus, "
    "the entire background clearly sharp and in focus, not blurred, no shallow "
    "depth of field, no professional portrait-mode look, no bokeh. Natural "
    "daylight, true-to-life color -- not a warm graded film look, no added grain, "
    "no vignette. Alone in frame, no crowds."
)

SKIN_DETAIL_BLOCK = (
    "Visible real skin texture on her face, minimal everyday makeup, warm rose "
    "lip, soft natural glow -- not airbrushed, not plastic."
)

LAYERING_RULES = (
    "Render exactly the coverage pieces described in the outfit -- arms to the "
    "wrists, legs fully covered, chest and neckline closed, every fabric opaque. "
    "Any top layer falls to AT LEAST hip length, ending a few inches past her hip "
    "line -- never a cropped top that stops at the waist."
)


def hijab_block(color):
    return (
        f"She's wearing a {color} hijab pinned smoothly, covering her hair, "
        "hairline, and ears completely -- absolutely NO hair strands, wisps, or "
        "slivers visible anywhere at the hairline, temples, center part, or crown, "
        "and NO black underscarf, cap, or headband visible above, below, or "
        "through the fabric anywhere. One single continuous piece of fabric from "
        "the crown down, zero gaps -- check specifically the top-center of her "
        "head where hair would normally part."
    )


SHOT_TYPES = {
    "candid-crop": dict(
        framing="A tight candid crop from the chest up, camera angled slightly "
                "upward as if taken by someone standing close, looking off to the "
                "side or slightly up, natural candid expression, not posed.",
        aspect_ratio="3:4",
    ),
    "mirror-selfie": dict(
        framing="A mirror selfie, torso up, phone visible in her raised hand, "
                "arm bent, looking toward the phone/mirror, slightly imperfect "
                "amateur framing, not centered or professionally composed.",
        aspect_ratio="2:3",
    ),
    "standing-door": dict(
        framing="Full body to feet, straight-on eye-level camera angle, standing "
                "still, weight on one hip, a few steps back from the camera so her "
                "whole body and surroundings are comfortably in frame.",
        aspect_ratio="2:3",
    ),
    "candid-walk": dict(
        framing="Full body, caught mid-step walking, candid as if photographed by "
                "a friend a few steps back, natural motion, looking away from the "
                "camera.",
        aspect_ratio="2:3",
    ),
}


def load_env():
    env = {}
    for line in (APP / ".env").read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    key = env.get("HIGGSFIELD_API_KEY2")
    secret = env.get("HIGGSFIELD_API_SECRET2")
    if not key or not secret:
        sys.exit("Missing HIGGSFIELD_API_KEY2 / HIGGSFIELD_API_SECRET2 in .env")
    os.environ["HF_API_KEY"] = key
    os.environ["HF_API_SECRET"] = secret
    os.environ["HF_KEY"] = f"{key}:{secret}"


def build_prompt(outfit, hijab_color, scene, shot_type):
    st = SHOT_TYPES[shot_type]
    return (
        f"{ANTI_FAKE_BLOCK} Photo of {FACE_ANCHOR}. {st['framing']} "
        f"{SKIN_DETAIL_BLOCK} Layered thin gold necklaces and small gold hoop "
        f"earrings. {hijab_block(hijab_color)} "
        f"Outfit: {outfit}. {LAYERING_RULES} "
        f"Setting: {scene}, ordinary real-world daylight matching her lighting. "
        "No text, no watermark, no logos."
    ), st["aspect_ratio"]


def download(url, dest):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=120) as r:
        dest.write_bytes(r.read())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--outfit", required=True)
    ap.add_argument("--hijab-color", required=True)
    ap.add_argument("--scene", required=True)
    ap.add_argument("--shot-type", required=True, choices=list(SHOT_TYPES))
    ap.add_argument("--tag", required=True)
    args = ap.parse_args()

    load_env()
    import higgsfield_client

    prompt, aspect_ratio = build_prompt(args.outfit, args.hijab_color, args.scene, args.shot_type)
    print(f"Prompt:\n{prompt}\n", flush=True)

    OUT.mkdir(parents=True, exist_ok=True)
    print("Generating…", flush=True)
    res = higgsfield_client.subscribe(
        "higgsfield-ai/soul/standard",
        arguments={"prompt": prompt, "aspect_ratio": aspect_ratio,
                   "quality": "2k", "camera_fixed": False},
    )
    imgs = (res or {}).get("images") or []
    if not imgs:
        print(f"! no images in response: {json.dumps(res)[:400]}")
        sys.exit(1)
    url = imgs[0].get("url")
    dest = OUT / f"{args.tag}.jpg"
    download(url, dest)
    print(f"Saved {dest.relative_to(APP)}")
    (OUT / f"{args.tag}.json").write_text(json.dumps({"prompt": prompt, "url": url}, indent=2))


if __name__ == "__main__":
    main()
