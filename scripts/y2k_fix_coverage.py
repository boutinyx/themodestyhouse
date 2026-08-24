#!/usr/bin/env python3
"""
Patch a y2k_generate.py output that violates the modesty void list (exposed chest,
midriff, hip/thigh cutout, sheer fabric, or hairline) by running a targeted edit pass
through Higgsfield's nano_banana_pro, same mechanism as scripts/fina_fix_coverage.py.
Keeps face/pose/background/outfit color+silhouette/everything else intact -- only
patches the specific exposure.

Root cause this exists for (see docs/log/2026-08-14-y2k-root-cause-and-fix.md): the
generation model does not reliably follow single-shot coverage instructions on
fitted/going-out-style outfits, regardless of prompt wording -- confirmed via 7
independent controlled tests. This two-pass edit approach is the accepted fix for the
same limitation in scripts/fina_generate.py -- don't re-litigate via more prompt
rewording, extend this script's edit prompt instead if a new exposure pattern shows up.

Usage:
  ./.venv-style/bin/python scripts/y2k_fix_coverage.py public/hero-gen/y2k/some-image.png
"""
import subprocess
import sys
import urllib.request
from pathlib import Path

APP = Path(__file__).resolve().parent.parent

EDIT_PROMPT = (
    "Edit this photo to fully cover her modestly, without changing anything else. "
    "Specifically: (1) If any chest, cleavage, midriff, hip, or thigh skin is visible "
    "through a gap, cutout, or opening in the outfit, add opaque nude/light-tan fabric "
    "-- matching her skin tone closely but clearly a fabric layer with subtle texture, "
    "not translucent -- filling that gap completely, as if a fitted mock-neck bodysuit "
    "or opaque leggings were underneath the whole time. (2) If any fabric on the outfit "
    "reads as sheer, see-through, or mesh, make it fully opaque in the same color and "
    "pattern. (3) If any hair or hairline is visible at her forehead or temples, extend "
    "the hijab fabric to fully cover it. Do not show any bare chest, cleavage, stomach, "
    "hip, or thigh skin, and do not show any hair at the hairline. Keep everything else "
    "in the image exactly the same -- her face, pose, the outfit's color and style, the "
    "hijab color, the background, and the lighting -- unchanged."
)

CLI = ["npx", "--yes", "-p", "@higgsfield/cli", "higgsfield"]


def download(url, dest):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=120) as r:
        dest.write_bytes(r.read())


def main():
    if len(sys.argv) != 2:
        sys.exit("Usage: y2k_fix_coverage.py <path-to-flawed-image>")
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
