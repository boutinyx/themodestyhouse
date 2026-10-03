# The Modesty House

Curated women's modest-fashion directory and affiliate site — https://themodestyhouse.com.
It reads the public product feeds of independent brands (`data/brands.ts`), applies an
editorial filter, and links out to each brand. No cart, no checkout, no accounts.

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Vitest. Hosted on Railway.
Catalogue data is flat JSON in `data/`; editorial posts come from Ghost.

For how the system works and the rules for changing it, read `CLAUDE.md` and `docs/README.md`.

## Shipping a change

implement → push to `staging` → check it on
https://themodestyhouse-staging-production.up.railway.app → Tina approves → merge to `main`.
Railway deploys each branch on push. Nothing goes straight to `main` without approval.

## Catalogue upkeep

This runs by itself. `.github/workflows/refresh.yml` re-fetches every brand nightly at
04:10 UTC and commits the result to `main`; `catalogue-watchdog.yml` opens an issue if
that stops happening for 36 hours.

By hand:
- `npm run refresh [<slug>…]` — re-fetch brands, add new arrivals, delist removed ones, publish.
- `npx tsx scripts/add-brands.mjs <slug>` then `npm run build:data` — add a new brand.
- `/staff/curate` (staff login) — keep or cut individual products.

Avoid `npm run scrape`: it overwrites raw data wholesale and a rate-limited fetch loses products.

Set `NEXT_PUBLIC_SKIMLINKS_ID` in Railway to turn on affiliate link wrapping. It is inlined
at build time, so changing it needs a redeploy.

## Scripts
- `npm run dev` — local dev server on :3000
- `npm run build` — production build (does not rebuild the catalogue)
- `npm test` — unit tests
- `npm run lint` / `npm run typecheck`
- `npm run build:data` — publish raw data + decisions to `data/products.json`
- `npm run refresh` — nightly refresh, run locally
- `npm run audit:mobile` / `audit:visual` / `audit:interaction` — rendered-page audits
