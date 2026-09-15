# Review of Inoma Digital's "Content & Growth Action Plan" (13 Sep 2026)
**Date:** 2026-09-15 · **Status:** done (read-only review; nothing built, nothing published)

## Goal
Tina shared a Google Doc from an agency and asked what matters in it. Read in full via the
document's own text export (the Chrome extension is disconnected, so the browser route was
unavailable).

## What the document is
A 5-part SEO content plan: an editorial calendar (~25 post ideas), 11 new page types, 8 on-site
features, 7 link-building tactics, and a 3-month roadmap. Prepared by Inoma Digital. It is
Google-organic-shaped throughout.

## Where it agrees with our own measurements
- **The counted price-guide format is the thing to repeat.** Matches first-party data:
  `/editorial/best-abaya-brands-price-tiers` runs 5.4% CTR at avg position 9.6 while 26 lane
  pages sat at positions 47–65 (`2026-09-03-what-the-impressions-are-actually-worth.md`).
- **Content depth, not technical SEO, is the gap.** Matches GSC: brand-name queries avg position
  13.2, category queries 48.6 (`2026-09-09-who-is-actually-reached.md`).
- **Named author bios for E-E-A-T.** Independently the same finding as `brand-strategy-2026-09-09.md`
  T1 and `MARKETING-AUDIT.md` (2026-08-13). Third recommendation of the same thing.
- **Use the 115 brands as an outreach list.** Same population as §3.2 Population A.

## Factual corrections
| Document says | Actual |
|---|---|
| "HARO / journalist requests" | Connectively/HARO shut 9 Dec 2024. Featured.com bought the brand and relaunched it paid (~$49/mo); Source of Sources is the free alternative |
| Brands "likely know about it" | No outreach has ever been sent. The brand-claim flow stores nothing and no claim volume is known (`2026-09-02-brand-claim-flow.md`) |
| "earns referral revenue by linking out" | 1 of 115 brands carries an affiliate code (`lib/affiliates.ts`, Losyana). 27 clicks, 0 sales |
| Wedding-guest and summer-outfit posts as new | `/modest-wedding-guest` and `/modest-summer-outfits` are existing lanes. Writing posts on the same terms competes with our own pages |
| Region hub pages as new | Region grouping already renders on `/` and `/designers` (`lib/brandRegions.ts`); the hub *pages* do not exist |
| Breadcrumbs as missing | Partly present: `lib/schema.ts` + `app/designers/page.tsx`. Not site-wide |

Verified absent, so genuinely new work: price filter, glossary, related-posts, price-tier landing
pages, FAQ split (one page today, `lib/faq.ts`), user reviews.

## What the plan leaves out
1. **Money.** Its success metrics are indexed pages, rankings, organic traffic, referral clicks.
   With one monetised house, more traffic does not become more revenue. Affiliate coverage is the
   multiplier and is not in the plan.
2. **61% of current traffic.** ChatGPT 31% and Instagram 30% against Google 15%
   (`2026-09-09-who-is-actually-reached.md`). The plan is Google-organic with one passing mention
   of AI search and one line on repurposing to Pinterest/Instagram.
3. **Capacity.** 2 posts/week for 3 months is ~24 articles, all of which Tina must write herself
   (§10.18). Five posts exist since early August. This is the §7.7 #4 failure mode —
   diagnosis has never been the missing thing.
4. **Thin-content risk.** Price-tier and comparison pages multiply URLs. `lib/laneSubtypes.ts`
   already withholds the 4 thinnest subtype pages from the sitemap deliberately.
5. **User reviews** assume accounts and moderation the site does not have by design.

## Recommended split
- **Buildable from data, no copy from Tina:** price-tier landing pages, price filter, glossary
  scaffold, region hub pages, site-wide breadcrumbs, related posts on editorial.
- **Needs Tina:** the articles (1/week is the realistic cadence), the author-name decision, the
  brand outreach email — which should carry the affiliate-code ask in the same message.
