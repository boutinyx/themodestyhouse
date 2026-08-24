# Playbook: add character anchor sheet + color-ratio rule
**Date:** 2026-08-14 · **Status:** done

## Goal
Tina liked two specific ideas from a downloaded (unrelated) skill,
`~/Downloads/higgsfield-seedance-shotlist-director.skill` — a Seedance 2.0 *video* shotlist
generator, not something this project uses — and wanted them folded into the project's own
still-image playbook: (1) reusable character-anchor text blocks for identity continuity, and
(2) structured color/lighting language ("the coloring of the area").

## What changed
`docs/ai-content-production-playbook.md`:
- New §1 "Character anchor sheet" — a fixed, verbatim-reusable physical description of the
  character, verified against the real photos in `/Users/tina/Krea` (not invented). This is
  the concrete write-up of what's already being used as a fallback while Higgsfield's
  upload endpoint is broken (see the previous log entry).
- New Rule 5 "Color: the 60:30:10 ratio" inside the (now six) standing style rules —
  adapted from the Seedance skill's "Style Prefix" 60:30:10 color-ratio concept, scoped to
  this project's existing elegant-Y2K palette from Rule 0.
- Renumbered §§2–5 → §§3–6 to fit the new §1, and fixed every internal cross-reference
  (§2/§3 mentions in the outfit-prompting, face-position, tool-pipeline, and
  before-publishing sections). Also corrected one pre-existing stale cross-reference (old
  Rule 4 pointed at "§3" for the QA checklist, which has always lived in the outfit-
  prompting section — now correctly points at §3 post-renumber).
- Fixed the one outside reference to the old numbering, in
  `docs/log/2026-08-14-higgsfield-soul-reference-upload-broken.md` (§4.1 → §5.1).

## Verification
- `grep -n '§[0-9]' docs/ai-content-production-playbook.md` reviewed by hand — every
  cross-reference now points at the section it actually describes.
- Confirmed no other doc references this file's old section numbers
  (`grep -rn "ai-content-production-playbook" docs CLAUDE.md`).

## Notes / follow-ups
- The Seedance skill itself is not adopted — it's for narrative video (scripts, scenes,
  dialogue), a different medium from this project's still-image work. See the assistant's
  explanation to Tina in-session for the full comparison.
