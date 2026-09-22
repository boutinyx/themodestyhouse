#!/usr/bin/env python3
"""
Generate hero-image variations with Higgsfield Soul (text-to-image).
Reads HIGGSFIELD_API_KEY / HIGGSFIELD_API_SECRET from .env, generates a small
test batch (dark & moody, mixed subjects, 16:9 for the desktop hero, 720p),
and saves the results into public/hero-gen/.

Usage:
  ./.venv-style/bin/python scripts/gen_hero.py            # test batch, 16:9, 720p
  ...args: --ratio 9:16 --res 1080p --only 1,3            # e.g. mobile finals
"""
import argparse
import json
import os
import sys
import urllib.request
from pathlib import Path

APP = Path(__file__).resolve().parent.parent
OUT = APP / "public" / "hero-gen"

# --- credentials from .env ---------------------------------------------------
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
    # the SDK reads these from the environment
    os.environ["HF_API_KEY"] = key
    os.environ["HF_API_SECRET"] = secret
    os.environ["HF_KEY"] = f"{key}:{secret}"

# Batch 9 (2026-08-20): new homepage hero direction. Tina's brief, verbatim intent —
# the existing hero (single moody crop, batch 5-8) reads as "too editorial" and doesn't
# "lure the viewer in" or show what the site does at a glance. Reference she supplied is
# a group of 3 women in a white-column boutique, phones raised over their faces
# (mirror-selfie pose), iced drinks + designer bags, warm neutral silk abayas with gold
# lace trim — an immediately legible "shopping/lifestyle" scene, not a solo portrait.
# Adapted for the brand: 2-3 women (not always 3 — a duo reads cleaner at hero width),
# same phone-covering-face pose (also sidesteps needing one consistent AI face across
# every generation), on-brand aubergine/plum/brass palette instead of the reference's
# mauve-pink-cream, same white marble boutique-interior energy. Per
# dont-reuse-y2k-prompt-scaffold: fresh prompts for this new ask, not inherited
# jewel-crop constraints from batch 5-8.
STYLE = ("elegant editorial modest-fashion campaign photography, rich on-brand aubergine, plum and warm gold "
         "tones, an airy white-marble boutique interior with fluted columns and soft directional daylight, "
         "shot on film, aspirational and chic, no text, no writing, no signage, no logos, no watermark")

CONCEPTS = [
    ("duo-select", "Two stylish hijabi women in flowing silk abayas — one deep aubergine, one dusty plum — with "
                    "gold-embroidered hijab trim, standing close together in a sunlit white-column boutique, "
                    "each holding her phone raised to capture a mirror selfie so her face is gently hidden "
                    "behind it, one carrying a small structured aubergine leather handbag with gold hardware, "
                    "soft gold jewelry at the wrist, " + STYLE),
    ("trio-hall", "Three hijabi women shoulder to shoulder in coordinated silk abayas in aubergine, plum and "
                   "champagne gold, gold-trimmed draped hijabs, each with her phone held up over her face as if "
                   "mid mirror-selfie, one holding an iced coffee, standing in a grand white-marble boutique hall "
                   "with tall columns, " + STYLE),
    ("duo-atelier", "Two hijabi women in aubergine and gold-trimmed silk abayas, phones raised to take a mirror "
                     "selfie together, faces softly obscured by the phones, standing in a modest-fashion atelier "
                     "with a softly blurred rack of jewel-toned garments behind them, warm cinematic light, " + STYLE),
    ("trio-walk", "Three hijabi women mid-stride through a sunlit white-marble boutique corridor, wearing "
                   "coordinated aubergine, dusty plum and champagne-gold abayas with draped hijabs, one lifting "
                   "her phone to film as she walks, soft motion blur at the frame edges, gold jewelry catching "
                   "the light, " + STYLE),
    ("duo-crop", "Close editorial waist-up crop of two hijabi women in aubergine and gold-trimmed silk abayas, "
                  "phones raised over their faces in a mirror-selfie pose, one holding a small aubergine leather "
                  "bag with visible gold hardware, soft romantic daylight, tonal aubergine-and-plum backdrop, " + STYLE),
]

# Batch 10 (2026-08-20, same day, second round): Tina's follow-up on batch 9 — she wants
# sunglasses back (the identity/style device from the OLD batch 5-8 hero, which she liked
# on its own terms — her complaint there was that a SOLO moody portrait doesn't "lure the
# viewer in", not that sunglasses were wrong), the pose does not have to be the
# phone-selfie any more ("it doesnt only have to be using their phones it could also be
# something editorial else"), and explicitly "dont make it too busy" — batch 9's
# multi-prop trio shots (phone + bag + coffee + jewelry all at once) were read as
# cluttered. So: sunglasses on every concept, solo OR duo (no trios this round), one
# simple pose/gesture each, plain uncluttered backdrops, at most one small prop (never
# stacked). Fresh prompts per dont-reuse-y2k-prompt-scaffold — not the batch-9 phone/bag
# scaffold carried forward.
STYLE_10 = ("elegant editorial modest-fashion campaign photography, chic sunglasses, rich on-brand aubergine, "
            "plum and warm gold tones, soft directional daylight, shot on film, aspirational, clean and "
            "uncluttered composition, minimal props, no text, no writing, no signage, no logos, no watermark")

