# Wrote the AI content production playbook (character, outfit, scenery, pose)
**Date:** 2026-08-14 · **Status:** done

## Goal
Consolidate a full session of iterating on the AI hijabi-character content pipeline
(Krea character LoRA, garment application, Runway scene compositing, Magnific detail pass)
into a single reusable reference, so the working techniques and failure patterns don't need
to be re-discovered on the next production run.

## What changed
- Wrote `docs/ai-content-production-playbook.md`: four standing style rules (flash/skin
  sheen, candid pose, warm ambient setting, detailed layered outfit), the outfit-merging
  failure pattern and its fix, a pose/angle reliability table, the four-tool pipeline
  (Krea → Runway → Magnific → Photoshop for spot-fixes) with the exact settings that held
  identity (Optimize for: Character, non-real trigger words, Magnific Resemblance 10 /
  Creativity -6), and a pre-publish checklist including the EU AI Act disclosure
  requirement.

## Notes / follow-ups
- This is process documentation for marketing content production, not a site/code change —
  no verification commands apply. The content itself was synthesized from this session's
  own iteration, not copied from any reference material.
- Revisit the pose/angle reliability table periodically; it reflects tool behavior as of
  2026-08-14 and may drift as these platforms update their models.
