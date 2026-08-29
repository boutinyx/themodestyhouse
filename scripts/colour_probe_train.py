#!/usr/bin/env python3
"""
Train a colour classifier on a LABELLED fashion dataset, instead of prompting.

  ./.venv-style/bin/python scripts/colour_probe_train.py --train --n 12000
  ./.venv-style/bin/python scripts/colour_probe_train.py --eval-tina
  ./.venv-style/bin/python scripts/colour_probe_train.py --propose

MUST run under the .venv-style interpreter (torch, open_clip, datasets, sklearn).

WHY
---
Zero-shot prompting asks a general model to guess what "a photo of a beige
garment" looks like. It measured 74.0% from a single photograph. A LINEAR PROBE
asks a different question: given 44,000 apparel photographs that a human already
labelled with a colour, learn the boundary directly in CLIP's feature space.
That is usually a large gain over prompting, and it costs one matrix.

Dataset: ashraq/fashion-product-images-small on the Hugging Face Hub — 44,072
product photographs with a `baseColour` attribute (~46 values), which is exactly
the label this needs and is what makes this worth trying at all.

THE MAPPING IS THE RISKY PART, NOT THE MODEL. The dataset's 46 colours have to
become this site's 15 families, and that mapping is a judgement I am making, not
something the data states. It is written out in full below so it can be argued
with, and every ambiguous case is DROPPED rather than guessed — a mislabelled
training row is worse than a missing one.

RESULT: IT LOST. KEPT AS A RECORDED NEGATIVE.
-------------------------------------------
Measured 2026-08-29, and the probe is worse than the zero-shot prompting it was
meant to replace. On the IDENTICAL test — one photograph per product, scored
against the colour that product's own title states, 200 products:

    zero-shot Marqo-FashionSigLIP   74.0%
    this linear probe               48.5%

Against Tina's own 117 hand answers it scored 62.9% exact / 70.1% counting any
family she listed, having first scored 71.1% with a worse label mapping — i.e.
fixing the mapping did not rescue it.

WHY IT LOST, WHICH IS THE PART WORTH KEEPING. The failure is not spread out: of
103 misses, 48 land on `cream`, from every source family — beige, white, black,
blue, yellow, brown, green all collapse into it. That is domain shift, not a
tuning problem. This dataset is catalogue CUTOUTS ON WHITE; The Modesty House's
photography is models in rooms, on streets, in daylight. A linear probe reads the
whole embedding, background included, so it learned "mostly pale image -> cream"
and carried that straight into a catalogue where pale backgrounds are everywhere
and mean nothing. Zero-shot prompting survives the shift because the text anchors
the question on the garment ("a photo of a beige garment") rather than on the
picture as a whole.

Two smaller things learned on the way, both real:
  - Dropping `Nude` from the label map was the single biggest error source in the
    first run: with no home in training, every warm-pale garment fell into the
    nearest surviving class and ORANGE took 13 of 28 disagreements. Mapping it to
    beige cut that to 3. The mapping below is the corrected one.
  - The held-out score on the dataset's own split (72.8%) says nothing about this
    catalogue. It was 24 points above what the probe actually achieved here, which
    is exactly why a same-dataset split was never allowed to decide anything.

What would be needed to make this work: training images from THIS catalogue, or
segmenting the garment before embedding so the room stops being part of the
input. Neither is worth it for the 962 products at stake.

"""
import argparse, io, json, os, sys, urllib.request
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

APP = Path(__file__).resolve().parent.parent
OUT = APP / ".colour-probe"

# The site's fifteen families. `multi` is deliberately absent from training:
# the dataset labels a garment's colour, not whether it is patterned, so there
# is no honest label for it here.
FAMILIES = ["black", "grey", "white", "cream", "beige", "brown", "navy", "blue",
            "green", "yellow", "orange", "red", "pink", "purple"]

