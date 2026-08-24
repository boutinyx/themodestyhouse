> **DISCONTINUED 2026-08-15.** Tina: "forget the fina were not doing that anymore." No
> reason given. Treat everything below as historical — don't resume, extend, or reference
> it as active work unless she explicitly asks again. See the memory file
> `fina-project-discontinued.md` in the assistant's memory store.

# Fina — Pinterest outfit-inspo character

Working folder for a recurring Pinterest content series: an influencer-style AI character,
**Fina**, posting elegant/maximalist outfit-inspo shots in cute aesthetic locations
(cafes, cinema staircases, etc.). Separate persona from the site's own editorial-photography
work in `docs/ai-content-production-playbook.md` — same underlying technique, different
styling rules and a different production loop.

## Files
- **`HANDOFF.md`** — start here after a context reset. Full current state, what works, what
  doesn't, exact commands.
- `character.md` — who Fina is: physical anchor, hijab styling, identity-lock setup,
  `custom_reference_id`
- `style-rules.md` — every standing prompt rule and why it exists (bodysuit, awrah layer,
  skin/makeup, film look, pose, lighting) — mirrors `scripts/fina_generate.py`'s constants
- `scene-bank.md` — location/setting ideas, growing list
- `workflow.md` — the per-post process, including the intake checklist to run every time
- `pipeline.md` — full technical history: SDK-vs-CLI discovery, the bodysuit reliability
  saga, the edit-pass fix

## Status (2026-08-14, end of session)
**Working end-to-end.** `scripts/fina_generate.py` generates identity-locked, on-brief
posts; `scripts/fina_fix_coverage.py` patches any coverage miss after the fact. See
`HANDOFF.md` for the full picture before doing anything else.
