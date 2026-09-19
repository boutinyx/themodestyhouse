# Ghost multi-author addendum

**Date:** 2026-09-19 · **Status:** approved by Tina, 2026-09-19
**Amends:** `2026-09-07-ghost-headless-cms-design.md` (still the source of truth for everything not listed here)

## Goal

The base spec has one writer, Tina. Other people will now post to `/editorial` through Ghost.
This addendum records what changes for them and nothing else.

## Decisions

1. **Role: Author.** Tina is Owner. Each writer is invited in Ghost Admin as **Author**: they
   write and publish their own posts, cannot edit anyone else's, and cannot change site
   settings, integrations or staff. Rejected: Contributor (drafts only, every post needs
   Tina) and Editor (edits everyone's posts, including hers).
2. **Invites need working mail.** Ghost emails staff invitations and sign-in verification
   codes through the Mailgun setup in the base spec, so infra phase 1 must finish, with a
   delivered test email, before anyone is invited.
3. **Bylines.** `Post.author` (a string in `lib/posts.ts`) is filled from the Ghost author's
   display name via `lib/ghost.ts`, falling back to `The Modesty House` when a post has none.
   The five imported posts keep the bylines they have now.
4. **No author pages.** Ghost's author archive stays disallowed in robots.txt, as in the base
   spec. The site renders the byline only. Author pages (`/editorial/authors/<name>`) are a
   separate feature if wanted later.
5. **Publishing is unreviewed.** An Author's post is live within seconds of publishing, so
   the editorial rules in CLAUDE.md §7 (women's only, no non-apparel) depend on the writer.
   The site-side mitigation is already in the base spec: prose links get `withUtm()` and
   `rel="sponsored"`, so a writer cannot ship an untagged affiliate link.

## Sequencing change

Base spec phase 1 (infra) is unchanged but gains a last step: invite writers **after** the
Mailgun test email is delivered. Phases 2-7 are unchanged.

## Out of scope

Author pages, per-author RSS, a review queue, and draft previews in the house design (already
listed as open items in the base spec).
