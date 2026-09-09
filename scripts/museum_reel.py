#!/usr/bin/env python3
"""
"The Museum" — the recurring 10-second new-arrival reel.

THE FORMAT (Tina's, settled 2026-09-01, built 2026-09-09)
----------------------------------------------------------
A gallery: plinths, brass placards, dark aubergine walls. The curator stands at a
whiteboard. She slams the pencil on the board, and THE SLAM TRIGGERS THE SPOTLIGHT
on the plinth behind her — the garment is revealed. One line of judgement, not a
description. Cut. One item per post, daily.

The slam causing the reveal is the whole mechanic: the gesture is not decoration, it
is what makes a 10-second clip worth watching to the end. Three things have to stay
identical across episodes or the series stops being recognisable:

  1. the room  — same first frame, which is why every episode is built from a still
                 first and that still is passed as --start-image
  2. her mark  — she stands in the same spot, board on the same side
  3. the face  — public/hero-gen/tiktok/face-closeup-test.jpg, the anchor already
                 approved for the OOTD series (docs/tiktok/HANDOFF.md)

WHY SEEDANCE 2.0 AND NOT VEO 3.1
---------------------------------
Measured on the account 2026-09-09, not assumed:

  seedance_2_0  duration is a free INTEGER, generate_audio defaults true, up to 9
                image references, 1080p/4k, 9:16.   10s @1080p = 90 credits.
  veo3_1        duration is an ENUM of 4/6/8 — there is no 10.   8s high = 22 credits.

Veo is a third of the price and its lettering is steadier, but it structurally cannot
make the length Tina asked for, and it takes one start image and no garment reference.
Seedance can hold the real product photo in frame at the same time as the room.

TWO STAGES, BOTH RUN FROM HERE
------------------------------
  still  nano_banana_pro (falls back to nano_banana_flash) composites the REAL brand
         product photo + the face anchor into the gallery. Cheap, so iterate here.
  video  seedance_2_0 animates that still. Expensive, so only run it once the still
         is right.

Usage:
  ./.venv-style/bin/python scripts/museum_reel.py \
      --product-id "we-are-elegance:15899307704702" \
      --line "This one is new. Hand-beaded, taupe and gold, one fifty-nine. You're welcome." \
      --garment-desc "floor-length open abaya in soft taupe-sage, dense silver and gold \
                      sequin leaf embroidery over sheer mesh, wide flared sleeves" \
      --tag ep01-we-are-elegance --stage still

Then look at the still, and when it is right:
      … --stage video --still public/hero-gen/museum/ep01-we-are-elegance-still.png

Costs are printed before anything is spent. `higgsfield account status` is free and is
checked on every run — see docs/log/2026-08-15-y2k-credit-cost-mistake.md for why.
"""
import argparse
import json
import subprocess
import sys
import urllib.request
from pathlib import Path

APP = Path(__file__).resolve().parent.parent
OUT = APP / "public" / "hero-gen" / "museum"
CLI = ["npx", "--yes", "-p", "@higgsfield/cli", "higgsfield"]
FACE = APP / "public" / "hero-gen" / "tiktok" / "face-closeup-test.jpg"

# The set. Written once, reused verbatim by every episode — a paraphrase between
# episodes is how a recognisable room stops being recognisable. Colours are the
# brand tokens (globals.css): aubergine #441943, parchment #faf7f1, brass #a98a5b.
ROOM = (
    "A small museum gallery with deep aubergine walls and a polished dark stone floor. "
    "One brass-framed parchment placard on the wall behind her at shoulder height. "
    "A single warm tungsten beam falls from above onto the floor in front of her; the "
    "rest of the room falls away into darkness at three metres depth. "
)

# Hijab coverage, in the positive-assertion form docs/tiktok/HANDOFF.md proved is the
# only wording that holds — eleven earlier scripts escalated negations and the coverage
# bug survived every one of them.
HIJAB = (
    "She wears a matte deep-plum jersey hijab with an unbroken opaque fabric edge "
    "running from temple to temple across her forehead and resting on the forehead "
    "skin, one continuous layer of fabric at the hairline, one colour, one edge, "
    "covering both ears and the neck completely. "
)


def load_env():
    env = {}
    for line in (APP / ".env").read_text().splitlines():
        if "=" not in line or line.strip().startswith("#"):
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    key = env.get("HIGGSFIELD_API_KEY2") or env.get("HIGGSFIELD_API_KEY1")
    secret = env.get("HIGGSFIELD_API_SECRET2") or env.get("HIGGSFIELD_API_SECRET1")
    if not key or not secret:
        sys.exit("Missing HIGGSFIELD_API_KEY2 / HIGGSFIELD_API_SECRET2 in .env")
    return key, secret


