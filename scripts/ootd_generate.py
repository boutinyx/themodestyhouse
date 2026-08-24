#!/usr/bin/env python3
"""
OOTD post generator — the working pipeline as of 2026-08-16.

WHAT CHANGED (read docs/tiktok/HANDOFF.md for the full story):
The all-night failure to get real fabric detail was NOT a prompting problem. It was
two hard limits of `text2image_soul_v2`: it caps at 2k and accepts ONE image
reference. One reference means the model cannot be told "this is the face" AND
"this is the garment" separately -- so a single reference hijacks the whole
composition (confirmed twice), and the garment can only ever be *described*, never
transferred.

`nano_banana_flash` (Nano Banana 2) removes both limits: up to 4k (3392x5056 vs
1344x2016 -- 6.3x the pixels) and up to 14 image references. Feeding the REAL brand
product photo as reference 1 and a face anchor as reference 2 reproduces actual knit
stitch structure, weave, buttons and trim, because the fabric is transferred from a
photograph instead of hallucinated from adjectives.

Cost: 1.5 credits vs 0.12 for Soul. ~12x, still cheap. `nano_banana_pro` (the better
variant) requires a Pro/Ultimate plan -- basic plan gets 403 "Pro or Ultimate plan
required". `seedream_v4_5` is the 1-credit alternative (14 refs, no 4k).

Usage:
  ./.venv-style/bin/python scripts/ootd_generate.py \\
      --garment-image public/hero-gen/tiktok/refs/garment-knit-dress.jpg \\
      --garment-desc "cream open-knit maxi shirt dress -- scalloped wave knit texture, \\
                      open-work stitch pattern, flared cuffs, full row of small pearl \\
                      buttons down the centre front" \\
      --hijab-color camel \\
      --scene "a stone step in front of a weathered wooden door on a quiet residential brick street" \\
      --tag knit-door

--face-image defaults to the approved face anchor. Pass --shot-type to change framing.
"""
import argparse
import json
import subprocess
import sys
import urllib.request
from pathlib import Path

APP = Path(__file__).resolve().parent.parent
OUT = APP / "public" / "hero-gen" / "tiktok"
CLI = ["npx", "--yes", "-p", "@higgsfield/cli", "higgsfield"]

# The approved face anchor. Any generation reusing this keeps the character
# recognisable. NOT a true identity lock -- see HANDOFF.md on Soul ID for that.
DEFAULT_FACE = APP / "public" / "hero-gen" / "tiktok" / "face-closeup-test.jpg"

# Positive assertions only. Negations ("no hair visible") do not work -- this model
# family has no negative-prompt channel, so a negation just adds the token "hair".
# Eleven earlier scripts escalated negation wording and the bug survived all of them.
def hijab_block(color):
    return (
        f"She wears a plain {color} hijab with an unbroken opaque fabric edge running "
        f"from temple to temple across her forehead, resting on the forehead skin; "
        f"ears, neck and nape enclosed in one continuous layer of the same {color} "
        f"fabric, one colour, one edge."
    )


CAMERA = (
    "Flat overcast daylight from the left. Shot on iPhone 15 Pro Max main 1x camera, "
    "24mm equivalent, natural iPhone HDR, deep focus, handheld, slightly off-centre "
    "framing. An ordinary, slightly unremarkable phone snapshot. Visible real skin "
    "texture, minimal everyday makeup."
)

SHOT_TYPES = {
    "full-body": "A candid full-body phone photo of one woman in her late twenties, "
                 "medium-slim build, standing still on {scene}. Weight on one hip, "
                 "looking slightly off to the side, calm plain expression.",
    "waist-up": "A candid waist-up phone photo of one woman in her late twenties, "
                "standing on {scene}, turned slightly away, looking off to the side, "
                "calm plain expression.",
    "mirror-selfie": "A mirror selfie phone photo of one woman in her late twenties, "
                     "phone visible in her raised hand, standing at {scene}, slightly "
                     "off-centre amateur framing.",
    "detail-crop": "A close crop phone photo showing the garment detail on one woman "
                   "in her late twenties, standing at {scene}, framed from the "
                   "shoulders to the hip.",
}


