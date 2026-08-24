#!/usr/bin/env python3
"""
Patch a Fina generation that shows exposed skin (bare chest/midriff/etc) by running a
targeted edit pass through Higgsfield's nano_banana_pro (image-editing model) instead of
re-rolling the whole generation. Keeps face/pose/background/outfit/everything else intact,
only adds the missing bodysuit coverage.

Usage:
  ./.venv-style/bin/python scripts/fina_fix_coverage.py public/hero-gen/fina/some-image.png
"""
import subprocess
import sys
import urllib.request
from pathlib import Path

APP = Path(__file__).resolve().parent.parent

EDIT_PROMPT = (
    "Edit this photo: add an opaque nude/light-tan mock-neck long-sleeve bodysuit layer "
    "underneath her top, visible filling the open V-gap/exposed area, matching her skin "
    "tone closely but clearly a fabric layer with subtle texture, rising to a high "
    "mock-neck collar at her throat. Do not show any bare chest, cleavage, or stomach "
    "skin. Keep everything else in the image exactly the same -- her face, pose, the rest "
    "of the outfit, the hijab, the background, the lighting -- unchanged."
)

CLI = ["npx", "--yes", "-p", "@higgsfield/cli", "higgsfield"]


def download(url, dest):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=120) as r:
        dest.write_bytes(r.read())


def main():
    if len(sys.argv) != 2:
        sys.exit("Usage: fina_fix_coverage.py <path-to-flawed-image>")
    src = Path(sys.argv[1]).resolve()
    if not src.exists():
        sys.exit(f"Not found: {src}")

    dest = src.with_name(src.stem + "-fixed" + src.suffix)
    print(f"Editing {src.name} to patch coverage…", flush=True)

    cmd = CLI + [
        "generate", "create", "nano_banana_pro",
        "--image-references", str(src),
        "--prompt", EDIT_PROMPT,
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