def product(pid):
    rows = json.loads((APP / "data" / "products.json").read_text())
    for r in rows:
        if r["id"] == pid:
            return r
    sys.exit(f"No published product with id {pid} — it is cut, delisted or mistyped.")


def run(cmd, **kw):
    proc = subprocess.run(cmd, capture_output=True, text=True, **kw)
    if proc.returncode != 0:
        print(proc.stderr.strip() or proc.stdout.strip(), flush=True)
        sys.exit(1)
    return proc.stdout.strip()


def download(url, dest):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=600) as r:
        dest.write_bytes(r.read())


# --- stage 1: the still -------------------------------------------------------
def still_prompt(p, garment_desc, board_price):
    return (
        "A photograph of a woman standing in a museum gallery beside a whiteboard, with a "
        "garment displayed on a plinth behind her. "
        + ROOM +
        "FOREGROUND, right of centre: the woman, framed from the waist up and filling the "
        "right half of the frame with her head in the upper third, turned three quarters "
        "towards the camera, chin level, her eyes on the board, her right arm raised with a "
        "slim white marker pen held 15 centimetres clear of the board mid-gesture. " + HIJAB +
        "She wears a plain matte charcoal tailored blazer over a high-neck top, no jewellery. "
        "MIDGROUND, left of centre: a plain white whiteboard in a slim brass frame, its "
        "surface at her shoulder height, angled a few degrees towards the camera. Two lines "
        "are hand-written on it in thick black marker in clear capital letters: the top line "
        f"reads NEW IN in large letters, the line under it reads {board_price} in smaller letters. "
        "BACKGROUND, behind her right shoulder and deeper into the room: a waist-high "
        "parchment-coloured plinth carrying " + garment_desc + " displayed full length on an "
        "invisible mannequin, the fabric hanging straight and still. "
        "The plinth stands in deep shadow with no light of its own — the garment is dim and "
        "low in contrast, its silhouette and a few dull glints the only thing readable, "
        "roughly one fifth as bright as her face. "
        "The garment matches the FIRST reference photograph exactly: the same base fabric "
        "colour, the same embroidery, the same sleeve shape. The base fabric is the colour it "
        "is in that photograph and stays that colour, and the embroidery sits as scattered "
        "sprigs and vines with plain base fabric clearly visible between them across most of "
        "the garment. Her face matches the SECOND reference photograph. "
        "One warm tungsten light source at 3200K, high and slightly camera-left, so her face "
        "is lit from the left and the whiteboard catches a soft even fall of the same light. "
        "Vertical frame, sharp focus on her face and on the lettering, the room behind falling "
        "into darkness. Photoreal, fine grain, natural skin texture with visible pores."
    )


def fetch_ref(p):
    """The CLI takes a local path or an upload UUID — a CDN URL is rejected outright
    ("is neither a UUID nor an existing file path"), so the brand photo is pulled down
    first. Named by product id, which is unique per row (Invariant 1), so this can
    never overwrite another episode's reference."""
    refs = OUT / "refs"
    refs.mkdir(parents=True, exist_ok=True)
    dest = refs / (p["id"].replace(":", "-") + ".jpg")
    if not dest.exists():
        download(p["image"], dest)
        print(f"Fetched reference {dest.relative_to(APP)}", flush=True)
    return dest


def make_still(args, p):
    garment_ref = str(fetch_ref(p))
    prompt = still_prompt(p, args.garment_desc, args.board_price)
    print(f"STILL PROMPT:\n{prompt}\n", flush=True)

    for model in (args.still_model, "nano_banana_flash"):
        cmd = CLI + ["generate", "create", model,
                     "--prompt", prompt,
                     "--image-references", garment_ref,
                     "--image-references", str(FACE),
                     "--aspect_ratio", "9:16",
                     "--resolution", args.still_res,
                     "--wait", "--wait-timeout", "8m"]
        print(f"Generating still via {model}…", flush=True)
        proc = subprocess.run(cmd, capture_output=True, text=True)
        url = proc.stdout.strip().splitlines()[-1] if proc.stdout.strip() else ""
        if proc.returncode == 0 and url.startswith("http"):
            OUT.mkdir(parents=True, exist_ok=True)
            dest = OUT / f"{args.tag}-still.png"
            download(url, dest)
            (OUT / f"{args.tag}-still.json").write_text(json.dumps(
                {"model": model, "prompt": prompt, "url": url,
                 "product": p, "face_ref": str(FACE)}, indent=2))
            print(f"Saved {dest.relative_to(APP)}", flush=True)
            return dest
        print(f"  ! {model} failed: {(proc.stderr or proc.stdout).strip()[:300]}", flush=True)
        if model == "nano_banana_flash":
            sys.exit(1)
    return None


