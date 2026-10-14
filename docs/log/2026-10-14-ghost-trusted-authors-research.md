# Can specific Ghost users skip the allowlist? (research)
**Date:** 2026-10-14 · **Status:** research only, nothing built

## Question
Tina: can we remove the whole allowlist for specific users only?

## Findings
- **Ghost doesn't filter HTML; our site does** (`components/GhostHtml.tsx`). So the switch
  lives on our side. Nothing needs installing in Ghost.
- **The site already receives each post's authors:** `lib/ghost.ts` requests
  `include=tags,authors`. A per-person switch is therefore possible.
- **Who can fake authorship.** This comes from Ghost 6.70.0's own code
  (`core/server/models/relations/authors.js`, `permissible`), not from documentation:
  - Contributor and Author roles can't change a post's primary author (`!isChangingAuthors()`).
  - When an Author creates a post, they must be its author (`isOwner()`).
  - Editors and Administrators can set any author.
  - Staff today: Tina (Owner), usman (Admin), inomadigital (Admin).
- **To make the switch hold:**
  - Key it on Ghost user **ids**, not slugs. Users can edit their own slug.
  - Require **every** author on the post to be trusted. Authors can be co-authors on posts
    they don't own.
- **The risk:** the CSP allows `script-src 'unsafe-inline'`, so raw HTML from a trusted
  account could run code on every visitor's page. That means affiliate-link hijack, tracking,
  defacement. It would only take that account being compromised.
- **Middle option:** for trusted authors, swap our allowlist for DOMPurify's defaults. All
  normal HTML, CSS, classes and `<style>` would be allowed; scripts, event handlers and
  `javascript:` URLs would still be stripped. Keep a hook that adds UTM and
  `rel="sponsored"` to outbound links (§6 requirement). Pasted `<style>` blocks are global,
  so they could restyle the header and footer unless scoped.
- **Estimate:** about half a day to a day, including tests and a staging check.
