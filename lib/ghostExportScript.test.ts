import { describe, expect, it } from 'vitest';
// @ts-expect-error -- plain .mjs script helper, no types
import { publicExport } from '../scripts/lib/ghostExport.mjs';

const db = (data: Record<string, unknown[]>) => ({ db: [{ meta: { exported_on: 1 }, data }] });

describe('publicExport', () => {
  const src = db({
    posts: [
      { id: 'p1', status: 'published', visibility: 'public', title: 'Live' },
      { id: 'p2', status: 'draft', visibility: 'public', title: 'A writer\'s unpublished draft' },
      { id: 'p3', status: 'published', visibility: 'paid', title: 'Members only' },
    ],
    tags: [
      { id: 't1', visibility: 'public', name: 'Guides' },
      { id: 't2', visibility: 'public', name: 'Only on the draft' },
    ],
    posts_tags: [
      { post_id: 'p1', tag_id: 't1' },
      { post_id: 'p2', tag_id: 't2' },
    ],
    users: [{ id: 'u1', email: 'staff@example.com', password: 'hash' }],
    settings: [{ key: 'stripe_secret_key', value: 'sk_live' }],
    members: [{ id: 'm1', email: 'reader@example.com' }],
  });

  it('keeps only published public posts', () => {
    const out = publicExport(src);
    expect(out.data.posts.map((p: { id: string }) => p.id)).toEqual(['p1']);
  });

  it('keeps only the tags and joins those posts use', () => {
    const out = publicExport(src);
    expect(out.data.tags.map((t: { id: string }) => t.id)).toEqual(['t1']);
    expect(out.data.posts_tags).toEqual([{ post_id: 'p1', tag_id: 't1' }]);
  });

  it('never carries staff, members or settings, however the export is shaped', () => {
    const json = JSON.stringify(publicExport(src));
    expect(json).not.toContain('staff@example.com');
    expect(json).not.toContain('reader@example.com');
    expect(json).not.toContain('sk_live');
    expect(json).not.toContain('unpublished draft');
    expect(Object.keys(publicExport(src).data).sort()).toEqual(['posts', 'posts_tags', 'tags']);
  });

  it('throws on an export it does not recognise instead of writing an empty backup', () => {
    expect(() => publicExport({})).toThrow(/unexpected/);
  });
});