# --- stage 2: the video -------------------------------------------------------
def video_prompt(p, line, garment_desc):
    """Seedance 2.0 prompt, in the block order the seedance-clean skill specifies.

    The one non-obvious choice: the spotlight is written as a SEPARATE light that
    switches on, not as the existing beam moving. A moving beam reads as a camera
    exposure change; a second source snapping on reads as a reveal.
    """
    return f"""SCENE CONTEXT
A museum curator stands at a whiteboard in a dark gallery, camera-left of the board. She strikes the board once with her pen, and on that strike a spotlight switches on behind her, lighting a garment on a plinth. She delivers one line to camera. Ten seconds, one room, no location change.

ACTIVE REFERENCES
@image1: the gallery, the curator, the whiteboard and the plinth. 100% matches the reference. The whiteboard lettering stays exactly as written in the reference — the top line reads NEW IN, the line under it reads the price. The garment on the plinth is {garment_desc}, and it keeps the same colour, the same embroidery placement and the same sleeve shape as the reference throughout.

LOCATION MAP
Foreground: empty dark parquet floor. Midground right: the whiteboard in its slim brass frame, her writing hand against it. Midground left and centre: the curator, standing on her mark, feet planted, body turned three quarters to camera. Background centre-left, three metres deep and behind her shoulder: the plinth with the garment on an invisible mannequin. The camera is on the shadow side, square to the whiteboard, at chest height. The one existing warm tungsten source is high and camera-left.

FIRST FRAME / BLOCKING
Frame one is the reference image exactly: she fills the left and centre of the vertical frame with her head in the upper third, the whiteboard fills the right third, the plinth sits dim in the background behind her shoulder toward frame centre-left. Her right arm is up and across, the pen held at board height, her eyes already on the lens.

FORMAT MODE
One continuous shot, the camera does not cut on its own.

OPTICS
MS at 29 degrees FOV throughout, no drift mid-shot, natural portrait compression, motion blur only on the pen strike.

CAMERA
Chest height, two metres out, locked off for the first two seconds, then a very slight push in at 0.4 km/h, ending on a medium shot that still holds her, the plinth and the whole whiteboard inside the frame. The operator stays on the same axis for the whole shot. Focus stays on her face; the plinth behind stays readable. Wide tonal latitude, warm highlight roll-off.

ACTION
0.0s to 1.2s — her raised hand drives the pen onto the whiteboard in one short movement and taps it once, hard. The board flexes 5 millimetres and settles. Her eyes stay on the lens through the tap.
1.2s to 2.2s — on that tap a second, harder white spotlight switches on above the plinth behind her, throwing the garment into full light and a defined shadow onto the floor. The garment stays still. She does not look at it.
2.2s to 9.0s — she keeps the pen resting where it landed and speaks one line straight down the lens.
9.0s to 10.0s — she lifts one eyebrow a few millimetres, closes her mouth, and holds still. The spotlight stays on.

PERFORMANCE
Dry, unhurried, amused. Her eye-line is on the lens from the first frame and stays there for the whole shot. A micro-pause after the first sentence. The eyebrow moves, the rest of the face barely does — the restraint is the joke. Pore-level skin realism, capillary flush at the cheek, living eyes with a single tungsten catch-light, one visible breath before she speaks.

PHYSICS
The pen has weight — the strike carries through the wrist and the board rings once. Her sleeve moves with the arm and settles. The garment on the plinth hangs under its own weight and does not sway. Contact shadow under the plinth stays anchored.

LIGHTING
Two sources. One warm tungsten at 3200K, high and camera-left, on her face and the board, constant. One museum display spotlight above the plinth, off until 1.2s, then on at 3800K, edged, throwing a defined shadow. It is a gallery light exposed for the fabric: it lands at half the brightness of her face, so the garment's own base colour reads plainly and its detail stays legible. The colour temperature split between the two sources is gentle.

COLOR GRADE
Deep aubergine wall reading as a dark plum field around the lit areas, warm brass on the board frame catching the tungsten. Under the spotlight the garment holds its soft grey-taupe base fabric as the dominant colour across the whole piece, with the scattered stonework picking out small warm silver glints against it. The floor holds a low warm reflection.

AUDIO
One sharp pen tap on the board at 1.2s, a low room tone, and a soft electrical thunk as the spotlight strikes. She says, in a low, dry, unhurried voice: "{line}" No music.

STYLE
Photoreal, natural skin, fine grain, gallery interior, vertical frame.

OUTPUT SETTINGS
1080p, 9:16, real-time throughout.

POSITIVE LOCKS
The whole whiteboard stays inside the frame for all ten seconds with both hand-written lines legible, the top line reading NEW IN.
The garment stays soft grey-taupe with its sheer net base visible and stonework scattered across it, holding that colour under the spotlight from the moment the light comes on to the last frame.
She stays on her mark, the board stays camera-right, the plinth stays behind her shoulder toward frame centre-left.
The garment on the plinth keeps the colour, embroidery and sleeve shape of the reference from first frame to last.
Her hijab keeps one continuous opaque edge across the forehead and covers both ears and the neck for the whole shot.
The spotlight stays on from 1.2s to the end.
She speaks the line once, and only that line."""


