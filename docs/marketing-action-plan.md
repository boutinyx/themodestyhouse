# Marketing action plan — do / don't

**Date:** 2026-08-13 · **Status:** active
**Source:** distilled from `docs/marketing-strategy-vs-mdst.md` (full MDST/Slate/Kauna
competitive intel, verified from real posts, 2026-08-13). That file has the evidence and the
"why" — this file is the checklist to actually work from. Tooling: the
[ai-marketing-claude](https://github.com/zubair-trabzada/ai-marketing-claude) skill suite is
now installed (`~/.claude/skills/market-*`), giving `/market competitors <url>`,
`/market audit <url>`, `/market social`, etc. for future runs — see §4.

---

## 1. Do this, in order

| # | Action | Why (evidence) | Effort |
|---|---|---|---|
| 1 | Start a **weekly UGC/reader-feature** post: solicit readers' modest outfits built from linked brands, feature them | MDST's only reliable comment driver (14–18 comments vs. median 2) | Low |
| 2 | Start a recurring **"what we cut this week and why"** post, tied to real `exclusions.json` entries (categories only — never name blocklisted brands) | Directly counters the AI-leak finding shared by MDST/Slate/Kauna; shows judgment a faceless competitor can't fake | Low |
| 3 | Get a **real person on camera**, even occasionally — explaining a pick, "3 things I rejected this week," reacting to a reader outfit | Single highest-leverage finding: founder/team content beat brand-voice by 5–7x on MDST's own numbers | Medium (depends on Tina's willingness — see Notes) |
| 4 | Stand up **Pinterest properly**: occasion-based boards (wedding guest, Eid, interview, graduation, summer modest, hijab-friendly workwear), pinned from your own catalogue, consistent cadence | MDST proved the taxonomy works, then abandoned it at 3 followers — open lane | Medium |
| 5 | Start the **editorial/long-form habit now**, even slowly: styling guides tied to real occasions, brand spotlights on *why* a brand made the cut, seasonal capsules | MDST's Substack: promoted everywhere, 21 subscribers, zero posts in 8 months — competitors structurally can't sustain this | Medium (compounds slowly, start early) |
| 6 | Build a **content calendar around real cultural/seasonal moments** (Ramadan, Eid, weddings, back-to-school modest workwear, plus local European moments), planned ahead not reactive | MDST's single best post ever (by every metric) was a Ramadan reel | Low–Medium |
| 7 | If the catalogue genuinely spans multiple aesthetics/communities, **show it** — a hijabi outfit next to a modest-secular outfit next to a modest-Christian outfit, same catalogue | The credible version of MDST's "modesty has never had just one definition" tagline — earned, not stated | Low |

## 2. Don't do this

| # | Don't | Why (evidence) |
|---|---|---|
| 1 | Don't post the value proposition as a value proposition (no "modest shopping shouldn't feel like a full-time job" style captions) | MDST's own literal pitch post is their **worst-performing post on both platforms simultaneously** |
| 2 | Don't spread thin across 5+ channels | MDST runs Instagram/TikTok/Pinterest/Substack/Reddit — only the first two get real attention; the rest sit nearly empty. Pick 2–3 sustainable at real cadence |
| 3 | Don't lean on AI/tech claims in marketing copy | Contested ground competitors outspend you on, currently unvalidated (their "opacity meter" has no published methodology), and not what their own audience responds to anyway |
| 4 | Don't compete on catalogue size | Their bigger number is inflated by Temu/AliExpress/boohoo. "Fewer but better" is the actual differentiator — don't undercut it by chasing volume |
| 5 | Don't launch a channel without a real cadence behind it | MDST's Pinterest (109 pins, 3 followers, dormant since 2026-07-24) and Substack (0 posts in 8 months) are both proof a started-then-abandoned channel is a liability, not an asset |
| 6 | Don't disclose which brands are permanently blocklisted, even when talking about cuts publicly | Legal/relationship risk — categories of cuts are fair game ("we don't carry mass-market synthetic abayas"), specific brand names are not |

## 3. Sequencing

1. **Now:** items 1 and 2 from §1 — cheapest to start, directly hit the proven engagement
   pattern, reinforce the AI-leak differentiator.
2. **Next:** item 4 — Pinterest, occasion-based boards, essentially uncontested right now.
3. **Ongoing, started early because it compounds slowly:** item 5 — editorial/long-form
   cadence, doubles as the SEO/GEO surface MDST has ceded.
4. **Parallel:** item 6 (content calendar) feeds items 1, 2 and 5 rather than standing alone.

## 4. Tooling now available

`ai-marketing-claude` is cloned to `/Users/tina/ai-marketing-claude` and installed into
`~/.claude/skills/market-*` (14 skills, 5 agents, 4 scripts). Once you start a new Claude Code
session, these are live:

- `/market competitors <url>` — re-run a fuller competitor scan against a specific URL
  (complements, doesn't replace, the reusable prompt in `marketing-strategy-vs-mdst.md` §3,
  which is tuned specifically to MDST/Slate/Kauna's actual social presence)
- `/market audit <url>` — score The Modesty House's own site across content, conversion, SEO,
  competitive positioning, brand/trust, growth
- `/market social <topic>` — draft a 30-day content calendar (use as a first draft only —
  verify every claimed metric before publishing anything derived from it, per this project's
  "no invented numbers" rule)
- `/market seo` — pairs with the existing `docs/seo-geo-aeo-plan.md` work already in this repo

Uninstall anytime with `~/ai-marketing-claude/uninstall.sh` if unwanted.

## Notes / follow-ups

- Item 3 (real person on camera) is the single highest-leverage item in this whole plan per
  MDST's own numbers. If that's off the table, item 1 (UGC/reader features) becomes the
  primary substitute and should move up in priority.
- Re-run `marketing-strategy-vs-mdst.md` §3's prompt roughly quarterly, or sooner if
  MDST/Slate/Kauna ship a visible strategy shift (new channel, pricing change, funding news).
- This plan is a checklist derived from verified research, not new research itself — if any
  of the underlying numbers are challenged, the source of truth is
  `docs/marketing-strategy-vs-mdst.md` §1, not this file.
