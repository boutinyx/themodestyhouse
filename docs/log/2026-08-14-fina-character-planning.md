# Fina — Pinterest character: planning folder created
**Date:** 2026-08-14 · **Status:** partial (planning only, nothing generated yet)

## Goal
Tina wants a named, consistent AI character ("Fina") for a recurring Pinterest outfit-inspo
content series — distinct persona/rules from the site's existing editorial-photography work.
Asked for an implementation plan first, then for everything discussed to be saved to a
folder she can come back to, and for a standing intake checklist so future posts get the
right questions asked upfront.

## What changed
New `docs/fina/` folder:
- `README.md` — index
- `character.md` — Fina's identity (shared physical anchor + Fina-specific hijab styling
  exception + body description), Higgsfield `custom_reference_id` placeholder
- `style-rules.md` — styling register (elegant baseline, maximalist only when explicitly
  requested), setting-independent-of-outfit-color rule, per-scene lighting rule
- `scene-bank.md` — seed scene ideas (cafe/matcha overhead, cinema staircase 3/4)
- `workflow.md` — per-post loop + the intake checklist (ask hijab color every time; ask
  setting only if unspecified; don't ask about lighting register, Claude judges that)
- `pipeline.md` — technical plan for `scripts/fina_generate.py`, blocked on Tina's
  `custom_reference_id`

Also updated the shared character anchor in `docs/ai-content-production-playbook.md` §1
(and mirrored into `docs/fina/character.md`) with a body description Tina added mid-session:
slim build, subtle hourglass (not exaggerated hips), B cup.

## Verification
N/A — planning/documentation only, no code run. Verification is deferred to when
`scripts/fina_generate.py` is actually built and run (see `docs/fina/pipeline.md`).

## Notes / follow-ups
- Next concrete step: Tina supplies the `custom_reference_id` UUID from her trained
  Higgsfield character → build the script per `docs/fina/pipeline.md`.
- Task list item #4 (in this session) tracked getting this ID — superseded by this folder,
  see `docs/fina/pipeline.md` for current status instead.
