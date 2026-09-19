# ADR-0003 — Ghost as a headless CMS for /editorial

**Date:** 2026-09-19 · **Status:** accepted (Tina approved the design 2026-09-07 and the multi-author
addendum 2026-09-19). Supersedes the "no subscriber database" premise of ADR-0001 for the newsletter list only.

## Context

Editorial posts were markdown files in `content/editorial/`, committed by hand. More people are
going to publish, and none of them should need git. The footer sign-up also only emailed the owner
an address; there was no list, no double opt-in and no unsubscribe.

## Decision

Self-host **Ghost 6.62.0** (pinned) on Railway beside the site, **headless**: writers use Ghost's
editor, the site renders every page in the house design from the Content API, and no visitor ever
sees a Ghost-rendered page. MySQL 8.4 (pinned) holds it; Mailgun's HTTP API sends its mail
(Railway blocks outbound SMTP on Hobby). Writers join as **Author**: they publish their own
posts and cannot touch anyone else's or the site's settings.

- The site reads through `lib/ghost.ts` behind an unchanged `Post` type (`body` → `html`).
- HTML is rendered as React elements through an **allowlist** (`components/GhostHtml.tsx`); the
  allowlist is the sanitiser. `dangerouslySetInnerHTML` is never used.
- A publish reaches the site through a **signed webhook** (`/api/ghost/revalidate`), not a rebuild:
  it revalidates the `ghost-posts` tag and affected paths, regenerates them, then purges Cloudflare.
- The footer sign-up relays to Ghost's members API; Ghost owns the double opt-in.
- Ghost's own front end is a six-file redirect theme that serves `noindex` and forwards to the site.

## Consequences

- One more service to keep alive, and a members database that is **not backed up** (Railway Hobby has
  no volume backups). The nightly export is deliberately filtered to published posts only, because
  the repository is **public**: a raw export would publish every draft and every staff account.
- Every deploy needs Ghost reachable at **build** time. `generateStaticParams` throws on an empty or
  unreachable Ghost rather than shipping an empty blog.
- Authors publish with no review. The editorial rules in CLAUDE.md §7 rest on the writer's judgement;
  the site-side mitigation is that prose links get `withUtm()` and `rel="sponsored"` automatically.
- `/subscribed` and the footer pill's "you're on the list" now describe different moments (submitted
  vs confirmed). The pill's wording is Tina's to change.

## Alternatives considered

- **Ghost(Pro):** no ops, but the platform fee and no control over the host. Rejected in the spec.
- **Railway Pro + Resend SMTP:** Ghost has no Resend HTTP transport, and SMTP is blocked on Hobby.
- **Keep markdown, add a git-based editor (Decap etc.):** does nothing for the sign-up list and still
  puts writers in a git workflow.
- **Ghost "private site" mode:** does not block the Content API and walls the members landing page.
  A redirect theme does the job.

Full design: `docs/superpowers/specs/2026-09-07-ghost-headless-cms-design.md` and
`docs/superpowers/specs/2026-09-19-ghost-multi-author-addendum.md`.
