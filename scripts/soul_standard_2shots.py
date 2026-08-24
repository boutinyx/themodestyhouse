#!/usr/bin/env python3
"""
Two test generations of the Krea reference character via Higgsfield soul/standard
(text-to-image; no upload needed -- the file-upload endpoint is currently broken,
see docs/log/2026-08-14-higgsfield-upload-endpoint-broken.md).
"""
import json
import os
import sys
import urllib.request
from pathlib import Path

APP = Path(__file__).resolve().parent.parent
OUT = APP / "public" / "hero-gen" / "soul-standard-test"

CHARACTER = (
    "A young Middle Eastern/South Asian woman, mid-20s, oval face, defined "
    "straight-to-arched dark brows, hazel-olive eyes, straight nose, full lips with "
    "a neutral resting expression, warm medium olive skin tone with a natural sheen"
)

FLASH = (
    "Lit with direct on-camera flash, creating strong visible shine and specular "
    "highlights across the forehead, nose, cheeks, and chin -- skin reads noticeably "
    "oily/shiny under the flash, not matte or diffused; the background falls into "
    "warmer, dimmer ambient light beyond the flash's reach"
)
POSE = (
    "Candid, confident stance, weight shifted onto one hip, natural genuine "
    "expression -- a small real smile, not stiff or posed"
)
DETAIL = (
    "Render every garment detail with precision -- embroidery, beading, fabric "
    "texture, sheen, trim -- do not simplify or flatten. Hijab fully covers hair, "
    "hairline, ears, and neck. No text, no watermark, no logos"
)

CONCEPTS = [
    (
        "candles-burgundy",
        f"Ultra-realistic editorial fashion photograph of {CHARACTER}, wearing a "
        f"beige jersey hijab draped close to the face and neck and a flowing "
        f"bias-cut burgundy satin dress with fine delicate gold jewelry -- thin "
        f"layered chains and small drop earrings. {FLASH}. {POSE}. Setting: an "
        f"intimate indoor venue with warm candlelight and string lights, "
        f"softly blurred background, night-time warmth, never flat daylight or a "
        f"plain studio backdrop. {DETAIL}",
    ),
    (
        "garden-champagne",
        f"Ultra-realistic editorial fashion photograph of {CHARACTER}, wearing a "
        f"beige jersey hijab draped close to the face and neck and a champagne "
        f"draped top with a separate matching skirt, a visible waistline seam "
        f"between the two garments, delicate fine gold jewelry. {FLASH}. {POSE}. "
        f"Setting: an outdoor evening setting with lush greenery and warm "
        f"path/string lighting, softly blurred background, night-time warmth. "
        f"{DETAIL}",
    ),
]


def load_env():
    env = {}
    for line in (APP / ".env").read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    key = env.get("HIGGSFIELD_API_KEY2") or env.get("HIGGSFIELD_API_KEY")
    secret = env.get("HIGGSFIELD_API_SECRET2") or env.get("HIGGSFIELD_API_SECRET")
    if not key or not secret:
        sys.exit("Missing HIGGSFIELD_API_KEY2 / HIGGSFIELD_API_SECRET2 in .env")
    os.environ["HF_API_KEY"] = key
    os.environ["HF_API_SECRET"] = secret
    os.environ["HF_KEY"] = f"{key}:{secret}"


def download(url, dest):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        dest.write_bytes(r.read())


def main():
    load_env()
    import higgsfield_client

    OUT.mkdir(parents=True, exist_ok=True)
    results = []
    for i, (name, prompt) in enumerate(CONCEPTS, start=1):
        print(f"[{i}/{len(CONCEPTS)}] {name} — generating…", flush=True)
        try:
            res = higgsfield_client.subscribe(
                "higgsfield-ai/soul/standard",
                arguments={
                    "prompt": prompt,
                    "aspect_ratio": "4:3",
                    "resolution": "1080p",
                    "camera_fixed": False,
                },
            )
        except Exception as e:
            print(f"    ! failed: {e}", flush=True)
            results.append({"concept": name, "error": str(e)})
            continue
        imgs = (res or {}).get("images") or []
        if not imgs:
            print(f"    ! no images in response: {json.dumps(res)[:300]}", flush=True)
            results.append({"concept": name, "raw": res})
            continue
        url = imgs[0].get("url")
        dest = OUT / f"soulstd-{i}-{name}.jpg"
        try:
            download(url, dest)
            print(f"    ✓ saved {dest.relative_to(APP)}", flush=True)
            results.append({"concept": name, "file": str(dest), "url": url})
        except Exception as e:
            print(f"    ! download failed: {e} ({url})", flush=True)
            results.append({"concept": name, "url": url, "error": str(e)})

    (OUT / "results.json").write_text(json.dumps(results, indent=2))
    ok = sum(1 for r in results if r.get("file"))
    print(f"\nDone. {ok}/{len(results)} saved to {OUT.relative_to(APP)}/", flush=True)


if __name__ == "__main__":
    main()
