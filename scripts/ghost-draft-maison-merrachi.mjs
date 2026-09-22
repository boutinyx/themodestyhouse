#!/usr/bin/env node
/**
 * One-off: create the "What Is Maison Merrachi?" post in Ghost as a DRAFT — not
 * published. Tina reviews and publishes it herself in Ghost's editor.
 *
 *   GHOST_URL=… GHOST_ADMIN_KEY=<id>:<secret> node scripts/ghost-draft-maison-merrachi.mjs
 */
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { admin } from './lib/ghostAdmin.mjs';
import { markdownToHtml } from './lib/markdownToHtml.mjs';

const TITLE = 'What Is Maison Merrachi? Inside the House’s New Loyalty Program';
const SLUG = 'what-is-maison-merrachi';
const COVER = 'public/editorial/maison-merrachi-cover.jpg';
const COVER_ALT = 'A hijabi woman in an aubergine dress standing in a doorway, cover image for the Maison Merrachi article';

const BODY = `Merrachi just opened the doors to something new: [Maison Merrachi](/designers/merrachi), a loyalty programme built like a house rather than a points chart. If you've seen the name floating around and weren't quite sure what it meant, here's the honest walkthrough.

**It's free, and it's automatic.** Create a Merrachi account and you're in — no fee, no separate signup for "membership."

**You move through four rooms.** Foyer, Living Room, Walk-In Closet, and Atelier — each one unlocked by how much you've bought from the house. The more you shop, the deeper into the house you go, and the more credits and perks come with it.

**What you actually get isn't the regular shop.** Credits don't go toward [dresses](/modest-dresses), [hijabs](/modest-hijabs) or [trousers](/modest-trousers) from the main catalogue — they redeem for exclusive member-only gifts, plus priority access to [new collection launches](/new-in) and early previews before everyone else sees them.

**Credits work both ways, with one catch.** You earn them whether you buy online or in a physical Merrachi store, but you can only spend them on the website — so an in-store credit still needs an online visit to become a reward.

**They don't sit still forever.** A credit stays live for 12 months from your last order; buy again within that window and the clock resets.

**What we can't tell you — because Merrachi hasn't said:** the exact amount you need to spend to move from one room to the next. If that's the part that's had people confused, you're not alone; it isn't published anywhere, ours included.

Maison Merrachi is Merrachi's way of saying thank you for coming back — not a discount code, a members' house. If loyalty programmes like this are your thing, [browse hijabs](/modest-hijabs) from every house we track, [Merrachi included](/designers/merrachi).`;

async function uploadCover(path) {
  const type = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }[path.split('.').pop().toLowerCase()];
  if (!type) throw new Error(`unsupported cover image type: ${path}`);
  const form = new FormData();
  form.append('file', new Blob([readFileSync(path)], { type }), basename(path));
  form.append('purpose', 'image');
  const res = await admin('POST', 'images/upload/', { form });
  return res.images[0].url;
}

const html = markdownToHtml(BODY);
console.log(`HTML: ${html.length} chars\n`);

let exists = true;
try {
  await admin('GET', `posts/slug/${encodeURIComponent(SLUG)}/`);
} catch (e) {
  if (!String(e.message).includes('-> 404')) throw e;
  exists = false;
}
if (exists) {
  console.log(`already exists: ${SLUG} (not re-created; delete it in Ghost first if you want a clean re-run)`);
  process.exit(0);
}

const feature_image = await uploadCover(COVER);
console.log('cover uploaded:', feature_image);

const res = await admin('POST', 'posts/?source=html', {
  json: {
    posts: [
      {
        slug: SLUG,
        title: TITLE,
        html,
        custom_excerpt: 'Merrachi’s new four-room loyalty programme, explained honestly — what it is, what it isn’t, and the one thing they don’t publish.',
        feature_image,
        feature_image_alt: COVER_ALT,
        tags: ['Guides'],
        status: 'draft',
      },
    ],
  },
});

const post = res.posts[0];
console.log(`\ncreated DRAFT: ${post.slug}`);
console.log(`Ghost admin: ${process.env.GHOST_URL}/ghost/#/editor/post/${post.id}`);
