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
    key = env.get("HIGGSFIELD_API_KEY2") or env.get("HIGGSFIELD_API_KEY")
    secret = env.get("HIGGSFIELD_API_SECRET2") or env.get("HIGGSFIELD_API_SECRET")
    if not key or not secret:
        sys.exit("Missing HIGGSFIELD_API_KEY2 / HIGGSFIELD_API_SECRET2 in .env")
    # the SDK reads these from the environment
    os.environ["HF_API_KEY"] = key
    os.environ["HF_API_SECRET"] = secret
    os.environ["HF_KEY"] = f"{key}:{secret}"

# Batch 9 (2026-08-20): new homepage hero direction. Tina's brief, verbatim intent —
# the existing hero (single moody crop, batch 5-8) reads as "too editorial" and doesn't
# "lure the viewer in" or show what the site does at a glance. Reference she supplied is
# a group of 3 women in a white-column boutique, phones raised over their faces
# (mirror-selfie pose), iced drinks + designer bags, warm neutral silk abayas with gold
# lace trim — an immediately legible "shopping/lifestyle" scene, not a solo portrait.
# Adapted for the brand: 2-3 women (not always 3 — a duo reads cleaner at hero width),
# same phone-covering-face pose (also sidesteps needing one consistent AI face across
# every generation), on-brand aubergine/plum/brass palette instead of the reference's
# mauve-pink-cream, same white marble boutique-interior energy. Per
# dont-reuse-y2k-prompt-scaffold: fresh prompts for this new ask, not inherited
# jewel-crop constraints from batch 5-8.
STYLE = ("elegant editorial modest-fashion campaign photography, rich on-brand aubergine, plum and warm gold "
         "tones, an airy white-marble boutique interior with fluted columns and soft directional daylight, "
         "shot on film, aspirational and chic, no text, no writing, no signage, no logos, no watermark")

CONCEPTS = [
    ("duo-select", "Two stylish hijabi women in flowing silk abayas — one deep aubergine, one dusty plum — with "
                    "gold-embroidered hijab trim, standing close together in a sunlit white-column boutique, "
                    "each holding her phone raised to capture a mirror selfie so her face is gently hidden "
                    "behind it, one carrying a small structured aubergine leather handbag with gold hardware, "
                    "soft gold jewelry at the wrist, " + STYLE),
    ("trio-hall", "Three hijabi women shoulder to shoulder in coordinated silk abayas in aubergine, plum and "
                   "champagne gold, gold-trimmed draped hijabs, each with her phone held up over her face as if "
                   "mid mirror-selfie, one holding an iced coffee, standing in a grand white-marble boutique hall "
                   "with tall columns, " + STYLE),
    ("duo-atelier", "Two hijabi women in aubergine and gold-trimmed silk abayas, phones raised to take a mirror "
                     "selfie together, faces softly obscured by the phones, standing in a modest-fashion atelier "
                     "with a softly blurred rack of jewel-toned garments behind them, warm cinematic light, " + STYLE),
    ("trio-walk", "Three hijabi women mid-stride through a sunlit white-marble boutique corridor, wearing "
                   "coordinated aubergine, dusty plum and champagne-gold abayas with draped hijabs, one lifting "
                   "her phone to film as she walks, soft motion blur at the frame edges, gold jewelry catching "
                   "the light, " + STYLE),
    ("duo-crop", "Close editorial waist-up crop of two hijabi women in aubergine and gold-trimmed silk abayas, "
                  "phones raised over their faces in a mirror-selfie pose, one holding a small aubergine leather "
                  "bag with visible gold hardware, soft romantic daylight, tonal aubergine-and-plum backdrop, " + STYLE),
]

# Batch 10 (2026-08-20, same day, second round): Tina's follow-up on batch 9 — she wants
# sunglasses back (the identity/style device from the OLD batch 5-8 hero, which she liked
# on its own terms — her complaint there was that a SOLO moody portrait doesn't "lure the
# viewer in", not that sunglasses were wrong), the pose does not have to be the
# phone-selfie any more ("it doesnt only have to be using their phones it could also be
# something editorial else"), and explicitly "dont make it too busy" — batch 9's
# multi-prop trio shots (phone + bag + coffee + jewelry all at once) were read as
# cluttered. So: sunglasses on every concept, solo OR duo (no trios this round), one
# simple pose/gesture each, plain uncluttered backdrops, at most one small prop (never
# stacked). Fresh prompts per dont-reuse-y2k-prompt-scaffold — not the batch-9 phone/bag
# scaffold carried forward.
STYLE_10 = ("elegant editorial modest-fashion campaign photography, chic sunglasses, rich on-brand aubergine, "
            "plum and warm gold tones, soft directional daylight, shot on film, aspirational, clean and "
            "uncluttered composition, minimal props, no text, no writing, no signage, no logos, no watermark")