CONCEPTS_10 = [
    ("solo-walk", "A stylish hijabi woman in a deep aubergine silk abaya and gold-trimmed draped hijab, elegant "
                   "sunglasses, walking with quiet confidence through a sunlit white-marble colonnade, one hand "
                   "loosely at her side, plain uncluttered corridor behind her, " + STYLE_10),
    ("duo-laugh", "Two hijabi women in aubergine and dusty plum silk abayas with gold-trimmed hijabs, both in "
                   "elegant sunglasses, caught mid-laugh walking side by side, plain sunlit marble backdrop, no "
                   "other props, " + STYLE_10),
    ("solo-profile", "Editorial profile portrait of a hijabi woman in a plum silk abaya, gold-trimmed draped "
                      "hijab, elegant sunglasses, one hand lightly resting at the edge of her hijab, plain soft "
                      "aubergine-toned backdrop, no props, " + STYLE_10),
    ("duo-armin", "Two hijabi women in aubergine and champagne-gold silk abayas, gold-trimmed hijabs, elegant "
                   "sunglasses, walking arm in arm with calm soft smiles, plain white-column hallway behind "
                   "them, no bags or props, " + STYLE_10),
    ("solo-lean", "A hijabi woman in a deep aubergine silk abaya and draped gold-trimmed hijab, elegant "
                   "sunglasses, leaning gently against a fluted white column with a soft smile, plain "
                   "uncluttered background, " + STYLE_10),
    ("duo-glance", "Two hijabi women in plum and aubergine silk abayas with gold-trimmed hijabs, elegant "
                    "sunglasses, walking away from camera down a sunlit marble corridor and glancing back over "
                    "one shoulder, plain background, no props, " + STYLE_10),
    ("solo-seated", "A hijabi woman in a champagne-gold silk abaya and gold-trimmed draped hijab, elegant "
                     "sunglasses, seated gracefully on a plain marble bench, hands relaxed in her lap, soft "
                     "uncluttered white-column background, " + STYLE_10),
    ("duo-doorway", "Two hijabi women in aubergine and plum silk abayas with gold-trimmed hijabs, elegant "
                     "sunglasses, stepping together through a plain arched white doorway into soft daylight, no "
                     "props, " + STYLE_10),
    ("solo-crop", "Close editorial bust-up crop of a hijabi woman in a deep aubergine silk abaya, gold-trimmed "
                   "hijab, elegant sunglasses, chin gently lifted, plain solid aubergine backdrop, no props, "
                   "graphic and minimal, " + STYLE_10),
    ("duo-crop2", "Close editorial shoulder-to-shoulder crop of two hijabi women in aubergine and plum silk "
                   "abayas, gold-trimmed hijabs, both in elegant sunglasses, calm expressions, plain solid plum "
                   "backdrop, no props, graphic and minimal, " + STYLE_10),
]

# Batch 11 (2026-08-20, same day, third round): "lets not do the glasses" — batch 10 minus
# sunglasses, otherwise held constant. Deliberately NOT a fresh concept set: the poses,
# framing, and "not too busy" brief in batch 10 tested well, so this isolates the one
# variable she called out (sunglasses) instead of re-rolling everything, which would make
# it impossible to tell whether a difference in the results comes from the pose or from
# the accessory. Faces are open/visible instead — same soft daylight, same on-brand
# aubergine/plum/gold, same one-gesture-plain-backdrop rule.
STYLE_11 = ("elegant editorial modest-fashion campaign photography, rich on-brand aubergine, plum and warm "
            "gold tones, soft directional daylight, shot on film, aspirational, clean and uncluttered "
            "composition, minimal props, no sunglasses, no text, no writing, no signage, no logos, no watermark")

CONCEPTS_11 = [
    ("solo-walk", "A stylish hijabi woman in a deep aubergine silk abaya and gold-trimmed draped hijab, calm "
                   "open expression, walking with quiet confidence through a sunlit white-marble colonnade, one "
                   "hand loosely at her side, plain uncluttered corridor behind her, " + STYLE_11),
    ("duo-laugh", "Two hijabi women in aubergine and dusty plum silk abayas with gold-trimmed hijabs, faces "
                   "open, caught mid-laugh walking side by side, plain sunlit marble backdrop, no other props, "
                   + STYLE_11),
    ("solo-profile", "Editorial profile portrait of a hijabi woman in a plum silk abaya, gold-trimmed draped "
                      "hijab, calm open expression, one hand lightly resting at the edge of her hijab, plain "
                      "soft aubergine-toned backdrop, no props, " + STYLE_11),
    ("duo-armin", "Two hijabi women in aubergine and champagne-gold silk abayas, gold-trimmed hijabs, faces "
                   "open, walking arm in arm with calm soft smiles, plain white-column hallway behind them, no "
                   "bags or props, " + STYLE_11),
    ("solo-lean", "A hijabi woman in a deep aubergine silk abaya and draped gold-trimmed hijab, faces open, "
                   "leaning gently against a fluted white column with a soft smile, plain uncluttered "
                   "background, " + STYLE_11),
    ("duo-glance", "Two hijabi women in plum and aubergine silk abayas with gold-trimmed hijabs, faces open, "
                    "walking away from camera down a sunlit marble corridor and glancing back over one shoulder, "
                    "plain background, no props, " + STYLE_11),
    ("solo-seated", "A hijabi woman in a champagne-gold silk abaya and gold-trimmed draped hijab, calm open "
                     "expression, seated gracefully on a plain marble bench, hands relaxed in her lap, soft "
                     "uncluttered white-column background, " + STYLE_11),
    ("duo-doorway", "Two hijabi women in aubergine and plum silk abayas with gold-trimmed hijabs, faces open, "
                     "stepping together through a plain arched white doorway into soft daylight, no props, "
                     + STYLE_11),
    ("solo-crop", "Close editorial bust-up crop of a hijabi woman in a deep aubergine silk abaya, gold-trimmed "
                   "hijab, calm open expression, chin gently lifted, plain solid aubergine backdrop, no props, "
                   "graphic and minimal, " + STYLE_11),
    ("duo-crop2", "Close editorial shoulder-to-shoulder crop of two hijabi women in aubergine and plum silk "
                   "abayas, gold-trimmed hijabs, faces open, calm expressions, plain solid plum backdrop, no "
                   "props, graphic and minimal, " + STYLE_11),
]


