#!/usr/bin/env node
/**
 * One-off: create "Inside Fajr Noor" in Ghost as a DRAFT — not published.
 * Tina reviews and publishes herself in Ghost's editor.
 *
 * Source: the Fajr Noor team's written reply (Osman, manager), 2026-10-14.
 * Their conditions, kept here so nobody "improves" the post past them:
 *   - About the brand, credited to "the Fajr Noor team". No founder name, no portrait.
 *   - Links to fajrnoor.com plus abayas / hijabs / khatijah-abayas.
 * Every quote is theirs, verbatim. Nothing invented (CLAUDE.md §10.18).
 *
 * Fajr Noor is not in data/brands.ts yet, so there is no /designers/fajr-noor
 * page to link. Swap the links in once it is onboarded. No cover image yet.
 *
 *   GHOST_URL=… GHOST_ADMIN_KEY=<id>:<secret> node scripts/ghost-draft-fajr-noor-feature.mjs
 */
import { admin } from './lib/ghostAdmin.mjs';
import { markdownToHtml } from './lib/markdownToHtml.mjs';

const TITLE = 'Inside Fajr Noor: A Lifestyle Leading to Jannah';
const SLUG = 'inside-fajr-noor';

const BODY = `[Fajr Noor](https://fajrnoor.com) began with a question, not a product: why are so few businesses that shape everyday life led by Muslims, and built around our values? The team's answer was a brand where faith comes first. The name means "the light of dawn", and the tagline sums up the rest: *a lifestyle leading to Jannah*.

**What it's built on:** modest pieces made with intention, Islamic knowledge shared alongside them, and a business that gives back. A portion of every order goes to Sadaqah, and the team donates to charity every month. "We hope that when someone shops with us, they feel they've found a home, not just a store."

**What's been hardest:** staying true to those values while growing. "It's easy to chase trends or shout about discounts," the team says. Instead they've tried to grow with *Ihsaan*, excellence, in the fabrics, the packaging, the systems behind the scenes and how every customer is treated. "Building that kind of trust takes longer, but there is barakah in it."

**The piece they're proudest of:** the [Khatijah Abaya](https://fajrnoor.com/collections/khatijah-abayas), their best seller. It's comfortable enough for every day, modest, and elegant enough that sisters reach for it again and again. It comes in twelve colours, and many customers own more than one. Like the Maryam, Amina and Nourah, it's named after a woman from Islamic history, so every piece carries a story.

**The messages that stay with them:** reviews are, in the team's words, "the dessert", and the ones they remember are about how a piece made someone feel. One customer wrote that she "felt like a princess" in her abaya. Another: "Effortless shopping experience and quick delivery. Jazak Allahu Khairan." Knowing their pieces are part of someone's salah, Eid or everyday life "is why we do this".

**Who carried it:** community, from the start. Family and friends were Fajr Noor's first customers, first models and first critics.

Beyond clothing, the team sends regular Islamic reminder emails on marriage, patience, people-pleasing and more. For many sisters, that's their favourite part of being a Fajr Noor customer. They ship worldwide. Browse the [abayas](https://fajrnoor.com/collections/abayas) and [hijabs](https://fajrnoor.com/collections/hijabs).`;

const html = markdownToHtml(BODY);
console.log(`HTML: ${html.length} chars, ${BODY.split(/\s+/).length} words\n`);

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

const res = await admin('POST', 'posts/?source=html', {
  json: {
    posts: [
      {
        slug: SLUG,
        title: TITLE,
        html,
        custom_excerpt: 'The faith-first brand behind the Khatijah Abaya, on growing with Ihsaan, giving with every order, and the reviews that stay with them.',
        status: 'draft',
      },
    ],
  },
});

const post = res.posts[0];
console.log(`\ncreated DRAFT: ${post.slug} (${post.status})`);
console.log(`Ghost admin: ${process.env.GHOST_URL}/ghost/#/editor/post/${post.id}`);
