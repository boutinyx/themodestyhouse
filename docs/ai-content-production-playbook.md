# AI content production playbook — hijabi character, Pinterest content

**Date:** 2026-08-14 · **Status:** active
**Purpose:** a single reference for how to actually produce the "small brand, real
influencer, candid event photography" aesthetic — **elegant Y2K** specifically — character,
outfit, scenery, pose, skin — plus the tool pipeline and every failure pattern hit while
building this out, so it doesn't need to be re-discovered next time.

---

## 1. Character anchor sheet

A fixed, reusable block of physical description for the character — paste it verbatim into
every prompt (Krea, Higgsfield, wherever), not just as an image reference. This is what
holds identity together when a tool doesn't support an image reference at all (e.g.
Higgsfield's `soul/standard`, currently the only working Higgsfield path — see
`docs/log/2026-08-14-higgsfield-soul-reference-upload-broken.md`), and reinforces it even
when a tool does.

```
A young Middle Eastern/South Asian woman, mid-20s. Oval face, defined straight-to-arched
dark brows, hazel-olive eyes, straight nose, full lips with a neutral resting expression,
warm medium olive skin tone with a natural sheen. Slim build with a subtle hourglass shape —
a little bit of hip curve, not exaggerated, B-cup bust. Wearing a beige jersey hijab draped
close to the face and neck, fully covering hair, hairline, ears, and neck. Maintain these
exact facial proportions, skin tone, eye color, brow shape, and body proportions in every
generation — this is the same woman throughout, not a new likeness.
```

Verified against the real anchor photos in `/Users/tina/Krea` (28-image Krea round-1 set),
not invented. If the anchor set changes (new photos, different hijab color, etc.), update
this block to match — don't let it drift out of sync with the actual reference images.

Carry state forward the same way a shotlist would: if she's shown mid-motion, holding
something, or a garment detail was established in a previous shot in the same series, name
it explicitly in the next prompt rather than assuming the model remembers.

---

## 2. The six standing style rules

Every generation from here on should include all six. These are not optional per-shot
choices — they're what makes a feed read as one consistent series instead of random AI
images.

### Rule 0 — Aesthetic: elegant Y2K, not casual Y2K
The reference point is early-2000s party/evening photography at the refined end, not the
casual/streetwear end. **Lean into:** bias-cut satin, fluid draped silhouettes, fine
delicate jewelry (thin layered chains, small drop earrings), rich jewel or warm metallic
tones (amber, burgundy, bronze, champagne, deep rose), delicate floral/botanical embroidery,
strappy refined heeled sandals, soft glam makeup with a glossy finish. **Avoid:** cargo
pants, baby tees, chunky costume jewelry, chunky platform sandals, candy-bright colors,
graphic/bold prints — those read as the casual side of the era, not this brand's register.

### Rule 1 — Skin & lighting: direct on-camera flash
```
Lit with direct on-camera flash, creating strong visible shine and specular highlights
across the forehead, nose, cheeks, and chin — skin reads noticeably oily/shiny under the
flash, not matte or diffused. The flash is the dominant light source on her; the background
falls into warmer, dimmer ambient light beyond its reach (candles, string lights, or night
ambiance), creating natural contrast between a brightly flash-lit subject and a moodier
background.
```
Why: real skin has oil that catches light as specular highlights — this is one of the most
reliable "this is a real photo, not AI" signals, and it's specific/describable enough that
models render it well when asked explicitly. Generic "photorealistic skin" prompts don't
produce this; you have to name the mechanism (flash + oil + specular highlight location).

### Rule 2 — Pose: candid confident, caught mid-moment
```
Candid, confident stance, weight shifted onto one hip, natural genuine expression — a small
real smile or caught mid-laugh, not stiff or posed. One hand relaxed at her side or lightly
touching her jewelry/outfit, as if caught in conversation at an event rather than
deliberately posing for a camera.
```
Why: stiff/symmetrical poses are one of the biggest "AI tell"s. Motion (walking mid-stride)
is genuinely hard for these tools to render convincingly — static-but-candid poses work far
better than motion.

