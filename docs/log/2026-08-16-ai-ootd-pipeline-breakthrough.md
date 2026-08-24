# AI OOTD pipeline — garment-detail blocker solved by changing model, not prompt

**Date:** 2026-08-16 · **Status:** done

## Goal

Tina asked for AI-generated hijabi OOTD posts for TikTok matching the quality of real
influencer photos on her own Pinterest board. A long session of prompt iteration got
coverage, framing and background realism right but never fixed the core complaint:
the clothes rendered as flat blocks of colour with no fabric detail, and the images
read as AI. Her words: *"the clothes even they were far more detailed"*.

## What changed

### Root cause — two hard model limits, not prompt wording

`text2image_soul_v2` (used for every generation this session and in `docs/y2k/`):

- caps at **2k** (`--quality {1.5k,2k}`), read from `higgsfield model get`
- accepts **one** image reference

One reference cannot separately carry "this is the face" and "this is the garment".
Two controlled tests confirmed the consequence: passing a single reference image
reproduced its lighting and photo quality beautifully but also dragged its room,
pose and outfit through, and an explicit *"use the reference ONLY to match her face
— ignore the room, pose, angle, outfit and expression"* override was ignored both
times. And with only one slot, the garment could only ever be *described*.

Separately, a wrong parameter was found and fixed mid-session: the SDK calls were
passing `resolution: "1080p"`, which is not a parameter this model accepts (the real
one is `quality`). That was silently degrading every generation.

### The fix

`nano_banana_flash` (Nano Banana 2) — same Higgsfield CLI, one argument change —
accepts **up to 14 image references at up to 4k**. Reference 1 = the real brand
product photograph from `data/products.json`; reference 2 = the approved face anchor.

The fabric is now *transferred from a photograph* instead of hallucinated from
adjectives. This is what the industry does; it is not a prompting technique.

### Files

- `scripts/ootd_generate.py` — new generator. Takes `--garment-image`,
  `--garment-desc`, `--hijab-color`, `--scene`, `--shot-type`, `--tag`; defaults to
  `nano_banana_flash` at 4k with the face anchor as the second reference.
- `docs/tiktok/HANDOFF.md` — methodology, model/cost table, prompt rules, QA list,
  open items. Supersedes `docs/y2k/HANDOFF.md` for this content type.
- `public/hero-gen/tiktok/` — outputs, including `refs/` for downloaded product photos.
- Obsidian: `AI Content/TikTok OOTD Generation — Findings.md` (written earlier in the
  session, before the breakthrough — its "unsolved" section is now out of date).

## Verification

Every claim below is from a command run this session, not from documentation.

**Model capabilities** (`higgsfield model get`):

```
text2image_soul_v2  quality {1.5k,2k}        at most one image reference
nano_banana_flash   resolution {1k,2k,4k}    at most 14 image references
nano_banana_pro     resolution {1k,2k,4k}    at most 14 image references
seedream_v4_5       quality {basic,high}     at most 14 image references
```

**Costs** (`higgsfield generate cost`, free, zero spend):

```
text2image_soul_v2   0.12 credits
seedream_v4_5        1 credit
nano_banana_flash    1.5 credits
gpt_image_2          7 credits
```

**Account:** `boutainatjee@gmail.com — basic plan, 199.52 credits`.

**`nano_banana_pro` is NOT available on this plan** — it errors
`"Pro" or "Ultimate" plan required` (exit 3). The research pass had recommended it as
the fallback; that recommendation is void without a plan upgrade. `nano_banana_flash`
was substituted and works.

**Soul ID is scriptable** — contradicting the premise carried through several earlier
sessions and recorded in `docs/log/2026-08-14-higgsfield-soul-reference-upload-broken.md`:

```
$ higgsfield soul-id list
ID                                    NAME             TYPE    STATUS
712ea516-8fb9-4a7a-ac16-f67e45aae9c5  Serene Guardian  soul_2  completed
```

`soul-id create/get/list/wait` all exist; `create` takes 5–20 local image paths and
auto-uploads. The old 403 `SignatureDoesNotMatch` was specific to the key/secret REST
upload path, which is a different auth surface. Not yet integrated with the new
pipeline — flagged as the next experiment, not claimed as working.

**The generation itself:**

```
$ npx @higgsfield/cli higgsfield generate create nano_banana_flash \
    --prompt "..." \
    --image-references public/hero-gen/tiktok/refs/garment-knit-dress.jpg \
    --image-references public/hero-gen/tiktok/face-closeup-test.jpg \
    --aspect_ratio 2:3 --resolution 4k --wait
https://d8j0ntlcm91z4.cloudfront.net/.../hf_20260816_110039_9b63c4d7-....png

$ sips -g pixelWidth -g pixelHeight BREAKTHROUGH-knit-4k.png
  pixelWidth: 3392
  pixelHeight: 5056
```

3392x5056 vs 1344x2016 previously — **6.3x the pixel count**.

**Visual check, at 1:1 on a cropped region** (`BREAKTHROUGH-knit-4k-FABRIC-CROP.png`,
compared against the source `refs/garment-knit-dress.jpg`): individual knit stitch
loops, the open-work eyelet pattern, the raised scalloped wave rows, the contrast
between the flat woven button placket and the knit body, and mother-of-pearl buttons
with visible four-hole detail and colour variation — all present and matching the
real product. This is the specific thing that had been missing all session.

Coverage on the same image: hijab edge unbroken across the forehead, ears/neck/nape
covered, no hair sliver, no underscarf band. Face matches the anchor reference while
the scene, pose and framing are completely different from it — which is exactly the
failure mode that made single-reference Soul unusable.

Source garment is a real catalogue row: Sirwaal, "The Icon knitted dress in white",
`data/products.json`.

## Notes / follow-ups

- **Not verified:** whether `custom_reference_id` (Soul ID) composes with the
  multi-reference garment pipeline. They live on different endpoints and
  `text2image_soul_v2` is the 2k/1-ref one, so they may not combine at all. The face
  anchor image is the working substitute meanwhile.
- **Rights question is open and blocking a real posting cadence:** the product photos
  belong to 108 brands. Compositing them into our own promotional social content is a
  different use from listing them in the directory. Read the affiliate agreements.
- **EU AI Act Art 50(4)** has applied since 2026-08-02 and Tina is a deployer; a
  human-readable AI disclosure is required, plus TikTok's AIGC toggle and its
  commercial-content toggle for affiliate links. A byte-scan of existing
  `higgsfield-library/` outputs found zero C2PA/XMP/Exif provenance markers, so
  platform auto-labelling will not fire — disclosure must be manual. No post-process
  script exists yet to stamp the official EU icon.
- The research pass that produced the model-capability lead ran 21 agents; its own
  verification phase refuted or could not confirm 12 of 14 checked claims, including
  the `nano_banana_pro` recommendation. Everything asserted in this log was
  re-verified by direct command before being written down.
- `scripts/tiktok_*.py` (7 scripts from this session) are superseded by
  `scripts/ootd_generate.py` and kept only for archaeology.
