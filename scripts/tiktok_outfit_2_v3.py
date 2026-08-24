#!/usr/bin/env python3
"""
Same burgundy vest/pleated skirt outfit, third pass. Tina's feedback on outfit-2-y2k:
visible hair at the hairline, face reads fake, and the paparazzi/bystanders framing
isn't the polished "Pinterest" look she wants. Dropping the y2k scaffold's candid-
street/bystander framing, keeping its strict hairline-coverage language (tightened
further), and borrowing Fina's dewy/glam skin treatment (no identity lock -- that
needs the OAuth CLI, which is at 0 credits) for a cleaner, single-subject editorial
OOTD shot.
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
    "Editorial Pinterest/Instagram-style OOTD photograph of a young Middle Eastern "
    "woman in her mid-20s, alone in frame, no other people visible anywhere in the "
    "shot. Oval face, warm olive skin with a soft dewy natural glow and real visible "
    "skin texture -- not plastic, not overly smoothed or airbrushed. Soft natural "
    "glam makeup, warm rose lip and cheek tone, defined natural brows. "
    "She's wearing a cream ivory hijab pinned smoothly, covering her hair, hairline, "
    "and ears completely -- absolutely NO hair strands, wisps, or slivers visible "
    "anywhere at the hairline, temples, part, or crown. One continuous piece of soft "
    "draped fabric, no gaps, no underscarf band showing. Check specifically the "
    "center hairline above her forehead -- zero hair there. "
    "Outfit: a deep burgundy fitted vest buttoned at the waist over a cream "
    "long-sleeve blouse tied in a bow at the neck, falling to hip length, with a "
    "flowing burgundy pleated maxi skirt. "
    "Standing candid, weight on one hip, soft natural genuine smile, one hand "
    "resting near her hijab. "
    "Setting: a sunlit stone courtyard with terracotta potted plants and greenery, "
    "background softly blurred, warm natural daylight matching her lighting. Clean "
    "single-subject framing like a polished Pinterest outfit post, shallow depth of "
    "field, warm color grade, subtle natural film grain -- not a paparazzi or "
    "street-candid photo, no bystanders, no crowd. "
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
    dest = OUT / "outfit-2-v3.jpg"
    download(url, dest)
    print(f"Saved {dest.relative_to(APP)}")
    (OUT / "outfit-2-v3.json").write_text(json.dumps({"prompt": PROMPT, "url": url}, indent=2))


if __name__ == "__main__":
    main()
