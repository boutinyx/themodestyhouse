# Word boundaries on `set`/`trousers` — and the Turkish vocabulary that had to come with them

**Date:** 2026-08-10 · **Status:** done

## Goal

`lib/tag.ts` had two unanchored `GARMENT_RULES`:

```js
['trousers', /trouser|pant|jean|legging|culotte|wide.?leg/i],
['set',      /set|co.?ord|two.?piece|coordinate|\bensemble\b/i],
```

§10.10 records this bug class as fixed; these two were missed. Anchor them, measure the
before/after, add regression tests from real titles, re-ingest, republish.

## Outcome

| | before | after |
|---|---|---|
| published | 20,783 | **23,303** (+2,520) |
| raw rows | 33,489 | **37,954** |
| tests | 420 | **429** |

- **374 published rows moved lane** — `set→dress` 113, `set→abaya` 107, `set→top` 95,
  `set→hijab` 23, `abaya→hijab` 18, and 15 others.
- **8 published rows removed**, all non-apparel (below).
- **2,537 added** — rows the tagger previously could not name, and so dropped.

## What the measurement actually said

Measured against **all 109 live feeds, 36,754 records**, not against titles in
`raw-products.json` — because `tagDiscovery` reads `product_type` and `tags` too, and raw
stores neither. `scripts/`-free; the harness lived in the session scratchpad and imported
`lib/tag.ts` directly for the "after" side, so it measured the shipping code and not a
transcription of it (the §8 duplication trap).

**The handoff's worked examples were wrong, in an instructive way.** `Closet Staple Dress`
and `Sunset Kaftan` do NOT misfile: the `dress` and `abaya` rules sit ABOVE `set` and win.
Those rows were produced by running the regex **in isolation** rather than through
`tagDiscovery`. `Closet Staple Dress` is not in the catalogue at all. A rule's behaviour
inside an ordered list is not its behaviour alone.

The real published damage was ~30 English rows — `Cotton Top – Sunset`, `Lace-Up Corset
Cotton Shirt`, `Rosette Top`, `Loujean Shirt`, `Kaaba Coordinates Ring` — plus the Turkish
rows, which reached the rule mostly through `product_type`/`tags` rather than the title.

## Why the fix could not ship alone

Anchoring the two rules pushed **303 published rows** to `garment: 'other'` — which
`normalizeProduct` **drops**. ~296 were real garments (Turkish `Elbise`, `Ferace`, `Etek`,
`Kazak`, `Hırka`, `Takım`). Tightening a classifier is a destructive operation.

Raised with Tina with the measurement; she chose boundaries + a Turkish vocabulary layer in
one change, and confirmed the one editorial call in it (below).

## The trap: `\b` is ASCII-only

JavaScript's `\b` is defined against `\w` = `[A-Za-z0-9_]`. Every Turkish letter outside
ASCII — `ı ş ğ ü ö ç İ` — is therefore a **non-word character**, and `\b` finds a boundary
mid-word:

```
/\bkap\b/i.test('Kapüşonlu Çıtçıt Düğmeli Tesettür Yağmurluk')  →  true
```

`kap` is a cape; `kapüşonlu` means hooded and `kapitone` means quilted. The rule would have
published **`Kapitone Puf Çanta`, a quilted handbag, as a top**. §10.5 and §10.10 both end
with "always use `\b`" — a rule derived entirely from English evidence, and actively wrong
in a language where it manufactures the false positives it exists to prevent.

`lib/tag.ts` now has `word()`, building `(?<![\p{L}\p{M}\d])…(?![\p{L}\p{M}\d])` with the
`u` flag. Every non-English rule uses it. → **CLAUDE.md §10.31**.

**Second trap, same family:** `'İ'.toLowerCase()` is `i` + U+0307 COMBINING DOT ABOVE, a
two-code-point string no `/i/` regex folds — `/elbise/i.test('ELBİSE')` is **false**. 37
rows are titled in caps. `TR_I` spells the four Turkish i's explicitly.

## What changed

**`lib/tag.ts`**
- `word()` and `TR_I` helpers, both documented in place.
- `trousers` and `set` rewritten as bounded alternations. Every alternative was enumerated
  from the corpus, not guessed — the compounds matter, because a plain `\bsets?\b` silently
  stops matching `twinset`, `joggingset`, `setje`, `seti`, and `\bpants?\b` stops matching
  `sweatpants`, `pantolon` (tr) and `pantalon` (fr). A first draft that omitted `pantolon`
  destroyed 988 rows in measurement; that is why the measurement runs before the commit.
- Turkish + Malay vocabulary appended to `FOREIGN_RULES`, which is **fallback-only**, so it
  can only ever rescue a row that is already `other` — it cannot beat an English match.
  Ordered to mirror `GARMENT_RULES`: `swim` sits first because `takım` means *set*, and
  without it Baqa's `Bikini Takımı` publishes as a co-ord, breaking §7.
- `hijab` gains `(open|ninja|tube) caps?` — 148 corpus hits, all underscarf caps. A bare
  `\bcap\b` was measured and rejected: it drags in baseball caps and men's taqiyahs.
- `kleid(er)?\b` opened on the LEFT: German compounds every noun, so Aurora Abaya ships
  `Silkkleid` and `Baumwollkleid`. 31 hits, all dresses.

**Two candidates measured and REJECTED**
- `bone` → hijab. In this catalogue "Bone" is a **colour** (`Pleated Summer Abaya in Bone`),
  not the Turkish word for an underscarf. It happened to be right on two rows for entirely
  the wrong reason.
