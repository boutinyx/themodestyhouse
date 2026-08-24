#!/usr/bin/env python3
"""
Direct attempt to close the remaining gap against Tina's real reference grid
(aubergine-doorway photo specifically). Looking at that reference again side by
side with test-standing-door.jpg, the difference isn't coverage or skin anymore --
it's that everything I've been generating still reads as a STAGED/EDITORIAL photo:
grand landmark backdrops, golden-hour light, dramatic pose. Her real reference is
mundane: an ordinary building doorway, flat overcast-ish daylight, more headroom/
negative space around a smaller figure, a plain unremarkable street. Real OOTD
posts are not cinematic. Testing with the setting and lighting deliberately
downgraded to "ordinary," and looser framing (more distance/headroom) to match.
"""
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
    "straight nose, full glossy rose-pink lips, an oval face"
)


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
    f"An ordinary, slightly unremarkable phone snapshot of {FACE_ANCHOR}, taken "
    "quickly by a friend on a normal day -- not a photoshoot, not a professional "
    "portrait, nothing cinematic or dramatic about the lighting or setting. Flat, "
    "slightly overcast or plain daylight, ordinary color, no golden-hour glow, no "
    "dramatic light. Standing a good distance back from the camera so there is "
    "real empty space above her head and around her -- she is a fairly small "
    "figure in an ordinary real place, not filling the frame. Slightly imperfect, "
    "candid phone-camera framing, not centered, not composed like a magazine shot. "
    "Deep focus, everything sharp, no blur, no bokeh, no professional camera look. "
    "Visible real skin texture on her face, minimal everyday makeup, not "
    "airbrushed. "
    "She's wearing a deep aubergine hijab pinned smoothly, covering her hair, "
    "hairline, and ears completely -- absolutely no hair strands visible anywhere "
    "at the hairline, and no black underscarf visible beneath the fabric anywhere. "
    "Outfit: a deep burgundy fitted vest buttoned at the waist over a cream "
    "long-sleeve blouse tied in a bow at the neck, falling to hip length, with a "
    "flowing burgundy pleated maxi skirt. "
    "Standing still, looking slightly off to the side, calm plain expression, not "
    "a big posed smile. "
    "Setting: standing on a plain stone step in front of an ordinary, slightly "
    "weathered wooden double door on an unremarkable street, nothing grand or "
    "landmark-like about the building. "
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
    dest = OUT / "realmatch-v1.jpg"
    download(url, dest)
    print(f"Saved {dest.relative_to(APP)}")
    (OUT / "realmatch-v1.json").write_text(json.dumps({"prompt": PROMPT, "url": url}, indent=2))


if __name__ == "__main__":
    main()
