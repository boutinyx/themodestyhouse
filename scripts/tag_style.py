#!/usr/bin/env python3
"""
tag_style.py — free, local style/archetype tagging for The Modesty House.

Runs an open-source CLIP model ON THIS MACHINE (no API, no cost) to tag each
product photo with an aesthetic archetype:

    Elegant · Minimal · Maximalist · Streetwear · Boho

For each product it writes a primary archetype, an optional secondary, and a
confidence 0-1. Anything below the confidence gate is left UNTAGGED (a blank is
better than a wrong label).

Reads : data/products.json          (list of {id, image, ...})
Writes: data/archetypes.json        (passing tags: {id: {primary, secondary, confidence, source}})
        data/archetypes.debug.json  (every product + all class scores, for calibration)

Design : vault/Style-Tagging-Design.md
Plan   : vault/Style-Tagging-Plan.md

Usage
-----
  python scripts/tag_style.py --test20      # calibration: the 20 hand-labelled products, prints a table
  python scripts/tag_style.py --limit 100   # first 100 products (quick sanity run)
  python scripts/tag_style.py               # full run over the whole catalogue (resumable)

Common flags: --gate 0.60  --model ViT-B-32  --resume  --out data/archetypes.json
"""

import argparse
import json
import os
import sys
import time
import urllib.request
from pathlib import Path

# --- paths (script lives in <app>/scripts/, data in <app>/data/) -------------
APP_DIR = Path(__file__).resolve().parent.parent
DATA = APP_DIR / "data"
CACHE = APP_DIR / ".cache" / "style-imgs"

ARCHETYPES = ["elegant", "minimal", "maximalist", "streetwear", "boho"]

# Multiple phrasings per archetype; their text embeddings are averaged so the
# class vector isn't hostage to one wording. Tuned for modest fashion.
# Prompts describe the AESTHETIC with strong visual cues. Deliberately do NOT
# repeat "modest" in every line — that word flattened every class toward
# "elegant" in the first calibration run. Balance the classes so plain basics
# and casual/sporty pieces have as strong a pull as occasion wear.
PROMPTS = {
    "elegant": [
        "an elegant formal evening gown",
        "a refined sophisticated dressy occasion outfit",
        "a graceful tailored gown in luxurious fabric",
    ],
    "minimal": [
        "a plain outfit in a single solid neutral colour, no pattern",
        "a clean simple understated look, minimalist",
        "a basic monochrome garment with no decoration",
    ],
    "maximalist": [
        "an outfit with a loud, colourful, busy all-over print",
        "a garment covered in sequins, beads and heavy embellishment",
        "a bold dramatic maximalist look with ornate decoration",
    ],
    "streetwear": [
        "casual streetwear: a hoodie, sweatpants and sneakers",
        "a sporty athletic tracksuit, joggers and trainers",
        "relaxed everyday casualwear in denim and jersey",
    ],
    "boho": [
        "a bohemian outfit with earthy tones, fringe and crochet",
        "a flowing tiered peasant dress with folk print and ruffles",
        "a relaxed natural-linen boho look",
    ],
}

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"


def log(*a):
    print(*a, file=sys.stderr, flush=True)


def load_products():
    raw = json.loads((DATA / "products.json").read_text())
    return raw if isinstance(raw, list) else raw.get("products", [])


def pick_test20(products):
    """Reproduce the deterministic 20-product sample used for the hand-label test."""
    by_brand = {}
    for p in products:
        by_brand.setdefault(p.get("brandSlug"), []).append(p)
    pick = []
    for b in by_brand:
        items = [x for x in by_brand[b] if x.get("inStock") and x.get("image")]
        if items:
            pick.append(items[0])
            if len(items) > 3:
                pick.append(items[3])
        if len(pick) >= 24:
            break
    return pick[:20]


def safe_name(pid):
    return "".join(c if c.isalnum() or c in "-_." else "_" for c in str(pid)) + ".jpg"


def fetch_image(url, dest, timeout=20, retries=2):
    """Download once to dest (cached). Returns True on success."""
    if dest.exists() and dest.stat().st_size > 0:
        return True
    for attempt in range(retries + 1):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                data = r.read()
            if data:
                dest.write_bytes(data)
                return True
        except Exception as e:
            if attempt == retries:
                log(f"  ! download failed: {url[:70]} ({e})")
            else:
                time.sleep(1.0)
    return False


def build_model(model_name, pretrained, device):
    import torch  # noqa
    import open_clip

    log(f"Loading CLIP {model_name} / {pretrained} on {device} (first run downloads the weights)...")
    model, _, preprocess = open_clip.create_model_and_transforms(model_name, pretrained=pretrained)
    tokenizer = open_clip.get_tokenizer(model_name)
    model.eval().to(device)
    return model, preprocess, tokenizer


def class_text_features(model, tokenizer, device):
    import torch

    feats = []
    with torch.no_grad():
        for arch in ARCHETYPES:
            toks = tokenizer(PROMPTS[arch]).to(device)
            tf = model.encode_text(toks)
            tf = tf / tf.norm(dim=-1, keepdim=True)
            mean = tf.mean(dim=0)
            mean = mean / mean.norm()
            feats.append(mean)
    return torch.stack(feats)  # [5, D]


