# Hijabi street-style series — session handoff (2026-08-14)

Read this first after a context reset. One-stop summary of a long, iterative
session (10 log entries in `docs/log/2026-08-14-y2k-*.md` if you want the blow-by-
blow) — this file is the current, correct state; the log entries are the history of
how we got here, including several dead ends. Trust this file over any single log
entry if they seem to disagree.

## What this is

Real hijabi OOTD/street-style content — the kind shared on Instagram/Pinterest.
**Not** the Fina character series (`docs/fina/`) — no trained identity, a fresh face
every generation, per Tina's explicit "fuck the character for now" call. Also not
"Y2K paparazzi" (an earlier, wrong framing from this same session — ignore any log
entry that references paparazzi/flash-event styling, it was corrected).

Look: genuine layered outfits (cardigan, poncho, kimono, belted jacket, tie-neck
blouse) over wide-leg trousers/jeans or a maxi/midi skirt, muted earthy palette
(browns, olives, taupe, cream, dusty pink) with one statement piece, natural
daylight, real locations. Half candid street-style, half mirror selfies.

## Current status: working end-to-end, 3-script pipeline

```
./.venv-style/bin/python scripts/y2k_generate.py \
    --outfit "<real, visible coverage garments — see Layering rule below>" \
    --hijab-color "<color>" \
    --shot-type candid   # or "selfie"
    --scene "<free-text setting>" \
    --count 1 \
    --tag <name>
```
Saves to `public/hero-gen/y2k/<tag>-N.png`.

```
./.venv-style/bin/python scripts/y2k_fix_coverage.py public/hero-gen/y2k/<image>.png
```
Run on any generation showing skin (chest/midriff/hip/thigh cutout, sheer fabric,
hair at the hairline). Saves `<image>-fixed.png`. **Not always one-shot reliable —
see "Known issues" below.**

```
./.venv-style/bin/python scripts/y2k_outpaint.py public/hero-gen/y2k/<image>.png \
    [--aspect-ratio 9:16]
```
Run on any generation where the outfit/coverage/background are already right but
the framing is too tight. Extends the canvas outward (default 9:16) instead of
re-generating — reveals more of her body and more real environment. Saves
`<image>-farback.png`. This is the fix for camera distance; **do not try to fix
distance by rewording the prompt, that path is closed (see Known issues).**

```
./.venv-style/bin/python scripts/y2k_fix_angle.py public/hero-gen/y2k/<image>.png
```
Run on any generation shot from an elevated/overhead angle instead of normal eye
level. `text2image_soul_v2` defaults to a slightly-overhead OOTD angle very
consistently — 3 separate generation-time wording attempts (direct instruction,
positive-only phrasing, a different pose) all failed to produce an eye-level shot.
This edit pass fixes it reliably by re-rendering the perspective on the finished
image. Saves `<image>-anglefix.png`. **Same rule as distance: don't try to fix the
angle by rewording the generation prompt, use this instead.**

Normal workflow: generate → coverage-fix if needed → outpaint if framing is too
tight → angle-fix if the shot is overhead instead of eye-level. Not every image
needs all four steps — check each one and only run the passes it actually needs.

## The locked methodology — every rule currently in `y2k_generate.py`

1. **No identity lock.** No `custom_reference_id`. Every generation is a different
   face. `GENERIC_IDENTITY` is a text-only demographic anchor (young Middle
   Eastern/South Asian woman, mid-20s), not a trained character.
2. **Coverage = real, visible garments, not an invisible base layer.** The
   `--outfit` string must fully specify actual coverage pieces (a turtleneck, a
   cardigan, trousers under a skirt) per Tina's own "Layering Toolkit" doc. There is
   NO automatic hidden bodysuit — that mechanism (borrowed from the Fina script)
   was the root cause of most coverage failures early this session and was removed
   entirely. Write outfits the way a real stylist would.
3. **Max 2 visible layers per generation.** 3+ distinct layers (e.g. a fitted top +
   a separate flowing cape + trousers, plus several accessories) reliably breaks
   background rendering — confirmed on 4 separate attempts. If a look genuinely
   needs 3 layers, generate the first 2, then add the 3rd via a targeted
   `nano_banana_pro` edit pass on the finished image (untried in practice yet, but
   this is the mechanism — same tool as coverage fixes).
4. **Keep the whole prompt short.** `GARMENT_DETAIL` (embroidery/beading render
   instructions) was removed because it — and general prompt bloat — competes with
   background rendering and collapses the scene to a flat studio backdrop. This
   generalizes: any time you're tempted to add another descriptive block, check
   whether the background still renders afterward.
5. **Hijab: asymmetric one-shoulder drape, smooth rounded crown, zero hair.**
   `hijab_note()` is tuned for: fabric swept over ONE shoulder only (not
   symmetric), no pointed peak at the crown, and — the most persistent bug this
   session — literally zero hair visible anywhere including a thin sliver at the
   top-center where the hijab begins. This has been tightened 3 times and still
   fails occasionally; it is not 100% reliable, treat any hair sighting as a normal
   edit-pass candidate, not a surprise.
6. **Natural, not "modelish."** `NATURAL_LOOK` (light natural skin texture, minimal
   makeup) and `POSE_CANDID`/`POSE_SELFIE` (genuine warm/relaxed expression, NOT a
   sultry high-fashion stare) replace Fina's heavier glam styling. This was an
   explicit, strong correction from Tina — don't reintroduce heavy glam language.
7. **Shot type drives pose AND framing.** `--shot-type candid` = photographed by
   someone else, standing/walking, not always looking at camera. `--shot-type
   selfie` = phone visible in her raised hand, real bedroom/fitting-room/bathroom,
   mirror edge visible.
