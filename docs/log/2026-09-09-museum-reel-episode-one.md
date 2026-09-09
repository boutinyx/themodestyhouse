# The Museum reel — format built, episode one rendered
**Date:** 2026-09-09 · **Status:** done (episode one rendered; one fidelity gap open)

## Goal
Build the recurring 10-second new-arrival reel Tina designed on 2026-09-01: a gallery
set, a curator at a whiteboard, the pencil slam triggering a spotlight reveal of the
garment on a plinth, one line of judgement, cut. One item per post.

## What changed
- **`scripts/museum_reel.py`** (new) — the episode generator. Two stages: a cheap
  still (`nano_banana_pro`, the real brand photo + the approved face anchor as
  references) which is iterated until the room is right, then the expensive video
  (`seedance_2_0`) animating that still. The room string, the hijab-coverage string
  and the Seedance prompt live in the file so every episode is the same place.
- Outputs in `public/hero-gen/museum/` — **gitignored**, like every other generated
  batch (`public/hero-gen/` line 69 of `.gitignore`), so a 50 MB clip never reaches
  the Railway deploy.

## Why Seedance 2.0, not Veo 3.1
Read off the account, 2026-09-09, not assumed:

| model | duration | audio | image refs | 10s @1080p |
|---|---|---|---|---|
| `seedance_2_0` | free integer | `generate_audio` default true | 9 | **90 credits** |
| `veo3_1` | enum `4,6,8` — no 10 | flag | start image only | 22 credits (8s) |

Veo is a third of the price and steadier on lettering, but it structurally cannot make
the length Tina asked for. Balance before this work: 1712.26 credits; after: 1528.26.

## Verification
`ffprobe`: `1080x1920`, 24 fps, h264 + aac, `duration=10.100000` — the requested ten
seconds with sound, on both renders.

Audio envelope (stdlib RMS, 0.25 s windows) on v1, confirming the line is actually
spoken and phrased rather than assumed:

```
0.00s -31.4 ####################   <- the pen tap
0.25-2.00s ~-60 dB (silence)
2.25-3.25s -18.6 …  ] "This one is new."
3.75-5.50s -16.4 …  ] "Two kilos of hand-set stonework."
6.25-7.25s -18.2 …  ] "One fifty-nine."
7.75-8.40s -17.8 …  ] "You're welcome."
8.50-10.0s ~-60 dB (the hold)
```

Frames pulled at 0/1.0/1.4/2.5/5/8.3 s in both renders. v1 → v2 fixed:
- **camera drift** — v1 pushed far enough that the whiteboard left the frame by 8 s;
  v2 holds it to the end (last frame clips the right edge only).
- the tap now reads as a tap against the board rather than her stepping away from it.

**Still open, and it is the affiliate-fidelity check, not a taste note.** The piece is
a warm grey-taupe abaya with gold-toned stonework. The *still* renders it correctly
(cropped and compared against `data/products.json`'s own brand photo). The *video*
model brightens and cools it to near-white silver, in both renders — a warmer, dimmer
spotlight (5600K → 3800K, exposure halved) did not move it. Two attempts at the same
knob is the §10.36 signal, so it was stopped rather than tried a third time. The next
thing to try is the wording, not the light: the video prompt's garment description
still contains "silver", and the room's own tungsten is 3200K while the plinth light
is 3800K.

## Notes / follow-ups
- **The line is Tina's to approve.** It is built from the brand's own product copy —
  "meticulously handcrafted… heavy stonework set on a delicate net base… weighing just
  over 2kg" — rather than invented (§10.18). Alternates offered, not shipped.
- The face anchor is `public/hero-gen/tiktok/face-closeup-test.jpg`, already approved
  for the OOTD series. A true Soul-ID lock for the curator is still untrained; across
  more episodes the anchor alone will drift.
- Two open items inherited from `docs/tiktok/HANDOFF.md` apply here unchanged: rights
  in the brands' product photographs when composited into our own promotional content,
  and the EU AI Act Art 50(4) disclosure Tina owes as a deployer.
