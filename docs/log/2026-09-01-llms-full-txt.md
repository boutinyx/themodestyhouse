# /llms-full.txt — the site as one document

**Date:** 2026-09-01 · **Status:** done

## Goal

Tina, with https://ciphera.net/llms-full.txt: *"we need to implement this"*.

`llms.txt` is a map — a list of links an answer engine could follow.
`llms-full.txt` is the territory: the same site with its content inlined, so it
can be read in one request instead of crawled across 130 URLs. Ciphera's is a
knowledge base — products, a 70-term glossary, 200 linked articles. Ours is the
equivalent for a directory: how the curation works, every category with its
answer block, every house with its real numbers, the FAQ, and the editorial in
full.

## What it contains

55 KB, 8,064 words, six top-level sections, all generated at build time:

| section | source | size |
|---|---|---|
| How the directory works | the curation rules, stated plainly | 7 bullets |
| Categories | `lib/lanes.ts` intros + `lib/laneAnswers.ts` bodies | 14 |
| Houses | one pass over `data/products.json` | 91 |
| Questions | `lib/faq.ts`, verbatim | 10 |
| Editorial | the published markdown, in full | 4 posts |
| Notes | attribution and the sitemap | — |

**The Houses section is the only reason this file is worth having.** Each line
is `name · city · piece count · real price range · the storefront that sells
it` — e.g. *MERRACHI — Amsterdam · 1,027 pieces · €23–€177 · sold at
bymerrachi.com*. That is the one thing here a crawler cannot cheaply
reconstruct: it would need 91 requests to build it, and this is one.

**Nothing in it is composed.** The lane text, the questions and the posts are
quoted from what the site already publishes; the numbers are counted. The route
says so in its header, with the corollary: if this file ever needs a sentence
that exists nowhere else on the site, that sentence is being written for a
robot and should not exist (§10.18).

## Honesty about the return

`app/llms.txt/route.ts` already says the expected return is zero and cites the
measurement — Google states llms.txt has no effect on Search or AI Overviews, no
frontier lab commits to reading it, and Ahrefs found ~3% of llms.txt files ever
receive a request (`docs/log/2026-08-08-robots-llmstxt-crawlability-audit.md`).
None of that changed today. The narrower argument for this one is the Houses
table above: if anything ever does read it, it gets the part of the site that is
genuinely ours rather than a list of links it could have guessed.

## What changed

- **`app/llms-full.txt/route.ts`** (new) — `force-static`, so the single pass
  over the 10.9 MB catalogue happens once per build, never per request (§8).
  A route rather than a file in `public/` for the reason `llms.txt` gives: that
  directory is served with `max-age=14400`, is not fingerprinted, and this path
  cannot be renamed to bust the cache — the path IS the convention.
- **`lib/faq.ts`** (new) — the ten questions moved out of `app/faq/page.tsx`,
  which now imports them. A second consumer appeared, and copying the array
  would have been the §8 duplicated-logic trap in a new file: two lists that
  agree today and drift silently, leaving the machine-readable one lying.
- **`app/llms.txt/route.ts`** — points at the full file.
- **`lib/llmsFull.test.ts`** (new) — 8 tests.

## Two things caught while building it

**A concurrent session retired `/directory` to `/new-in`** (`d1e2668`) while
this was being written. Every URL in the file is derived from `LANES`, so
nothing had to be edited — and a test asserts the retired path never appears,
because publishing a 308 to every answer engine that reads the file is exactly
the silent kind of wrong this format invites.

**The inlined posts' headings collided twice.** A post's own sections are `##`,
which is the level this file uses for *Houses* and *Questions*, so inlined raw
they read as siblings of the site's structure. Demoting by one fixed that and
introduced the same fault one level down — the post's sections became siblings
of the post's own title. Demoted by two, and the hierarchy is finally true: 6
`##`, 28 `###` (14 lanes + 10 questions + 4 post titles), 22 `####`.

## Verification

```
npx tsc --noEmit                        → exit 0
npx eslint app lib                      → exit 0
npx vitest run lib/llmsFull.test.ts     → 8 passed
npm test                                → 1063 passed, 2 failed (PRE-EXISTING)
npm run build                           → ○ /llms-full.txt  ○ /llms.txt

$ curl localhost:3215/llms-full.txt
http=200  56,307 bytes  content-type: text/plain; charset=utf-8
h2 sections : How the directory works, Categories, Houses, Questions, Editorial, Notes
h3 28 · h4 22 · houses 91 · "/directory" 0
```

The two failing tests are both in `lib/edits.test.ts` — a hand-picked product
that went out of stock, and a hijab-adjacency assertion. That file imports
nothing this work touches; both come from the nightly data and are red on
`staging` independently.

**Negative control (§10.28 rule 1):** the heading demotion removed → the test
reports the post's first heading still at `##`. Restored → 8 passed.
