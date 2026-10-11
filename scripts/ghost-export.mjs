#!/usr/bin/env node
/**
 * Write data/ghost-export.json: the PUBLISHED posts and their tags, from Ghost's Admin API.
 * See scripts/lib/ghostExport.mjs for why it is filtered — the repo is public.
 *
 *   GHOST_URL=… GHOST_ADMIN_KEY=<id>:<secret> node scripts/ghost-export.mjs
 *
 * Reads posts/ rather than db/: an integration key gets 403 "You do not have permission to
 * exportContent db" there, which is why this job failed every night from 2026-09-21 to
 * 2026-10-11. Authors are not requested, so no staff name or email is ever fetched. The
 * result is reshaped into the db-export layout publicExport() already filters.
 *
 * Refuses to write an empty backup: a Ghost that is down or misconfigured must not overwrite
 * yesterday's good copy with nothing.
 */
import { writeFileSync } from 'node:fs';
import { admin } from './lib/ghostAdmin.mjs';
import { publicExport } from './lib/ghostExport.mjs';

const res = await admin(
  'GET',
  'posts/?filter=status:published%2Bvisibility:public&include=tags&formats=lexical,html&limit=all',
);
const tags = new Map();
const postsTags = [];
const posts = res.posts.map(({ tags: postTags = [], ...rest }) => {
  const post = { ...rest };
  delete post.primary_tag;
  for (const t of postTags) {
    tags.set(t.id, t);
    postsTags.push({ post_id: post.id, tag_id: t.id });
  }
  return post;
});
const out = publicExport({
  db: [{ meta: { exported_on: Date.now() }, data: { posts, tags: [...tags.values()], posts_tags: postsTags } }],
});
if (out.data.posts.length === 0) {
  console.error('export has no published posts; refusing to overwrite the backup');
  process.exit(1);
}
writeFileSync('data/ghost-export.json', JSON.stringify(out, null, 2) + '\n');
console.log(`wrote data/ghost-export.json: ${out.data.posts.length} posts, ${out.data.tags.length} tags`);
