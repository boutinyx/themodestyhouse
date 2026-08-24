# Fina — style rules

Builds on the six standing rules in `docs/ai-content-production-playbook.md` §2. These are
Fina-specific refinements/additions.

## Styling register: elegant baseline, maximalist only on request
- **Default is restrained/elegant** — simple layering, no patterns, no statement jewelry.
- **Layering is always fine** — e.g. layered thin necklaces/pearls.
- **A patterned piece, or chunky/statement jewelry, only appears when Tina explicitly asks
  for it in that post's outfit brief.** It is not a default, even though Fina's overall
  persona is "elegant but maximalist" — that identity is expressed through fabric richness
  and layering by default, and through bolder pieces only when specifically requested.

## Setting stays independent of outfit color
The background/location keeps its own natural palette — a cafe stays cafe-colored, a cinema
staircase stays whatever it actually looks like — regardless of what colors the outfit uses.
Explicitly instruct the model NOT to color-match the environment to the outfit. (Pairs with
the existing Rule 5 60:30:10 color-ratio language, which is about the outfit/lighting, not
the backdrop.)

## Lighting matches the scene
Unlike the site's editorial work (which always uses Rule 1's direct-flash + warm-night-
ambiance look), Fina's lighting is judged per scene:
- **Daytime outdoor/candid settings** (e.g. sitting outside a cafe) → soft natural daylight,
  not flash.
- **Evening/event-style settings** → the existing flash + warm ambient look from Rule 1 still
  applies.

**Background/subject exposure must match (added 2026-08-14).** Tina flagged a daylight
generation where the background looked faded/hazy while her face was brightly lit — read as
a "photoshopped cutout" rather than one real photo. The daylight lighting block now
explicitly requires the same light source, exposure, and color temperature across the whole
frame — glowy skin is still fine and wanted, but the background can't look separately/under-
exposed relative to her.
Decide which register fits the scene Tina describes (or the scene picked from
`scene-bank.md`) rather than applying one fixed lighting rule to every post.

## Neck/hijab
See `character.md` — loose drape, neck slightly visible, color asked per post.

## Awrah coverage — conditional mini-layer (always checked, not always shown)
```
Conditional rule: IF the described top is cropped or short enough that the gap between it
and the bottoms could expose her groin/pelvic area, THEN she is also wearing a tight,
fitted, short mini-layer (like a fitted mini-skirt or bike-short style piece) underneath
that gap — as short as possible while still fully covering that area, not longer. IF the
top is a normal/longer length with no such gap, this layer does not apply and is not shown.
```
Added 2026-08-14 per Tina, using the term "awrah" — the area that must stay covered. Unlike
the bodysuit rule (always present), this one is conditional: only relevant when a cropped/
short top would otherwise leave that area exposed. Same standing-rule status as the
bodysuit — not something to ask about per post, it's automatic in `fina_generate.py`.

## Film look: grain, color grade, shallow depth of field (always, added 2026-08-14)
```
Shallow depth of field — she is in sharp focus while the background falls off into gentle
softness behind her, real lens falloff, not everything equally tack-sharp. Subtle natural
film grain and a slightly imperfect, warm color grade — not digital-clean or perfectly
color-corrected.
```
Prompted by feedback (via Tina, from another AI's analysis) comparing our daylight park shot
against a real candid photo: the gap wasn't brightness, it was that everything in our shot
was equally sharp and digitally clean. Took the generalizable parts (grain, color grade,
depth of field) and rejected the non-generalizable one (switching to night+flash as a
universal fix — that's specific to a night scene, not a fix for daylight shots, and
contradicts Tina's explicit daylight/glowy-face direction from earlier the same session).

Also sharpened the existing flash-lighting rule the same session: the mechanism is TWO
mismatched light sources (cool/hard flash on her vs. warm/soft ambient behind), not just
"night + flash" as separate keywords — same insight, tighter wording.

**Second pass same day** — Tina asked to re-check the full pasted feedback against what
had actually been implemented, not just the parts pulled out first. Two real gaps found:
1. `POSE` had lost the body-asymmetry detail (weight on one hip, hands doing different
   things) when it got split out into a separate `FRAMING` block earlier the same session —
   restored, plus the explicit "not symmetrical/centered, two hands doing different things"
   language the feedback called out directly (their critique of an earlier shot: "both hands
   on the railing, centered, balanced" read as posed/AI-like).
2. `FILM_LOOK`'s "background falls into gentle softness" risked contradicting their point
   that a real background stays busy/detailed/textured, not abstracted into blur — added a
   companion clause keeping real architecture/texture/depth explicit alongside the falloff.

## Skin & makeup (always)
```
Skin: always glowy and dewy, natural luminous sheen, never matte or flat. Realistic skin
texture with visible pores and subtle natural imperfections — not airbrushed, not smoothed,
not plastic/CGI-looking.
Makeup: soft natural glam — cheeks a warm natural rose flush, the same rose tone family as
the lipstick so cheeks and lips read as one matching warm-rose palette. Mascara with
clearly defined, separated lashes. Subtle glossy/dewy lip finish. Kept minimal beyond that —
no heavy contour, no bold graphic eyeshadow — unless a post explicitly asks for more.
```
Pore/texture realism added 2026-08-14 per Tina — same instinct as Rule 1's flash/specular
mechanism (§2 of the main playbook): naming the real physical mechanism (pores, texture)
renders better than a generic "photorealistic skin" instruction.

## Bodysuit under every outfit (always)
```
Underneath the outfit, as a base layer, she wears an OPAQUE fitted long-sleeve mock-neck
bodysuit in a solid nude/light-tan shade close to her skin tone — high coverage, like a
plain jersey turtleneck bodysuit, not a low-cut one. It rises all the way to a high
mock-neck collar at the base of her throat. Wherever the outer garment has a low neckline,
V, wrap opening, or gap, what you actually see filling that space is this solid opaque
bodysuit fabric up to its high mock-neck — never her actual bare chest, cleavage, or torso
skin.
```
Added 2026-08-14 per Tina — a standing rule on every generation, not a per-post ask. Keeps
Fina's content within the same modesty register as the rest of the brand even when an outfit
brief includes something low-cut or sheer (e.g. the pink kimono top's V-neckline in the
park/trench post). **Revised same day**: the first wording ("not visible as a garment
itself") was too weak/self-contradictory and produced inconsistent results (bare chest
visible in some generations). Reference: a mock-neck, long-sleeve, opaque nude bodysuit —
think a plain jersey turtleneck bodysuit, high coverage, not the sheer/low-cut kind — Tina
shared a product photo example 2026-08-14 (Fashion Nova style mock-neck bodysuit).
Reference: the mall/escalator candid photo Tina shared 2026-08-14 (dewy glow, rosy
cheeks-matching-lips, defined mascara, soft natural glam) — saved to
`/Users/tina/.claude/image-cache/303d4a24-63e3-4355-855f-f5735c1cf2fa/3.png`, which is a
**session-scoped cache path and may not persist** — worth copying somewhere durable
(e.g. alongside the Krea reference set) if Tina wants to keep it as a lasting visual anchor.

This is a standing rule (always applied), not a per-post intake question. It layers with
Rule 1's flash/specular-highlight skin description when a scene uses flash+night lighting;
for daylight scenes (no flash, per the lighting-matches-scene rule above), the glow comes
from the dewy skin/makeup finish itself rather than flash-driven shine.
