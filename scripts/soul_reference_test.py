#!/usr/bin/env python3
"""
Prototype: Higgsfield `soul/reference` — one reference image, no training step.
Uploads a single photo from /Users/tina/Krea as the identity reference, generates
a small test batch of new poses/settings, and saves results for a side-by-side
identity-hold check against the source.

Usage:
  ./.venv-style/bin/python scripts/soul_reference_test.py
"""
import json
import os
import sys
import urllib.request
from pathlib import Path

APP = Path(__file__).resolve().parent.parent
KREA_DIR = Path("/Users/tina/Krea")
OUT = APP / "public" / "hero-gen" / "soul-reference-test"

REFERENCE_IMAGE = (
    KREA_DIR
    / "_round_1__front-facing_neutral-_ultra-realistic_editorial_fashion_photograph_of_the_exact_same_woman_aad5e41a-5a8c-4fa8-a11c-b4072c9eeff3.webp"
)

STYLE = (
    "candid confident editorial fashion photograph, modest hijab styling, natural genuine "
    "expression, soft natural light, shot on film, chic and aspirational, no text, no "
    "watermark, no logos"
)

CONCEPTS = [
    ("smile-3q", "3/4 profile turn, small genuine smile, " + STYLE),
    ("serious-front", "front-facing, calm serious expression, " + STYLE),
    ("laugh-candid", "caught mid-laugh, candid moment, " + STYLE),
]


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
    os.environ["HF_API_KEY"] = key
    os.environ["HF_API_SECRET"] = secret
    os.environ["HF_KEY"] = f"{key}:{secret}"


def download(url, dest):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        dest.write_bytes(r.read())


def upload_file_fixed(higgsfield_client, path):
    """
    higgsfield_client.upload_file()'s PUT to the presigned S3 URL omits the
    `x-amz-tagging` header that the presign's SignedHeaders list requires,
    which makes every upload fail with SignatureDoesNotMatch. Reproduce the
    same _get_upload_url() call but send the header the signature expects.
    """
    import mimetypes

    import httpx

    mime_type, _ = mimetypes.guess_type(path)
    mime_type = mime_type or "application/octet-stream"
    public_url, upload_url = higgsfield_client.sync_client._get_upload_url(mime_type)
    with open(path, "rb") as f:
        data = f.read()
    resp = httpx.put(
        upload_url,
        content=data,
        headers={"Content-Type": mime_type, "x-amz-tagging": ""},
    )
    resp.raise_for_status()
    return public_url


def main():
    if not REFERENCE_IMAGE.exists():
        sys.exit(f"Reference image not found: {REFERENCE_IMAGE}")

    load_env()
    import higgsfield_client

    OUT.mkdir(parents=True, exist_ok=True)

    print(f"Uploading reference image {REFERENCE_IMAGE.name} ...", flush=True)
    ref_url = upload_file_fixed(higgsfield_client, REFERENCE_IMAGE)
    print(f"  -> {ref_url}", flush=True)

    results = []
    for i, (name, prompt) in enumerate(CONCEPTS, start=1):
        print(f"[{i}/{len(CONCEPTS)}] {name} — generating…", flush=True)
        try:
            res = higgsfield_client.subscribe(
                "higgsfield-ai/soul/reference",
                arguments={
                    "prompt": prompt,
                    "image_reference_url": ref_url,
                    "resolution": "1080p",
                    "aspect_ratio": "4:3",
                },
            )
        except Exception as e:
            print(f"    ! failed: {e}", flush=True)
            results.append({"concept": name, "error": str(e)})
            continue
        imgs = (res or {}).get("images") or []
        if not imgs:
            print(f"    ! no images in response: {json.dumps(res)[:300]}", flush=True)
            results.append({"concept": name, "raw": res})
            continue
        url = imgs[0].get("url")
        dest = OUT / f"soulref-{i}-{name}.jpg"
        try:
            download(url, dest)
            print(f"    ✓ saved {dest.relative_to(APP)}", flush=True)
            results.append({"concept": name, "file": dest.name, "url": url, "prompt": prompt})
        except Exception as e:
            print(f"    ! download failed: {e} ({url})", flush=True)
            results.append({"concept": name, "url": url, "error": str(e)})

    (OUT / "results.json").write_text(json.dumps(results, indent=2))
    ok = sum(1 for r in results if r.get("file"))
    print(f"\nDone. {ok}/{len(results)} saved to {OUT.relative_to(APP)}/", flush=True)


if __name__ == "__main__":
    main()
