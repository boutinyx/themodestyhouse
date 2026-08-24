#!/usr/bin/env python3
"""
Correct an elevated/overhead camera angle on a y2k_generate.py output to a normal
eye-level street-style angle, via a nano_banana_pro edit pass. This is a genuine
fix, not a prompt trick -- generation-time wording (3 separate attempts: direct
instruction, positive-only phrasing, a different non-"leaning" pose) never once
produced an eye-level shot, all 3 landed back at the same overhead angle. Asking
the edit model to re-render the perspective from eye level, on a finished image,
worked on the first try. See docs/log/2026-08-14-y2k-eye-level-angle-fix.md.

Usage:
  ./.venv-style/bin/python scripts/y2k_fix_angle.py public/hero-gen/y2k/some-image.png
"""
import subprocess
import sys
import urllib.request
from pathlib import Path

APP = Path(__file__).resolve().parent.parent

EDIT_PROMPT = (
    "Edit this photo: change the camera angle/perspective so it looks like it was "
    "photographed from eye level -- the camera at the same height as her face, "
    "pointing straight ahead horizontally -- instead of an overhead angle looking "
    "down at her. Re-render the whole scene and her body from this new, "
    "straight-on eye-level perspective, like a normal street-style photo a friend "
    "took standing directly in front of her. Keep her face, outfit, hijab, colors, "
    "and the general setting the same, just corrected to a natural eye-level "
    "camera angle."
)

CLI = ["npx", "--yes", "-p", "@higgsfield/cli", "higgsfield"]


def download(url, dest):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=120) as r:
        dest.write_bytes(r.read())


def main():
    if len(sys.argv) != 2:
        sys.exit("Usage: y2k_fix_angle.py <path-to-elevated-angle-image>")
    src = Path(sys.argv[1]).resolve()
    if not src.exists():
        sys.exit(f"Not found: {src}")

    dest = src.with_name(src.stem + "-anglefix" + src.suffix)
    print(f"Correcting camera angle on {src.name}…", flush=True)

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
