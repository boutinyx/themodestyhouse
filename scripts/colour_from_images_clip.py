#!/usr/bin/env python3
"""
Read a garment's colour off its PHOTOGRAPH, with CLIP.

  ./.venv-style/bin/python scripts/colour_from_images_clip.py --validate --limit 200
  ./.venv-style/bin/python scripts/colour_from_images_clip.py --propose --limit 858

WHY NOT PIXELS
--------------
The first attempt at this (scripts/colour-from-images.mjs) sampled a fixed
central rectangle and took the modal colour in Lab. Measured against the ~13.6k
products whose colour the TITLE already gives: **45.4%** exact agreement, then
**41.8%** after fixing a real bug in it (a per-channel median mixes channels
from different pixels and drifts to grey; that is why almost every miss landed
on `grey`).

Looking at a contact sheet with the sampled rectangle drawn on it showed why,
and no amount of tuning would have: the rectangle is frequently not on the
garment at all. This catalogue's photography is full-body, half-body, flat-lay,
two models in one frame, and a close crop of a hijab against a face — often for
the same brand. A fixed crop cannot find clothing in that.

CLIP is asked what it SEES instead, which needs no crop and no background rule.
The torch + open_clip in .venv-style were already here for other work, so this
adds no dependency.

WHAT IT IS ASKED
----------------
One prompt per colour family, phrased as the garment rather than the image
("a photo of a dark navy blue garment"), plus a set of DISTRACTOR prompts —
a person's face, a plain studio wall, a flat-lay on a table. A photo whose best
match is a distractor is refused rather than forced into a colour, which is the
same discipline the pixel version's "no honest read" branch had and the reason
the accuracy figure below is trustworthy rather than flattering.

HOW GOOD IT IS
--------------
`--validate` is the only claim worth making. It samples products whose title
carries an unambiguous colourway suffix, hides the title, and asks CLIP. The
number it prints is the number; nothing here is proposed for Tina's file unless
that number justifies it.
"""
import argparse, io, json, os, sys, urllib.request
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

APP = Path(__file__).resolve().parent.parent

# One SYMMETRIC template set, filled per family.
#
# The first version hand-wrote each family's prompts and they were not
# comparable: `black` got "a black abaya" while `brown` got "a coffee coloured
# abaya", and 29 of the 72 misses in that run went to brown. Asymmetric phrasing
# is a thumb on the scale — every family now gets the identical three sentences
# and only the colour word changes.
TEMPLATES = [
    "a photo of a {} garment",
    "{} clothing",
    "a {} dress",
]
FAMILY_WORDS = {
    "black":  ["black"],
    "grey":   ["grey", "charcoal grey"],
    "white":  ["white", "bright white"],
    "cream":  ["cream coloured", "ivory"],
    "beige":  ["beige", "tan", "sand coloured"],
    "brown":  ["brown", "chocolate brown"],
    "navy":   ["navy blue", "dark navy"],
    "blue":   ["blue", "bright blue"],
    "green":  ["green", "olive green"],
    "yellow": ["yellow", "mustard yellow"],
    "orange": ["orange", "rust orange"],
    "red":    ["red", "deep red"],
    "pink":   ["pink", "blush pink"],
    "purple": ["purple", "lilac purple"],
    "multi":  ["patterned", "floral printed", "striped"],
}
FAMILY_PROMPTS = {
    fam: [t.format(w) for w in words for t in TEMPLATES]
    for fam, words in FAMILY_WORDS.items()
}

# A photo whose best match is one of these is refused. Without them CLIP always
# names SOME colour, including for a size chart, a packaging shot or a face.
DISTRACTORS = [
    "a close up photograph of a person's face",
    "a size chart or a text graphic",
    "a photograph of a shop interior",
    "a logo on a plain background",
    # Added after the first run: brown took 29 of 72 misses, and the frames that
    # produced them had wooden doors, wooden floors and long brown hair in them.
    "a wooden door or a wooden floor",
    "a photograph of long brown hair",
    "bare skin",
]