def make_video(args, p, still):
    line = args.line.strip()
    prompt = video_prompt(p, line, args.garment_desc)
    print(f"VIDEO PROMPT:\n{prompt}\n", flush=True)

    cost = run(CLI + ["generate", "cost", "seedance_2_0", "--prompt", prompt,
                      "--duration", str(args.duration), "--resolution", args.res,
                      "--aspect_ratio", "9:16"])
    print(f"Cost: {cost}", flush=True)

    cmd = CLI + ["generate", "create", "seedance_2_0",
                 "--prompt", prompt,
                 "--start-image", str(still),
                 "--duration", str(args.duration),
                 "--resolution", args.res,
                 "--aspect_ratio", "9:16",
                 "--generate_audio", "true",
                 "--bitrate_mode", "high",
                 "--wait", "--wait-timeout", "25m"]
    print("Generating video via seedance_2_0…", flush=True)
    proc = subprocess.run(cmd, capture_output=True, text=True)
    url = proc.stdout.strip().splitlines()[-1] if proc.stdout.strip() else ""
    if proc.returncode != 0 or not url.startswith("http"):
        print(f"! failed: {(proc.stderr or proc.stdout).strip()[:500]}", flush=True)
        sys.exit(1)
    dest = OUT / f"{args.tag}.mp4"
    download(url, dest)
    (OUT / f"{args.tag}.json").write_text(json.dumps(
        {"model": "seedance_2_0", "prompt": prompt, "line": line, "url": url,
         "duration": args.duration, "resolution": args.res, "start_image": str(still),
         "product": p}, indent=2))
    print(f"Saved {dest.relative_to(APP)}", flush=True)
    return dest


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--product-id", required=True, help="id from data/products.json")
    ap.add_argument("--garment-desc", required=True,
                    help="what is on the plinth, in plain words — the reference photo "
                         "carries the texture, this carries the shape")
    ap.add_argument("--line", default="", help="the spoken line (video stage)")
    ap.add_argument("--board-price", default="", help="second line on the whiteboard")
    ap.add_argument("--tag", required=True)
    ap.add_argument("--stage", default="still", choices=["still", "video", "both"])
    ap.add_argument("--still", default="", help="existing still to animate")
    ap.add_argument("--still-model", default="nano_banana_pro")
    ap.add_argument("--still-res", default="2k", choices=["1k", "2k", "4k"])
    ap.add_argument("--duration", type=int, default=10)
    ap.add_argument("--res", default="1080p", choices=["480p", "720p", "1080p", "4k"])
    args = ap.parse_args()

    load_env()
    p = product(args.product_id)
    if not args.board_price:
        args.board_price = f"${p['price']:g}" if p["currency"] == "USD" else \
                           f"{p['price']:g} {p['currency']}"
    print(f"Account: {run(CLI + ['account', 'status'])}", flush=True)
    print(f"Piece:   {p['brandName']} — {p['title']} — {args.board_price}", flush=True)

    still = Path(args.still) if args.still else None
    if args.stage in ("still", "both"):
        still = make_still(args, p)
    if args.stage in ("video", "both"):
        if not still or not still.exists():
            sys.exit("--stage video needs --still pointing at a generated still")
        if not args.line:
            sys.exit("--stage video needs --line")
        make_video(args, p, still)

    print("\nQA before publishing — check all six:", flush=True)
    print("  1. whiteboard lettering legible and unchanged through the whole clip", flush=True)
    print("  2. hijab edge at hairline, temples, ears", flush=True)
    print("  3. hands and the pen", flush=True)
    print("  4. the garment still matches the real product photo (this is the affiliate claim)", flush=True)
    print("  5. the spotlight fires ON the tap, not before or after", flush=True)
    print("  6. AI disclosure on the post — EU AI Act Art 50(4), see docs/tiktok/HANDOFF.md", flush=True)


if __name__ == "__main__":
    main()