# dataset baseColour -> our family. Anything absent is DROPPED from training.
#
# Dropped on purpose, with the reason, because these are the ones a careless
# mapping would get wrong and quietly poison the probe with:
#   Multi, Metallic          — not a single colour
#   Gold, Silver, Bronze,
#   Copper, Steel, Rust*     — metals read as their material, not a dye; the
#                              site already guards these in HARDWARE_OR_TRIM
#   Nude, Skin               — no agreed hue, and it collides with the skin the
#                              photo reader is meant to ignore
#   Fluorescent Green etc.   — no corresponding family
# (*Rust IS mapped: it is a normal dye colour in this catalogue.)
COLOUR_MAP = {
    "Black": "black", "Charcoal": "grey", "Grey": "grey", "Grey Melange": "grey",
    "White": "white", "Off White": "cream", "Cream": "cream", "Beige": "beige",
    "Khaki": "beige", "Tan": "beige", "Taupe": "beige",
    # `Nude` mapped to None in the first run and it was the single biggest
    # error source. With no home in training, every warm-pale garment landed on
    # the nearest surviving class -- ORANGE took 13 of 28 disagreements against
    # Tina's own answers (earth, champagne, desert, golden beige, taupe gray,
    # nude peach, blush nude, beige rose, nude brown ...). In this catalogue
    # "nude" is a beige-pink, and Tina's own calls say so: nude brown -> brown,
    # nude pink -> pink+beige, nude peach -> beige+pink. Mapped to beige.
    "Nude": "beige",
    "Brown": "brown", "Coffee Brown": "brown", "Bronze": None, "Mushroom Brown": "brown",
    "Navy Blue": "navy", "Blue": "blue", "Teal": "blue", "Turquoise Blue": "blue",
    "Sea Green": "green", "Green": "green", "Olive": "green", "Lime Green": "green",
    "Fluorescent Green": None,
    "Yellow": "yellow", "Mustard": "yellow", "Gold": None,
    # `Peach` moved off orange for the same reason: a peach garment reads pink
    # in this catalogue far more often than orange, and leaving it on orange
    # widened the class that was already swallowing everything warm and pale.
    "Orange": "orange", "Rust": "orange", "Peach": "pink",
    "Red": "red", "Maroon": "red", "Burgundy": "red",
    "Pink": "pink", "Rose": "pink", "Magenta": "pink", "Coral": "pink",
    "Purple": "purple", "Lavender": "purple", "Mauve": "purple",
    "Multi": None, "Metallic": None, "Silver": None, "Copper": None, "Steel": None,
    "Skin": None, "Skin Colour": None,
}

MODEL = os.environ.get("COLOUR_MODEL", "ViT-B-32")


def load_clip():
    import torch, open_clip
    forced = os.environ.get("COLOUR_DEVICE")
    if forced:
        device = forced
    elif "siglip" in MODEL.lower():
        device = "cpu"          # SigLIP hard-crashes on Metal here
    else:
        device = "mps" if torch.backends.mps.is_available() else "cpu"
    if MODEL.startswith("hf-hub:"):
        model, _, pre = open_clip.create_model_and_transforms(MODEL)
    else:
        model, _, pre = open_clip.create_model_and_transforms(MODEL, pretrained="laion2b_s34b_b79k")
    return model.to(device).eval(), pre, device


def embed_pils(pils, model, pre, device, bs=64):
    import torch
    out = []
    for i in range(0, len(pils), bs):
        batch = torch.stack([pre(im) for im in pils[i:i + bs]]).to(device)
        with torch.no_grad():
            f = model.encode_image(batch)
            f /= f.norm(dim=-1, keepdim=True)
        out.append(f.cpu())
        sys.stderr.write(f"\r  embedded {min(i + bs, len(pils))}/{len(pils)}")
    sys.stderr.write("\r")
    return torch.cat(out).numpy()


