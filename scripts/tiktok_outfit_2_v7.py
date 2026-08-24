#!/usr/bin/env python3
"""
Matching the "post1-key2-test" / "post2-sage-park" batch quality (found in
public/hero-gen/y2k/, no surviving prompt file, but visually: real landmark-style
locations, layered gold jewelry, genuinely candid look-away pose, deep-focus real
phone-photo background) -- applied to the burgundy vest/pleated skirt outfit.
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
    "A real un-edited phone snapshot, full body to mid-thigh, of a young Middle "
    "Eastern woman in her mid-20s, OOTD outfit post style exactly like a real "
    "Instagram/TikTok/Pinterest photo taken by a friend standing a few steps back. "
    "Deep focus, the entire background clearly sharp and in focus, not blurred, no "
    "shallow depth of field, no professional portrait-mode look. Natural daylight, "
    "true-to-life color -- not a warm graded film look, no added grain. Alone in "
    "frame, no crowds. "
    "A soft, rounded face shape with full cheeks, warm tan-olive skin with natural "
    "texture, full lips, straight defined brows. Minimal everyday makeup, warm rose "
    "lip, soft natural glow, not airbrushed. Layered thin gold necklaces and small "
    "gold hoop earrings. "
    "She's wearing a cream ivory hijab pinned smoothly, covering her hair, hairline, "
    "and ears completely -- absolutely NO hair strands visible anywhere at the "
    "hairline or crown, and NO black underscarf visible beneath the fabric. "
    "Outfit: a deep burgundy fitted vest buttoned at the waist over a cream "
    "long-sleeve blouse tied in a bow at the neck, falling to hip length, with a "
    "flowing burgundy pleated maxi skirt. "
    "Candid pose, weight on one hip, looking off to the side past the camera rather "
    "than straight at it, relaxed genuine half-smile, one hand resting near her "
    "collar. "
    "Setting: standing against a real stone balustrade or colonnade at a sunlit "
    "European landmark-style building, warm golden-hour light, ordinary real-world "
    "daylight matching her lighting. "
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
                   "quality": "2k", "camera_fixed": False},
    )
    imgs = (res or {}).get("images") or []
    if not imgs:
        print(f"! no images in response: {json.dumps(res)[:400]}")
        sys.exit(1)
    url = imgs[0].get("url")
    dest = OUT / "outfit-2-v7.jpg"
    download(url, dest)
    print(f"Saved {dest.relative_to(APP)}")
    (OUT / "outfit-2-v7.json").write_text(json.dumps({"prompt": PROMPT, "url": url}, indent=2))


if __name__ == "__main__":
    main()
