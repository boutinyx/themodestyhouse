#!/usr/bin/env python3
"""
Generate a Fina (Pinterest outfit-inspo) post via the official `higgsfield` CLI
(OAuth-authenticated) -- text2image_soul_v2, identity-locked to her trained Soul ID.

Why the CLI and not the Python SDK: the SDK's static API_KEY/SECRET pair cannot see
Soul IDs trained on the account (character_not_found) -- confirmed via `higgsfield
soul-id list` showing the same ID instantly once OAuth-authenticated. See
docs/fina/pipeline.md for the full story.

First-time setup (once per machine): npx --yes -p @higgsfield/cli higgsfield auth login
                                      npx --yes -p @higgsfield/cli higgsfield workspace set <id>

Usage:
  ./.venv-style/bin/python scripts/fina_generate.py \\
      --outfit "brown leather jacket, beige turtleneck, white ruffled satin skirt, black heels and bag" \\
      --hijab-color "beige" \\
      --scene cafe \\
      --lighting daylight \\
      --count 2

--scene accepts a key from SCENES (cafe, cinema) or any free-text scene description.
--lighting: daylight | flash | auto (default: auto -> inferred from the scene key, falls
  back to daylight for free-text scenes unless the text mentions night/evening/candle).
"""
import argparse
import json
import subprocess
import sys
import urllib.request
from pathlib import Path

APP = Path(__file__).resolve().parent.parent
OUT = APP / "public" / "hero-gen" / "fina"

CUSTOM_REFERENCE_ID = "712ea516-8fb9-4a7a-ac16-f67e45aae9c5"  # "Serene Guardian"

FINA_IDENTITY = (
    "Fina, the exact same woman as the reference character -- do not alter her identity, "
    "facial features, skin tone, or body proportions, except her eyes are dark brown "
    "(not hazel/olive). Slim build with a subtle hourglass shape, a little bit of hip "
    "curve, not exaggerated, B-cup bust."
)

FILM_LOOK = (
    "Slight lens falloff on the busy, detailed background (not tack-sharp, not abstracted "
    "into blur either). Subtle film grain, slightly imperfect warm color grade."
)

SKIN_MAKEUP = (
    "Skin always glowy and dewy, natural luminous sheen, never matte or flat. Realistic "
    "skin texture with visible pores and subtle natural imperfections -- not airbrushed, "
    "not smoothed, not plastic/CGI-looking. Soft natural glam makeup -- cheeks a warm "
    "natural rose flush, the same rose tone family as the lipstick so cheeks and lips read "
    "as one matching warm-rose palette. Mascara with clearly defined, separated lashes. "
    "Subtle glossy/dewy lip finish. Minimal beyond that -- no heavy contour, no bold "
    "graphic eyeshadow."
)

BODYSUIT_NOTE = (
    "Underneath the outfit, as a base layer, she wears an OPAQUE fitted long-sleeve "
    "mock-neck bodysuit in a solid nude/light-tan shade close to her skin tone -- high "
    "coverage, like a plain jersey turtleneck bodysuit, not a low-cut one. It rises all the "
    "way to a high mock-neck collar at the base of her throat. Wherever the outer garment "
    "has a low neckline, V, wrap opening, or gap, what you actually see filling that space "
    "is this solid opaque bodysuit fabric up to its high mock-neck -- never her actual bare "
    "chest, cleavage, or torso skin. The bodysuit is a real, clearly visible clothing layer, "
    "not a translucent or skin-colored illusion."
)

AWRAH_LAYER_NOTE = (
    "Conditional rule: IF the described top is cropped or short enough that the gap "
    "between it and the bottoms could expose her groin/pelvic area, THEN she is also "
    "wearing a tight, fitted, short mini-layer (like a fitted mini-skirt or bike-short "
    "style piece) underneath that gap -- as short as possible while still fully covering "
    "that area, not longer. IF the top is a normal/longer length with no such gap, this "
    "layer does not apply and is not shown."
)

POSE = (
    "Candid stance, weight on one hip, not centered/symmetrical, hands doing different "
    "things (not mirrored). Small natural smile, caught mid-moment, not posed."
)

FRAMING = (
    "Within this exact setting, the camera is positioned further back than a tight "
    "portrait crop -- a wider candid framing that shows more of her full body and this "
    "specific location around her (never a plain wall or studio backdrop), like a casual "
    "snapshot a friend took from a few steps away. Slightly imperfect, not perfectly "
    "centered or studio-composed -- an amateur candid photo feel, not a posed close-in "
    "fashion editorial crop."
)