# Which vision-language model reads the photographs.
#
# The first version used generic CLIP (ViT-B-32 / laion2b), which scored 64%
# per photo and 78% per colour name. Marqo-FashionSigLIP is the same open_clip
# interface but trained on e-commerce APPAREL — product photography with
# product text — which is exactly this corpus. Swapping it is one string, and
# `--validate` re-measures rather than assuming it is better.
MODEL = os.environ.get("COLOUR_MODEL", "hf-hub:Marqo/marqo-fashionSigLIP")


def load_model():
    import torch, open_clip
    # SigLIP crashes on Apple's Metal backend here — a hard MPSNDArray assertion
    # ("buffer is not large enough"), not a Python exception, so it takes the
    # process down with no traceback. CPU is slower and correct.
    forced = os.environ.get("COLOUR_DEVICE")
    if forced:
        device = forced
    elif "siglip" in MODEL.lower():
        device = "cpu"
    else:
        device = "mps" if torch.backends.mps.is_available() else "cpu"
    if MODEL.startswith("hf-hub:"):
        model, _, preprocess = open_clip.create_model_and_transforms(MODEL)
        tok = open_clip.get_tokenizer(MODEL)
    else:
        model, _, preprocess = open_clip.create_model_and_transforms(MODEL, pretrained="laion2b_s34b_b79k")
        tok = open_clip.get_tokenizer(MODEL)
    model = model.to(device).eval()

    families, prompts, owner = [], [], []
    for fam, ps in FAMILY_PROMPTS.items():
        families.append(fam)
        for p in ps:
            prompts.append(p); owner.append(fam)
    for d in DISTRACTORS:
        prompts.append(d); owner.append(None)

    with torch.no_grad():
        t = model.encode_text(tok(prompts).to(device))
        t /= t.norm(dim=-1, keepdim=True)
    return model, preprocess, t, owner, device


def fetch(url, px=336):
    u = url + ("&" if "?" in url else "?") + f"width={px}"
    req = urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def read_batch(urls, model, preprocess, text_feats, owner, device):
    """Returns [(family|None, confidence)] aligned with `urls`."""
    import torch
    from PIL import Image
    imgs, idx = [], []
    with ThreadPoolExecutor(max_workers=8) as ex:
        blobs = list(ex.map(lambda u: (lambda: None)() if not u else _safe(fetch, u), urls))
    for i, b in enumerate(blobs):
        if not b:
            continue
        try:
            imgs.append(preprocess(Image.open(io.BytesIO(b)).convert("RGB")))
            idx.append(i)
        except Exception:
            pass
    out = [(None, 0.0)] * len(urls)
    if not imgs:
        return out
    with torch.no_grad():
        f = model.encode_image(torch.stack(imgs).to(device))
        f /= f.norm(dim=-1, keepdim=True)
        sims = (100.0 * f @ text_feats.T).softmax(dim=-1).cpu()
    for row, i in zip(sims, idx):
        # Best prompt per family (max, not mean: one good phrasing is enough and
        # averaging lets a weak third prompt drown a strong first).
        best = {}
        distract = 0.0
        for p, fam in enumerate(owner):
            v = float(row[p])
            if fam is None:
                distract = max(distract, v)
            else:
                best[fam] = max(best.get(fam, 0.0), v)
        fam, score = max(best.items(), key=lambda kv: kv[1])
        out[i] = (None, 0.0) if distract > score else (fam, score)
    return out


def _safe(fn, *a):
    try:
        return fn(*a)
    except Exception:
        return None


def load_products():
    return json.loads((APP / "data" / "products.json").read_text())


