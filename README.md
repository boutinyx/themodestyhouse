# The Modest House

Curated modest-fashion discovery + affiliate site. Design/plan live in the Obsidian vault `ModestDirectory`.

## Weekly refresh
1. `npm run scrape`      # pull brand feeds -> data/raw-products.json
2. `npm run dev` then open http://localhost:3000/admin/curate   # keep/cut with your eye
3. `npm run build:data`  # kept -> data/products.json
4. commit + push         # Railway rebuilds

Set `NEXT_PUBLIC_SKIMLINKS_ID` in the Railway env once you have a Skimlinks account (enables affiliate link wrapping).
Note it is inlined at BUILD time, so changing it requires a redeploy, not just a restart.

## Scripts
- `npm run dev` — local dev
- `npm run scrape` — scrape brand feeds
- `npm run build:data` — publish kept products
- `npm test` — run unit tests
- `npm run build` — production build
