# TikTok/Pinterest OOTD content — session handoff

**Date:** 2026-08-16 · **Status:** working, core blocker solved · **Supersedes:** `docs/y2k/HANDOFF.md` for this content type

Read this first after a context reset. `docs/y2k/HANDOFF.md` describes an earlier,
related series and its methodology is largely obsolete for this work — the model
changed and most of its prompt rules were built around limits that no longer apply.

## The one thing to know

**The "clothes look flat / it looks AI" problem was never a prompting problem.** It
was two hard limits of `text2image_soul_v2`:

1. It caps at **2k** (`--quality {1.5k,2k}`). A full-body frame at 1344x2016 gives
   the face a few hundred pixels and the fabric almost nothing. No adjective adds
   pixels.
2. It accepts **one** image reference. One reference cannot be told "this is the
   face" *and* "this is the garment" separately — so a single reference hijacks the
   entire composition (confirmed twice on 2026-08-16, including with an explicit
   "ignore everything about the reference except her face" override), and the garment
   can only ever be *described*, never transferred.

**`nano_banana_flash` (Nano Banana 2) removes both limits: up to `4k` and up to 14
image references.** Feeding the real brand product photo as reference 1 and a face
anchor as reference 2 produced, on the first try, actual knit stitch structure,
open-work eyelets, raised scalloped rows and mother-of-pearl buttons matching the
real product — at 3392x5056, **6.3x the pixels** of everything generated before it.

Proof: `public/hero-gen/tiktok/BREAKTHROUGH-knit-4k.png`, its 1:1 fabric crop
`BREAKTHROUGH-knit-4k-FABRIC-CROP.png`, and the source product photo
`refs/garment-knit-dress.jpg` (Sirwaal "The Icon knitted dress in white", a real
row in `data/products.json`). Compare them side by side.

## The pipeline

```bash
./.venv-style/bin/python scripts/ootd_generate.py \
    --garment-image public/hero-gen/tiktok/refs/garment-knit-dress.jpg \
    --garment-desc "cream open-knit maxi shirt dress -- scalloped wave knit texture, \
                    open-work stitch pattern, flared cuffs, full row of small pearl buttons" \
    --hijab-color camel \
    --scene "a stone step in front of a weathered wooden door on a quiet residential brick street" \
    --shot-type full-body \
    --tag knit-door
```

Reference 1 is the garment (from `data/products.json` — 20,165 rows, every one with
a brand CDN photo URL, already public, no upload step). Reference 2 is the face
anchor, `public/hero-gen/tiktok/face-closeup-test.jpg`.

## Models and costs — priced 2026-08-16, check before assuming

| job type | refs | max res | credits | notes |
|---|---|---|---|---|
| `text2image_soul_v2` | 1 | 2k | **0.12** | the old path. Cheap, but structurally cannot do fabric. |
| `seedream_v4_5` | 14 | — (quality basic/high) | **1** | cheapest multi-ref option, no 4k |
| `nano_banana_flash` | 14 | **4k** | **1.5** | **current default. What produced the breakthrough.** |
| `gpt_image_2` | yes | 4k | **7** | untested here, expensive |
| `nano_banana_pro` | 14 | 4k | — | **BLOCKED — returns `"Pro" or "Ultimate" plan required`** on the basic plan |

`higgsfield account status` and `higgsfield generate cost <job_type> --prompt "test"`
are both free. Run them at the start of every session — see
`docs/log/2026-08-15-y2k-credit-cost-mistake.md` for why this rule exists.
Balance at time of writing: **199.52 credits, basic plan**.

## Identity: Soul ID is scriptable, and one is already trained

The premise carried through several earlier sessions — that Soul ID training is
web-UI-only — **is wrong**. Verified live on 2026-08-16:

```
higgsfield soul-id create --name X --soul-2 --image ./a.png ...  # 5-20 images
higgsfield soul-id list / get / wait
```

`higgsfield soul-id list` shows one already trained on this account:
**`712ea516-8fb9-4a7a-ac16-f67e45aae9c5` "Serene Guardian", soul_2, completed** — the
old Fina character. `text2image_soul_v2` takes a `custom_reference_id` param.

