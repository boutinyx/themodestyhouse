/**
 * What may be committed from a Ghost database export.
 *
 * THIS REPOSITORY IS PUBLIC (checked 2026-09-19: the GitHub API answers an unauthenticated
 * request for it). A raw `GET /ghost/api/admin/db/` export holds every writer's UNPUBLISHED
 * DRAFTS, staff accounts and emails, and settings. So the backup keeps only what the public
 * site already serves: published, public posts and the tags attached to them. Everything
 * else is dropped by an allowlist — a table nobody thought of is never included by accident.
 *
 * This is a backup of PUBLISHED WORDS, not of Ghost. Drafts, members and settings live only
 * in Railway's volume and MySQL, and their backup is the open item in the design spec.
 */

const KEEP_TABLES = ['posts', 'tags', 'posts_tags'];

export function publicExport(exported) {
  const data = exported?.db?.[0]?.data;
  if (!data || !Array.isArray(data.posts)) throw new Error('unexpected Ghost export shape: no db[0].data.posts');

  const posts = data.posts.filter((p) => p.status === 'published' && p.visibility === 'public');
  const ids = new Set(posts.map((p) => p.id));
  const postsTags = (data.posts_tags ?? []).filter((r) => ids.has(r.post_id));
  const tagIds = new Set(postsTags.map((r) => r.tag_id));
  const tags = (data.tags ?? []).filter((t) => tagIds.has(t.id) && t.visibility === 'public');

  const out = { posts, tags, posts_tags: postsTags };
  for (const k of Object.keys(out)) if (!KEEP_TABLES.includes(k)) throw new Error(`unallowlisted table ${k}`);
  return { meta: { exported_on: exported.db[0].meta?.exported_on ?? null }, data: out };
}