CONCEPTS_10 = [
    ("solo-walk", "A stylish hijabi woman in a deep aubergine silk abaya and gold-trimmed draped hijab, elegant "
                   "sunglasses, walking with quiet confidence through a sunlit white-marble colonnade, one hand "
                   "loosely at her side, plain uncluttered corridor behind her, " + STYLE_10),
    ("duo-laugh", "Two hijabi women in aubergine and dusty plum silk abayas with gold-trimmed hijabs, both in "
                   "elegant sunglasses, caught mid-laugh walking side by side, plain sunlit marble backdrop, no "
                   "other props, " + STYLE_10),
    ("solo-profile", "Editorial profile portrait of a hijabi woman in a plum silk abaya, gold-trimmed draped "
                      "hijab, elegant sunglasses, one hand lightly resting at the edge of her hijab, plain soft "
                      "aubergine-toned backdrop, no props, " + STYLE_10),
    ("duo-armin", "Two hijabi women in aubergine and champagne-gold silk abayas, gold-trimmed hijabs, elegant "
                   "sunglasses, walking arm in arm with calm soft smiles, plain white-column hallway behind "
                   "them, no bags or props, " + STYLE_10),
    ("solo-lean", "A hijabi woman in a deep aubergine silk abaya and draped gold-trimmed hijab, elegant "
                   "sunglasses, leaning gently against a fluted white column with a soft smile, plain "
                   "uncluttered background, " + STYLE_10),
    ("duo-glance", "Two hijabi women in plum and aubergine silk abayas with gold-trimmed hijabs, elegant "
                    "sunglasses, walking away from camera down a sunlit marble corridor and glancing back over "
                    "one shoulder, plain background, no props, " + STYLE_10),
    ("solo-seated", "A hijabi woman in a champagne-gold silk abaya and gold-trimmed draped hijab, elegant "
                     "sunglasses, seated gracefully on a plain marble bench, hands relaxed in her lap, soft "
                     "uncluttered white-column background, " + STYLE_10),
    ("duo-doorway", "Two hijabi women in aubergine and plum silk abayas with gold-trimmed hijabs, elegant "
                     "sunglasses, stepping together through a plain arched white doorway into soft daylight, no "
                     "props, " + STYLE_10),
    ("solo-crop", "Close editorial bust-up crop of a hijabi woman in a deep aubergine silk abaya, gold-trimmed "
                   "hijab, elegant sunglasses, chin gently lifted, plain solid aubergine backdrop, no props, "
                   "graphic and minimal, " + STYLE_10),
    ("duo-crop2", "Close editorial shoulder-to-shoulder crop of two hijabi women in aubergine and plum silk "
                   "abayas, gold-trimmed hijabs, both in elegant sunglasses, calm expressions, plain solid plum "
                   "backdrop, no props, graphic and minimal, " + STYLE_10),
]

# Batch 11 (2026-08-20, same day, third round): "lets not do the glasses" — batch 10 minus
# sunglasses, otherwise held constant. Deliberately NOT a fresh concept set: the poses,
# framing, and "not too busy" brief in batch 10 tested well, so this isolates the one
# variable she called out (sunglasses) instead of re-rolling everything, which would make
# it impossible to tell whether a difference in the results comes from the pose or from
# the accessory. Faces are open/visible instead — same soft daylight, same on-brand
# aubergine/plum/gold, same one-gesture-plain-backdrop rule.
STYLE_11 = ("elegant editorial modest-fashion campaign photography, rich on-brand aubergine, plum and warm "
            "gold tones, soft directional daylight, shot on film, aspirational, clean and uncluttered "
            "composition, minimal props, no sunglasses, no text, no writing, no signage, no logos, no watermark")

