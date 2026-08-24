# Fina — per-post workflow

## The loop
1. Tina gives the exact outfit/clothing brief for that post (every garment, color, material
   — she's explicit about this on purpose, don't guess at clothing).
2. Claude runs the **intake checklist** below for anything not already covered by her brief.
3. Claude picks/varies the scene and pose creatively within `style-rules.md` and
   `scene-bank.md`, unless Tina specified a location.
4. Generate (default: 2 images per request, per Tina's stated preference).
5. Show her the results directly (inline images or a quick contact-sheet HTML, same pattern
   used earlier this session).

## Intake checklist — run this every time before generating
Ask whatever isn't already answered by Tina's brief. Don't skip silently and guess on these
— they're the ones most likely to make or break a post:

1. **Hijab color for this post.** Always ask — no default (confirmed 2026-08-14: guessing
   wrong on something this visible isn't worth the saved question).
2. **Setting/location** — only ask if Tina didn't name one. If she didn't, either propose a
   pick from `scene-bank.md` (or a new one in the same territory) and confirm, or just go
   with a strong pick and say what was chosen — judgment call based on how much the rest of
   the brief already implies a mood (e.g. "coffee run" outfit → cafe scene is obvious enough
   not to ask).
3. **Anything explicitly patterned or statement jewelry** — this resolves automatically from
   her clothing brief (§ style-rules.md: only included if she asked for it), no separate
   question needed unless her brief is ambiguous about whether a described piece counts as
   "patterned"/"statement."
4. **Count/format** — only ask if she wants something other than the 2-image, Pinterest-
   vertical default.

5. **Deep-V / fully open-front tops** — flag it, don't block on it. If Tina's brief
   includes this neckline shape, mention that it's the one known failure case for the
   bodysuit coverage rule (2026-08-14: 0/4 held on one such top across 5 prompt-wording
   attempts) before generating, so she can decide whether to swap the piece or accept the
   higher reroll rate.

## What NOT to ask about
- Lighting register (daylight vs. flash/night) — Claude judges this per scene per
  `style-rules.md`, not a question to Tina each time.
- Pose/composition specifics beyond what she gives — creative latitude, per her instruction
  ("you can be creative and give your own twist").
