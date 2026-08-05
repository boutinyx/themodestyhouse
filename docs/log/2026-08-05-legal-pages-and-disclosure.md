# Privacy policy, terms, and affiliate disclosure (P0-D)

**Date:** 2026-08-05 · **Status:** done, pending one owner-supplied field

## Goal

Close launch blocker **P0-D**: no privacy policy, no terms, and no FTC/EU affiliate
disclosure anywhere — with an EU/UK audience and a footer that already printed an inert
"Privacy · Terms", making it look as though the pages existed.

## What I found first

P0-D was recorded as "blocked on Tina's business details". It wasn't. Searching the session
transcripts in `conversations/` turned up drafts already written and sitting in the Obsidian
vault:

```
/Users/tina/ModestDirectory/Legal/Privacy-Policy.md
/Users/tina/ModestDirectory/Legal/Terms-of-Service.md
```

Both are GDPR documents written for an individual operator in the Netherlands. They had
never been wired into the site.

## What changed

Filling in the five placeholders would have been the shortcut. Four were sourceable from the
codebase (`[SITE NAME]`, `[DOMAIN]`, `[CONTACT EMAIL]`, `[DATE]`) — but the drafts also
described a site that no longer matches reality, so I verified each factual claim against
the code and corrected it:

| Draft said | Reality (verified) |
|---|---|
| Hosted on **Railway** | Deploys to **Vercel** — a US company, which changes the international-transfer section |
| Stores **"quiz answers"** in-browser | There is no quiz. There is the **Style It** picker (client-side) and **favourites** in `localStorage` under `tmh_favs` |
| Remembers a **"chosen vibe theme"** | No such storage exists |
| (not mentioned) | Product images are hotlinked from **`cdn.shopify.com`**, so the visitor's browser makes a third-party request — worth disclosing |
| "Any analytics we add later" | Confirmed **zero** analytics today (grepped for gtag/plausible/posthog/fathom) |

Shipping a privacy policy that misdescribes where a visitor's data goes is worse than
shipping none, so this correction was the substance of the work, not the placeholders.

| File | Purpose |
|---|---|
| `content/legal/privacy.md`, `content/legal/terms.md` | The corrected documents |
| `lib/legal.ts` | Loads a doc, substitutes the operator name, reports if it's still unfilled |
| `app/legal/LegalPage.tsx` | Shared shell so `/privacy` and `/terms` can't drift apart |
| `app/privacy/page.tsx`, `app/terms/page.tsx` | The routes, with canonical metadata |
| `components/Footer.tsx` | Real links + site-wide affiliate disclosure |
| `components/Markdown.tsx` | Added bullet lists, `---` rules, `###` headings |
| `app/sitemap.ts` | Added `/privacy`, `/terms`, and the previously-omitted `/designers` |

**The one field left open, deliberately.** `[OPERATOR NAME]` — the natural person named as
GDPR data controller — is a legal identity declaration only Tina can make. Rather than
guessing or silently shipping a blank, the page renders a visible **"Not ready to publish"**
warning until `NEXT_PUBLIC_OPERATOR_NAME` is set. Failing loudly beats a legal document with
a hole in it.

**Markdown had to be extended.** The component supported headings, paragraphs, bold, italic
and links — but the legal copy uses bullet lists and horizontal rules, which would have
rendered as literal `- ` text. The GDPR legal-basis **table** was rewritten as a list rather
than teaching the component to parse tables; it also reads better on mobile.

## Verification

```
$ npx tsc --noEmit        # clean
$ npx vitest run
 Test Files  8 passed (8)
      Tests  219 passed (219)
$ npm run build           # ✓ compiled; /privacy and /terms emitted as ○ Static
```

Checked the built HTML rather than assuming:

```
Not ready to publish              ← warning renders while the operator name is unfilled
General Data Protection Regula…   ← legal copy renders
52 × <li>                         ← bullet lists render as real list items
"affiliate links, and if you buy through one"  ← disclosure present on the homepage
```

## Notes / follow-ups

- **Blocking launch:** set `NEXT_PUBLIC_OPERATOR_NAME`. Until then both pages self-flag.
- The vault copies at `ModestDirectory/Legal/` are now **stale** — `content/legal/` is the
  source of truth. Worth deleting the vault ones to avoid two diverging versions.
- Cookie consent is still **not implemented**. Today the site sets no analytics or ad
  cookies, and the Skimlinks script only loads when `NEXT_PUBLIC_SKIMLINKS_ID` is set — so
  there is nothing to consent to yet. **The moment Skimlinks is enabled for EU/UK traffic,
  a consent gate becomes necessary**, and the policy already says so.
- `components/Markdown.tsx` still has no table support. Fine for now; noted so nobody
  assumes it does.
