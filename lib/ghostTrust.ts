/**
 * Ghost staff whose posts skip the HTML allowlist (Tina, 2026-10-14: the agency kept losing its
 * own styling). Their HTML and CSS render as written; GhostHtml's trusted mode still strips
 * anything that can RUN or SUBMIT (scripts, event handlers, javascript: URLs, forms).
 *
 * Keyed by Ghost user ID, never slug or name: a user can edit their own slug in Ghost, so a
 * slug could be taken over. Read the ids with the Admin API: GET users/?fields=id,slug.
 *
 * Who can fake an author (Ghost 6.70.0, core/server/models/relations/authors.js): Contributors
 * and Authors cannot change a post's primary author and can only create posts as themselves.
 * Editors and Administrators can set any author, so only ever invite those roles if you would
 * trust them here anyway. → docs/log/2026-10-14-ghost-trusted-authors-research.md
 */
export const TRUSTED_GHOST_AUTHOR_IDS: ReadonlySet<string> = new Set([
  '6ab11a96b4f0b200019e388c', // inomadigital — Inoma Digital, the SEO agency
]);

/**
 * A post is trusted only when EVERY author on it is. A co-author can edit a post's body, so one
 * untrusted co-author on a trusted author's post would otherwise get the trusted path too.
 */
export function isTrustedPost(authors: ReadonlyArray<{ id: string }> | null | undefined): boolean {
  return !!authors && authors.length > 0 && authors.every((a) => TRUSTED_GHOST_AUTHOR_IDS.has(a.id));
}