8. **Aspect ratio: 2:3 for generation, always.** 16:9 and 4:3 were both tried for a
   wider single-shot frame and both caused the same failure: the model rotates the
   entire photo 90° to fit a standing figure into a landscape canvas. Confirmed
   twice, not fixable by wording, not worth retrying. If more width/height is
   needed, that's what `y2k_outpaint.py` is for — outpaint AFTER generating at 2:3.
9. **Daylight by default**, not flash/night — matches Tina's real references, none
   of which were night shots. `--lighting` auto-detects an explicit night scene if
   asked for.
10. **Tops fall to at least hip length, never cropped at the waist.** Added
    2026-08-14 after a cropped blouse left the trousers' front seam/waistband
    visible (read as a "cameltoe" line). `LAYERING_RULES` now states this
    explicitly. When writing an `--outfit` string, don't describe a top as
    "cropped" unless it's layered over something else that itself covers the hip.

## Known issues — don't re-discover these

1. **Coverage edit pass is not one-shot reliable, in either direction.** Sometimes
   the generic prompt in `y2k_fix_coverage.py` under-corrects (leaves a gap) and
   needs a second, precisely targeted edit call describing exactly what's still
   wrong and where. Sometimes it OVER-corrects catastrophically on an image that
   didn't need fixing at all (once destroyed a perfectly fine grey sweater,
   replacing it with a nude bodysuit look) — **only run the coverage-fix pass when
   there is an actual visible exposure. For anything else (e.g. a hair touch-up),
   write a narrow, specific edit prompt by hand instead of reaching for the generic
   script.**
2. **Prompt-based camera distance fixes are a dead end.** Tried a leading
   `DISTANCE_LEAD` sentence at multiple strengths (extreme → moderate), different
   poses, different scenes, different outfits — 6+ generations, all landed back at
   a tight, elevated crop. This is a real bias in how `text2image_soul_v2` composes
   a "candid photo of a person," not a wording problem. **The fix is
   `y2k_outpaint.py`, a completely different tool (canvas extension, not
   generation), not more prompt engineering.**
3. **3+ layer outfits (e.g. top + separate cape + trousers + accessories) break
   background rendering reliably**, independent of the distance issue above. See
   rule 3 above.
4. **A dense, multi-accessory outfit (sunglasses + bangles + necklace + bag all at
   once) tends to drop most of the accessories anyway**, even when the background
   survives. Not fully solved — if accessories matter, consider adding them via a
   separate edit pass rather than cramming them into the generation prompt.

## Cost — check before running anything, every session (added 2026-08-15)

`higgsfield account status` (balance) and `higgsfield generate cost <job_type> ...`
(price a call with zero spend) are both free and existed the whole time this project
ran up a bill without ever checking either. Prices, confirmed 2026-08-15:

| call | credits |
|---|---|
| `text2image_soul_v2` (a raw generation, `y2k_generate.py`) | **0.12** |
| `outpaint` (`y2k_outpaint.py`) | **2** |
| `nano_banana_pro` (coverage-fix / angle-fix / jewelry-add — every edit pass) | **2** |

Edit passes are ~17x a raw generation. Re-rolling a bad generation is cheap; running
an edit pass speculatively, or twice because the first guess was wrong, is not.
**Never run outpaint/coverage-fix/angle-fix/jewelry-add to "see what happens" —
decide what's needed, run it once.** Full story:
`docs/log/2026-08-15-y2k-credit-cost-mistake.md`.

## File map

```
scripts/y2k_generate.py       generator (no identity lock, real-garment layering)
scripts/y2k_fix_coverage.py   coverage edit pass (chest/midriff/hip/thigh/sheer/hairline)
scripts/y2k_fix_angle.py      eye-level camera-angle edit pass
scripts/y2k_outpaint.py       canvas-extension pass for camera distance
scripts/y2k_add_jewelry.py    jewelry edit pass — never put jewelry in --outfit (see above)
docs/y2k/HANDOFF.md           this file
docs/log/2026-08-14-y2k-*.md  chronological history, including dead ends (see below)
docs/log/2026-08-15-y2k-*.md  jewelry-vs-background-rendering finding, credit-cost mistake
public/hero-gen/y2k/          all generated images (raw + -fixed + -farback variants)
```

## Log entries, in order (for archaeology only — this HANDOFF supersedes all of them)

1. `y2k-no-identity-generation-attempt.md` — first batch, total failure (wrong
   direction: Y2K paparazzi framing, invisible bodysuit approach)
2. `y2k-root-cause-and-fix.md` — found `GARMENT_DETAIL` causes scene loss; still
   paparazzi framing at this point
3. `y2k-elegant-variations.md` — still paparazzi framing, added one-shoulder hijab
   drape (symmetric version — later corrected to asymmetric)
4. `y2k-natural-look-and-one-shoulder-hijab.md` — fixed "too modelish" look,
   corrected hijab to asymmetric one-shoulder
5. `y2k-real-reset-hijabi-street-style.md` — **the real pivot**: Tina sent 13
   references, discarded the whole paparazzi framing, rebuilt around real
   layering + street-style/selfie shot types
6. `y2k-background-and-hijab-shape-fixed.md` — fixed hijab point shape, first real
   background render
7. `y2k-locked-methodology-10-variations.md` — 10-variation batch, methodology
   confirmed and locked
8. `y2k-minidress-outfit-and-framing-distance.md` — first framing-distance attempts
9. `y2k-minidress-cape-scene-limitation.md` — found the 3-layer-outfit limitation
10. `y2k-outpaint-distance-fix.md` — **the actual distance fix**: outpainting, not
    prompting
