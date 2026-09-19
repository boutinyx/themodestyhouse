#!/usr/bin/env node
/**
 * Write data/ghost-export.json: the PUBLISHED posts and their tags, from Ghost's Admin API.
 * See scripts/lib/ghostExport.mjs for why it is filtered — the repo is public.
 *
 *   GHOST_URL=… GHOST_ADMIN_KEY=<id>:<secret> node scripts/ghost-export.mjs
 *
 * Refuses to write an empty backup: a Ghost that is down or misconfigured must not overwrite
 * yesterday's good copy with nothing.
 */
import { writeFileSync } from 'node:fs';
import { admin } from './lib/ghostAdmin.mjs';
import { publicExport } from './lib/ghostExport.mjs';

const out = publicExport(await admin('GET', 'db/'));
if (out.data.posts.length === 0) {
  console.error('export has no published posts; refusing to overwrite the backup');
  process.exit(1);
}
writeFileSync('data/ghost-export.json', JSON.stringify(out, null, 2) + '\n');
console.log(`wrote data/ghost-export.json: ${out.data.posts.length} posts, ${out.data.tags.length} tags`);