CONCEPTS_11 = [
    ("solo-walk", "A stylish hijabi woman in a deep aubergine silk abaya and gold-trimmed draped hijab, calm "
                   "open expression, walking with quiet confidence through a sunlit white-marble colonnade, one "
                   "hand loosely at her side, plain uncluttered corridor behind her, " + STYLE_11),
    ("duo-laugh", "Two hijabi women in aubergine and dusty plum silk abayas with gold-trimmed hijabs, faces "
                   "open, caught mid-laugh walking side by side, plain sunlit marble backdrop, no other props, "
                   + STYLE_11),
    ("solo-profile", "Editorial profile portrait of a hijabi woman in a plum silk abaya, gold-trimmed draped "
                      "hijab, calm open expression, one hand lightly resting at the edge of her hijab, plain "
                      "soft aubergine-toned backdrop, no props, " + STYLE_11),
    ("duo-armin", "Two hijabi women in aubergine and champagne-gold silk abayas, gold-trimmed hijabs, faces "
                   "open, walking arm in arm with calm soft smiles, plain white-column hallway behind them, no "
                   "bags or props, " + STYLE_11),
    ("solo-lean", "A hijabi woman in a deep aubergine silk abaya and draped gold-trimmed hijab, faces open, "
                   "leaning gently against a fluted white column with a soft smile, plain uncluttered "
                   "background, " + STYLE_11),
    ("duo-glance", "Two hijabi women in plum and aubergine silk abayas with gold-trimmed hijabs, faces open, "
                    "walking away from camera down a sunlit marble corridor and glancing back over one shoulder, "
                    "plain background, no props, " + STYLE_11),
    ("solo-seated", "A hijabi woman in a champagne-gold silk abaya and gold-trimmed draped hijab, calm open "
                     "expression, seated gracefully on a plain marble bench, hands relaxed in her lap, soft "
                     "uncluttered white-column background, " + STYLE_11),
    ("duo-doorway", "Two hijabi women in aubergine and plum silk abayas with gold-trimmed hijabs, faces open, "
                     "stepping together through a plain arched white doorway into soft daylight, no props, "
                     + STYLE_11),
    ("solo-crop", "Close editorial bust-up crop of a hijabi woman in a deep aubergine silk abaya, gold-trimmed "
                   "hijab, calm open expression, chin gently lifted, plain solid aubergine backdrop, no props, "
                   "graphic and minimal, " + STYLE_11),
    ("duo-crop2", "Close editorial shoulder-to-shoulder crop of two hijabi women in aubergine and plum silk "
                   "abayas, gold-trimmed hijabs, faces open, calm expressions, plain solid plum backdrop, no "
                   "props, graphic and minimal, " + STYLE_11),
]


def download(url, dest):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        dest.write_bytes(r.read())


# Batch 12 (2026-08-24): the /edits/everyday-lace COVER, not a homepage hero. Different
# brief from every batch above, so fresh prompts rather than the batch-11 colonnade
# scaffold (per dont-reuse-y2k-prompt-scaffold). Tina: the hero "needs to be editorial, but
# it needs to be willing to click on it because it grabs attention. It should show
# immediately that we're talking about lace."
#
# THE HARD PART IS SCALE, NOT STYLING. Lace photographed at full-body distance is just
# texture you cannot name — it reads as printed pattern. So every concept here is framed
# CLOSE, and two of the three are lit so light passes THROUGH the holes in the lace. That
# is the one lighting choice that makes lace legible as lace. It is also the mitigation for
# the flat-fabric failure this model has on cloth at low resolution (see the OOTD note in
# memory): if the lace fills the frame, 1080p is enough pixels to resolve the weave.
#
# MODESTY: lace is semi-sheer by nature, so every prompt states the lace sits over an
# OPAQUE underlayer. Without that this model will happily render lace against bare skin.
#
# Concepts 2 and 3 are Tina's own styling rules from the edit's copy, made visual —
# contrast (black lace on white reads instantly, black on black disappears) and denim
# (soft against hard). Concept 1 is the pure texture shot.
STYLE_12 = ("elegant editorial modest-fashion campaign photography, warm parchment and cream tones with deep "
            "aubergine accents, soft directional daylight, shot on 85mm film, shallow depth of field, real "
            "fabric texture, natural skin, clean uncluttered composition, aspirational and quiet, "
            "no text, no writing, no signage, no logos, no watermark")

CONCEPTS_12 = [
    ("lace-backlit", "Close editorial crop, chest and shoulders only, of a hijabi woman in a cream lace blouse "
                      "worn over an opaque cream underlayer, a wide scalloped lace border running across the "
                      "collarbone. Backlit from behind so daylight passes through the open holes of the lace and "
                      "throws a faint lace pattern onto the fabric beneath. The lace fills much of the frame and "
                      "its individual threads and open weave are unmistakable. Plain warm parchment wall far out "
                      "of focus behind her. Modest, fully covered, draped hijab, no visible hair, " + STYLE_12),
    ("lace-contrast", "Editorial waist-up crop of a hijabi woman in a black lace top worn over an opaque black "
                       "underlayer, standing against a plain bright cream-white backdrop, with crisp white "
                       "wide-leg trousers below. Maximum contrast between the black lace and the white around it "
                       "so the lace pattern reads instantly and graphically. Black draped hijab, fully covered, "
                       "no visible hair. Graphic, minimal, high-impact, " + STYLE_12),
    ("lace-denim", "Editorial three-quarter crop of a hijabi woman wearing a cream lace top over an opaque "
                    "underlayer, layered under a rigid structured indigo denim jacket worn open, so the soft "
                    "open lace sits directly against the hard square-shouldered denim. Warm neutral hijab, fully "
                    "covered, no visible hair. Plain warm parchment background. The contrast of soft against "
                    "hard is the subject, " + STYLE_12),
]

