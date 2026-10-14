# Why ChatGPT sends fewer visitors: investigation
**Date:** 2026-10-14 · **Status:** diagnosis done; fix needs off-site work

## Goal
Tina: ChatGPT was the main target; find out what is happening and fix it.

## Evidence
**Pulse, AI-channel visitors per week:** Aug 24–Sep 6 ≈56/wk · Sep 7–13 60 · Sep 14–20 49 · **Sep 21–27 26** ·
Sep 28–Oct 4 23 · Oct 5–14 19 (10 days). The step down is the week of Sep 21. Homepage entries 27/25 → 11/11 → 6;
`/designers` 18 (first 2 weeks) → 7 → 1 → 0. All ChatGPT; `utm_source=chatgpt.com` 108 visitors in the last 30 days.

**Cloudflare request log (httpRequestsAdaptiveGroups, by user agent, Sep 15–Oct 14):**
- OAI-SearchBot (ChatGPT search index): crawls daily, 3–492 requests a day, all 200 (plus a few 301s). Not blocked.
- ChatGPT-User (ChatGPT reading a page live during a chat): steady 20–30 a day through both periods, then 13–19 since
  Oct 10. Almost all `/`, spread over ~15 countries. So ChatGPT still pulls the homepage while answering at about the
  same rate, but people click through far less.
- GPTBot 1–6/day, bingbot 10–136/day, Googlebot 21–83/day, all 200.

**Already in place (checked live):** robots.txt allows every OpenAI bot; Cloudflare AI/bot protections off;
`/designers` emits CollectionPage + ItemList of Brand nodes; homepage ItemList + Organization sameAs (shipped 10-13);
llms.txt. Bing indexes 114 pages, and Copilot citations are rising (164, see `2026-10-13-visitor-dip-vs-image-sitemap.md`).

**Direct visitors doubled (52 → 98) as AI fell**, but much of the rise is bots or probes (SG/CN, `/pages/contact`,
`/policies/contact-information`, Shopify paths), so this does NOT show that ChatGPT visitors were just relabelled.

## Conclusion
Not technical: ChatGPT can read and index everything, and does. What changed is ChatGPT's answers: it shows our link
less, or lower, so fewer people click. The timing fits launch mentions ageing out (launch week, Product Hunt).
The site has 1 backlink (Bing), so nothing durable tells ChatGPT we're the reference for "modest clothing brands".

## Could not do
Driving ChatGPT itself: the Chrome extension times out on chatgpt.com and screenshots there are permission-denied;
headless Playwright gets no answer (likely a bot check). So I can't see who ChatGPT cites instead. Needs Tina to run
the prompts and send screenshots.

## Fix (off-site, in order)
1. Brands link to us (badge + Tina's email). 2. Real answers on Reddit (r/hijabis, r/MuslimLounge,
r/ModestFashion), which ChatGPT cites heavily for brand-list questions. 3. Get added to existing "modest clothing brands"
roundup articles that ChatGPT already cites; we'll know which ones once Tina's screenshots show the sources.
