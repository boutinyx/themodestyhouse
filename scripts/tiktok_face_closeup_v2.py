#!/usr/bin/env python3
"""
Same close-up framing/skin-detail recipe as tiktok_face_closeup_test.py (confirmed
working -- Tina approved the skin/makeup level), with the ethnicity description
sharpened to North African per her direction, instead of the more generic "Middle
Eastern/South Asian" used everywhere else in this project so far.
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


FACE_ANCHOR = (
    "a young North African woman in her mid-20s, warm tan-olive skin with a natural "
    "sheen, straight thick dark brows, deep brown almond-shaped eyes, a straight "
    "nose, full lips, an oval face"
)

PROMPT = (
    f"An extreme close-up mirror selfie phone photo, face filling almost the entire "
    f"frame, of {FACE_ANCHOR}, taken in a bright fitting room. The top edge of her "
    "phone is visible at the top of frame, held up at a slight angle, her arm "
    "partially visible. She's looking slightly up and to the side, calm neutral "
    "expression, natural head tilt. "
    "Extremely detailed real skin: visible individual pores across the forehead, "
    "nose, and cheeks, natural uneven skin tone with slightly blotchy warm redness "
    "on the cheeks, a couple of tiny natural blemishes/dark spots, fine peach-fuzz "
    "hair visible catching the light along the jawline, natural asymmetric brows "
    "with individual visible hairs, natural lower lash line, a glossy natural lip "
    "with visible texture and fine lip lines -- not smoothed, not airbrushed, not "
    "plastic. Soft bright indoor lighting from the side. "
    "She's wearing a warm taupe-beige hijab pinned close to her face, fully covering "
    "her hair and hairline -- no hair strands visible at the front hairline. "
    "Blurred neutral fitting-room background, a hint of a garment rack out of "
    "focus behind her. "
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
        arguments={"prompt": PROMPT, "aspect_ratio": "3:4",
                   "quality": "2k", "camera_fixed": False},
    )
    imgs = (res or {}).get("images") or []
    if not imgs:
        print(f"! no images in response: {json.dumps(res)[:400]}")
        sys.exit(1)
    url = imgs[0].get("url")
    dest = OUT / "face-closeup-v2-northafrican.jpg"
    download(url, dest)
    print(f"Saved {dest.relative_to(APP)}")
    (OUT / "face-closeup-v2-northafrican.json").write_text(json.dumps({"prompt": PROMPT, "url": url}, indent=2))


if __name__ == "__main__":
    main()