def train(n):
    import numpy as np, torch
    from datasets import load_dataset
    from sklearn.linear_model import LogisticRegression
    from sklearn.model_selection import train_test_split

    print(f"loading ashraq/fashion-product-images-small …", flush=True)
    ds = load_dataset("ashraq/fashion-product-images-small", split="train")
    print(f"  {len(ds)} rows", flush=True)

    keep_i, keep_y = [], []
    unmapped = {}
    for i, c in enumerate(ds["baseColour"]):
        fam = COLOUR_MAP.get(c, "MISSING")
        if fam == "MISSING":
            unmapped[c] = unmapped.get(c, 0) + 1
        elif fam is not None:
            keep_i.append(i); keep_y.append(fam)
    if unmapped:
        print("  baseColour values with no mapping (dropped, listed so the map can be fixed):")
        for k, v in sorted(unmapped.items(), key=lambda kv: -kv[1])[:20]:
            print(f"    {v:5}  {k}")
    print(f"  usable rows: {len(keep_i)}", flush=True)

    # Even sample per family, capped, so a huge Black class does not dominate.
    per = max(1, n // len(set(keep_y)))
    chosen, counts = [], {}
    for idx, y in zip(keep_i, keep_y):
        if counts.get(y, 0) >= per:
            continue
        counts[y] = counts.get(y, 0) + 1
        chosen.append((idx, y))
    print(f"  sampled {len(chosen)}: " + "  ".join(f"{k}:{v}" for k, v in sorted(counts.items())), flush=True)

    model, pre, device = load_clip()
    print(f"  embedding on {device} with {MODEL} …", flush=True)
    pils = [ds[i]["image"].convert("RGB") for i, _ in chosen]
    X = embed_pils(pils, model, pre, device)
    y = np.array([lab for _, lab in chosen])

    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, random_state=0, stratify=y)
    clf = LogisticRegression(max_iter=3000, C=10.0)
    clf.fit(Xtr, ytr)
    print(f"\nheld-out accuracy (same dataset, sanity only): {clf.score(Xte, yte):.3f}")

    OUT.mkdir(exist_ok=True)
    import pickle
    with open(OUT / "probe.pkl", "wb") as f:
        pickle.dump({"clf": clf, "model": MODEL, "families": list(clf.classes_)}, f)
    print(f"wrote {OUT / 'probe.pkl'}")


def _fetch(url, px=336):
    u = url + ("&" if "?" in url else "?") + f"width={px}"
    req = urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def _predict_urls(urls, clf, model, pre, device):
    from PIL import Image
    with ThreadPoolExecutor(max_workers=8) as ex:
        blobs = list(ex.map(lambda u: _safe(_fetch, u), urls))
    pils, idx = [], []
    for i, b in enumerate(blobs):
        if not b:
            continue
        try:
            pils.append(Image.open(io.BytesIO(b)).convert("RGB")); idx.append(i)
        except Exception:
            pass
    out = [None] * len(urls)
    if not pils:
        return out
    X = embed_pils(pils, model, pre, device)
    pred = clf.predict(X)
    for p, i in zip(pred, idx):
        out[i] = p
    return out


def _safe(fn, *a):
    try:
        return fn(*a)
    except Exception:
        return None


def _load_probe():
    import pickle
    with open(OUT / "probe.pkl", "rb") as f:
        d = pickle.load(f)
    global MODEL
    MODEL = d["model"]
    return d["clf"]


def _catalogue_terms():
    """Every open term with its products' image URLs, via the real classifier."""
    import subprocess
    r = subprocess.run(
        ["npx", "tsx", "-e",
         "import {classifyColour} from './lib/colour';"
         "const p=require('./data/products.json');const g={};"
         "for(const x of p){const v=classifyColour(x.title);"
         "if(v.confidence==='override'||v.confidence==='auto'||!v.term)continue;"
         "const amb=v.candidates.length>1; if(v.family&&!amb)continue;"
         "(g[v.term]=g[v.term]||{term:v.term,rows:0,urls:[]});"
         "g[v.term].rows++; if(g[v.term].urls.length<10)g[v.term].urls.push(x.image);}"
         "console.log(JSON.stringify(Object.values(g).sort((a,b)=>b.rows-a.rows)))"],
        cwd=APP, capture_output=True, text=True)
    line = [l for l in r.stdout.splitlines() if l.startswith("[")]
    return json.loads(line[-1]) if line else []


def eval_tina():
    """The measurement that counts: does the probe reproduce HER calls?"""
    import subprocess
    clf = _load_probe()
    model, pre, device = load_clip()
    ov = json.loads((APP / "data" / "colour-overrides.json").read_text())
    hers = {k: v for k, v in ov["terms"].items() if v is not None}

    r = subprocess.run(
        ["npx", "tsx", "-e",
         "import {splitColourSuffix} from './lib/colorVariants';"
         "const p=require('./data/products.json');const g={};"
         "for(const x of p){const s=splitColourSuffix(x.title); if(!s)continue;"
         "const k=s.colour.toLowerCase(); (g[k]=g[k]||[]); if(g[k].length<10)g[k].push(x.image);}"
         "console.log(JSON.stringify(g))"],
        cwd=APP, capture_output=True, text=True)
    line = [l for l in r.stdout.splitlines() if l.startswith("{")]
    urls_by_term = json.loads(line[-1]) if line else {}

    agree = agree_any = scored = 0
    wrong = []
    for term, val in hers.items():
        urls = urls_by_term.get(term, [])
        if not urls:
            continue
        preds = [p for p in _predict_urls(urls, clf, model, pre, device) if p]
        if not preds:
            continue
        votes = {}
        for p in preds:
            votes[p] = votes.get(p, 0) + 1
        top = max(votes.items(), key=lambda kv: kv[1])[0]
        want = val if isinstance(val, list) else [val]
        scored += 1
        if top == want[0]:
            agree += 1
        if top in want:
            agree_any += 1
        else:
            wrong.append(f"{term:22} she:{'+'.join(want):18} probe:{top}")
    print(f"\nTina's terms scored: {scored}")
    print(f"  matches her FIRST : {agree}  {100*agree/max(scored,1):.1f}%")
    print(f"  matches ANY       : {agree_any}  {100*agree_any/max(scored,1):.1f}%")
    print(f"\ndisagreements ({len(wrong)}):")
    for w in wrong[:30]:
        print("  " + w)


