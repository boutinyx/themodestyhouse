#!/usr/bin/env python3
"""
One TikTok outfit post. Simple, direct prompt (no y2k_generate.py scaffold reuse --
Tina rejected that on 2026-08-16). Via higgsfield_client SDK + HIGGSFIELD_API_KEY2.
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
    "Ultra-realistic candid street-style photo of a young Middle Eastern woman in her "
    "mid-20s, wearing a deep aubergine hijab draped elegantly over her head and one "
    "shoulder, fully covering her hair and neck. She's wearing a deep aubergine and "
    "cream polka-dot long-sleeve blouse with a tie-front knot at the waist, tucked "
    "into cream wide-leg trousers with a folded cuff at the ankle. She's standing on "
    "a stone step in front of tall ornate carved antique wooden doors with brass "
    "hardware, looking off to the side, one hand near her collar, holding a small "
    "white top-handle bag, wearing black pointed slingback heels and small gold hoop "
    "earrings. Natural daylight, soft shadows, shot on a phone camera, real "
    "Instagram/TikTok outfit-of-the-day photo, not studio, not overly posed. No text, "
    "no watermark, no logos."
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
        arguments={"prompt": PROMPT, "aspect_ratio": "9:16",
                   "resolution": "1080p", "camera_fixed": False},
    )
    imgs = (res or {}).get("images") or []
    if not imgs:
        print(f"! no images in response: {json.dumps(res)[:400]}")
        sys.exit(1)
    url = imgs[0].get("url")
    dest = OUT / "outfit-1.jpg"
    download(url, dest)
    print(f"Saved {dest.relative_to(APP)}")
    (OUT / "outfit-1.json").write_text(json.dumps({"prompt": PROMPT, "url": url}, indent=2))


if __name__ == "__main__":
    main()
