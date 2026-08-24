#!/usr/bin/env python3
"""
Full pivot to a mirror-selfie fitting-room shot, matching the pose/background/
composition of the real reference photo Tina sent (close torso-up crop, phone
raised above her head, chin down/eyes up, blurred clothing racks behind her) --
not the full-body outdoor "candid street" framing used in outfit-2-v*. Outfit
altered from the reference (mustard instead of bright yellow, burgundy bag instead
of pink) per her "change it a little bit so it doesn't look exactly the same."
"""
import json
import os
import sys
import urllib.request
from pathlib import Path

APP = Path(__file__).resolve().parent.parent
OUT = APP / "public" / "hero-gen" / "tiktok"


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


PROMPT = (
    "A real un-edited mirror selfie phone photo, close crop from mid-torso up, of a "
    "young Middle Eastern woman in her mid-20s, taken in a clothing boutique fitting "
    "room. She's holding her phone raised in one hand above her head, arm bent, "
    "looking up toward the phone/mirror with her chin tilted down, direct natural "
    "gaze at the camera, calm neutral expression. Slightly off-center, imperfect "
    "amateur phone-selfie framing, not professionally composed. "
    "Background: blurred clothing racks and hanging garments behind her in a "
    "boutique fitting room, a sliver of mirror edge visible, mixed warm indoor "
    "overhead lighting, soft shadow under her chin from the angle. Real visible "
    "skin texture, fine pores, subtle natural sheen from the indoor light -- not "
    "airbrushed, not plastic. Defined natural brows, a bold warm mauve-rose lip. "
    "She's wearing a warm taupe-mocha hijab draped loosely over her head and one "
    "shoulder, fully covering her hair, hairline, and ears completely -- absolutely "
    "NO hair strands or slivers visible anywhere at the hairline or crown, and NO "
    "black underscarf visible beneath the fabric. "
    "Outfit: a mustard-ochre ruffled long-sleeve blouse with a tie-front bow at the "
    "waist and a ruffled peplum hem, over ivory-cream wide-leg trousers, a small "
    "burgundy crossbody bag visible at her hip. "
    "No text, no watermark, no logos."
)


def download(url, dest):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=120) as r:
        dest.write_bytes(r.read())


def main():
    load_env()
    import higgsfield_client

    OUT.mkdir(parents=True, exist_ok=True)
    print("Generating…", flush=True)
    res = higgsfield_client.subscribe(
        "higgsfield-ai/soul/standard",
        arguments={"prompt": PROMPT, "aspect_ratio": "2:3",
                   "resolution": "1080p", "camera_fixed": False},
    )
    imgs = (res or {}).get("images") or []
    if not imgs:
        print(f"! no images in response: {json.dumps(res)[:400]}")
        sys.exit(1)
    url = imgs[0].get("url")
    dest = OUT / "outfit-mirror-v1.jpg"
    download(url, dest)
    print(f"Saved {dest.relative_to(APP)}")
    (OUT / "outfit-mirror-v1.json").write_text(json.dumps({"prompt": PROMPT, "url": url}, indent=2))


if __name__ == "__main__":
    main()
