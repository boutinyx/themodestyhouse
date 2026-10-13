# Growth batch live on production: subtype titles, "Modest" h1s, structured data, abaya links
**Date:** 2026-10-13 · **Status:** done (hero placeholder still on staging only)

## Goal
Tina: "go do everything" on the growth plan (`2026-10-13-growth-research-plan.md`), then, after seeing staging:
"no … that looks ugly [the shorter phone hero] … keep the editorials on the homepage, the rest you can do."

## What shipped to main (cherry-picked onto origin/main 76e11a0+, now 5972456)
- `cf43173` 32 subtype pages get written titles/descriptions; 7 lane h1s read "Modest …"
  (`2026-10-13-subtype-titles-and-lane-h1s.md`).
- `209e19c` Organization/WebSite `alternateName`, verified Pinterest + TikTok in `sameAs`, homepage category
  ItemList, image sitemap for lanes and edits (`2026-10-13-structured-data-names-categories-image-sitemap.md`).
- `717fb08` homepage links to the four abaya subtype pages.
NOT shipped: the 72px-shorter phone hero and the pinned stories (`4681741`, rejected, reverted on staging), and
the hero placeholder (`29704c9`, on staging, not yet seen by Tina).
Staging was not merged wholesale: it still holds the unapproved Creators pages.

## Verification
- tsc clean; vitest 1,351 passed, 3 failed — the known catalogue-data failures (colourLeads, edits, exclude),
  identical on origin/main.
- Origin polled with a cache-buster until the kimono title appeared, then `purge_everything`, then canonical URLs:
```
/                               HIT on 2nd request, h1 unchanged
/modest-tops                    Modest Tops Online — Tunics, Blouses & Layering Tops | h1: Modest Tops
/modest-hijabs?type=prayer-set  Prayer Dresses & Prayer Sets for Women | h1: Prayer Sets
/modest-abayas                  h1: Abayas (unchanged, by design)
home: abaya subtype links 4 · hero-placeholder absent (correct) · Merrachi story still on home
Organization alternateName [Modesty House, TMH], sameAs 3 · ItemList 13 · sitemap-images.xml 110 URLs
```

## Follow-ups
- `sitemap-images.xml` resubmission in Search Console: the ADC token is read-only, so it is a manual click
  (Google also re-fetches it on its own).
- Pinterest: `.env`'s `PINTEREST_API` is the 40-hex app secret, not an access token (`pina_…`); 401 from
  `/v5/user_account`. Pin repair waits on a real token.
- ChatGPT check (non-personalised temporary chat, 2026-10-13): TMH is the #1 pick for "a website that lists many
  modest brands in one place" (US), absent for "where to buy abayas" / "modest clothing from independent brands",
  where it names brands directly and ROMOSA. A personalised chat DID name TMH — memory skews it, never measure there.