So a true identity lock is available and was available the whole time. It has not
yet been combined with the `nano_banana_flash` garment pipeline — **that is the next
experiment**, and note the two may not compose: `custom_reference_id` is a
`text2image_soul_v2` param, and that endpoint is the one capped at 2k/1-ref. The face
anchor image passed as reference 2 is the current, working substitute.

To train a new character: 5-20 head-and-shoulders frames that genuinely read as the
same woman, varied angle (not all frontal), at least one full-height, **every frame
with perfect hijab coverage** (an identity model absorbs whatever is invariant across
the set), no sunglasses.

## Prompt rules that actually hold

**Positive assertions, never negations.** This model family has no negative-prompt
channel, so "no hair visible" just adds the token *hair*. Eleven earlier scripts
escalated negation wording and the coverage bug survived every one of them. Invert:

- ~~"no hair visible"~~ → "an unbroken opaque fabric edge running from temple to temple across the forehead, resting on the forehead skin"
- ~~"no underscarf showing"~~ → "one continuous layer of fabric at the hairline, one colour, one edge"
- ~~"sleeves not too short"~~ → "sleeve fabric ending at the base of the thumb"

**Delete these words:** `editorial` `cinematic` `bokeh` `shallow depth of field`
`golden hour` `8K` `hyperrealistic` `ultra-detailed` `masterpiece` `professional
photography` `shot on film`. They push toward a staged photoshoot look. This was
diagnosed the hard way on 2026-08-16 — "editorial" language was the direct cause of
the images reading as fake.

**Name one light source and its direction.** "Flat overcast daylight from the left"
beats any amount of lighting adjectives.

**Use the fixed camera anchor string** (in `ootd_generate.py`, `CAMERA`) rather than
improvising per prompt.

**Do not describe fabric in adjectives and expect texture.** Transfer it via the
reference image. Describing it is what failed all night.

## QA — every image, before publishing

1. **Background text/signage** — the top AI tell, ahead of hands. Prefer plain
   residential streets and plain fitting rooms over commercial frontage.
2. **Hijab edge** at hairline, temples, ears. The known recurring bug.
3. **Hands.**
4. **Shadow direction** consistent between subject and scene.
5. **Garment matches the real product photo** — this one is a legal check, not an
   aesthetic one. The image implies "this is the product you can buy".

## Open items

- **Rights.** Those product photos are 108 brands' copyrighted assets. Using them in
  a directory listing is a different use from compositing them into our own
  promotional social content. Check the affiliate agreements before this becomes a
  posting pipeline. Genuinely open, not a formality.
- **Character sheet** not yet written — see the research synthesis in Obsidian
  (`AI Content/TikTok OOTD Generation — Findings.md`) for a full proposed template.
- **Soul ID + multi-ref composition** untested (see above).
- **EU AI Act Art 50(4)** applies since 2026-08-02 and Tina is a deployer: a
  human-readable AI disclosure is required. Also TikTok's AIGC toggle, and its
  commercial-content toggle for affiliate links (undisclosed commercial content is
  ineligible for the For You feed). A post-process script stamping the official EU
  "AI-generated" icon is not yet written.
- Byte-scanned `higgsfield-library/` outputs: **zero C2PA/XMP/Exif provenance
  markers**. TikTok's auto-labelling will not fire on our output; disclosure must be
  manual.

## Files

```
scripts/ootd_generate.py                          the working generator
public/hero-gen/tiktok/BREAKTHROUGH-knit-4k.png   proof, 3392x5056
public/hero-gen/tiktok/refs/                      downloaded product photos used as refs
public/hero-gen/tiktok/face-closeup-test.jpg      the approved face anchor
docs/log/2026-08-16-ai-ootd-pipeline-breakthrough.md
```

Obsolete, kept only for archaeology: `scripts/tiktok_generate.py`,
`scripts/tiktok_outfit_*.py`, `scripts/tiktok_realmatch_v1.py`,
`scripts/tiktok_face_closeup*.py` — all `text2image_soul_v2`-based, all superseded.