def download(url, dest):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        dest.write_bytes(r.read())


# Batch 12 (2026-08-24): the /edits/everyday-lace COVER, not a homepage hero. Different
# brief from every batch above, so fresh prompts rather than the batch-11 colonnade
# scaffold (per dont-reuse-y2k-prompt-scaffold). Tina: the hero "needs to be editorial, but
# it needs to be willing to click on it because it grabs attention. It should show
# immediately that we're talking about lace."
#
# THE HARD PART IS SCALE, NOT STYLING. Lace photographed at full-body distance is just
# texture you cannot name — it reads as printed pattern. So every concept here is framed
# CLOSE, and two of the three are lit so light passes THROUGH the holes in the lace. That
# is the one lighting choice that makes lace legible as lace. It is also the mitigation for
# the flat-fabric failure this model has on cloth at low resolution (see the OOTD note in
# memory): if the lace fills the frame, 1080p is enough pixels to resolve the weave.
#
# MODESTY: lace is semi-sheer by nature, so every prompt states the lace sits over an
# OPAQUE underlayer. Without that this model will happily render lace against bare skin.
#
# Concepts 2 and 3 are Tina's own styling rules from the edit's copy, made visual —
# contrast (black lace on white reads instantly, black on black disappears) and denim
# (soft against hard). Concept 1 is the pure texture shot.
STYLE_12 = ("elegant editorial modest-fashion campaign photography, warm parchment and cream tones with deep "
            "aubergine accents, soft directional daylight, shot on 85mm film, shallow depth of field, real "
            "fabric texture, natural skin, clean uncluttered composition, aspirational and quiet, "
            "no text, no writing, no signage, no logos, no watermark")

CONCEPTS_12 = [
    ("lace-backlit", "Close editorial crop, chest and shoulders only, of a hijabi woman in a cream lace blouse "
                      "worn over an opaque cream underlayer, a wide scalloped lace border running across the "
                      "collarbone. Backlit from behind so daylight passes through the open holes of the lace and "
                      "throws a faint lace pattern onto the fabric beneath. The lace fills much of the frame and "
                      "its individual threads and open weave are unmistakable. Plain warm parchment wall far out "
                      "of focus behind her. Modest, fully covered, draped hijab, no visible hair, " + STYLE_12),
    ("lace-contrast", "Editorial waist-up crop of a hijabi woman in a black lace top worn over an opaque black "
                       "underlayer, standing against a plain bright cream-white backdrop, with crisp white "
                       "wide-leg trousers below. Maximum contrast between the black lace and the white around it "
                       "so the lace pattern reads instantly and graphically. Black draped hijab, fully covered, "
                       "no visible hair. Graphic, minimal, high-impact, " + STYLE_12),
    ("lace-denim", "Editorial three-quarter crop of a hijabi woman wearing a cream lace top over an opaque "
                    "underlayer, layered under a rigid structured indigo denim jacket worn open, so the soft "
                    "open lace sits directly against the hard square-shouldered denim. Warm neutral hijab, fully "
                    "covered, no visible hair. Plain warm parchment background. The contrast of soft against "
                    "hard is the subject, " + STYLE_12),
]

# Batch 13 (2026-08-24): batch 12 was rejected — "too editorial i do want a bit playful".
# So this holds the two things that WORKED in 12 (lace legible at close range; the
# contrast rule doing the visual work) and changes the register: movement, daylight,
# real places, candid warmth instead of a still studio backdrop.
#
# TWO DEFECTS FROM BATCH 12 ARE FIXED HERE, not left to luck:
#   1. Concept 63 rendered a bare upper back and neck. The prompt said "fully covered, no
#      visible hair" and that was not enough — it never forbade bare skin, so a back-facing
#      pose produced it. COVERAGE below states it explicitly. On a modest directory this is
#      a correctness bug, not a taste one.
#   2. All three of batch 12 filled the centre of the frame, so the "Everyday Lace" title
#      would have landed on the model. Every concept here places the subject to one side
#      and names the empty side, because the title is centred over the photograph.
COVERAGE = ("modest and fully covered — long sleeves to the wrist, high neckline, draped hijab with no "
            "visible hair, no bare back, no bare neck, no bare arms, no bare legs, lace always layered "
            "over an opaque underlayer and never against skin")

STYLE_13 = ("playful editorial modest-fashion photography, warm natural sunlight, candid and joyful, gentle "
            "movement, real place rather than a studio, warm parchment cream and soft aubergine tones, shot "
            "on 50mm film, real fabric texture, no text, no writing, no signage, no logos, no watermark")

