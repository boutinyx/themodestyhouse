#!/usr/bin/env python3
"""
Pull the "camera" back on a y2k_generate.py output by outpainting -- extending the
canvas around the existing image so she becomes proportionally smaller within a
larger real scene, instead of asking the generator to compose distance correctly in
one shot (which repeatedly failed -- see docs/log/2026-08-14-y2k-outpaint-distance-fix.md).

Uses Higgsfield's dedicated `outpaint` model. Unlike the coverage-fix edit pass
(nano_banana_pro, which edits pixels in place), this GROWS the canvas -- the
existing image is kept as-is and new, consistent scene content is generated around
its borders. Run this on any generation where the outfit/coverage/background are
already correct but the framing is too tight.

Usage:
  ./.venv-style/bin/python scripts/y2k_outpaint.py public/hero-gen/y2k/some-image.png \\
      [--aspect-ratio 9:16]
"""
import argparse
import subprocess
import sys
import urllib.request
from pathlib import Path

APP = Path(__file__).resolve().parent.parent
CLI = ["npx", "--yes", "-p", "@higgsfield/cli", "higgsfield"]


def download(url, dest):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=120) as r:
        dest.write_bytes(r.read())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("image", help="path to the source image")
    ap.add_argument("--aspect-ratio", default="9:16",
                     help="target aspect ratio to outpaint to (taller than the 2:3 "
                          "source adds headroom/floor space; wider adds side context)")
    args = ap.parse_args()

    src = Path(args.image).resolve()
    if not src.exists():
        sys.exit(f"Not found: {src}")
    dest = src.with_name(src.stem + "-farback" + src.suffix)

    print(f"Outpainting {src.name} to {args.aspect_ratio}…", flush=True)
    cmd = CLI + [
        "generate", "create", "outpaint",
        "--image-references", str(src),
        "--aspect_ratio", args.aspect_ratio,
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