GARMENT_DETAIL = (
    "Render every garment detail with precision -- embroidery, beading, fabric texture, "
    "sheen, and trim. Do not simplify or flatten fine detailing."
)

SETTING_INDEPENDENT = (
    "The background/location keeps its own natural palette -- do not color-match the "
    "environment to the outfit."
)

FLASH_LIGHTING = (
    "Lit with direct on-camera flash, creating strong visible shine and specular "
    "highlights across the forehead, nose, cheeks, and chin, slightly flattening her "
    "facial shadows. Two distinct light sources, visibly mismatched: the flash on her "
    "reads cooler and harder, while the background is lit separately by warmer, softer "
    "ambient light (string lights, lit windows, glowing signage) -- this contrast between "
    "the cool hard flash on her and the warm soft light behind her is what makes it read "
    "as a real flash photo, not a rendered scene."
)

DAYLIGHT_LIGHTING = (
    "Lit with soft natural daylight, gentle directional light with soft natural shadows -- "
    "no artificial flash. The glow on her skin comes from the dewy makeup finish itself, "
    "not flash-driven shine. She is turned slightly toward the light so her face reads "
    "noticeably bright and luminous -- but she and the background still share the SAME "
    "light source and color temperature; the background is not faded, hazy, or "
    "desaturated relative to her. This must read as one continuous real photograph shot in "
    "that location, not a subject composited onto a separate background -- avoid any "
    "cutout or photoshopped look."
)

SCENES = {
    "cafe": (
        "Sitting outside a cafe with a matcha in hand, camera angled from above/in front "
        "so the outfit reads top-down.",
        "daylight",
    ),
    "cinema": (
        "Standing on a staircase at a cinema, shot from a 3/4 front angle.",
        "flash",
    ),
}

CLI = ["npx", "--yes", "-p", "@higgsfield/cli", "higgsfield"]


def hijab_note(color):
    return (
        f"Wearing a {color} hijab draped loosely, not tight around the neck -- her neck is "
        f"slightly visible. Hair, hairline, and ears fully covered."
    )


def build_prompt(outfit, hijab_color, scene_text, lighting):
    lighting_block = FLASH_LIGHTING if lighting == "flash" else DAYLIGHT_LIGHTING
    return (
        f"Ultra-realistic editorial fashion photograph of {FINA_IDENTITY} "
        f"{hijab_note(hijab_color)} "
        f"{BODYSUIT_NOTE} On top of that base layer, the outfit: {outfit}. {GARMENT_DETAIL} "
        f"{AWRAH_LAYER_NOTE} "
        f"{POSE} "
        f"Setting: {scene_text} {SETTING_INDEPENDENT} {FRAMING} "
        f"{lighting_block} {FILM_LOOK} "
        f"{SKIN_MAKEUP} "
        f"No text, no watermark, no logos."
    )


def resolve_scene(scene_arg, lighting_arg):
    if scene_arg in SCENES:
        text, default_lighting = SCENES[scene_arg]
    else:
        text = scene_arg
        default_lighting = "flash" if any(
            w in scene_arg.lower() for w in ("night", "evening", "candle", "dusk")
        ) else "daylight"
    lighting = default_lighting if lighting_arg == "auto" else lighting_arg
    return text, lighting


def download(url, dest):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=120) as r:
        dest.write_bytes(r.read())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--outfit", required=True)
    ap.add_argument("--hijab-color", required=True)
    ap.add_argument("--scene", default="cafe", help="'cafe', 'cinema', or free text")
    ap.add_argument("--lighting", default="auto", choices=["auto", "daylight", "flash"])
    ap.add_argument("--count", type=int, default=2)
    ap.add_argument("--aspect-ratio", default="2:3")
    ap.add_argument("--quality", default="2k", choices=["1.5k", "2k"])
    ap.add_argument("--tag", default="post", help="filename tag for this run")
    args = ap.parse_args()

    scene_text, lighting = resolve_scene(args.scene, args.lighting)
    prompt = build_prompt(args.outfit, args.hijab_color, scene_text, lighting)

    OUT.mkdir(parents=True, exist_ok=True)
    print(f"Scene: {scene_text}\nLighting: {lighting}\n")
    print(f"Prompt:\n{prompt}\n", flush=True)

    results = []
    for i in range(1, args.count + 1):
        print(f"[{i}/{args.count}] generating…", flush=True)
        cmd = CLI + [
            "generate", "create", "text2image_soul_v2",
            "--prompt", prompt,
            "--custom_reference_id", CUSTOM_REFERENCE_ID,
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