def classify(model, preprocess, image_path, class_feats, device, temp):
    import torch
    from PIL import Image

    try:
        img = Image.open(image_path).convert("RGB")
    except Exception as e:
        return None
    x = preprocess(img).unsqueeze(0).to(device)
    with torch.no_grad():
        f = model.encode_image(x)
        f = f / f.norm(dim=-1, keepdim=True)
        sims = (f @ class_feats.T).squeeze(0)          # cosine, [5]
        probs = torch.softmax(sims * temp, dim=0)      # temp keeps it from saturating
    sims = sims.tolist()
    probs = probs.tolist()
    order = sorted(range(5), key=lambda i: probs[i], reverse=True)
    top, second = order[0], order[1]
    return {
        "cosine": {ARCHETYPES[i]: round(sims[i], 4) for i in range(5)},
        "probs": {ARCHETYPES[i]: round(probs[i], 4) for i in range(5)},
        "primary": ARCHETYPES[top],
        "second_candidate": ARCHETYPES[second],
        "primary_prob": round(probs[top], 4),
        "second_prob": round(probs[second], 4),
    }


def decide_tags(res, gate, sec_min=0.22, sec_gap=0.18):
    """Apply the confidence gate + secondary rule. Returns tag dict or None (untagged)."""
    if res is None or res["primary_prob"] < gate:
        return None
    secondary = None
    if res["second_prob"] >= sec_min and (res["primary_prob"] - res["second_prob"]) <= sec_gap:
        secondary = res["second_candidate"]
    return {
        "primary": res["primary"],
        "secondary": secondary,
        "confidence": res["primary_prob"],
        "source": "clip",
    }


def device_str():
    import torch

    if torch.backends.mps.is_available():
        return "mps"
    if torch.cuda.is_available():
        return "cuda"
    return "cpu"


def main():
    ap = argparse.ArgumentParser(description="Free local CLIP style/archetype tagger")
    ap.add_argument("--limit", type=int, default=0, help="only process the first N products")
    ap.add_argument("--ids", default="", help="comma-separated product ids to process")
    ap.add_argument("--test20", action="store_true", help="run the 20 hand-labelled products, print a table")
    ap.add_argument("--gate", type=float, default=0.60, help="confidence gate (below = untagged)")
    ap.add_argument("--temp", type=float, default=50.0, help="softmax temperature on cosine sims")
    ap.add_argument("--model", default="ViT-B-32")
    ap.add_argument("--pretrained", default="laion2b_s34b_b79k")
    ap.add_argument("--out", default=str(DATA / "archetypes.json"))
    ap.add_argument("--debug-out", default=str(DATA / "archetypes.debug.json"))
    ap.add_argument("--resume", action="store_true", help="skip products already in --out")
    args = ap.parse_args()

    CACHE.mkdir(parents=True, exist_ok=True)
    products = load_products()

    if args.test20:
        products = pick_test20(products)
    elif args.ids:
        wanted = set(args.ids.split(","))
        products = [p for p in products if p.get("id") in wanted]
    elif args.limit:
        products = products[: args.limit]

    existing = {}
    if args.resume and Path(args.out).exists():
        existing = json.loads(Path(args.out).read_text())
        products = [p for p in products if p.get("id") not in existing]
        log(f"Resume: {len(existing)} already tagged, {len(products)} to go.")

    device = device_str()
    model, preprocess, tokenizer = build_model(args.model, args.pretrained, device)
    class_feats = class_text_features(model, tokenizer, device)

    tagged = dict(existing)      # passing tags → archetypes.json
    debug = {}                   # everything → archetypes.debug.json
    n_tagged = n_untagged = n_fail = 0

    for i, p in enumerate(products):
        pid = p.get("id")
        url = p.get("image")
        if not pid or not url:
            continue
        dest = CACHE / safe_name(pid)
        if not fetch_image(url, dest):
            n_fail += 1
            continue
        res = classify(model, preprocess, dest, class_feats, device, args.temp)
        if res is None:
            n_fail += 1
            continue
        debug[pid] = {"title": p.get("title"), "garment": p.get("garment"), **res}
        tag = decide_tags(res, args.gate)
        if tag:
            tagged[pid] = tag
            n_tagged += 1
        else:
            n_untagged += 1

        if args.test20:
            mark = "✓" if tag else "·"
            sec = f"+{tag['secondary']}" if tag and tag["secondary"] else ""
            print(f"{mark} {res['primary_prob']:.2f}  {res['primary']:<11}{sec:<12} "
                  f"[{p.get('garment','?'):<8}] {(p.get('title') or '')[:38]}")
        elif (i + 1) % 100 == 0:
            log(f"  {i+1}/{len(products)}  tagged={n_tagged} untagged={n_untagged} fail={n_fail}")

    # --- write outputs -------------------------------------------------------
    if not args.test20:
        Path(args.out).write_text(json.dumps(tagged, indent=1, ensure_ascii=False))
        Path(args.debug_out).write_text(json.dumps(debug, indent=1, ensure_ascii=False))
        log(f"\nWrote {len(tagged)} tags → {args.out}")
        log(f"Wrote {len(debug)} debug rows → {args.debug_out}")

    total = n_tagged + n_untagged
    if total:
        log(f"\nDone. tagged={n_tagged} ({100*n_tagged//total}%)  untagged={n_untagged}  download_fail={n_fail}")
        dist = {}
        for t in tagged.values():
            dist[t["primary"]] = dist.get(t["primary"], 0) + 1
        log("primary spread: " + ", ".join(f"{k}={v}" for k, v in sorted(dist.items(), key=lambda x: -x[1])))


if __name__ == "__main__":
    main()
