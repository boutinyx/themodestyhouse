#!/usr/bin/env node
/**
 * One-off: re-push the try-modest founder post's HTML after swapping its
 * brand-name links from trymodest.com to /designers/try-modest (now that the
 * catalogue is curated and the page clears MIN_PRODUCTS). Ghost's Admin API
 * needs the post's current `updated_at` for the PUT (optimistic lock), so
 * this fetches the post first rather than guessing it.
 *
 *   GHOST_URL=… GHOST_ADMIN_KEY=<id>:<secret> node scripts/ghost-update-try-modest-links.mjs
 */
import { admin } from './lib/ghostAdmin.mjs';
import { markdownToHtml } from './lib/markdownToHtml.mjs';

const SLUG = 'meet-farheen-try-modest-founder';

const BODY = `[Try Modest](/designers/try-modest) started with a prayer, not a business plan. Farheen had an engineering degree, then a master's in IT — a technical path that left something unanswered. "I asked Allah to guide me towards work that I would genuinely enjoy and love, and to open that path for me," she says. The pull toward fashion had been there since childhood; it took her sister's suggestion — modest fashion, specifically — to put a name to it. Try Modest launched in 2022.

**The idea she built it on:** that modesty and fashion were never supposed to be a trade-off. "Modesty is not the absence of beauty; it is beauty carried with dignity." The brand ships free, with no minimum, to more than 20 countries, and Try Modest absorbs customs duties for shoppers in the US, Canada and much of Europe — most of her customers today are American.

**What's been hardest:** earning trust from an audience she couldn't meet in person. "As a UK online store serving customers internationally, earning the trust of shoppers in other countries was initially challenging." She says it came down to attentive service and personally taking responsibility when something needed fixing — built order by order, not solved by any one campaign.

**The piece she's proudest of:** the Afraa Co-Ord Set, a bestseller she keeps coming back to for "its balance of comfort, coverage and effortless styling" — the combination she wants the whole brand to stand for.

**A message that's stuck with her:** a customer who ordered an abaya to wear for her Shahadah. Another bought eight Lila abaya sets so a group of mothers could wear them together at their daughters' Aalimah graduation. "It was incredibly special to imagine those mothers celebrating their daughters together while wearing our pieces." Engagements, Umrah trips, last-minute graduation outfits — she says it stopped feeling like just sending clothes a long time ago.

Her parents' support — and their duas — come up when she talks about what carried her through the uncertain years. It's the same thread that opened this piece: a prayer, answered in a shape she couldn't have planned for.

Outside the business, she's learning Turkish for a country she hasn't visited yet, and calls herself "very much a tea person" — homemade blends, mostly. [See what Try Modest is making right now](/designers/try-modest).`;

const html = markdownToHtml(BODY);

const current = await admin('GET', `posts/slug/${encodeURIComponent(SLUG)}/`);
const post = current.posts[0];
console.log('found post, status:', post.status, '| id:', post.id);

const res = await admin('PUT', `posts/${post.id}/?source=html`, {
  json: { posts: [{ html, updated_at: post.updated_at }] },
});

const updated = res.posts[0];
console.log('updated:', updated.slug, '| status:', updated.status);
console.log(`Ghost admin: ${process.env.GHOST_URL}/ghost/#/editor/post/${updated.id}`);
