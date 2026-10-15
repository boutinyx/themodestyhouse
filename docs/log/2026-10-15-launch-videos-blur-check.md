# Launch videos: every-frame nose/mouth blur check, re-blur of all four, abaya cut, covers
**Date:** 2026-10-15 · **Status:** done (one caveat in Notes)

## Goal
Get Tina's four studio videos (`videos/studio-1014/out/{abaya-tiers,birkin-tina-edit,inconspicuous,lavers-law}.mp4`)
ready for the Instagram launch. Her nose and mouth must be blurred in every frame (eyes may show), checked on every
frame with two independent detectors per §10.63. Also: start abaya-tiers at "Most of you own C-tier abayas", and pick
3 cover frames per video. No existing file was overwritten. All outputs are in `videos/studio-1014/out/launch/`.

## Result: all four originals FAILED. All four are fixed in `-v2`

| video | frames | original: what was seen | fix | v2 frames flagged → looked at → real failures |
|---|---|---|---|---|
| abaya-tiers | 1375 | lips readable 5.07-5.23 s (f152-157). Nose tip and nostrils sharp 7.93-8.13 s, 18.70-19.07 s, 20.03-20.27 s (head tilted up) | `launch_blur.py` | 39 → 39 → 0 |
| inconspicuous | 1665 | lower lip sharp below the blur 5.87-5.93 s (f176-178). Nostrils showing when she looks up, 33.6-34.2 s. The suspected drift at 26-28 s was NOT a failure: every frame there is covered | `launch_blur.py` | 41 → 41 → 0 |
| lavers-law | 1598 | blur too weak for her face size in the WHOLE video (lips, teeth and mouth shape readable through it, including the first 1.2 s). Nose fully exposed 36.20-36.27 s, at a jump cut | `launch_blur.py` | 20 → 20 → 0 |
| birkin-tina-edit | 570 | nose tip and nostrils above the U-shaped blur when she tilts her head up: 5.6-5.8 s, 11.1 s, 12.7 s, 13.2-13.4 s, 14.3 s | `launch_birkin.py` | 27 → 27 → 0 |

## How the check works (`videos/studio-1014/launch_check.py`)
- Each final frame is paired with the frame-aligned **clean** source (`out/tmp/<name>_zoom.mp4`; birkin
  `out/tmp/birkin2_cam.mp4`). Her face is found on the clean frame by **YuNet** (OpenCV) and **MediaPipe FaceDetection
  full-range**, which are independent of each other. **FaceMesh** is a third source. Model:
  `~/video-blur/models/face_detection_yunet_2023mar.onnx`.
- Sharpness check: Laplacian variance in small patches at the nose tip, alae, upper lip, lip centre, lower lip and
  mouth corners. Each is a ratio of final to clean. A blurred patch keeps about 5-10%. Any frame where her face is on
  screen and a patch keeps more than 30% is flagged. Every flagged frame was then looked at in a crop.
- FaceMesh is outvoted when its mouth is more than 0.5 eye-distances from both other detectors. It lands on her hand
  or mic in the small-face shots (abaya 254 frames, inconspicuous 355).
- No frame of any video had zero detectors. Disagreements between the two independent detectors were few:
  abaya 9 frames, inconspicuous 30 (7 of them during a b-roll cutaway), birkin 10, lavers 0. All of them were looked at, and the blur covers both
  candidate positions.
- Every face in each FINAL frame is also listed, to catch other people.

## What changed
- `videos/studio-1014/launch_blur.py` is `blur_nose.py` (same smooth 1/5-downscale blur and mask shape) with these changes:
  1. Blur strength scales with face size: eye distance / 60, floor 1.4x, cap 3x. lavers' face is ~117 px, and the fixed
     strength kept ~27% of the mouth detail there.
  2. Jump cuts are detected from picture difference, not just from the face box moving. The smoothed eye line no longer
     carries across a cut and clips the top of the blur.
  3. The eye-line clip can never sit above her nose. Its top is set from the highest point that must be blurred, minus 20 px.
  4. Points that must be blurred now come from three detectors: FaceMesh, FaceDetection (nose, mouth, lower lip) and
     YuNet (nose, both corners, lower lip). Each must sit under at least 92% blur, where the old threshold was 50%.
     The mask is grown until that holds. That was true in every frame (`guard-not-satisfied frames []`).
- `videos/studio-1014/launch_compose.py` is `compose.py` with input and output as arguments, and it refuses to overwrite.
  The output differs from the original only around her face (≤1% of pixels changed per frame).
- `videos/studio-1014/launch_birkin.py` is `birkin_final.py` with only the blur guard changed. Nose points must sit
  inside the U template by 0.18 mouth-units. The template's flat top extends upward (a hull of the template and a
  copy slid up), so the chin line Tina approved stays where it was. Eyes stay visible: margins of 0.25 and a version
  that slid the whole shape covered her eyes when she looks up, and both were rejected.
- Abaya cut: per the faster-whisper check, "most" starts at about 4.63 s. The picture cut is at frame 142 (4.733 s).
  The audio starts at 4.600 s (10 ms fade-in). The first 4 video frames hold frame 142, so there is no 4-frame flash
  of the previous shot. After that, every output frame k is source frame 138+k. Encoded as H.264 High, crf 16, 1080x1920, 30 fps, AAC 256k 48 kHz.

## Verification
- Audio of every v2 is identical to its original: decoded-PCM MD5 matches for all four. For example abaya
  `95607b1b…` = `95607b1b…`. birkin: the script's re-mix was replaced by a stream copy of the original track.
- Final check reports: `out/launch/check/<name>-v2.json`, summarised by `launch_report.py`. Sheets of every flagged
  frame are in `out/launch/check/sheets/final/`.
- abaya-tiers-launch.mp4 duration is 41.233 s for both video (1237 frames) and audio. faster-whisper (medium) on the
  first 5 s: `most@0.00 of@0.42 you@0.62 guys@0.82 own@1.32 C@1.94 -Tier@2.20 Abayas@2.48 and@3.14 let's@4.38`.
  Audio cross-correlation against the source gives exactly 200.0 ms at t = 0.5, 20 and 38 s (200 ms expected).
  Frame diff against the source is 0.1 from frame 4 on. The first frame was looked at: nose and mouth are blurred and
  the caption reads "most of you guys".
- Covers: 12 JPGs at 1080x1920. Each was looked at full-frame and as a face close-up. Nose and mouth are blurred
  and the eyes are visible in all 12.

## Notes / follow-ups
- Other people (b-roll, not blurred, all stock or public figures): inconspicuous has a woman walking at about
  41.1 s, two women in pink at about 49.2 s, and hands and lips at about 34.3 s. birkin has the Jane Birkin photo card
  and Jean-Louis Dumas, which are intended. lavers has ballet feet and a drawing hand, with no faces. abaya has only Tina.
- **Caveat:** the clean-frame pass relies on the detectors finding her face. A frame where all three miss her is
  covered only by the hold logic. That never happened here: 0 frames had no detection. The pass was not tried on
  footage with no face present.
- Rejected intermediates are kept in `out/launch/tmp/rejected*` (all made this session). Delete them once Tina has approved.
- Root cause of the original failures: the guard in `blur_nose.py` accepted 50% blur at the raw points. It only had
  FaceMesh points, and FaceMesh misses most small faces. Its eye clip also used a smoothed eye line that lagged
  across jump cuts. Any future blur should start from `launch_blur.py`, not `blur_nose.py`.
