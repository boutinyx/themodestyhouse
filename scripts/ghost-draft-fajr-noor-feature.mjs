#!/usr/bin/env node
/**
 * One-off: create (or rewrite) the Fajr Noor feature in Ghost as a DRAFT — not published.
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

const TITLE = 'Meet Fajr Noor, the Muslim-Led Brand Asking a Bigger Question';
const SLUG = 'inside-fajr-noor';

const BODY = `*Fajr Noor* means "the light of dawn", the hour of the first prayer, before the day has asked anything of you. The team behind [Fajr Noor](https://fajrnoor.com) started with a question that wouldn't leave them alone: why are so few of the businesses that shape everyday life led by Muslims, and built around our values? Their answer was to build one.

**The idea they built it on:** a brand where faith decides things first. Modest pieces made with intention, knowledge that brings you closer to your Deen, and a business that gives back. A portion of every order goes to Sadaqah, and the team donates to charity every month. Or, as Fajr Noor puts it in its own tagline: *a lifestyle leading to Jannah*.

**What's been hardest:** staying who they are while they grow. "It's easy to chase trends or shout about discounts." They chose *Ihsaan*, excellence, instead: in the fabrics, the packaging, the systems no customer ever sees, and how every customer is treated. "Building that kind of trust takes longer, but there is barakah in it."

**The piece they're proudest of:** the [Khatijah Abaya](https://fajrnoor.com/collections/khatijah-abayas), their best seller. It's comfortable enough for every day, modest, and elegant enough that sisters reach for it again and again. It comes in twelve colours, and many customers own more than one. Like the Maryam, Amina and Nourah, it carries the name of a woman from Islamic history. Khadijah, may Allah be pleased with her, ran a trading business in Mecca and was the first to believe: a fitting namesake for a brand that began by asking why so few businesses are built around faith.

**The messages that stay with them:** reviews are, in the team's words, "the dessert", and the ones they remember are about how a piece made someone feel. One customer wrote that she "felt like a princess" in her abaya. Another kept it simple: "Effortless shopping experience and quick delivery. Jazak Allahu Khairan." Knowing their pieces are part of someone's salah, Eid or everyday life "is why we do this".

**Who carried it:** community, from the very start. Family and friends were Fajr Noor's first customers, first models and first critics.

Today the team still writes to its community, with regular reminders on marriage, patience and people-pleasing, and for many sisters those emails are the best part of being a customer. It's what the name promised: something that meets you at the start of the day and turns you toward something better.

"We hope that when someone shops with us, they feel they've found a home, not just a store." Fajr Noor ships worldwide. Start with the [abayas](https://fajrnoor.com/collections/abayas) or the [hijabs](https://fajrnoor.com/collections/hijabs).`;

const html = markdownToHtml(BODY);
console.log(`HTML: ${html.length} chars, ${BODY.split(/\s+/).length} words\n`);

const EXCERPT = 'Named for the light of dawn, built around one question: why are so few businesses led by Muslims and shaped by our values? Inside the brand behind the Khatijah Abaya.';

let existing = null;
try {
  existing = (await admin('GET', `posts/slug/${encodeURIComponent(SLUG)}/`)).posts[0];
} catch (e) {
  if (!String(e.message).includes('-> 404')) throw e;
}
if (existing) {
  if (existing.status !== 'draft') throw new Error(`${SLUG} is ${existing.status}; refusing to overwrite a non-draft`);
  const up = await admin('PUT', `posts/${existing.id}/?source=html`, {
    json: { posts: [{ title: TITLE, html, custom_excerpt: EXCERPT, updated_at: existing.updated_at }] },
  });
  console.log(`updated DRAFT: ${up.posts[0].slug} (${up.posts[0].status})`);
  process.exit(0);
}

const res = await admin('POST', 'posts/?source=html', {
  json: {
    posts: [
      {
        slug: SLUG,
        title: TITLE,
        html,
        custom_excerpt: EXCERPT,
        status: 'draft',
      },
    ],
  },
});

const post = res.posts[0];
console.log(`\ncreated DRAFT: ${post.slug} (${post.status})`);
console.log(`Ghost admin: ${process.env.GHOST_URL}/ghost/#/editor/post/${post.id}`);
