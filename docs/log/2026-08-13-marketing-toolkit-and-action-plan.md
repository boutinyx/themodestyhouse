# Installed AI marketing skill suite; wrote a do/don't action plan
**Date:** 2026-08-13 · **Status:** done

## Goal
Tina wanted a GitHub repo she could point Claude at for marketing/competitive analysis, and
a concrete do/don't plan built from the existing MDST competitive research.

## What changed
- Cloned [ai-marketing-claude](https://github.com/zubair-trabzada/ai-marketing-claude) to
  `/Users/tina/ai-marketing-claude` (outside this repo — it's a general-purpose Claude Code
  skill suite, not project-specific).
- Ran its `install.sh`, which copied 14 skills + 5 agents + 4 scripts into
  `~/.claude/skills/market-*` and `~/.claude/agents/market-*`. Adds `/market audit`,
  `/market competitors`, `/market social`, etc. as global slash commands in future sessions.
  Reversible via `~/ai-marketing-claude/uninstall.sh`.
- Wrote `docs/marketing-action-plan.md` — a do/don't checklist distilled from the existing
  `docs/marketing-strategy-vs-mdst.md`, plus a note on how the newly installed `/market`
  commands complement that file's own reusable research prompt.

## Verification
- `git clone` exit 0; `find` confirmed repo structure (14 skills, 5 agents, scripts,
  templates).
- `install.sh` ran to completion: "Skills installed: 14 / Agents installed: 5 / Scripts
  installed: 4 / Templates installed: 6", Python 3.9 + reportlab + requests all detected.
- New skill listing in this session confirms all 15 `market*` skills are now registered.

## Notes / follow-ups
- No new competitor research was run — `docs/marketing-strategy-vs-mdst.md` is same-day
  (2026-08-13) and already verified, so the action plan was built from it directly rather
  than re-fetching.
- The installed toolkit is a third-party MIT-licensed repo, not audited line-by-line before
  install; it only writes to `~/.claude/skills` and `~/.claude/agents` and was reviewed at
  the SKILL.md/install.sh level before running.