### Rule 3 — Setting: warm ambient, night or golden light
```
Setting: either an intimate indoor venue with warm ambient light (candles, string lights,
sconces) OR an outdoor evening setting with lush greenery and warm path/string lighting —
night-time warmth either way, softly blurred background, never flat daylight or a plain
studio backdrop.
```
Why: flat studio lighting reads as a product photo, not a lifestyle/event photo. Warm
ambient light also gives the flash-on-subject contrast from Rule 1 somewhere to fall off
into.

### Rule 4 — Outfit: the detail is the point
```
Render every garment detail with precision — embroidery, beading, fabric texture, sheen,
and trim exactly as they appear on the real product. Do not simplify or smooth out fine
detailing; the craftsmanship and texture should be clearly visible, not flattened into a
plain block of color.
```
Why: this is what separates "influencer wearing a specific piece" from "generic AI person
in generic clothes." It's also the actual product being marketed — accuracy here isn't
optional, see the QA checklist in §3.

### Rule 5 — Color: the 60:30:10 ratio
```
Color: 60:30:10 — a dominant tone, a secondary tone, and an accent, drawn from the elegant
Y2K palette in Rule 0 (jewel or warm metallic tones — amber, burgundy, bronze, champagne,
deep rose). Name the actual three colors in the shot explicitly, not just "warm tones" —
e.g. "60% deep burgundy (dress), 30% warm amber (ambient light/background), 10% antique
gold (jewelry accents)."
```
Why: an unstructured "warm, jewel-toned" instruction lets the model pick colors freely from
shot to shot, which reads as inconsistent even when every individual image is on-brand.
Naming the ratio and the three actual colors per shot is what makes a *series* look graded
together, not just individually pretty. Borrowed from a video-shotlist skill's "Style
Prefix" concept and adapted for stills.

---

## 3. Prompting the outfit — layered, detailed, and accurate

The single most common failure hit while building this: **a top + skirt/bottom combo gets
merged into one continuous garment (reads as a dress) instead of two distinct pieces.**
This happened repeatedly regardless of model. Countermeasures:

1. **Say "two separate garments" explicitly, and describe the boundary.**
   ```
   She is wearing TWO SEPARATE GARMENTS, not a dress: a [top description] on top, and a
   [bottom description] below, with a visible seam or waistline break where the two pieces
   meet. Do not merge them into one continuous garment.
   ```
2. **Feed the real product photo as an image reference, not just a text description.**
   Text alone consistently under-renders fine detail (embroidery, exact color, exact
   drape). An attached reference image is what actually carries fabric/pattern accuracy.
3. **Name specific construction details from the real product**, not just color —
   necklines (mock/collar/V), sleeve construction (bell, fitted, dolman), waist treatment
   (knot, tie, elastic), hem shape. Generic "long sleeve dress" loses everything that makes
   a piece identifiable as *that* product.
