#!/usr/bin/env python3
"""
Add jewelry to a finished y2k_generate.py output via a targeted nano_banana_pro edit
pass, instead of describing it in the generation prompt.

Why this exists: docs/y2k/HANDOFF.md known issue #4 and three independent log entries
(2026-08-14, y2k-root-cause-and-fix.md / y2k-background-and-hijab-shape-fixed.md /
y2k-minidress-outfit-and-framing-distance.md) all confirm the same finding -- any extra
descriptive clause in the --outfit string (jewelry included) competes with the scene
description for the model's attention and measurably increases the odds the background
collapses to a flat/generic backdrop. The accepted fix for accessories specifically
(HANDOFF known issue #4) is to add them via a second-pass edit, same mechanism as
coverage/angle fixes, never by cramming them into the generation prompt.

Usage:
  ./.venv-style/bin/python scripts/y2k_add_jewelry.py public/hero-gen/y2k/some-image.png \\
      --jewelry "layered thin gold necklaces, small gold hoop earrings, a delicate gold ring"
"""
import argparse
import subprocess
import sys
import urllib.request
from pathlib import Path

APP = Path(__file__).resolve().parent.parent

CLI = ["npx", "--yes", "-p", "@higgsfield/cli", "higgsfield"]


def build_prompt(jewelry):
    return (
        f"Edit this photo: add the following jewelry on her, worn naturally and "
        f"sized realistically -- {jewelry}. Keep everything else in the image "
        f"exactly the same -- her face, pose, the outfit's color/style/coverage, the "
        f"hijab, the background, and the lighting -- completely unchanged. Do not "
        f"remove or alter any existing jewelry already visible."
    )


def download(url, dest):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=120) as r:
        dest.write_bytes(r.read())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("image", help="path to the source image")
    ap.add_argument("--jewelry", required=True, help="jewelry to add, free text")
    args = ap.parse_args()

    src = Path(args.image).resolve()
    if not src.exists():
        sys.exit(f"Not found: {src}")

    dest = src.with_name(src.stem + "-jewelry" + src.suffix)
    prompt = build_prompt(args.jewelry)
    print(f"Adding jewelry to {src.name}…", flush=True)

    cmd = CLI + [
        "generate", "create", "nano_banana_pro",
        "--image-references", str(src),
        "--prompt", prompt,
        "--aspect_ratio", "2:3",
        "--resolution", "2k",
        "--wait", "--wait-timeout", "3m",
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    url = proc.stdout.strip().splitlines()[-1] if proc.stdout.strip() else ""
    if proc.returncode != 0 or not url.startswith("http"):
        sys.exit(f"! failed: {proc.stderr.strip() or proc.stdout.strip()}")

    download(url, dest)
    print(f"✓ saved {dest.relative_to(APP) if APP in dest.parents else dest}", flush=True)


if __name__ == "__main__":
    main()
