#!/usr/bin/env python3
"""
Fifth pass. Tina wants the face styled closer to the girls in her Pinterest
reference board. Not locking to one specific photographed individual (can't verify
identity/consent on a screenshot), but building a face-type description from the
shared traits across that board -- soft rounded face, warm tan skin, fuller lips,
straight defined brows -- same "describe a type, don't clone a photo" approach as
the character anchor sheet. Everything else kept from v4 (deep-focus phone-photo
background, tightened hairline coverage), since that one landed.
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
    "A real un-edited phone snapshot of a young Middle Eastern woman in her mid-20s, "
    "OOTD outfit post style like a real Instagram/TikTok/Pinterest photo, not a "
    "professional photoshoot. Shot on a phone camera: deep focus with the entire "
    "background clearly sharp and in focus, NOT blurred, no shallow depth of field, "
    "no bokeh, no professional portrait-mode look. Flat, natural daylight, neutral "
    "color rendering -- not a warm graded film look, no added grain, no vignette. "
    "Alone in frame, no other people visible anywhere in the shot. "
    "A soft, rounded face shape with full cheeks, warm tan-olive skin with natural "
    "texture, full lips, straight defined brows, warm expressive brown eyes. Minimal "
    "everyday makeup, warm rose lip, soft glow. "
    "She's wearing a cream ivory hijab pinned smoothly, covering her hair, hairline, "
    "and ears completely -- absolutely NO hair strands, wisps, or slivers visible "
    "anywhere at the hairline, temples, center part, or crown, and no black "
    "underscarf or cap visible above or beneath the cream fabric anywhere. One "
    "continuous piece of cream fabric, zero gaps, checked specifically at the "
    "top-center crown of her head. "
    "Outfit: a deep burgundy fitted vest buttoned at the waist over a cream "
    "long-sleeve blouse tied in a bow at the neck, falling to hip length, with a "
    "flowing burgundy pleated maxi skirt. "
    "Standing candid, weight on one hip, soft natural genuine smile, one hand "
    "resting near her hijab, small black clutch bag in the other hand. "
    "Setting: a sunlit stone courtyard with terracotta potted plants and greenery, "
    "all clearly visible and in focus behind her, ordinary real-world daylight. "
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
    dest = OUT / "outfit-2-v5.jpg"
    download(url, dest)
    print(f"Saved {dest.relative_to(APP)}")
    (OUT / "outfit-2-v5.json").write_text(json.dumps({"prompt": PROMPT, "url": url}, indent=2))


if __name__ == "__main__":
    main()