4. **If it's a hijab product being marketed** (not a garment), the same reference-image
   technique applies — feed the real hijab product photo as the garment reference,
   describing the wrap/drape style precisely (see the drape-style prompting used for the
   character's signature hijab style).
5. **Isolate the marketed piece if the source photo shows a full outfit.** If the real
   product is only the skirt/hijab/one piece, explicitly say to pair it with a plain neutral
   stand-in for whatever isn't being sold, so the marketed piece stays the visual focus:
   ```
   Pair it with a simple, plain [top/bottom] in a neutral tone (not the [other garment]
   from the reference photo) so the [marketed piece] is the visual focus.
   ```

### QA checklist — every single time, against the real product photo side by side
- [ ] Sleeve length / construction matches (AI tends to shorten or simplify sleeves)
- [ ] Neckline height/style matches (tends to drop or genericize necklines)
- [ ] Two-tone or patterned pieces stay distinct, not flattened to one color
- [ ] Garment length matches (skirts/dresses tend to shorten)
- [ ] Waist/knot/tie details survive
- [ ] Hijab still fully covers hair, hairline, ears, neck — **check this on every single
      output, no exceptions.** One generation in this project shipped with no hijab at all
      despite the prompt requesting one.

---

## 4. Prompting face position / pose specifics

What's actually been reliable vs. not, learned the hard way across ~30 generations:

| Want | Reliable? | Notes |
|---|---|---|
| Front-facing, straight-on | Yes | Baseline, always works |
| 3/4 profile turn | Sometimes | Worked well via a fresh generation with no reference image; was resistant when chained through repeated edits on the same reference |
| Full side profile | Sometimes | Same pattern — works better fresh than iteratively edited |
| Expression variation (smile, serious, laugh, thoughtful) | Yes, most reliable variable | This is the easiest thing to vary reliably — lean on this over angle changes if angle is fighting you |
| Motion/walking pose | No | Consistently produced stiff, unnatural results. Use a static candid stance instead (Rule 2) |
| Lighting mood change (e.g. "golden hour") on top of an existing reference | No | Reference image tends to lock the original lighting; don't fight it, drop the instruction if it's not landing after one try |
| Color/style changes via text on top of a reference image | Mixed | Sometimes works, sometimes the reference dominates. Test cheap before assuming either way — don't guess |

**Rule of thumb:** vary expression first, angle second, and treat lighting/lifestyle-mood
changes as things to build in from the *original* anchor generation rather than bolt onto
an existing reference-based edit.

---

## 5. Tool pipeline

1. **Krea — character (LoRA).** Generate an anchor face (age/ethnicity/vibe described
   explicitly in the prompt — or use the character anchor sheet in §1 directly), build a
   10-image variation set (angle/expression, NOT dramatically different lighting — see §4),
   train via **Train Lora → Optimize for: Character** (not Style — this has been mis-set
   twice, always double-check it). Give it a trigger word that is **not a real word** (a
   real-word trigger collided with its own meaning once and corrupted every output).
2. **Krea — garment application (Edit tool).** Character LoRA + real product photo →
   dressed shot on a plain background. Run the §3 technique for layered outfits. QA against
   the real product photo before moving on.
3. **Runway — scene placement (Gen-4 References).** Upload the clean plain-background
   garment shot as a Reference (well-lit, simple background — this is the ideal reference
   image per Runway's own guidance). Use `@name` + scene description built from Rules 2-3.
   This held identity through a background/scene change far more reliably than Krea's Edit
   tool did for the same task.
4. **Magnific — final detail pass (Image Upscaler).** Push **Resemblance to max (10)** and
   **Creativity to low/negative (around -6)** — this is the setting combination that held
   her face intact while still adding real skin/fabric detail. Leaving Creativity at a
   default/positive value visibly changed her face on one run — always check the result
   against the source before treating it as final.
5. **Photoshop — small, localized fixes.** For anything contained and simple (recolor a
   single element like an undercap, remove/adjust jewelry, minor touch-ups), do it in
   Photoshop rather than re-prompting the AI. Every attempt to fix something small via a new
   AI generation this session changed more than intended. Reserve AI regeneration for
   structural changes, not spot-fixes.

---

## 6. Before publishing, every time

- [ ] Hijab fully covers hair/hairline/ears/neck — checked visually, not assumed
- [ ] Face matches the trained character (compare against the LoRA anchor image, or the §1
      character anchor sheet if no image reference was used)
- [ ] Garment matches the real product photo (full §3 QA checklist)
- [ ] Add an "AI-generated" disclosure tag to the caption — required under the EU AI Act
      (Article 50, in force since 2026-08-02) since this business is Netherlands-based and
      targets an EU/UK audience, and Pinterest has its own AI-content labeling policy
      separately. Cheap, one line, same logic as the site's existing affiliate disclosure.

---

## Notes / follow-ups

- This playbook describes original technique built through iteration on this project's own
  tools (Krea, Runway, Magnific, Photoshop) — it is not a copy of any other creator's
  specific images or captions, and shouldn't be treated as one.
- Revisit §4's reliability table periodically — model updates on any of these platforms can
  change what's actually reliable; don't assume it stays accurate forever.
- The character anchor sheet (§1) and the color-ratio rule (Rule 5) were added 2026-08-14
  after reviewing a Higgsfield Seedance video-shotlist skill (`~/Downloads/higgsfield-
  seedance-shotlist-director.skill`) — that skill is for narrative video, not this project's
  still-image workflow, but its character-anchor and structured color/lighting "Style
  Prefix" concepts were worth borrowing. See
  `docs/log/2026-08-14-playbook-character-anchor-and-color-rule.md`.
