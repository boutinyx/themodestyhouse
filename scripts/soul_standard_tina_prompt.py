#!/usr/bin/env python3
"""Two generations of Tina's exact prompt via Higgsfield soul/standard (text-only;
the file-upload endpoint needed for a real reference image is currently broken)."""
import json
import os
import sys
import urllib.request
from pathlib import Path

APP = Path(__file__).resolve().parent.parent
OUT = APP / "public" / "hero-gen" / "soul-standard-tina"

PROMPT = """Amateur candid snapshot, early 2000s digital camera, direct flash photography, slightly
grainy, imperfect amateur photo quality — not a professional studio shot.

The exact same woman shown in the attached reference image — match her face, skin tone,
eyes, brows, and facial structure exactly, do not alter her identity. She is wearing the
same beige hijab styled as in the reference, fully covering her hair, hairline, ears, and
neck.

Outfit: an oversized brown leather jacket over a fitted beige long-sleeve top, and a white
satin skirt with vertical ruffle/frill detailing, floor-length, with natural fluid drape
and visible sheen. Styled with black stiletto heels and a small black handbag.

IMPORTANT: The jacket is BROWN leather, the top is BEIGE, the skirt is WHITE satin with
visible frill trim, the bag and heels are BLACK — these four colors must all be visibly
distinct from each other and from the hijab, not a monochrome palette.

Elegant Y2K aesthetic — refined draping, delicate fine jewelry, soft glam makeup.

Pose: candid, confident stance, weight shifted onto one hip, natural genuine expression —
a small real smile, not stiff or posed.

Setting: a specific real indoor venue or outdoor evening setting with warm ambient light —
candles, string lights, or warm night ambiance — with real visible texture and detail in
the background, not a soft blurred generic backdrop.

Sharp focus throughout, hard direct flash with real shadow falloff, realistic skin texture
with visible pores and imperfections, oily shine on the forehead/nose/cheeks from the flash.

Avoid: smooth skin, airbrushed, CGI, plastic, overly perfect, soft blurred generic
background, hair visible at hairline, different face than the reference,
perfectly symmetrical centered framing."""


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
    for i in (1, 2):
        print(f"[{i}/2] generating…", flush=True)
        try:
            res = higgsfield_client.subscribe(
                "higgsfield-ai/soul/standard",
                arguments={
                    "prompt": PROMPT,
                    "aspect_ratio": "4:3",
                    "resolution": "1080p",
                    "camera_fixed": False,
                },
            )
        except Exception as e:
            print(f"    ! failed: {e}", flush=True)
            results.append({"i": i, "error": str(e)})
            continue
        imgs = (res or {}).get("images") or []
        if not imgs:
            print(f"    ! no images in response: {json.dumps(res)[:300]}", flush=True)
            results.append({"i": i, "raw": res})
            continue
        url = imgs[0].get("url")
        dest = OUT / f"tina-{i}.jpg"
        try:
            download(url, dest)
            print(f"    ✓ saved {dest.relative_to(APP)}", flush=True)
            results.append({"i": i, "file": str(dest), "url": url})
        except Exception as e:
            print(f"    ! download failed: {e} ({url})", flush=True)
            results.append({"i": i, "url": url, "error": str(e)})

    (OUT / "results.json").write_text(json.dumps(results, indent=2))
    ok = sum(1 for r in results if r.get("file"))
    print(f"\nDone. {ok}/2 saved to {OUT.relative_to(APP)}/", flush=True)


if __name__ == "__main__":
    main()
