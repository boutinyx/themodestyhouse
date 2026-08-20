# Un-link the Verified Spotlight cards; drop article titles from the footer's Editorial column
**Date:** 2026-08-20 · **Status:** done

## Goal
Two things Tina flagged from screenshots of the homepage and footer:
1. Keep the fanned-card "Houses that just earned the seal" animation, but the cards
   should not be clickable.
2. The footer's Editorial column was listing full article titles — remove that, keep
   just the section link.

## What changed
- `components/VerifiedSpotlight.tsx` — each card was an `<a href={h.homepage} target="_blank" …>`
  linking straight to the brand's site. Swapped the wrapper to a plain `<div>` (same
  `tmh-card` classes, same inline `background-image`), so the CSS hover
  tilt/lift/shadow transition — plain `:hover` on `.tmh-card` — is unaffected, but there's
  no href, no click target, no pointer cursor. `data-surface="spotlight"` and the outbound
  `target`/`rel` attributes were dropped along with the anchor since there's no longer a
  navigation to track or secure. "All designers" remains the way to reach the brand list
  from this section.
- `components/Footer.tsx` — the Editorial column previously rendered `<FLink href="/editorial">The Edit</FLink>`
  followed by `getPosts().slice(0, 3).map(...)`, one `<FLink>` per post title (added
  2026-08-19, see the removed comment block for the original SEO rationale — inbound
  internal links per post). Tina asked for the full titles gone; column is now just the
  "The Edit" link. Removed the now-unused `getPosts` import.

## Verification
- `npx tsc --noEmit` (after `rm tsconfig.tsbuildinfo`): clean, no output.
- `npm run build`: succeeds, 40/40 static pages generated, no route changes.
- `npm test`: 1317/1319 pass. The 2 failures are in
  `.claude/worktrees/jiggly-hugging-honey/lib/devOnly.test.ts`, a stale worktree copy of
  the repo unrelated to this change (pre-existing, not touched this session).
- Verified visually against a `next start` production build on port 3179 via Chrome:
  - Homepage fan section — cards render, hover still tilts/lifts (`transform:rotate(0)
    translateY(-10px) scale(1.02)`), cursor is the default arrow (not a link) and hovering
    does not navigate.
  - Footer — Editorial column shows only "The Edit"; the three article-title links are
    gone.

## Notes / follow-ups
None — straightforward reversal of two specific pieces of UI, no other surfaces touched.
