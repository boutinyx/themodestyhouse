import { describe, expect, it } from 'vitest';
import { isTrustedPost, TRUSTED_GHOST_AUTHOR_IDS } from './ghostTrust';
import { ghostPostToPost, type GhostRaw } from './ghost';

const AGENCY = '6ab11a96b4f0b200019e388c';
describe('isTrustedPost', () => {
  it('trusts a post only when every author is listed', () => {
    expect(TRUSTED_GHOST_AUTHOR_IDS.has(AGENCY)).toBe(true);
    expect(isTrustedPost([{ id: AGENCY }])).toBe(true);
    expect(isTrustedPost([{ id: AGENCY }, { id: 'someone-else' }])).toBe(false);
    expect(isTrustedPost([{ id: 'someone-else' }])).toBe(false);
    expect(isTrustedPost([])).toBe(false);
    expect(isTrustedPost(undefined)).toBe(false);
  });
  it('flows through to the Post the page renders', () => {
    const raw = { slug: 's', title: 't', custom_excerpt: null, excerpt: 'e', published_at: '2026-10-14T00:00:00.000Z', feature_image: null, feature_image_alt: null, html: '', plaintext: '', meta_title: null, meta_description: null, primary_tag: null, primary_author: null } satisfies GhostRaw;
    expect(ghostPostToPost({ ...raw, authors: [{ id: AGENCY }] }).trustedHtml).toBe(true);
    expect(ghostPostToPost({ ...raw, authors: [{ id: 'x' }] }).trustedHtml).toBe(false);
    expect(ghostPostToPost(raw).trustedHtml).toBe(false);
  });
});
