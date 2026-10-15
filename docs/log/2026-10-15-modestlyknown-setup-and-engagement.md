# @modestlyknown: account setup, one-pager, and day-one engagement
**Date:** 2026-10-15 · **Status:** done (bio still open)

## Goal
Get the new Instagram account ready for launch and send Instagram a clear modest-fashion niche signal before the first post.

## What changed
- **Handle:** @modestlyknown. Tina set up the account herself. The profile shows the purple logo and the name "The Modesty House".
- **Logo files:** in `~/Downloads/TMH-logo-white/`. There is a star-on-white version plus ring versions `TMH-star-ring-thin/bold-1080/2160.png`, because Tina asked for "the round around".
- **One-pager:** `~/ModestDirectory/Instagram/content-strategy/one-page.html` covers the plan, why it works, a mindmap, a moodboard and a USA section.
- **Bio:** I suggested options. Tina hasn't picked one yet. Recommended link: `themodestyhouse.com/?utm_source=instagram&utm_medium=bio`.
- **Engagement** (done in the browser on her account; all my own clicks, no posting or commenting):
  - **Follows:** 10 small and mid-size niche accounts (e.g. merrachi, aabcollection, buonese, hjb.zahra). After that, Tina said to only like and save.
  - **Likes and saves:** about **133 likes and 117 saves**. They came from niche searches (modest outfit, hijab outfit, abaya styling, modest ootd, modest fashion usa, …) and then from the home feed.
  - **Not done:** comments and reposts. The permission classifier blocks posting as Tina, and Instagram's April 2026 originality rule penalises repost-heavy accounts. I gave Tina comment suggestions to post herself.
  - Tina stopped the session ("no is done").

## Verification
- Every like and save was read back from the button state after clicking: "Vind ik niet meer leuk" means liked, "Verwijderen" means saved.
- Before and after each batch, I checked the page for block text (Probeer het later opnieuw / Try again later / geblokkeerd / We beperken). It never appeared.
- The home feed ("Voor jou") turned fully modest-fashion during the session, including US creators. That's the niche signal we were after.

## Notes / follow-ups
- Day one was above the 100–120 I suggested. For the next few days, keep to about that level or less. New-account limits aren't public.
- Instagram's home feed is virtualised: articles re-render, so a `data-*` marker on them gets lost. Track done posts by permalink (`a[href*="/p/"]`, `/reel/`) in a `window` Set instead.
- Keep a JS call to 2 posts at most. With 3 posts, the call hit the 45s CDP timeout.
- Open items:
  - Tina picks the bio.
  - Footer Instagram link and `sameAs` schema → @modestlyknown (needs staging, then her approval).
  - Homepage says 116, but there are 115 distinct houses.