def validate_titles(limit):
    """The SAME test the zero-shot reader took, so the two have one comparable
    number: one photograph per product, scored against the colour the product's
    own title states. Zero-shot FashionSigLIP measured 74.0% here."""
    import subprocess
    clf = _load_probe()
    model, pre, device = load_clip()
    r = subprocess.run(
        ["npx", "tsx", "-e",
         "import {classifyColour} from './lib/colour';"
         "const p=require('./data/products.json');"
         "const r=p.map(x=>{const v=classifyColour(x.title);"
         "return (v.family&&v.confidence==='suffix'&&v.family!=='multi')?{f:v.family,u:x.image}:null})"
         ".filter(Boolean);console.log(JSON.stringify(r))"],
        cwd=APP, capture_output=True, text=True)
    line = [l for l in r.stdout.splitlines() if l.startswith("[")]
    rows = json.loads(line[-1]) if line else []
    step = max(1, len(rows) // limit)
    sample = rows[::step][:limit]
    agree = scored = 0
    conf = {}
    for i in range(0, len(sample), 32):
        chunk = sample[i:i + 32]
        for pred, row in zip(_predict_urls([c["u"] for c in chunk], clf, model, pre, device), chunk):
            if pred is None:
                continue
            scored += 1
            if pred == row["f"]:
                agree += 1
            else:
                k = f'{row["f"]} -> {pred}'
                conf[k] = conf.get(k, 0) + 1
        sys.stderr.write(f"\r  {min(i+32,len(sample))}/{len(sample)}")
    sys.stderr.write("\r")
    print(f"PROBE, one photo per product, against the title's own colour")
    print(f"  scored          : {scored}")
    print(f"  exact agreement : {agree}  {100*agree/max(scored,1):.1f}%")
    print("  (zero-shot FashionSigLIP on this same test: 74.0%)")
    print("\ntop disagreements:")
    for k, n in sorted(conf.items(), key=lambda kv: -kv[1])[:12]:
        print(f"  {n:3}  {k}")


def propose():
    clf = _load_probe()
    model, pre, device = load_clip()
    terms = _catalogue_terms()
    out = []
    for i, g in enumerate(terms):
        preds = [p for p in _predict_urls(g["urls"], clf, model, pre, device) if p]
        if preds:
            votes = {}
            for p in preds:
                votes[p] = votes.get(p, 0) + 1
            ranked = sorted(votes.items(), key=lambda kv: -kv[1])
            out.append({"term": g["term"], "rows": g["rows"], "family": ranked[0][0],
                        "votes": ranked[0][1], "read": len(preds)})
        else:
            out.append({"term": g["term"], "rows": g["rows"]})
        sys.stderr.write(f"\r  {i+1}/{len(terms)}  {g['term'][:26]:26}")
    sys.stderr.write("\r")
    (APP / "data" / "colour-probe-proposals.json").write_text(json.dumps(out, indent=1) + "\n")
    print(f"{len(out)} terms · {sum(1 for o in out if o.get('family'))} with a reading")
    print("wrote data/colour-probe-proposals.json")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--train", action="store_true")
    ap.add_argument("--eval-tina", action="store_true")
    ap.add_argument("--propose", action="store_true")
    ap.add_argument("--validate-titles", action="store_true")
    ap.add_argument("--n", type=int, default=12000)
    a = ap.parse_args()
    if a.train:
        train(a.n)
    elif a.eval_tina:
        eval_tina()
    elif a.validate_titles:
        validate_titles(a.n)
    elif a.propose:
        propose()
    else:
        print("pass --train, --eval-tina or --propose")