CONCEPTS_13 = [
    ("lace-twirl", "A hijabi woman laughing mid-turn in a cream lace blouse with wide scalloped lace sleeves, "
                    "the lace sleeve caught in motion and flaring out so sunlight passes through the open holes "
                    "of the lace. She stands to the LEFT of the frame; the right half is a plain sunlit warm "
                    "wall with nothing in it. Late afternoon golden light, soft motion, genuine smile. "
                    + COVERAGE + ", " + STYLE_13),
    ("lace-steps", "A hijabi woman sitting relaxed on warm stone steps in bright daylight, wearing a black lace "
                    "top over an opaque black underlayer with crisp white wide-leg trousers, one hand resting "
                    "on the step, mid-laugh looking off to the side. The black lace reads sharply against the "
                    "pale stone and white trousers. She sits to the RIGHT of the frame; the left half is empty "
                    "sunlit stone. " + COVERAGE + ", " + STYLE_13),
    ("lace-duo", "Two hijabi friends walking together down a sunlit street, both mid-laugh, one in a cream lace "
                  "blouse over an opaque underlayer with indigo denim, the other in a black lace top with cream "
                  "trousers. Easy natural stride, hands gesturing as they talk. The pair sits to the LEFT of "
                  "frame with open sunlit pavement and plain wall to the right. Warm, social, unposed. "
                  + COVERAGE + ", " + STYLE_13),
]

# Each batch keeps its own CONCEPTS list + starting filename index (see the comment
# above each batch for why). Add a new tuple here — (concepts_list, filename_start_index)
# — for every new batch rather than overwriting an old one, so `--batch N` always
# reproduces exactly what shipped that day.
# Batch 14 (2026-09-22): cover for the "What Is Maison Merrachi?" editorial post.
# The article's own idea — a loyalty programme structured as a house with four rooms
# (Foyer, Living Room, Walk-In Closet, Atelier) — not Merrachi's own product photography
# or storefront, which we don't have rights to and shouldn't fabricate a likeness of.
# One concept: a doorway/threshold reads as "invited into the house" without depicting
# any specific real store. No text/logos — this brand's own name is added by the site,
# never baked into the image (STYLE already excludes it).
CONCEPTS_14 = [
    ("house-threshold", "A hijabi woman in an elegant deep-aubergine silk coat dress with a draped plum hijab, "
                         "standing just inside an open doorway of a warm, softly lit townhouse interior — pale "
                         "stone archway, brass door hardware, a glimpse of a parchment-toned room beyond with "
                         "soft daylight. She is captured mid-step, one hand resting on the doorframe, looking "
                         "past the camera into the room ahead rather than at it. Warm, inviting, editorial, "
                         "shot on film. " + COVERAGE + ", " + STYLE_13),
]

# Batch 15 (2026-09-22): re-run of batch 14 — the render put a lace panel directly
# against bare-looking leg skin at the hem, breaking COVERAGE's own "never against
# skin" line (Soul doesn't reliably obey that clause). Fix: dropped the lace/hem
# detail from the garment entirely rather than re-ask for the same risky detail.
CONCEPTS_15 = [
    ("house-threshold-v2", "A hijabi woman in an elegant deep-aubergine silk coat dress, floor-length and "
                            "fully opaque with no slits or sheer panels, with a draped plum hijab, standing "
                            "just inside an open doorway of a warm, softly lit townhouse interior — pale stone "
                            "archway, brass door hardware, a glimpse of a parchment-toned room beyond with soft "
                            "daylight. She is captured mid-step, one hand resting on the doorframe, looking past "
                            "the camera into the room ahead rather than at it. Warm, inviting, editorial, shot "
                            "on film. " + COVERAGE + ", " + STYLE_13),
]

# Batch 16 (2026-09-22): batches 14/15 invented a palette (aubergine silk, brass,
# marble townhouse) that doesn't match Merrachi's own look at all. Checked their real
# site: campaign photography is soft French-countryside — worn wood, linen, florals,
# natural window light, script serif type — and the actual Maison Merrachi loyalty
# page uses flat illustrated room panels in muted mustard/dusty-pink/taupe/burgundy,
# not photography. This concept follows the campaign-photography half of that, in a
# rustic doorway rather than a polished marble one, since the article still needs a
# photographic cover for the site's existing editorial template.
CONCEPTS_16 = [
    ("house-threshold-cottage", "A hijabi woman in a flowing cream linen dress, fully opaque with no slits, "
                                 "with a soft dusty-pink hijab, standing in the doorway of a rustic countryside "
                                 "house — weathered wooden door frame, peeling pale paint, linen curtains "
                                 "stirring in the breeze, warm golden-hour sunlight streaming in low and side-on. "
                                 "A small vase of wildflowers rests on a windowsill beside her. She is captured "
                                 "mid-step over the threshold, looking softly toward the light ahead rather than "
                                 "at the camera. Warm, candid, editorial, shot on film, muted cream and dusty-pink "
                                 "tones. " + COVERAGE + ", " + STYLE_13),
]

