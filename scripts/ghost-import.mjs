#!/usr/bin/env node
/**
 * One-off: move content/editorial/*.md into Ghost, then read each post back through the
 * PUBLIC Content API and diff it against the source. Idempotent — a post whose slug already
 * exists in Ghost is not created again, only re-diffed.
 *
 *   node scripts/ghost-import.mjs --dry     # convert + self-check, touches nothing
 *   GHOST_URL=… GHOST_ADMIN_KEY=<id>:<secret> GHOST_CONTENT_KEY=… node scripts/ghost-import.mjs
 *
 * Not Ghost's own importer, so WEBHOOKS FIRE for each post. Harmless: the site is not yet
 * reading Ghost when this runs (the plan's sequencing), and a webhook to a host that has not
 * been registered yet simply has no receiver.
 *
 * Byline: `authors` is omitted, so Ghost assigns the Owner. The Owner's display name must be
 * "The Modesty House" (set in Ghost Admin) so the five bylines read as they do today.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { admin, ghostEnv } from './lib/ghostAdmin.mjs';
import { htmlToText, markdownToHtml, parseFrontmatter, words } from './lib/markdownToHtml.mjs';

const DRY = process.argv.includes('--dry');
const DIR = 'content/editorial';
const DEK_MAX = 300; // Ghost's custom_excerpt limit
const CATEGORY = { Guide: 'Guides' }; // normalised on the way in

const problems = [];
const problem = (slug, msg) => {
  problems.push(`${slug}: ${msg}`);
  console.error(`PROBLEM ${slug}: ${msg}`);
};

const files = readdirSync(DIR).filter((f) => f.endsWith('.md')).sort();
if (files.length === 0) throw new Error(`no markdown posts found in ${DIR}`);

const posts = files.map((f) => {
  const { fm, body } = parseFrontmatter(readFileSync(join(DIR, f), 'utf8'));
  const slug = fm.slug || basename(f, '.md');
  const html = markdownToHtml(body);
  if (!fm.title || !fm.date) problem(slug, 'missing title or date');
  if ((fm.dek ?? '').length > DEK_MAX) problem(slug, `dek is ${fm.dek.length} chars, over Ghost's ${DEK_MAX}`);
  if (fm.author && fm.author !== 'The Modesty House') problem(slug, `author is "${fm.author}"; the import assigns the Owner`);
  // The conversion must not lose a word: compare the words in the source with the words in the HTML.
  const src = new Set(words(body.replace(/\]\([^)]*\)/g, ']'))); // link targets are not prose
  const out = new Set(words(htmlToText(html)));
  const lost = [...src].filter((w) => !out.has(w));
  if (lost.length) problem(slug, `conversion dropped words: ${lost.slice(0, 12).join(', ')}`);
  return { fm, slug, html, body };
});

if (DRY) {
  for (const p of posts) console.log(`${p.slug}: ${p.html.length} chars of HTML, ${words(htmlToText(p.html)).length} words`);
  if (problems.length) process.exit(1);
  console.log(`\ndry run ok: ${posts.length} posts convert cleanly`);
  process.exit(0);
}

const { url } = ghostEnv();
const contentKey = process.env.GHOST_CONTENT_KEY;
if (!contentKey) throw new Error('GHOST_CONTENT_KEY is not set (needed for the read-back diff)');

async function uploadCover(path) {
  const file = join('public', path.replace(/^\//, ''));
  // A Blob with no `type` reaches Ghost with no content type and is refused as "not a valid image".
  const type = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }[file.split('.').pop().toLowerCase()];
  if (!type) throw new Error(`unsupported cover image type: ${file}`);
  const form = new FormData();
  form.append('file', new Blob([readFileSync(file)], { type }), basename(file));
  form.append('purpose', 'image');
  const res = await admin('POST', 'images/upload/', { form });
  return res.images[0].url;
}

for (const { fm, slug, html, body } of posts) {
  let exists = true;
  try {
    await admin('GET', `posts/slug/${encodeURIComponent(slug)}/`);
  } catch (e) {
    if (!String(e.message).includes('-> 404')) throw e;
    exists = false;
  }

  if (exists) {
    console.log(`exists  ${slug} (not re-created)`);
  } else {
    const feature_image = fm.image ? await uploadCover(fm.image) : undefined;
    await admin('POST', 'posts/?source=html', {
      json: {
        posts: [
          {
            slug,
            title: fm.title,
            html,
            custom_excerpt: fm.dek || undefined,
            meta_title: fm.seoTitle || undefined,
            meta_description: fm.seoDescription || undefined,
            feature_image,
            feature_image_alt: fm.imageAlt || undefined,
            tags: fm.category ? [CATEGORY[fm.category] ?? fm.category] : [],
            published_at: `${fm.date}T09:00:00.000Z`,
            status: 'published',
          },
        ],
      },
    });
    console.log(`created ${slug}`);
  }

  // Read back through the PUBLIC API — what the site will actually see — and diff.
  const res = await fetch(
    `${url}/ghost/api/content/posts/slug/${encodeURIComponent(slug)}/?key=${contentKey}&include=tags,authors&formats=html,plaintext`,
    { headers: { 'Accept-Version': 'v6.62' } },
  );
  if (!res.ok) {
    problem(slug, `Content API read-back returned ${res.status}`);
    continue;
  }
  const got = (await res.json()).posts[0];
  const have = new Set(words(got.plaintext));
  const lost = [...new Set(words(body.replace(/\]\([^)]*\)/g, ']')))].filter((w) => !have.has(w));
  if (lost.length) problem(slug, `Ghost's plaintext is missing source words: ${lost.slice(0, 12).join(', ')}`);
  if (got.title !== fm.title) problem(slug, `title differs: "${got.title}"`);
  if (fm.image && !got.feature_image) problem(slug, 'cover image did not attach');
  if (got.published_at.slice(0, 10) !== fm.date) problem(slug, `date differs: ${got.published_at}`);
  if (!got.primary_tag) problem(slug, 'no primary tag');
  console.log(`checked ${slug}: ${got.primary_tag?.name}, by ${got.primary_author?.name}`);
}

if (problems.length) {
  console.error(`\n${problems.length} problem(s):\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log('\nimport verified');