# Batch 13 (2026-08-24): batch 12 was rejected — "too editorial i do want a bit playful".
# So this holds the two things that WORKED in 12 (lace legible at close range; the
# contrast rule doing the visual work) and changes the register: movement, daylight,
# real places, candid warmth instead of a still studio backdrop.
#
# TWO DEFECTS FROM BATCH 12 ARE FIXED HERE, not left to luck:
#   1. Concept 63 rendered a bare upper back and neck. The prompt said "fully covered, no
#      visible hair" and that was not enough — it never forbade bare skin, so a back-facing
#      pose produced it. COVERAGE below states it explicitly. On a modest directory this is
#      a correctness bug, not a taste one.
#   2. All three of batch 12 filled the centre of the frame, so the "Everyday Lace" title
#      would have landed on the model. Every concept here places the subject to one side
#      and names the empty side, because the title is centred over the photograph.
COVERAGE = ("modest and fully covered — long sleeves to the wrist, high neckline, draped hijab with no "
            "visible hair, no bare back, no bare neck, no bare arms, no bare legs, lace always layered "
            "over an opaque underlayer and never against skin")

STYLE_13 = ("playful editorial modest-fashion photography, warm natural sunlight, candid and joyful, gentle "
            "movement, real place rather than a studio, warm parchment cream and soft aubergine tones, shot "
            "on 50mm film, real fabric texture, no text, no writing, no signage, no logos, no watermark")

CONCEPTS_13 = [
    ("lace-twirl", "A hijabi woman laughing mid-turn in a cream lace blouse with wide scalloped lace sleeves, "
                    "the lace sleeve caught in motion and flaring out so sunlight passes through the open holes "
                    "of the lace. She stands to the LEFT of the frame; the right half is a plain sunlit warm "
                    "wall with nothing in it. Late afternoon golden light, soft motion, genuine smile. "
                    + COVERAGE + ", " + STYLE_13),
    ("lace-steps", "A hijabi woman sitting relaxed on warm stone steps in bright daylight, wearing a black lace "
                    "top over an opaque black underlayer with crisp white wide-leg trousers, one hand resting "
                    "on the step, mid-laugh looking off to the side. The black lace reads sharply against the "
                    "pale stone and white trousers. She sits to the RIGHT of the frame; the left half is empty "
                    "sunlit stone. " + COVERAGE + ", " + STYLE_13),
    ("lace-duo", "Two hijabi friends walking together down a sunlit street, both mid-laugh, one in a cream lace "
                  "blouse over an opaque underlayer with indigo denim, the other in a black lace top with cream "
                  "trousers. Easy natural stride, hands gesturing as they talk. The pair sits to the LEFT of "
                  "frame with open sunlit pavement and plain wall to the right. Warm, social, unposed. "
                  + COVERAGE + ", " + STYLE_13),
]

# Each batch keeps its own CONCEPTS list + starting filename index (see the comment
# above each batch for why). Add a new tuple here — (concepts_list, filename_start_index)
# — for every new batch rather than overwriting an old one, so `--batch N` always
# reproduces exactly what shipped that day.
BATCHES = {
    9: (CONCEPTS, 38),
    10: (CONCEPTS_10, 43),
    11: (CONCEPTS_11, 53),
    12: (CONCEPTS_12, 63),
    13: (CONCEPTS_13, 66),
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ratio", default="16:9")
    ap.add_argument("--res", default="720p")
    ap.add_argument("--batch", type=int, default=max(BATCHES), help="which CONCEPTS batch to run")
    ap.add_argument("--only", default="", help="comma-separated 1-based concept numbers")
    args = ap.parse_args()

    load_env()
    import higgsfield_client

    OUT.mkdir(parents=True, exist_ok=True)
    concepts, start = BATCHES[args.batch]
    pick = {int(x) for x in args.only.split(",") if x.strip()} if args.only else None
    tag = args.ratio.replace(":", "x")
    results = []

    for i, (name, prompt) in enumerate(concepts, start=start):
        if pick and i not in pick:
            continue
        print(f"[{i}/{len(concepts)}] {name} ({args.ratio}, {args.res}) — generating…", flush=True)
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

    (OUT / f"results-{tag}-{args.res}-b{args.batch}.json").write_text(json.dumps(results, indent=2))
    ok = sum(1 for r in results if r.get("file"))
    print(f"\nDone. {ok}/{len(results)} saved to {OUT.relative_to(APP)}/", flush=True)


if __name__ == "__main__":
    main()