def build_prompt(garment_desc, hijab_color, scene, shot_type, has_face_ref):
    face_line = (
        "Her face is the woman from the second reference image. "
        if has_face_ref else ""
    )
    return (
        f"{SHOT_TYPES[shot_type].format(scene=scene)}\n\n"
        f"She is wearing the exact {garment_desc} from the first reference image — "
        f"reproduce its fabric texture, stitch structure, trim and fastenings exactly "
        f"as they appear in that reference. The garment is closed at the front, hem to "
        f"the floor, sleeves ending at the base of the thumb.\n\n"
        f"{face_line}\n"
        f"{hijab_block(hijab_color)}\n\n"
        f"{CAMERA}"
    )


def download(url, dest):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=300) as r:
        dest.write_bytes(r.read())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--garment-image", required=True, help="local path or URL of the real product photo")
    ap.add_argument("--garment-desc", required=True)
    ap.add_argument("--hijab-color", required=True)
    ap.add_argument("--scene", required=True)
    ap.add_argument("--face-image", default=str(DEFAULT_FACE))
    ap.add_argument("--shot-type", default="full-body", choices=list(SHOT_TYPES))
    ap.add_argument("--aspect-ratio", default="2:3")
    ap.add_argument("--resolution", default="4k", choices=["1k", "2k", "4k"])
    ap.add_argument("--model", default="nano_banana_flash",
                    help="nano_banana_flash (4k, 1.5cr) | seedream_v4_5 (14 refs, 1cr) | "
                         "nano_banana_pro (needs Pro plan)")
    ap.add_argument("--tag", required=True)
    args = ap.parse_args()

    face = Path(args.face_image)
    has_face = face.exists()
    if not has_face:
        print(f"! face anchor not found at {face} — generating without it "
              f"(character will not be consistent)", flush=True)

    prompt = build_prompt(args.garment_desc, args.hijab_color, args.scene,
                          args.shot_type, has_face)
    print(f"Prompt:\n{prompt}\n", flush=True)

    cmd = CLI + ["generate", "create", args.model,
                 "--prompt", prompt,
                 "--image-references", args.garment_image]
    if has_face:
        cmd += ["--image-references", str(face)]
    cmd += ["--aspect_ratio", args.aspect_ratio]
    if args.model != "seedream_v4_5":
        cmd += ["--resolution", args.resolution]
    cmd += ["--wait", "--wait-timeout", "5m"]

    print(f"Generating via {args.model} at {args.resolution}…", flush=True)
    proc = subprocess.run(cmd, capture_output=True, text=True)
    url = proc.stdout.strip().splitlines()[-1] if proc.stdout.strip() else ""
    if proc.returncode != 0 or not url.startswith("http"):
        print(f"! failed: {proc.stderr.strip() or proc.stdout.strip()}", flush=True)
        sys.exit(1)

    OUT.mkdir(parents=True, exist_ok=True)
    dest = OUT / f"{args.tag}.png"
    download(url, dest)
    print(f"Saved {dest.relative_to(APP)}", flush=True)
    (OUT / f"{args.tag}.json").write_text(json.dumps(
        {"prompt": prompt, "url": url, "model": args.model,
         "resolution": args.resolution, "garment_image": args.garment_image,
         "face_image": str(face) if has_face else None}, indent=2))

    print("\nQA before publishing — zoom in and check all five:", flush=True)
    print("  1. background text/signage (top AI tell)", flush=True)
    print("  2. hijab edge at hairline, temples, ears — no hair, no underscarf band", flush=True)
    print("  3. hands", flush=True)
    print("  4. shadow direction consistent, one light source", flush=True)
    print("  5. garment matches the real product photo (this is the affiliate claim)", flush=True)


if __name__ == "__main__":
    main()
