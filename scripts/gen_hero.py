#!/usr/bin/env python3
"""
Generate hero-image variations with Higgsfield Soul (text-to-image).
Reads HIGGSFIELD_API_KEY / HIGGSFIELD_API_SECRET from .env, generates a small
test batch (dark & moody, mixed subjects, 16:9 for the desktop hero, 720p),
and saves the results into public/hero-gen/.

Usage:
  ./.venv-style/bin/python scripts/gen_hero.py            # test batch, 16:9, 720p
  ...args: --ratio 9:16 --res 1080p --only 1,3            # e.g. mobile finals
"""
import argparse
import json
import os
import sys
import urllib.request
from pathlib import Path

APP = Path(__file__).resolve().parent.parent
OUT = APP / "public" / "hero-gen"

# --- credentials from .env ---------------------------------------------------
def load_env():
    env = {}
    for line in (APP / ".env").read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    key = env.get("HIGGSFIELD_API_KEY")
    secret = env.get("HIGGSFIELD_API_SECRET")
    if not key or not secret:
        sys.exit("Missing HIGGSFIELD_API_KEY / HIGGSFIELD_API_SECRET in .env")
    # the SDK reads these from the environment
    os.environ["HF_API_KEY"] = key
    os.environ["HF_API_SECRET"] = secret
    os.environ["HF_KEY"] = f"{key}:{secret}"

# Batch 5: variations of the winning street-style shot (aubergine coat, hijab +
# sunglasses, daylight). Vary pose/setting; keep it on-brand aubergine and keep a
# tonal (not blown-out white) background so the light-on-dark overlay still reads.
STYLE = ("candid street-style modest fashion editorial, a stylish hijabi woman in elegant sunglasses and a "
         "gracefully draped silk hijab, rich on-brand aubergine and plum tones, soft natural daylight, shot on "
         "film, chic and aspirational, a soft blurred city background (not blown-out, some mid tone for text), "
         "calm space to one side, no text, no writing, no signage, no logos, no watermark")

# 5 more close-crop takes like #25/#28 — aubergine coat, draped hijab, sunglasses,
# with visible gold jewelry. Vary the hand pose and backdrop a little.
CONCEPTS = [
    ("jewel-a", "Waist-up editorial crop of a stylish hijabi woman wearing a deep aubergine coat and a draped "
                "silk hijab with elegant sunglasses, one hand resting near the collar showing delicate gold rings, "
                "a fine gold bracelet and small gold earrings, softly blurred elegant Haussmann facade behind, " + STYLE),
    ("jewel-b", "Waist-up editorial crop of a stylish hijabi woman in a plum aubergine coat and draped hijab with "
                "sunglasses, one hand raised near her chin revealing several stacked gold rings and a slim gold "
                "watch, tasteful gold statement earrings, softly blurred chic city street, " + STYLE),
    ("jewel-c", "Waist-up editorial crop of a stylish hijabi woman in an aubergine coat, gently adjusting her draped "
                "silk hijab with one hand showing delicate gold rings and a thin gold bangle, small gold earrings, "
                "sunglasses, softly blurred cobblestone street, " + STYLE),
    ("jewel-d", "Waist-up editorial crop of a stylish hijabi woman in a rich aubergine wool coat and draped hijab, "
                "one hand lightly touching her sunglasses showing gold rings and a gold bracelet, elegant gold "
                "earrings, softly blurred warm café backdrop, " + STYLE),
    ("jewel-e", "Waist-up editorial crop of a stylish hijabi woman in a deep aubergine coat and draped hijab with "
                "sunglasses, hand at her collar holding a leather bag strap, gold rings, a fine bracelet and gold "
                "earrings, softly blurred tree-lined boulevard, " + STYLE),
]


def download(url, dest):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        dest.write_bytes(r.read())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ratio", default="16:9")
    ap.add_argument("--res", default="720p")
    ap.add_argument("--only", default="", help="comma-separated 1-based concept numbers")
    args = ap.parse_args()

    load_env()
    import higgsfield_client

    OUT.mkdir(parents=True, exist_ok=True)
    pick = {int(x) for x in args.only.split(",") if x.strip()} if args.only else None
    tag = args.ratio.replace(":", "x")
    results = []

    for i, (name, prompt) in enumerate(CONCEPTS, start=33):
        if pick and i not in pick:
            continue
        print(f"[{i}/{len(CONCEPTS)}] {name} ({args.ratio}, {args.res}) — generating…", flush=True)
        try:
            res = higgsfield_client.subscribe(
                "higgsfield-ai/soul/standard",
                arguments={"prompt": prompt, "aspect_ratio": args.ratio,
                           "resolution": args.res, "camera_fixed": False},
            )
        except Exception as e:
            print(f"    ! failed: {e}", flush=True)
            results.append({"concept": name, "error": str(e)})
            continue
        imgs = (res or {}).get("images") or []
        if not imgs:
            print(f"    ! no images in response: {json.dumps(res)[:200]}", flush=True)
            results.append({"concept": name, "raw": res})
            continue
        url = imgs[0].get("url")
        dest = OUT / f"hero-{tag}-{i}-{name}.jpg"
        try:
            download(url, dest)
            print(f"    ✓ saved {dest.relative_to(APP)}", flush=True)
            results.append({"concept": name, "file": dest.name, "url": url, "prompt": prompt})
        except Exception as e:
            print(f"    ! download failed: {e} ({url})", flush=True)
            results.append({"concept": name, "url": url, "error": str(e)})

    (OUT / f"results-{tag}-{args.res}-b8.json").write_text(json.dumps(results, indent=2))
    ok = sum(1 for r in results if r.get("file"))
    print(f"\nDone. {ok}/{len(results)} saved to {OUT.relative_to(APP)}/", flush=True)


if __name__ == "__main__":
    main()
