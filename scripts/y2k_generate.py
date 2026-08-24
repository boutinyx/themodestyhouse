#!/usr/bin/env python3
"""
Generate real hijabi OOTD / street-style outfit photos via the official `higgsfield`
CLI -- text2image_soul_v2, NO identity lock (no custom_reference_id). No trained
character -- every generation is a fresh face, per Tina's "fuck the character for
now" direction (2026-08-14).

METHODOLOGY CHANGE 2026-08-14 (3rd revision, the real reset): Tina sent 13 real
hijabi OOTD/street-style reference photos and said to start over. They are NOT
Y2K club wear and NOT paparazzi tabloid flash shots -- that framing from the first
two revisions was wrong. What they actually are: genuine layered outfits (kimono/
duster jackets, cardigans, ponchos/capes, belted oversized jackets, tie-neck
blouses, ruffled tops) over wide-leg trousers, jeans, or maxi/midi skirts, in a
muted/earthy palette (browns, olives, taupe, cream, dusty pink) usually with ONE
statement piece (a pattern, a color, a texture) rather than an all-over "maximalist"
look. Shot in natural daylight at real city locations (streets, canals, stone steps,
parking lots, ornate doorways) -- roughly half candid street-style (photographed by
someone else, not always looking at camera) and half mirror selfies (phone visible,
real bedroom/fitting-room/bathroom). See --shot-type below.

Coverage mechanism (unchanged from the 2nd revision, still correct): no invisible
hidden base layer. The --outfit argument must fully specify real, VISIBLE coverage
garments -- a turtleneck, a cardigan, trousers worn under a skirt -- per
LAYERING_RULES below, exactly like Tina's own "Layering Toolkit" reference doc. This
is what actually fixed most of the coverage failures from the whole history of this
series (docs/log/2026-08-14-y2k-root-cause-and-fix.md) -- rendering an implied unseen
layer was a genuinely hard generative task; rendering a real described garment is not.

Aspect ratio: back to 2:3 (Tina tried 16:9 for a wider candid frame, but the model
rotated the whole photo sideways to fit a standing figure into a landscape canvas --
a real, reproducible failure, not fixed, reverted same session).

Usage:
  ./.venv-style/bin/python scripts/y2k_generate.py \\
      --outfit "an olive oversized structured wool jacket, belted at the waist with a \\
                brown leather buckle belt, worn over a plain black turtleneck, a \\
                matching olive satin midi skirt (below the knee, full leg coverage \\
                below with sheer black tights), silver metallic ankle boots, brown \\
                leather gloves" \\
      --hijab-color "olive" \\
      --shot-type candid \\
      --scene "standing beside an ornate black iron railing outside a stone building, \\
               looking off to the side, sunglasses in hand" \\
      --count 1 \\
      --tag streetstyle-olive
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from fina_generate import (  # noqa: E402
    FILM_LOOK,
    SETTING_INDEPENDENT,
    FLASH_LIGHTING,
    DAYLIGHT_LIGHTING,
    download,
    CLI,
)

LAYERING_RULES = (
    "Render exactly the coverage pieces described in the outfit -- arms to the "
    "wrists, legs fully covered, chest and neckline closed, every fabric opaque, "
    "elegant proportions, never bulky or costume-like. Any top layer (blouse, "
    "sweater, cardigan) falls to AT LEAST hip length, ending a few inches past her "
    "hip line -- never a cropped top that stops at the waist. This fully covers the "
    "top of the trousers/skirt underneath so no seam, waistband, or outline from "
    "what's underneath is visible through or around the top."
)

# hijab_note is deliberately NOT imported from fina_generate.py -- different drape for
# this series. Corrected 2026-08-14: Tina's first correction (symmetric, both ends on
# both shoulders) was wrong -- her actual reference is an ASYMMETRIC one-shoulder
# drape (a black fringed hijab swept dramatically over ONE shoulder like a stole, the
# other side staying close to the neck). See hijab_note() below.

# SKIN_MAKEUP is deliberately NOT imported from fina_generate.py either -- Tina said
# the results read as too "modelish" (posed, heavy glam, sultry expression) vs. her
# reference, which is a normal-looking candid paparazzi photo of a real person with a
# genuine warm smile and natural makeup. See NATURAL_LOOK below.

# GARMENT_DETAIL is deliberately NOT imported/used here -- confirmed via a controlled
# single-variable test (2026-08-14, docs/log/2026-08-14-y2k-root-cause-and-fix.md) that
# its "render embroidery/beading/fabric texture/sheen/trim precisely" instruction
# competes with the background/scene instructions for the model's attention and causes
# the described setting to collapse to a flat studio backdrop. Dropping it, with no
# other change, restored full scene rendering. Do not re-add it to this script.

APP = Path(__file__).resolve().parent.parent
OUT = APP / "public" / "hero-gen" / "y2k"

# Text-only fallback anchor from docs/fina/character.md -- same brand demographic,
# no identity lock, no Fina-only dark-brown-eyes override.
GENERIC_IDENTITY = (
    "a young Middle Eastern/South Asian woman, mid-20s, oval face, defined "
    "straight-to-arched dark brows, hazel-olive eyes, straight nose, full lips, warm "
    "medium olive skin tone with a natural sheen, slim build with a subtle hourglass "
    "shape -- a little bit of hip curve, not exaggerated, B-cup bust."
)


def hijab_note(color):
    return (
        f"Wearing a {color} hijab, soft jersey or chiffon fabric that drapes smoothly "
        f"and loosely over the rounded top of her head -- NO pointed peak, NO cone "
        f"shape, no sharp point anywhere on top of her head; the fabric follows the "
        f"natural round shape of her head with soft loose folds. The excess fabric "
        f"sweeps over ONE shoulder only, cascading down and covering that shoulder and "
        f"upper arm; the other side stays close near her neck. The fabric covers the "
        f"ENTIRE top of her head and her whole forehead hairline with total coverage "
        f"and zero gaps -- check specifically the top-center of her head where the "
        f"hijab begins: there must be NO sliver, triangle, or wisp of hair visible "
        f"there or anywhere else. Not even a few strands. One continuous piece of "
        f"fabric, no separate underscarf band showing beneath it. Hair, hairline, and "
        f"ears fully covered, with no exceptions."
    )

STREET_STYLE_NOTE = (
    "Real hijabi fashion/OOTD content like Instagram or Pinterest, not a tabloid "
    "flash photo, not a studio editorial."
)

POSE_CANDID = (
    "Candid, taken by someone else -- standing or walking, weight on one hip, "
    "looking off to the side rather than straight at the camera. Natural relaxed "
    "expression, not a stiff high-fashion stare."
)

POSE_SELFIE = (
    "A mirror selfie -- phone visible in her raised hand, standing naturally in a "
    "real bedroom, fitting room, or bathroom with a visible mirror edge. Natural, "
    "slightly self-aware expression."
)

NATURAL_LOOK = (
    "Skin looks natural, not airbrushed -- visible texture, light sheen. Minimal "
    "everyday makeup, not heavy glam. Reads as a normal real woman, not a model."
)

# DISTANCE_LEAD history, 2026-08-14: an earlier, more extreme version of this
# ("many meters back", "small fraction of the frame's height") pushed 3 real-location
# candid shots back into extreme close-ups instead -- confirmed on 3 separate
# generations of the same simple outfit/scene, a real tension in the model between
# "render the environment in detail" and "keep her small/far away", not a wording
# bug. Tina's call: accept a MODERATE middle ground -- clearly further back than the
# original tight crops, but not fighting the background. Still stated as the first
# sentence of the prompt (placement mattered even at moderate strength -- see
# build_prompt), just with softer, achievable wording.
DISTANCE_LEAD = (
    "Framing: pull the camera back further than a typical close portrait -- a few "
    "full steps further back, so her whole body is comfortably in frame with some "
    "visible space above her head, and the real location around her is still clearly "
    "visible in detail. Not an extreme close-up, but not a tiny distant figure either "
    "-- a natural, moderate street-style distance."
)

FRAMING_CANDID = (
    "ONE photograph only, never a diptych or multiple crops. The real location around "
    "her is clearly visible and fills most of the image -- a photo of a place with her "
    "in it. Never a plain studio backdrop."
)

FRAMING_SELFIE = (
    "A mirror selfie, phone held around chest height (not raised high/looking down), "
    "slightly imperfect and off-center like a real photo, not professionally composed. "
    "Much of the real room is visible around the mirror's edges."
)

# LEG_COVERAGE_NOTE / OPACITY_NOTE / VOID_NOTE were tried and dropped 2026-08-14 -- see
# docs/log/2026-08-14-y2k-root-cause-and-fix.md. They didn't measurably reduce coverage
# failures (the model doesn't reliably follow single-shot coverage instructions on
# fitted/going-out outfits regardless of wording -- confirmed via 7 controlled tests),
# and their added length measurably suppressed scene/background rendering on top of
# that. Coverage compliance is now guaranteed by the mandatory second pass,
# scripts/y2k_fix_coverage.py, not by prompt bulk. Keep this prompt SHORT -- every
# generation MUST be followed by that edit pass, no exceptions, since single-shot
# output here is not reliable enough to skip it.


def build_prompt(outfit, hijab_color, scene_text, lighting, shot_type):
    lighting_block = FLASH_LIGHTING if lighting == "flash" else DAYLIGHT_LIGHTING
    pose = POSE_SELFIE if shot_type == "selfie" else POSE_CANDID
    framing = FRAMING_SELFIE if shot_type == "selfie" else FRAMING_CANDID
    return (
        f"{DISTANCE_LEAD} "
        f"Ultra-realistic photograph of {GENERIC_IDENTITY} "
        f"{hijab_note(hijab_color)} "
        f"The outfit: {outfit}. "
        f"{LAYERING_RULES} "
        f"{STREET_STYLE_NOTE} {pose} "
        f"Setting: {scene_text} {SETTING_INDEPENDENT} {framing} "
        f"{lighting_block} {FILM_LOOK} "
        f"{NATURAL_LOOK} "
        f"No text, no watermark, no logos."
    )


def resolve_lighting(scene_text, lighting_arg):
    if lighting_arg != "auto":
        return lighting_arg
    # Default is daylight -- none of Tina's 13 reference photos were night/flash shots,
    # unlike the earlier (wrong) paparazzi-event framing. Still auto-detects an
    # explicit night scene if one is asked for.
    return "flash" if any(
        w in scene_text.lower() for w in ("night", "evening", "candle", "dusk", "flash")
    ) else "daylight"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--outfit", required=True)
    ap.add_argument("--hijab-color", required=True)
    ap.add_argument("--scene", required=True, help="free-text setting description")
    ap.add_argument("--shot-type", default="candid", choices=["candid", "selfie"])
    ap.add_argument("--lighting", default="auto", choices=["auto", "daylight", "flash"])
    ap.add_argument("--count", type=int, default=1)
    ap.add_argument("--aspect-ratio", default="2:3")
    ap.add_argument("--quality", default="2k", choices=["1.5k", "2k"])
    ap.add_argument("--tag", required=True, help="filename tag for this run")
    args = ap.parse_args()

    lighting = resolve_lighting(args.scene, args.lighting)
    prompt = build_prompt(args.outfit, args.hijab_color, args.scene, lighting, args.shot_type)

    OUT.mkdir(parents=True, exist_ok=True)
    print(f"Scene: {args.scene}\nLighting: {lighting}\n")
    print(f"Prompt:\n{prompt}\n", flush=True)

    results = []
    for i in range(1, args.count + 1):
        print(f"[{i}/{args.count}] generating…", flush=True)
        cmd = CLI + [
            "generate", "create", "text2image_soul_v2",
            "--prompt", prompt,
            "--aspect_ratio", args.aspect_ratio,
            "--quality", args.quality,
            "--wait", "--wait-timeout", "3m",
        ]
        proc = subprocess.run(cmd, capture_output=True, text=True)
        url = proc.stdout.strip().splitlines()[-1] if proc.stdout.strip() else ""
        if proc.returncode != 0 or not url.startswith("http"):
            print(f"    ! failed: {proc.stderr.strip() or proc.stdout.strip()}", flush=True)
            results.append({"i": i, "error": proc.stderr.strip() or proc.stdout.strip()})
            continue
        ext = ".png" if url.endswith(".png") else ".jpg"
        dest = OUT / f"{args.tag}-{i}{ext}"
        try:
            download(url, dest)
            print(f"    ✓ saved {dest.relative_to(APP)}", flush=True)
            results.append({"i": i, "file": str(dest), "url": url})
        except Exception as e:
            print(f"    ! download failed: {e} ({url})", flush=True)
            results.append({"i": i, "url": url, "error": str(e)})

    (OUT / f"{args.tag}-results.json").write_text(
        json.dumps({"prompt": prompt, "results": results}, indent=2)
    )
    ok = sum(1 for r in results if r.get("file"))
    print(f"\nDone. {ok}/{args.count} saved to {OUT.relative_to(APP)}/", flush=True)
    if ok == 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