def title_truth(with_term=False):
    """Products whose colour the title states unambiguously — the ground truth."""
    import subprocess
    out = subprocess.run(
        ["npx", "tsx", "-e",
         "import {classifyColour} from './lib/colour';"
         "const p=require('./data/products.json');"
         "const r=p.map(x=>{const v=classifyColour(x.title);"
         "return (v.family&&v.confidence==='suffix')?{i:x.id,f:v.family,u:x.image,t:x.title,term:v.term}:null}).filter(Boolean);"
         "console.log(JSON.stringify(r))"],
        cwd=APP, capture_output=True, text=True)
    line = [l for l in out.stdout.splitlines() if l.startswith("[")]
    if not line:
        sys.exit("could not build ground truth:\n" + out.stderr[-800:])
    return json.loads(line[-1])


def validate(limit):
    rows = title_truth()
    step = max(1, len(rows) // limit)
    sample = rows[::step][:limit]
    model, pre, tf, owner, dev = load_model()
    agree = read = refused = 0
    conf = {}
    for i in range(0, len(sample), 16):
        chunk = sample[i:i + 16]
        for (fam, sc), r in zip(read_batch([c["u"] for c in chunk], model, pre, tf, owner, dev), chunk):
            if fam is None:
                refused += 1; continue
            read += 1
            if fam == r["f"]:
                agree += 1
            else:
                k = f'{r["f"]} -> {fam}'
                conf[k] = conf.get(k, 0) + 1
        sys.stderr.write(f"\r  {min(i+16, len(sample))}/{len(sample)}")
    sys.stderr.write("\r")
    print(f"sampled {len(sample)} products whose TITLE states the colour")
    print(f"  refused (distractor won) : {refused}")
    print(f"  scored                   : {read}")
    print(f"  exact agreement          : {agree}  {100*agree/max(read,1):.1f}%")
    print("\ntop disagreements:")
    for k, n in sorted(conf.items(), key=lambda kv: -kv[1])[:15]:
        print(f"  {n:3}  {k}")


def validate_terms(limit, per_term=10):
    """The test that mirrors how this is actually used.

    A proposal is never made from ONE photo — it is made for a colour NAME that
    many products share, by letting their photos vote. So the honest measure is
    per-term, not per-photo: group the ground truth by its colourway term, read
    up to `per_term` of that term's photos, take the majority, and compare that
    to the family the term's own word gives.

    Terms with fewer than 4 products are excluded: a vote of two is not a vote,
    and in use those terms would be left for a human anyway.
    """
    rows = title_truth()
    by_term = {}
    for r in rows:
        by_term.setdefault(r["term"], {"family": r["f"], "urls": []})["urls"].append(r["u"])
    terms = [(t, d) for t, d in by_term.items() if len(d["urls"]) >= 4]
    terms.sort(key=lambda kv: -len(kv[1]["urls"]))
    terms = terms[:limit]

    model, pre, tf, owner, dev = load_model()
    agree = scored = refused = 0
    conf = {}
    by_margin = {"strong": [0, 0], "weak": [0, 0]}   # [agree, total]
    for n, (term, d) in enumerate(terms):
        urls = d["urls"][:per_term]
        votes = {}
        readable = 0
        for i in range(0, len(urls), 16):
            for fam, _sc in read_batch(urls[i:i + 16], model, pre, tf, owner, dev):
                if fam is None:
                    continue
                readable += 1
                votes[fam] = votes.get(fam, 0) + 1
        if not votes:
            refused += 1
        else:
            top, cnt = max(votes.items(), key=lambda kv: kv[1])
            share = cnt / readable
            scored += 1
            ok = top == d["family"]
            if ok:
                agree += 1
            else:
                k = f'{d["family"]} -> {top}'
                conf[k] = conf.get(k, 0) + 1
            bucket = "strong" if share >= 0.6 and readable >= 4 else "weak"
            by_margin[bucket][1] += 1
            by_margin[bucket][0] += 1 if ok else 0
        sys.stderr.write(f"\r  {n+1}/{len(terms)}  {term[:26]:26}")
    sys.stderr.write("\r")
    print(f"{len(terms)} colour TERMS, each voted on by up to {per_term} of its own products")
    print(f"  refused          : {refused}")
    print(f"  scored           : {scored}")
    print(f"  exact agreement  : {agree}  {100*agree/max(scored,1):.1f}%")
    for k in ("strong", "weak"):
        a, t = by_margin[k]
        label = ">=60% of >=4 photos agreed" if k == "strong" else "no clear majority"
        print(f"  {k:6} ({label}): {a}/{t}  {100*a/max(t,1):.1f}%")
    print("\ntop disagreements:")
    for k, n in sorted(conf.items(), key=lambda kv: -kv[1])[:12]:
        print(f"  {n:3}  {k}")


def propose(limit, per_term=10):
    """Read every term the classifier could not settle, and write a proposal.

    MEASURED FIRST (--validate-terms, 60 known terms, 2026-08-29):
      per-term agreement              78.3%
      where >=60% of >=4 photos agree 86.0%
      where no clear majority         58.8%

    So a proposal carries its vote, and the review page marks the weak ones
    differently. Nothing here writes data/colour-overrides.json — that file is
    Tina's, and only her export writes it. This produces a SUGGESTION she
    confirms or corrects, which is the whole point: 86% right means one in seven
    still needs a human, and a silent auto-apply would bury those.
    """
    import subprocess
    out = subprocess.run(
        ["npx", "tsx", "-e",
         "import {classifyColour} from './lib/colour';"
         "const p=require('./data/products.json');const g={};"
         "for(const x of p){const v=classifyColour(x.title);"
         "if(v.confidence==='override'||!v.term)continue;"
         "const amb=v.candidates.length>1; if(v.family&&!amb)continue;"
         "(g[v.term]=g[v.term]||{term:v.term,kind:amb?'ambiguous':'unknown',rows:0,urls:[]});"
         "g[v.term].rows++; if(g[v.term].urls.length<10)g[v.term].urls.push(x.image);}"
         "console.log(JSON.stringify(Object.values(g).sort((a,b)=>b.rows-a.rows)))"],
        cwd=APP, capture_output=True, text=True)
    line = [l for l in out.stdout.splitlines() if l.startswith("[")]
    if not line:
        sys.exit("could not collect terms:\n" + out.stderr[-800:])
    terms = json.loads(line[-1])[:limit]

    model, pre, tf, owner, dev = load_model()
    result = []
    for n, g in enumerate(terms):
        urls = g["urls"][:per_term]
        votes, readable = {}, 0
        for i in range(0, len(urls), 16):
            for fam, _sc in read_batch(urls[i:i + 16], model, pre, tf, owner, dev):
                if fam is None:
                    continue
                readable += 1
                votes[fam] = votes.get(fam, 0) + 1
        entry = {"term": g["term"], "kind": g["kind"], "rows": g["rows"], "read": readable}
        if votes:
            top, cnt = max(votes.items(), key=lambda kv: kv[1])
            entry.update(family=top, votes=cnt,
                         strong=bool(cnt / readable >= 0.6 and readable >= 4),
                         tally=sorted(votes.items(), key=lambda kv: -kv[1]))
        result.append(entry)
        sys.stderr.write(f"\r  {n+1}/{len(terms)}  {g['term'][:26]:26}")
    sys.stderr.write("\r")
    (APP / "data" / "colour-proposals.json").write_text(json.dumps(result, indent=1) + "\n")
    strong = sum(1 for r in result if r.get("strong"))
    print(f"{len(result)} terms read · {strong} with a clear majority")
    print("wrote data/colour-proposals.json")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--validate", action="store_true")
    ap.add_argument("--validate-terms", action="store_true")
    ap.add_argument("--propose", action="store_true")
    ap.add_argument("--limit", type=int, default=200)
    a = ap.parse_args()
    if a.validate_terms:
        validate_terms(a.limit)
    elif a.validate:
        validate(a.limit)
    elif a.propose:
        propose(a.limit)
    else:
        print("pass --validate, --validate-terms or --propose")