# Batch 17 (2026-09-22): batch 16 still showed leg through the dress hem — same
# failure mode as batches 14/15, third time. Tina, looking at the render: "i see her
# leg and i want a jersey hijab tucked inside of her whatever shes wearing." Two
# changes: (1) the hem is now stated as pooling ON the floor, ankle-length with no
# leg visible at any point, dropped "linen" as a material word since it may read as
# sheer/light-catching — jersey/cotton for the dress too, matte and opaque; (2) hijab
# is now a jersey hijab, tucked into the neckline rather than draped loose over the
# shoulders (a real, common styling — not the loose drape of batches 14-16).
CONCEPTS_17 = [
    ("house-threshold-jersey", "A hijabi woman in a flowing ankle-length cream jersey dress with long sleeves, "
                                "fully opaque matte cotton-jersey fabric with no slits, the hem pooling fully at "
                                "her feet so no leg or ankle is ever visible, wearing a soft dusty-pink jersey "
                                "hijab tucked neatly into the neckline of the dress rather than draped loose over "
                                "the shoulders, standing in the doorway of a rustic countryside house — weathered "
                                "wooden door frame, peeling pale paint, linen curtains stirring in the breeze, "
                                "warm golden-hour sunlight streaming in low and side-on. A small vase of "
                                "wildflowers rests on a windowsill beside her. She is captured mid-step over the "
                                "threshold, looking softly toward the light ahead rather than at the camera. "
                                "Warm, candid, editorial, shot on film, muted cream and dusty-pink tones. "
                                + COVERAGE + ", " + STYLE_13),
]

# Batch 18 (2026-09-22): Tina — "not jersey dress jersey hijab." Batch 17 put jersey on
# both; only the hijab should be jersey. Dress reverts to a plain opaque cotton (not
# "linen", which reads sheer) while keeping 17's other fix — ankle-length hem pooling
# at the feet, no leg visible, hijab tucked into the neckline rather than draped.
# Second round, same batch before either was run — Tina, looking at batch 14's still:
# "she looks at us." Every prior concept said "looking ... rather than at the camera",
# which Soul has now ignored twice (batch 14 too). Rewritten as a positive instruction
# only — WHERE she looks, not what to avoid — plus her face turned enough in profile
# that meeting the lens is physically awkward for the pose, not just discouraged.
CONCEPTS_18 = [
    ("house-threshold-jersey-hijab", "A hijabi woman in a flowing ankle-length cream cotton dress with long "
                                      "sleeves, fully opaque matte fabric with no slits, the hem pooling fully at "
                                      "her feet so no leg or ankle is ever visible, wearing a soft dusty-pink "
                                      "JERSEY hijab (matte, stretch cotton-jersey fabric, not silky or shiny) "
                                      "tucked neatly into the neckline of the dress rather than draped loose over "
                                      "the shoulders, standing in the doorway of a rustic countryside house, her "
                                      "body and face turned three-quarters AWAY from the camera in profile, her "
                                      "eyes fixed on the sunlit room ahead of her, the side of her face and the "
                                      "back of her shoulder toward the viewer — weathered wooden door frame, "
                                      "peeling pale paint, linen curtains stirring in the breeze, warm "
                                      "golden-hour sunlight streaming in low and side-on. A small vase of "
                                      "wildflowers rests on a windowsill beside her. She is captured mid-step "
                                      "over the threshold. Warm, candid, editorial, shot on film, muted cream and "
                                      "dusty-pink tones. " + COVERAGE + ", " + STYLE_13),
]

# Batch 19 (2026-09-22): Tina — "make her look at the camera and the jersey hijab
# needs to be like this [screenshot of our own /modest-hijabs 'Jersey Hijabs' hero:
# wrapped snugly around the neck, tail tucked in, turtleneck-style, not a loose drape]
# an i want the place to be the smae as the older picture the first one you amde"
# — i.e. batch 14's setting (pale-stone archway, brass door hardware, aubergine silk),
# not batches 16-18's countryside doorway. Reverts location and garment to batch 14,
# drops the sheer lace panel that broke coverage there (batch 15's fix), swaps the
# loose-drape hijab for the wrapped/tucked jersey style from the reference, and now
# asks for direct eye contact instead of turning away (the opposite of batch 18).
CONCEPTS_19 = [
    ("house-threshold-jersey-wrap", "A hijabi woman in an elegant deep-aubergine silk coat dress, floor-length "
                                     "and fully opaque with no slits or sheer panels, wearing a plum JERSEY hijab "
                                     "(matte, stretch cotton-jersey fabric, not silky or shiny) wrapped snugly "
                                     "around her neck and head with the tail tucked in at the neck like a "
                                     "turtleneck wrap, not draped loosely over the shoulders, standing just "
                                     "inside an open doorway of a warm, softly lit townhouse interior — pale "
                                     "stone archway, brass door hardware, a glimpse of a parchment-toned room "
                                     "beyond with soft daylight. She is captured mid-step, one hand resting on "
                                     "the doorframe, looking directly at the camera with a warm, engaging "
                                     "expression. Warm, inviting, editorial, shot on film. " + COVERAGE + ", "
                                     + STYLE_13),
]

# Batch 20 (2026-09-22): Tina — "still bear legs." Third time this exact failure has
# shown up (batches 14, 16, 19), each time with the words "no slits" / "no bare legs"
# already in the prompt. Repeating the same instruction louder hasn't worked, so this
# changes what's actually driving it rather than the wording: every prior concept in
# this doorway posed her "mid-step" in a WRAP-front coat dress — a walking leg pushes
# a wrap-front open at the hem regardless of what the text says, which is a garment-
# and-pose interaction no amount of "no slits" fixes. Two structural changes: (1) she
# stands still, weight on both feet, rather than mid-step; (2) the dress is a straight
# column silhouette with a full front closure (buttons/zip, not a wrap-and-belt), which
# has no seam that a raised leg or forward step can open.
CONCEPTS_20 = [
    ("house-threshold-standing", "A hijabi woman in an elegant deep-aubergine silk column dress with a full "
                                  "front button closure from neck to floor — not a wrap or belted coat-style "
                                  "front — floor-length and fully opaque with no slit at any point, wearing a "
                                  "plum JERSEY hijab (matte, stretch cotton-jersey fabric, not silky or shiny) "
                                  "wrapped snugly around her neck and head with the tail tucked in at the neck "
                                  "like a turtleneck wrap, not draped loosely over the shoulders, standing still "
                                  "with her weight evenly on both feet just inside an open doorway of a warm, "
                                  "softly lit townhouse interior — pale stone archway, brass door hardware, a "
                                  "glimpse of a parchment-toned room beyond with soft daylight. One hand rests on "
                                  "the doorframe; she is looking directly at the camera with a warm, engaging "
                                  "expression. Warm, inviting, editorial, shot on film. " + COVERAGE + ", "
                                  + STYLE_13),
]