- a bare `cap` → hijab. 254 of its 434 hits were already classified, and the rescues
  included `Bouguessa Monogram Cap` (a baseball cap) and `COTTON PLAIN TAQIYAH CAP` (men's).

**`lib/tag.test.ts`** — 9 new tests, every title verbatim from a live feed. The last one is
the negative control for the ASCII-boundary bug: `Kapitone Puf Çanta VİZON` must be `other`.

## The editorial call

**`Ferace` → `abaya`.** Beyza's largest category, 148 products. Two product photographs were
pulled and looked at: a full-length loose overgarment worn as the outer layer — the garment
class this catalogue already means by `abaya|jilbab|kaftan|kimono`. Tina's decision.

`Giy Çık` (a hooded zip-front outer coat, worn over trousers) → `top`, alongside `trench`
and `coat`. `Kurung` (ms) → `set` deliberately: that is what those rows classify as today,
so the rule keeps them alive without also moving them to a different lane.

## Verification

```
$ npm test                              → 21 files, 429 tests passed
$ npx tsc --noEmit                      → exit 0
$ npx eslint lib/tag.ts lib/tag.test.ts → exit 0

$ npx tsx scripts/add-brands.mjs <30 slugs>   → 30/30 upserted
$ npm run build:data
Published 23303 products (mixed across 108 brands) | rejected 3280 | review 48

published-diff vs origin/main:  moved 374 · removed 17 · added 2537
```

**All 17 removals were checked individually rather than assumed.** 8 went because of this
change, all `filterReason: unclassified`:

```
kamin         LEAF | Large Blue Platter / Small Yellow / Large Yellow / Small Blue
kamin         Pebble | Serving Platter
lameera-moda  Kaaba Coordinates Ring | Premium   (jewellery)
lameera-moda  Kaaba Coordinates Necklace | Premium
nasiba        Tangier Ramadan Banner
```

The other 9 are `inStock: false` — they sold out since the last refresh, and the re-ingest
picked up current stock. Nothing to do with this change.

Per Invariant 12 the 8 are **not deleted**: they stay in `raw-products.json` carrying
`filteredAt` + `filterReason: unclassified`.

## Rebased mid-flight onto the LumosModesty cut

`origin/main` moved to `a9779f9` (another session: cut LumosModesty, nav alignment, footer
currency) while this was building. My `products.json` was built on `7ef3b8e`, so committing
it would have **reverted their brand cut** — the same shape as the near-miss in
`2026-08-10-add-48-brands.md`, where a bulk write nearly undid a refresh it never knew about.

Recovered cleanly because `a9779f9` touched only `brands.ts`, `exclusions.json` and
GENERATED files — never `raw-products.json`, `decisions.json` or `title-translations.json`.
So: reset the worktree to `a9779f9`, restore my two source files + my ingested raw +
decisions + the translation cache, and re-run `build:data`. Nothing was merged by hand;
`products.json` is a pure function of inputs that were never in conflict. Asserted after:
`lumos` publishes **0** rows, 107 brands, and the delta against their baseline is identical
to the delta against the old one (+2,520 / 374 moved / 17 removed).

## A defect this surfaced in the translation pair

`scripts/translate_titles.py` now runs over **already-translated** titles. Since
`8773ca5` moved translation into `build-data.mjs`, `products.json` holds ENGLISH titles by
the time the Python script reads it — so it translates English→English and degrades them:

```
'Brode Embroidery Detailed Trousers Lyocell Suit'  ->  'Embroidery Embroidery Detailed …'
'Beige blazer'                                     ->  'Beige blazers'
'Elena Hijab'                                      ->  'Elena hijab'
```

Harmless *here* only because those degraded strings are cached under their English keys,
while `build-data.mjs` looks the ORIGINAL feed title up in raw — so the rebuild discarded
them. But the cache is now polluted with English→English entries, and any future run
compounds it. The script should skip a title whose original is already a cache KEY.

37 of 23,142 published titles still carry Turkish characters (0.16%) — mostly proper nouns
(`Asrın`, `Şakira`, `Söğüt`), a few genuinely untranslated words (`Kaban`, `Kloş`, `TAŞ`).
Pre-existing translator quality, not classification.

## Notes / follow-ups

- **`lib/nonApparel.ts` rejects none of those 8.** The veto built in §10.10 for exactly this
  case misses serving platters, a Ramadan banner and two pieces of jewellery; they left only
  because the `set` false positive vanished. Worth its own pass.
- **+2,537 products arrived with no editorial pass.** `nextDecisions()` defaults an unseen id
  to `keep`, which is correct pipeline behaviour, but §2 says curation quality is the product.
  1,930 of them are Nihan, now by far the largest brand.
- **Nihan's feed is bigger than the pipeline can see.** `PAGE_CAP` is 20 × 250, so at most
  5,000 are fetched (3,952 normalise). Pages 15–18 each return a full 250, so there is more
  behind the cap.
- **`add-brands.mjs` prints "(partial — rate-limited)" for ANY incomplete fetch.** Nihan was
  not rate-limited; it hit the page cap. The message cost a re-run and a direct probe to
  disprove. It should report the actual `FetchOutcome` flag.
- **Italian `abito` (= dress) is still unmapped** — Aneesa's `Abito Fantasia in Seta` was
  only ever classified by the `seta` false positive and is now `other`. It publishes nothing
  today, so this is not a regression, but the brand's dresses are invisible.
- The two rules above are now bounded; the rest of `GARMENT_RULES` still uses plain `\b` and
  is English-only. That is correct for the words it contains, and a trap for the next one.
