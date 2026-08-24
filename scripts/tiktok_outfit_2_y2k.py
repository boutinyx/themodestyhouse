#!/usr/bin/env python3
"""
Same burgundy-vest/pleated-skirt courtyard outfit as tiktok_outfit_2.py, but built
with y2k_generate.py's actual locked prompt scaffold (build_prompt/hijab_note/
LAYERING_RULES/DISTANCE_LEAD/etc.) at Tina's explicit request 2026-08-16 ("now use
the y2k prompt on this"), run via the SDK + HIGGSFIELD_API_KEY2 since the CLI's
OAuth account is at 0 credits.
"""
import json
import os
import sys
import urllib.request
from pathlib import Path

APP = Path(__file__).resolve().parent.parent
OUT = APP / "public" / "hero-gen" / "tiktok"
sys.path.insert(0, str(APP / "scripts"))

from y2k_generate import build_prompt, resolve_lighting  # noqa: E402


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


OUTFIT = (
    "a deep burgundy fitted vest, buttoned at the waist, worn over a cream "
    "long-sleeve blouse with a tied bow neckline, falling to hip length, paired with "
    "a flowing burgundy pleated maxi skirt"
)
HIJAB_COLOR = "cream ivory"
SCENE = (
    "walking through a sunlit stone courtyard with terracotta potted plants and "
    "greenery, skirt swirling mid-step, small gold drop earrings, black pointed heels"
)
SHOT_TYPE = "candid"


def download(url, dest):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=120) as r:
        dest.write_bytes(r.read())


def main():
    load_env()
    import higgsfield_client

    lighting = resolve_lighting(SCENE, "auto")
    prompt = build_prompt(OUTFIT, HIJAB_COLOR, SCENE, lighting, SHOT_TYPE)
    print(f"Prompt:\n{prompt}\n", flush=True)

    OUT.mkdir(parents=True, exist_ok=True)
    print("Generating…", flush=True)
    res = higgsfield_client.subscribe(
        "higgsfield-ai/soul/standard",
        arguments={"prompt": prompt, "aspect_ratio": "2:3",
                   "resolution": "1080p", "camera_fixed": False},
    )
    imgs = (res or {}).get("images") or []
    if not imgs:
        print(f"! no images in response: {json.dumps(res)[:400]}")
        sys.exit(1)
    url = imgs[0].get("url")
    dest = OUT / "outfit-2-y2k.jpg"
    download(url, dest)
    print(f"Saved {dest.relative_to(APP)}")
    (OUT / "outfit-2-y2k.json").write_text(json.dumps({"prompt": prompt, "url": url}, indent=2))


if __name__ == "__main__":
    main()