# Batch 21 (2026-09-22): Tina — "use the higgsfield prompts we always use that dont
# make our carchetyers naked." Four straight attempts (14, 16, 19, 20) put her in a
# FLOOR-LENGTH dress or coat, wrap-front or button-front, standing or mid-step, and
# all four showed leg at the hem regardless. The two batches that actually shipped
# (12, 13 — "Everyday Lace") never once put a model in a dress: every concept there is
# a TOP over TROUSERS, which has no hem that can gap open no matter the pose. That
# structural choice, not any wording, is what "the ones that don't make our characters
# naked" actually means. Same doorway setting and jersey-wrap hijab as 19, garment
# changed to match 12/13's proven pattern.
CONCEPTS_21 = [
    ("house-threshold-trousers", "A hijabi woman in a deep-aubergine silk blouse tucked into wide-leg matching "
                                  "aubergine silk trousers that reach fully to the floor, both fully opaque, "
                                  "wearing a plum JERSEY hijab (matte, stretch cotton-jersey fabric, not silky "
                                  "or shiny) wrapped snugly around her neck and head with the tail tucked in at "
                                  "the neck like a turtleneck wrap, not draped loosely over the shoulders, "
                                  "standing just inside an open doorway of a warm, softly lit townhouse interior "
                                  "— pale stone archway, brass door hardware, a glimpse of a parchment-toned room "
                                  "beyond with soft daylight. One hand rests on the doorframe; she is looking "
                                  "directly at the camera with a warm, engaging expression. Warm, inviting, "
                                  "editorial, shot on film. " + COVERAGE + ", " + STYLE_13),
]

# Batch 22 (2026-09-22): Tina — "i mean the prompts of how we used to do it." Batch 21
# still wrote a fresh sentence; this instead copies CONCEPTS_13's "lace-steps" almost
# word for word — same skeleton, same clause order, same "reads sharply against"
# construction — swapping only the doorway setting and Merrachi's colours in place of
# the stone-steps scene. Nothing about the sentence structure is new.
CONCEPTS_22 = [
    ("house-threshold-oldformula", "A hijabi woman standing relaxed just inside an open doorway in bright "
                                    "daylight, wearing a deep-aubergine top over an opaque aubergine underlayer "
                                    "with crisp cream wide-leg trousers, one hand resting on the doorframe, warm "
                                    "smile looking directly at the camera. A plum JERSEY hijab (matte, stretch "
                                    "cotton-jersey fabric, not silky) is wrapped snugly around her neck and head "
                                    "with the tail tucked in at the neck like a turtleneck wrap. The aubergine "
                                    "top reads richly against the pale stone archway and cream trousers. She "
                                    "stands to the RIGHT of the frame; the left half is a plain sunlit stone wall "
                                    "with brass door hardware. " + COVERAGE + ", " + STYLE_13),
]

# Batch 23 (2026-09-22): Tina — "this is for higgsfield it gives priorities" — i.e.
# earlier words in the prompt carry more weight, and COVERAGE has been sitting at the
# very END of every concept so far (after the full scene/garment description used up
# the model's attention). Every batch above is COVERAGE LAST; this is the same batch 22
# concept with COVERAGE moved FIRST, so the modesty constraints are read before the
# model has already committed to a pose or garment interpretation.
CONCEPTS_23 = [
    ("house-threshold-priority", COVERAGE + ". " +
     "A hijabi woman standing relaxed just inside an open doorway in bright daylight, wearing a "
     "deep-aubergine top over an opaque aubergine underlayer with crisp cream wide-leg trousers, one hand "
     "resting on the doorframe, warm smile looking directly at the camera. A plum JERSEY hijab (matte, "
     "stretch cotton-jersey fabric, not silky) is wrapped snugly around her neck and head with the tail "
     "tucked in at the neck like a turtleneck wrap. The aubergine top reads richly against the pale stone "
     "archway and cream trousers. She stands to the RIGHT of the frame; the left half is a plain sunlit "
     "stone wall with brass door hardware. " + STYLE_13),
]

# Batch 24 (2026-09-22): Tina — "maybe we should do it like how wee write the videos."
# scripts/ootd_generate.py already has the answer, in its own comment: "Positive
# assertions only. Negations do not work — this model family has no negative-prompt
# channel, so a negation just adds the token." Eleven earlier scripts (that file's
# words) already burned through the exact mistake batches 14-23 just repeated here —
# every one of COVERAGE's clauses is a negation ("no bare legs", "never against
# skin"), and moving it earlier (batch 23) couldn't fix a wording problem. Rewritten
# as positive-only physical facts, in ootd's own style (compare hijab_block() above).
POSITIVE_COVERAGE = (
    "Her sleeves reach fully to her wrist bone. Her top has a high round neckline "
    "resting at the base of her throat. Her trousers are floor-length and made of a "
    "single solid opaque fabric from waist to ankle, the same opaque fabric touching "
    "her shoes at the hem. Her hijab fabric covers her hair completely from hairline "
    "to nape and wraps under her chin, one continuous piece of fabric."
)

