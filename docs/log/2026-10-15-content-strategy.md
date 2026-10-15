# Full content strategy (agents + ChatGPT, two rounds)
**Date:** 2026-10-15 · **Status:** done

## Goal
Tina asked for her whole content strategy. She suggested going back and forth with ChatGPT, in a normal chat (not a temporary one) so it could use its tools.

## What changed
- Ran an 8-agent workflow (wf_6303aa4b-82b): read the vault, read the repo plus Pulse, external research, 3 strategist drafts (audience, business, solo feasibility), a critic, and a synthesis.
  - Saved as `~/ModestDirectory/Instagram/Content strategy - agents draft.md` and `... - research appendix.md`.
- ChatGPT round 1: an independent plan from a neutral brief. Chat "Content strategy research", GPT-6.1 Sol in Work mode. Condensed in `Strategy - ChatGPT round 1.md`.
- ChatGPT round 2: I uploaded the agents' draft and asked for a hard critique.
  - Accepted from the critique: 3 guaranteed posts a week, with no Ramadan escalation.
  - Best Fits every 2 weeks with one woman.
  - A protected 6-week Pinterest test of 5 linked pins a week, after a diagnosis of where the funnel fails.
  - Judge a format after about 6 executions.
  - Dropped the causal AI-mention claims.
  - Added an affiliate-coverage audit, an evidence label on verdicts, and paid features kept separate.
  - Check whether the ChatGPT drop is partly an attribution change (Profound, 14 Oct).
- Final: `~/ModestDirectory/Instagram/Content strategy.md`, plus an HTML version in `content-strategy/index.html` (rendered with marked from a CDN, with a TOC sidebar).

## Verification
- Brand count: `data/brands.ts` on origin/main has 116 slugs, and two of them are Touché Privé (`touche-prive` and `touche-prive-eu`). So there are 115 distinct houses. The homepage says 116. ChatGPT's count of 115 is correct.
  - CLAUDE.md §2 is untracked; I updated it locally to 116 feeds.
- HTML: a Playwright render found 13 sections and 8 tables, with 0 page errors. I also looked at a screenshot.

## Notes / follow-ups
- `launch-calendar/index.html` and `Content calendar.md` still follow the 9-post launch run (4–5 a week). Sync them to 3 a week once Tina decides on the Birkin timing.
- Homepage "116 houses" vs 115 distinct names: a site fix that needs staging and Tina's approval.
- ChatGPT referral drop: before more off-site work, compare Pulse referrer vs utm classification around 9 Oct.
