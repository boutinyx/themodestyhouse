#!/usr/bin/env python3
"""
Second TikTok outfit post. Same simple direct-prompt approach as tiktok_outfit_1.py,
plus explicit realism cues (skin texture, candid asymmetry, natural grain) since
outfit-1 read as too smooth/AI-plastic without them. Different outfit: burgundy
vest + cream blouse + pleated skirt, courtyard scene.
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
    "Candid photo of a young Middle Eastern woman in her mid-20s, wearing a cream "
    "beige hijab draped loosely, fully covering her hair and neck. She's wearing a "
    "deep burgundy fitted vest over a cream long-sleeve blouse tied loosely at the "
    "neck, with a flowing burgundy pleated maxi skirt swirling as she walks. She's "
    "walking through a sunlit stone courtyard with potted plants and greenery, caught "
    "mid-step with her skirt swishing, looking down with a genuine warm smile, one "
    "hand slightly raised. Black pointed heels, small gold drop earrings. "
    "Skin has real visible texture, fine pores, and subtle natural imperfections, a "
    "light natural sheen -- not airbrushed, not smooth or plastic-looking. Slightly "
    "imperfect, candid framing like a real phone photo taken by a friend -- not "
    "perfectly centered or symmetrical. Soft natural daylight matching the outdoor "
    "setting, real directional shadows. Subtle film-like grain, not a clean digital "
    "render. Genuine unposed, caught-in-the-moment expression, not a model stare. "
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
        arguments={"prompt": PROMPT, "aspect_ratio": "9:16",
                   "resolution": "1080p", "camera_fixed": False},
    )
    imgs = (res or {}).get("images") or []
    if not imgs:
        print(f"! no images in response: {json.dumps(res)[:400]}")
        sys.exit(1)
    url = imgs[0].get("url")
    dest = OUT / "outfit-2.jpg"
    download(url, dest)
    print(f"Saved {dest.relative_to(APP)}")
    (OUT / "outfit-2.json").write_text(json.dumps({"prompt": PROMPT, "url": url}, indent=2))


if __name__ == "__main__":
    main()