CONCEPTS_24 = [
    ("house-threshold-positive", POSITIVE_COVERAGE + " " +
     "A hijabi woman standing relaxed just inside an open doorway in bright daylight, wearing a "
     "deep-aubergine top over an opaque aubergine underlayer with crisp cream wide-leg trousers, one hand "
     "resting on the doorframe, warm smile looking directly at the camera. A plum jersey hijab, matte "
     "stretch cotton-jersey fabric, is wrapped snugly around her neck and head with the tail tucked in at "
     "the neck like a turtleneck wrap. The aubergine top reads richly against the pale stone archway and "
     "cream trousers. She stands to the RIGHT of the frame; the left half is a plain sunlit stone wall "
     "with brass door hardware. " + STYLE_13),
]

# Batch 25 (2026-09-22): Tina, on batch 24 — "its good but i wanted dress and the area
# the same as the ones before." Two changes from 24, keeping its (working) positive-
# only phrasing: (1) trousers -> a dress, using ootd_generate.py's own proven sentence
# for exactly this — "The garment is closed at the front, hem to the floor, sleeves
# ending at the base of the thumb" — rather than a hand-written equivalent; (2) restores
# the "glimpse of a parchment-toned room beyond with soft daylight" detail that batches
# 14/19/20 had and 21-24 dropped when the garment changed.
DRESS_COVERAGE = (
    "Her sleeves reach fully to her wrist bone. Her dress has a high round neckline resting at the base of "
    "her throat. Her hijab fabric covers her hair completely from hairline to nape and wraps under her chin, "
    "one continuous piece of fabric."
)

CONCEPTS_25 = [
    ("house-threshold-dress-positive", DRESS_COVERAGE + " " +
     "A hijabi woman in a deep-aubergine silk dress. The dress is closed at the front, hem to the floor, "
     "sleeves ending at the base of the thumb. A plum jersey hijab, matte stretch cotton-jersey fabric, is "
     "wrapped snugly around her neck and head with the tail tucked in at the neck like a turtleneck wrap. "
     "She stands relaxed just inside an open doorway of a warm, softly lit townhouse interior — pale stone "
     "archway, brass door hardware, a glimpse of a parchment-toned room beyond with soft daylight. One hand "
     "rests on the doorframe; she is looking directly at the camera with a warm, engaging expression. Warm, "
     "inviting, editorial, shot on film. " + STYLE_13),
]

# Batch 26 (2026-09-22): Tina ran an EARLIER prompt (batch 22/23's negation-based
# COVERAGE, screenshotted from higgsfield.ai directly) and got a thin, clinging,
# sheer-lace-panelled top with visible chest shape — the exact failure mode this whole
# session has been chasing, now at its worst. Two root causes, both fixed here:
#   1. COVERAGE's own line — "lace always layered over an opaque underlayer and never
#      against skin" — puts the word "lace" into the prompt AT ALL. Same mechanism as
#      "no bare legs" adding "legs" (ootd_generate.py's own finding): naming lace as
#      something to constrain still means the model was told to render lace. This
#      concept never uses the word "lace" anywhere, since lace is not wanted on it.
#   2. Tina: "MAKE THE PROMPT LONGER AND MORE DETAILED." Every clause below is a
#      concrete, positive, physically specific fact about the fabric and construction
#      — weight, opacity, drape, seams — rather than a short adjective, on the theory
#      that an underspecified garment leaves the model free to default to whatever is
#      most common in its training data, which for "top" skews thin and fitted.
CONCEPTS_26 = [
    ("house-threshold-thick-fabric", (
        "A hijabi woman standing relaxed just inside an open doorway of a warm, softly lit townhouse "
        "interior, one hand resting on the doorframe, looking directly at the camera with a warm, engaging "
        "expression, weight even on both feet. "
        "She wears a deep-aubergine dress made of a heavy, thick, structured silk-crepe fabric with real "
        "visible weight to it — the kind of fabric that holds its own shape, falls in broad soft folds, and "
        "drapes several centimetres away from her body at the chest, waist and hips rather than following "
        "her silhouette. The fabric surface is smooth, matte and completely uniform in colour and texture "
        "from the collar to the floor-length hem — one single unbroken fabric the entire length of the "
        "dress, with the same thickness and opacity across the chest as everywhere else on the garment. The "
        "neckline is a high, structured round collar that sits at the base of her throat, cut from the same "
        "heavy fabric, fully closed all the way up with no gap. The dress closes edge-to-edge down the "
        "centre front from collar to hem with a hidden seam, so the front lies completely flat and even. "
        "Her sleeves are cut from the same heavy fabric, long and slightly loose through the forearm, ending "
        "in a buttoned cuff exactly at her wrist bone. The hem is a straight, floor-length line that reaches "
        "and touches the ground evenly all the way around her, brushing the tops of her shoes. "
        "Around her neck and head she wears a plum jersey hijab, a soft matte cotton-jersey knit fabric with "
        "a slight stretch and a soft brushed surface, the same uniform plum colour throughout with no sheen. "
        "It is wrapped snugly around her neck and head in a fitted wrap style, with the loose tail of fabric "
        "tucked neatly in at the side of her neck, sitting close to her skin like a turtleneck collar rather "
        "than hanging loose or draping over her shoulders. The jersey fabric covers her hair completely from "
        "her hairline at the front to the nape of her neck at the back, in one continuous piece with no gap "
        "or parting anywhere. "
        "The doorway itself has a pale stone archway and brass door hardware, with a glimpse of a "
        "parchment-toned room beyond her, lit by soft daylight. Warm, inviting, editorial photography, shot "
        "on 50mm film, natural warm sunlight, candid and joyful mood, real place rather than a studio, warm "
        "parchment cream and soft aubergine tones throughout the frame, real fabric texture visible in the "
        "weave, no text, no writing, no signage, no logos, no watermark anywhere in the image."
    )),
]

# Batch 27 (2026-09-22): Tina wants an illustrated cover in the spirit of Merrachi's
# own room artwork on their loyalty page, without copying it — that artwork is their
# commissioned illustration and reproducing it is a copyright problem regardless of
# credit (asked and declined). The general STYLE (loose ink linework, soft chalky
# crayon shading, warm cream ground) is not protected, only their specific composition
# is, so this concept deliberately differs in framing and subject from their "Atelier"
# panel: a different room entirely (an arched window seat, not a sewing corner), no
# mannequins, no flower vase in the same arrangement, no sewing machine.
CONCEPTS_27 = [
    ("illustrated-room", (
        "A loose hand-drawn ink and soft pastel crayon illustration, in the style of a quick editorial "
        "fashion sketch, of a warm, sunlit reading nook inside an elegant townhouse. A tall arched window "
        "with visible glazing bars fills the back wall, warm cream curtains pulled to one side. Beneath the "
        "window sits a deep-aubergine upholstered window seat with two soft plum cushions. A low wooden side "
        "table stands beside the seat, holding a single glass of iced tea and a small stack of books. A "
        "brass floor lamp stands in the corner, its shade a warm parchment colour. The floor is a warm wood "
        "in loose visible plank lines. The wall colour is a soft warm cream throughout. Rendered entirely as "
        "flat blocks of colour with visible loose ink outlines, imperfect hand-drawn linework, soft crayon "
        "texture and shading, in the style of a fashion designer's quick concept sketch — not photographic, "
        "not 3D rendered, no gradients other than soft crayon shading. Colour palette limited to deep "
        "aubergine, dusty plum, warm brass, parchment cream and soft wood brown. No text, no writing, no "
        "signage, no logos, no watermark, no human figures anywhere in the image."
    )),
]

BATCHES = {
    9: (CONCEPTS, 38),
    10: (CONCEPTS_10, 43),
    11: (CONCEPTS_11, 53),
    12: (CONCEPTS_12, 63),
    13: (CONCEPTS_13, 66),
    14: (CONCEPTS_14, 68),
    15: (CONCEPTS_15, 69),
    16: (CONCEPTS_16, 70),
    17: (CONCEPTS_17, 71),
    18: (CONCEPTS_18, 72),
    19: (CONCEPTS_19, 73),
    20: (CONCEPTS_20, 74),
    21: (CONCEPTS_21, 75),
    22: (CONCEPTS_22, 76),
    23: (CONCEPTS_23, 77),
    24: (CONCEPTS_24, 78),
    25: (CONCEPTS_25, 79),
    26: (CONCEPTS_26, 80),
    27: (CONCEPTS_27, 81),
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ratio", default="16:9")
    ap.add_argument("--res", default="720p")
    ap.add_argument("--batch", type=int, default=max(BATCHES), help="which CONCEPTS batch to run")
    ap.add_argument("--only", default="", help="comma-separated 1-based concept numbers")
    args = ap.parse_args()

    load_env()
    import higgsfield_client

    OUT.mkdir(parents=True, exist_ok=True)
    concepts, start = BATCHES[args.batch]
    pick = {int(x) for x in args.only.split(",") if x.strip()} if args.only else None
    tag = args.ratio.replace(":", "x")
    results = []

    for i, (name, prompt) in enumerate(concepts, start=start):
        if pick and i not in pick:
            continue
        print(f"[{i}/{len(concepts)}] {name} ({args.ratio}, {args.res}) — generating…", flush=True)
        try:
            res = higgsfield_client.subscribe(
                "higgsfield-ai/soul/standard",
                arguments={"prompt": prompt, "aspect_ratio": args.ratio,
                           "resolution": args.res, "camera_fixed": False},
            )
        except Exception as e:
            print(f"    ! failed: {e}", flush=True)
            results.append({"concept": name, "error": str(e)})
            continue
        imgs = (res or {}).get("images") or []
        if not imgs:
            print(f"    ! no images in response: {json.dumps(res)[:200]}", flush=True)
            results.append({"concept": name, "raw": res})
            continue
        url = imgs[0].get("url")
        dest = OUT / f"hero-{tag}-{i}-{name}.jpg"
        try:
            download(url, dest)
            print(f"    ✓ saved {dest.relative_to(APP)}", flush=True)
            results.append({"concept": name, "file": dest.name, "url": url, "prompt": prompt})
        except Exception as e:
            print(f"    ! download failed: {e} ({url})", flush=True)
            results.append({"concept": name, "url": url, "error": str(e)})

    (OUT / f"results-{tag}-{args.res}-b{args.batch}.json").write_text(json.dumps(results, indent=2))
    ok = sum(1 for r in results if r.get("file"))
    print(f"\nDone. {ok}/{len(results)} saved to {OUT.relative_to(APP)}/", flush=True)


if __name__ == "__main__":
    main()
