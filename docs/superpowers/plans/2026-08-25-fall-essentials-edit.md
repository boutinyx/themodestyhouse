# Fall Essentials Edit — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a third edit, `fall-essentials`, to `lib/edits.ts` — an outfit-kit theme (layer + blouse + bottom) whose clothing is gated by Tina's moodboard vocabulary and whose hijabs are gated by her six-colour fall palette.

**Architecture:** Purely additive data plus three module-private regex groups in `lib/edits.ts`. The `/edits/[slug]` route, `EditStory`, the homepage banner and the footer link all iterate `EDITS`, so a new array entry gets every surface for free. No new route, component, or CSS.

**Tech Stack:** TypeScript 5 (strict) · Next.js 16 App Router · Vitest 4 (node env) · Tailwind v4.

**Spec:** `docs/superpowers/specs/2026-08-25-fall-essentials-edit-design.md`

## Global Constraints

- **Address Tina by name in every reply.** CLAUDE.md §1.
- **Ship through staging.** implement → push `staging` → verify at `https://themodestyhouse-staging-production.up.railway.app` → Tina approves → merge `main`. Never push straight to `main`.
- **Pull before you touch data.** `git fetch && git log HEAD..origin/main --oneline` — `refresh.yml` pushes catalogue commits to `main` nightly (§10.35). This plan does **not** run the pipeline, but the test suite reads `data/products.json`.
- **Stage and commit in ONE command** — `git add <paths> && git commit`. Never leave files in the index while doing something else; the tree is shared with concurrent sessions (§10.39, §10.30). Read `git diff --cached` and confirm every hunk is yours.
- **`lib/edits.ts` must stay client-safe.** `components/Footer.tsx` imports it. Type-only imports from `./types`; never import `lib/products.ts` (Invariant 10).
- **Never write user-facing marketing copy that Tina has not said** (§10.18). The styling block in Task 5 is drafted strictly from her own words and must be presented to her as a draft.
- **Every new regex gets a known-good positive AND a known-good negative**, run through the real entry point (`edit.match(product)`), never the regex in isolation (§10.10, §10.31).
- **`npm test` must be run from the repo root** — `lib/` uses `process.cwd()` paths.
- Existing invariant: **hijabs are excluded from mixed grids by default**; this edit sets `includeHijabs: true`, which is the documented per-edit exception (Invariant 5, and the flag's own doc comment).

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `lib/edits.ts` | Modify | Extend `NOT_A_GARMENT`; add `TOO_THICK`, `CAPE_SLEEVE`, `TSHIRT`, `FALL_PALETTE`, `IN_FALL_PALETTE`, the three bucket predicates, and the `fall-essentials` entry in `EDITS`. |
| `lib/edits.test.ts` | Modify | Add a `Product` factory and a `describe('fall-essentials match')` block asserting positives, negatives and palette families. |
| `docs/log/2026-08-25-fall-essentials-edit.md` | Create | Log entry — what changed, verification output, the two open follow-ups (hero, picks). |

`lib/edits.ts` is already ~525 lines and heavily commented by design — its comments carry the decision history. Adding to it follows the established pattern; do **not** split it.

---

### Task 1: Guard regexes — the exclusions, with negative controls

Three exclusions must exist *before* any positive rule, because every positive rule below is an unanchored keyword over third-party titles (§10.10, Invariant 8).

**Files:**
- Modify: `lib/edits.ts:243` (the `NOT_A_GARMENT` line)
- Test: `lib/edits.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: module-private `const NOT_A_GARMENT: RegExp` (extended), `const TOO_THICK: RegExp`, `const CAPE_SLEEVE: RegExp`, `const TSHIRT: RegExp`. All stay unexported — Task 3 consumes them from inside the same module, and Task 2's tests reach them through `edit.match()`.

- [ ] **Step 1: Write the failing test**

Add to the top of `lib/edits.test.ts`, after the existing imports:

```ts
import type { Product } from '@/lib/types';

// Same factory shape lib/specialty.test.ts already uses, so a reader moving
// between the two files does not have to learn a second convention.
const base: Product = {
  id: 'x:1', brandSlug: 'x', brandName: 'X', title: 't', price: 1, currency: 'USD',
  image: 'i', url: 'u', inStock: true, garment: 'dress', community: 'general',
  occasion: [], season: [], activity: [],
};
const p = (title: string, garment: Product['garment'] = 'top'): Product =>
  ({ ...base, title, garment });

const fall = () => {
  const e = EDITS.find((x) => x.slug === 'fall-essentials');
  if (!e) throw new Error('fall-essentials edit is missing from EDITS');
  return e;
};
```

Then add this block at the end of the file, inside the top-level `describe('edits', ...)`:

```ts
  // Titles marked REAL are literal catalogue titles, verified against
  // data/products.json on 2026-08-25 — these are the cases that would have
  // shipped broken (see the spec's "false positives found" section).
  //
  // A few are CONSTRUCTED boundary probes, marked as such, for cases the
  // catalogue does not currently contain. That distinction is worth keeping
  // honest: §10.19 is about a test whose fixtures were asserted to be real
  // catalogue titles, and a constructed probe passed off as a real one makes
  // the whole file's provenance untrustworthy.
  describe('fall-essentials guards', () => {
    it('excludes cape-SLEEVE garments, which are not capes', () => {
      // 227 in-stock titles match /\bcape\b/ and almost all are these.
      expect(fall().match(p('Crystal Beaded Waist Cape Sleeve Maxi Dress(MS499)', 'dress'))).toBe(false);
      expect(fall().match(p('Lace Butterfly Cape Top in Sky Blue'))).toBe(false);
      expect(fall().match(p('Cape Swim Dress - Earth', 'swim'))).toBe(false);
    });

    it('excludes caps, undercaps and grips, which are not hijabs', () => {
      expect(fall().match(p('Velvet Cap Grip - Rust', 'hijab'))).toBe(false);
      expect(fall().match(p('Full Coverage Hijab Cap - Mulberry', 'hijab'))).toBe(false);
      expect(fall().match(p('Clay - Adjustable Tie Underscarf', 'hijab'))).toBe(false);
    });

    it('does NOT exclude a cap-SLEEVE garment by way of the cap rule', () => {
      // The negative control for the rule above: /\bcap\b/ would have killed
      // every cap-sleeve piece in the catalogue.
      expect(fall().match(p('Cap Sleeve Striped Blouse'))).toBe(true); // CONSTRUCTED
    });

    it('excludes outerwear that is too thick — Tina: "outerwear, but not too thick"', () => {
      expect(fall().match(p('Teddy Borg Oversized Coat'))).toBe(false);   // CONSTRUCTED
      expect(fall().match(p('Padded Puffer Gilet'))).toBe(false);         // CONSTRUCTED
    });

    it('keeps quilted gilets, which are the moodboard piece', () => {
      // Negative control for the rule above: `quilted` was in TOO_THICK on the
      // first pass and removed — moodboard panel 3 is a quilted wool gilet.
      expect(fall().match(p('Quilted Sleeveless Vest 9518'))).toBe(true);
    });

    it('excludes t-shirts even when the title says long-sleeved', () => {
      expect(fall().match(p('Long-sleeved T-shirt in Aube polo material'))).toBe(false);
      expect(fall().match(p('Striped t-shirt'))).toBe(false);
    });
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/edits.test.ts -t 'fall-essentials guards'`
Expected: FAIL — every test throws `fall-essentials edit is missing from EDITS`, because Task 4 has not added it yet.

This failure is correct and expected at this point. Tasks 1–3 build the parts; the tests go green in Task 4. Do **not** try to make them pass early.

- [ ] **Step 3: Add the guard regexes**

In `lib/edits.ts`, replace the existing `NOT_A_GARMENT` declaration:

```ts
const NOT_A_GARMENT = /\bpin\b|magnet|\bsock\b|glove|\bbag\b|clutch|jewel|earring|necklace|\bgrip\b|gift card|\bcard\b/i;
```

with:

```ts
/** Accessories and oddments that match a fabric word but are not the edit.
 *  Same class of false positive as CLAUDE.md §10.10 — a keyword is evidence,
 *  never proof. Checked against real titles: "Velvet Cap Grip" (an AUD11
 *  undercap grip) and "Leather Cap with Embroidery Detail" both matched their
 *  fabric word and are plainly not feature pieces.
 *
 *  The cap/undercap/underscarf terms were added 2026-08-25 for Fall
 *  Essentials, whose hijab rule is a COLOUR rule — so "Velvet Cap Grip - Rust"
 *  and "Full Coverage Hijab Cap - Mulberry" reach it on their colour alone and
 *  nothing about the fabric or the garment stops them.
 *
 *  NOTE the shape of the cap terms. A bare /\bcap\b/ was tried and rejected:
 *  it kills every "Cap Sleeve" garment in the catalogue, which is a real and
 *  common cut. Each term is therefore spelled out. */
const NOT_A_GARMENT =
  /\bpin\b|magnet|\bsock\b|glove|\bbag\b|clutch|jewel|earring|necklace|\bgrip\b|gift card|\bcard\b|\bundercap\b|under[-\s]?cap|under[-\s]?scarf|\bbonnet\b|hijab cap|cap grip/i;

/**
 * A cape SLEEVE is not a cape.
 *
 * Checked 2026-08-25 while sizing the Fall Essentials grid: /\bcape\b/ matches
 * 227 in-stock products and almost every one is a cape-sleeve dress or abaya —
 * "Crystal Beaded Waist Cape Sleeve Maxi Dress", "Cape Swim Dress - Earth",
 * "Lace Butterfly Cape Top". The outerwear cape Tina's moodboard shows is a
 * handful of pieces hiding inside that.
 *
 * Exactly §10.10 again: a keyword match is evidence FOR a category, never
 * proof. Without this the edit's biggest bucket would have been dresses.
 */
const CAPE_SLEEVE = /cape[-\s]?sleeve|sleeve[-\s]?cape|cape\s+(dress|abaya|top|maxi|swim)|butterfly\s+cape/i;

/**
 * The thickness ceiling. Tina, 2026-08-25: *"Denim skirts, capes, and
 * outerwear, but not too thick, so you can think about trench coats"*.
 *
 * This is a TRANSITIONAL edit — trench weight, not winter weight — so the
 * padded and pile-lined pieces are out even though the catalogue has them.
 *
 * `quilted` is deliberately NOT here. It was, on the first pass, and it
 * removed the quilted wool gilet that is panel 3 of her own moodboard. A
 * quilted gilet is the piece; a quilted parka is not.
 */
const TOO_THICK = /\bteddy\b|\bsherpa\b|\bborg\b|\bpuffer\b|\bpadded\b|\bparka\b|down[-\s]?filled/i;

/** A t-shirt is not a blouse. Needed as its own guard rather than folded into
 *  the shirt rule, because "Long-sleeved T-shirt in Aube polo material"
 *  qualifies via the long-sleeve branch before the shirt branch is consulted. */
const TSHIRT = /\bt[-\s]?shirts?\b/i;
```

- [ ] **Step 4: Confirm nothing else regressed**

Run: `npx vitest run lib/edits.test.ts lib/exclude.test.ts`
Expected: the pre-existing `edits` tests still PASS; the new `fall-essentials guards` block still FAILS with "fall-essentials edit is missing from EDITS".

`NOT_A_GARMENT` also gates the `everyday-lace` and `jersey-hijabs` fallbacks. Both ship `productIds`, so `match` is not what renders them and no picked id can be affected — but run the file to be sure.

- [ ] **Step 5: Commit**

```bash
git add lib/edits.ts lib/edits.test.ts && git commit -m "feat(edits): guard regexes for Fall Essentials

Cape-sleeve, cap/undercap/underscarf, thickness ceiling and t-shirt
exclusions, each with the literal catalogue title that motivated it.

A bare /\bcap\b/ was tried and rejected: it kills every Cap Sleeve
garment. 'quilted' was tried in TOO_THICK and removed: it killed the
quilted gilet that is panel 3 of the moodboard.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: The fall colour palette

Tina's palette card names six shades. Brands do not write those six words — they write mulberry, espresso, khaki, latte, ecru, terracotta. Each colour is therefore a family of the words brands actually use, read off real titles.

**Files:**
- Modify: `lib/edits.ts` (after the Task 1 guards)
- Test: `lib/edits.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: module-private `const FALL_PALETTE: Record<'burgundy'|'chocolate'|'olive'|'camel'|'cream'|'rust', RegExp>` and `const IN_FALL_PALETTE: (title: string) => boolean`. Task 3 calls `IN_FALL_PALETTE`.

- [ ] **Step 1: Write the failing test**

Add to `lib/edits.test.ts`, inside `describe('edits', ...)`:

```ts
  describe('fall-essentials palette', () => {
    // One literal in-stock catalogue title per family, checked 2026-08-25.
    it('accepts a hijab from each of the six families', () => {
      expect(fall().match(p('Deep Mulberry Modal Lace Hijab', 'hijab'))).toBe(true);   // burgundy
      expect(fall().match(p('Espresso Bamboo Jersey Hijab', 'hijab'))).toBe(true);             // chocolate
      expect(fall().match(p('The Khaki Jersey Hijab', 'hijab'))).toBe(true);              // olive
      expect(fall().match(p('Taupe Latte Jersey Hijab', 'hijab'))).toBe(true);         // camel
      expect(fall().match(p('Bone White Jersey Hijab', 'hijab'))).toBe(true);          // cream
      expect(fall().match(p('Solid Modal - Burnt Clay', 'hijab'))).toBe(true);         // rust
    });

    it('rejects a hijab outside the palette', () => {
      expect(fall().match(p('Powder Blue Lace', 'hijab'))).toBe(false);
      expect(fall().match(p('Jasmine White Lace', 'hijab'))).toBe(false);
      expect(fall().match(p('Premium Soft Jersey Hijab [Gree]', 'hijab'))).toBe(false);
    });

    it('does not read "almond green" as camel', () => {
      // Literal title. `almond` was in the camel family on the first pass and
      // was removed for exactly this: the piece is green.
      expect(fall().match(p('Almond green premium jersey hijab', 'hijab'))).toBe(false);
    });

    it('does not read "butter yellow" as cream', () => {
      // Butter yellow is the spring colour, not one of Tina's six.
      expect(fall().match(p('Satin Scarf Dress SS26 Butter Yellow', 'dress'))).toBe(false);
    });

    it('does not find a colour inside a longer word', () => {
      // \b regression guards. Each of these contains a palette term as a
      // substring and must not match on it.
      expect(fall().match(p('Herringbone Wrap Hijab', 'hijab'))).toBe(false);   // CONSTRUCTED, ...bone
      expect(fall().match(p('Tartan Check Hijab', 'hijab'))).toBe(false);       // CONSTRUCTED, ...tan
      expect(fall().match(p('Honeycomb Weave Hijab', 'hijab'))).toBe(false);    // CONSTRUCTED, honey...
    });
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/edits.test.ts -t 'fall-essentials palette'`
Expected: FAIL — `fall-essentials edit is missing from EDITS`.

- [ ] **Step 3: Add the palette**

Append to `lib/edits.ts`, after `TSHIRT`:

```ts
/**
 * Tina's fall palette, 2026-08-25 — *"the shades that make any outfit look
 * expensive this season"*: Burgundy · Chocolate · Olive · Camel · Cream · Rust.
 *
 * WHY EACH COLOUR IS A FAMILY. Brands do not write the six words on her card.
 * They write mulberry, espresso, khaki, latte, ecru, terracotta. Every term
 * below was read off a real in-stock catalogue title rather than taken from a
 * colour list, which is why the families are lopsided — `rust` has eleven terms
 * and only 86 hijabs, `olive` has nine and has 281.
 *
 * Measured 2026-08-25 over in-stock rows: burgundy 141 hijabs / chocolate 241 /
 * olive 281 / camel 141 / cream 184 / rust 86. Union 1,060 of 5,031.
 *
 * TWO TERMS WERE REMOVED after checking what they matched, which is the §10.10
 * discipline and the only reason this comment is worth reading:
 *   - `almond` (camel) matched "Almond green premium jersey hijab" — green.
 *   - `butter` (cream) matched "Butter Yellow" — the spring colour.
 *
 * On \b: every term here is ASCII, so §10.31's Turkish trap does not apply to
 * the terms themselves. It would apply to any non-English colour word added
 * later — `\b` is defined against [A-Za-z0-9_], so it finds a boundary in the
 * middle of a word containing ı ş ğ ü ö ç. Use the `word()` helper in
 * lib/tag.ts if a non-ASCII colour is ever added here.
 */
const FALL_PALETTE: Record<'burgundy' | 'chocolate' | 'olive' | 'camel' | 'cream' | 'rust', RegExp> = {
  burgundy: /\b(burgundy|bordeaux|merlot|maroon|wine|cherry|plum|damson|aubergine|fig|mulberry|berry)\b/i,
  chocolate: /\b(chocolate|cocoa|choco|espresso|coffee|mocha|walnut|chestnut|truffle|hazelnut|brownie)\b/i,
  olive: /\b(olive|khaki|sage|moss|forest|pistachio|army|fern|matcha)\b/i,
  camel: /\b(camel|caramel|toffee|tan|honey|biscuit|latte|butterscotch|cappuccino)\b/i,
  cream: /\b(cream|ecru|ivory|oatmeal|bone|milk|vanilla|eggshell|off[-\s]?white)\b/i,
  rust: /\b(rust|terracotta|terra[-\s]?cotta|brick|copper|cinnamon|burnt[-\s]orange|amber|clay|ochre|paprika|pumpkin|ginger|sienna|auburn)\b/i,
};

const IN_FALL_PALETTE = (title: string): boolean =>
  Object.values(FALL_PALETTE).some((re) => re.test(title));
```

- [ ] **Step 4: Confirm it still fails for the right reason**

Run: `npx vitest run lib/edits.test.ts -t 'fall-essentials palette'`
Expected: still FAIL with `fall-essentials edit is missing from EDITS` — not a regex error, not a TypeScript error.

Also run: `npx tsc --noEmit`
Expected: exit 0. (`rm -f tsconfig.tsbuildinfo` first — `incremental: true` can mask a repeat run.)

- [ ] **Step 5: Commit**

```bash
git add lib/edits.ts lib/edits.test.ts && git commit -m "feat(edits): fall colour palette as six term families

Tina's palette card mapped to the words brands actually use in titles.
Union is 1,060 of 5,031 in-stock hijabs.

'almond' and 'butter' removed after checking what they matched:
'Almond green premium jersey hijab' is green, 'Butter Yellow' is the
spring colour.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: The three bucket predicates

The moodboard is an outfit kit — a layer, a blouse, a bottom — so the fallback is a union of three buckets rather than one keyword.

**Files:**
- Modify: `lib/edits.ts` (after `IN_FALL_PALETTE`)
- Test: `lib/edits.test.ts`

**Interfaces:**
- Consumes: `CAPE_SLEEVE`, `TSHIRT` (Task 1).
- Produces: module-private `const FE_LAYER: (p: Product) => boolean`, `const FE_TOP: (p: Product) => boolean`, `const FE_BOTTOM: (p: Product) => boolean`. Task 4's `match` calls all three.

- [ ] **Step 1: Write the failing test**

Add to `lib/edits.test.ts`, inside `describe('edits', ...)`:

```ts
  describe('fall-essentials buckets', () => {
    it('takes the layer: gilets, vests, knits, trench, corduroy, real capes', () => {
      expect(fall().match(p('Oversized Gilet'))).toBe(true);
      expect(fall().match(p('Tailored Gilet Set', 'set'))).toBe(true);
      expect(fall().match(p('Laurel Vest'))).toBe(true);
      expect(fall().match(p('The Icon knitted dress in white', 'dress'))).toBe(true);
      expect(fall().match(p('Corduroy Two Piece Set – Dark Grey', 'set'))).toBe(true);
      expect(fall().match(p('Corduroy Abaya-CLEARANCE', 'abaya'))).toBe(true);
    });

    it('takes the top: blouses, stripes, long sleeves, shirts', () => {
      expect(fall().match(p('Basic Striped Shirt'))).toBe(true);
      expect(fall().match(p('Ruffle Blouse - Taupe'))).toBe(true);
      expect(fall().match(p('Blouse With Bow'))).toBe(true);
    });

    it('takes the bottom: fall trousers and A-line/balloon/satin/denim skirts', () => {
      expect(fall().match(p('Essential Wool Trousers', 'trousers'))).toBe(true);
      expect(fall().match(p('Fold Up Jeans', 'trousers'))).toBe(true);
      expect(fall().match(p('Pleated Satin Skirt', 'skirt'))).toBe(true);
      expect(fall().match(p('Espresso Satin Skirt', 'skirt'))).toBe(true);
    });

    it('does not take every trouser in the catalogue', () => {
      // The naive rule was 1,392 pieces — effectively all of them, summer
      // linen included. A fall signal is required.
      expect(fall().match(p('Basic Everyday Trousers', 'trousers'))).toBe(false);  // CONSTRUCTED
      expect(fall().match(p('Linen Palazzo Trousers', 'trousers'))).toBe(false);   // CONSTRUCTED
    });

    it('does not take a summer skirt', () => {
      expect(fall().match(p('Pleated Chiffon Maxi Skirt', 'skirt'))).toBe(false); // CONSTRUCTED
    });

    it('never takes swimwear', () => {
      expect(fall().match(p('Ribbed Knit Burkini - Olive', 'swim'))).toBe(false); // CONSTRUCTED
    });
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/edits.test.ts -t 'fall-essentials buckets'`
Expected: FAIL — `fall-essentials edit is missing from EDITS`.

- [ ] **Step 3: Add the buckets**

Append to `lib/edits.ts`, after `IN_FALL_PALETTE`:

```ts
/**
 * THE LAYER — the piece that goes over everything else.
 *
 * Gilet appears in 4 of Tina's 12 moodboard panels, more than any other item,
 * and it is the one word this catalogue is thin on (15 titles) while being deep
 * in its synonyms (`vest`, 230). Both are taken, restricted to tops and sets so
 * "floor length vest" abayas do not arrive through the back door.
 *
 * The knit/trench/corduroy/cape branches are deliberately NOT garment-restricted:
 * a knitted dress and a corduroy open abaya are both fall layers, and Tina named
 * "coat cords" and "sets that are a little bit thicker in texture" explicitly.
 */
const FE_LAYER = (p: Product): boolean =>
  ((p.garment === 'top' || p.garment === 'set') && /\bgilet\b|\bvest\b|\bwaistcoat\b/i.test(p.title)) ||
  /\bcardigan\b|\bsweater\b|\bjumper\b|\bknit(ted|wear)?\b|\bturtle\s?neck\b|\broll\s?neck\b/i.test(p.title) ||
  /\btrench\b|\bcorduroy\b|\bponcho\b/i.test(p.title) ||
  (/\bcape\b/i.test(p.title) && !CAPE_SLEEVE.test(p.title));

/**
 * THE BLOUSE — Tina: *"pop-of-color blouses"*, and *"The striped ones are
 * really, really popular"*. "Blouse pop of color" is on 5 of the 12 panels and
 * a striped long sleeve on 2 more.
 *
 * Restricted to `garment === 'top'`, which is why a striped ABAYA does not
 * qualify here. That is a choice, not an oversight: every striped piece on the
 * moodboard is a long-sleeve top, and letting the print in on abayas would pull
 * from a 5,218-row pool on a pattern rather than on the season. Tina can still
 * hand-pick one.
 */
const FE_TOP = (p: Product): boolean =>
  p.garment === 'top' &&
  !TSHIRT.test(p.title) &&
  /\bblouse\b|\bstripe[ds]?\b|\blong[-\s]?sleeve|\bshirt\b/i.test(p.title);

/**
 * THE BOTTOM — Tina: *"thick trousers"*, *"Denim skirts ... balloon skirts, and
 * A-line skirts"*, plus the satin column skirt that appears twice on the board.
 *
 * The trouser half needs a FALL SIGNAL. Without one the bucket is 1,392 pieces
 * — effectively every trouser in the catalogue, summer linen included — which
 * would have made the edit's largest category the one thing about it that is
 * not seasonal.
 */
const FALL_TROUSER = /\bwide[-\s]?leg\b|\bpleated\b|\btailored\b|\bcorduroy\b|\bwool\b|\bdenim\b|\bjeans?\b|\bthick\b|\bcargo\b|\bbarrel\b/i;

const FE_BOTTOM = (p: Product): boolean =>
  (p.garment === 'trousers' && FALL_TROUSER.test(p.title)) ||
  (p.garment === 'skirt' && /\ba[-\s]?line\b|\bballoon\b|\bbubble\b|\bsatin\b|\bdenim\b|\bcorduroy\b/i.test(p.title));
```

- [ ] **Step 4: Confirm it still fails for the right reason**

Run: `npx vitest run lib/edits.test.ts -t 'fall-essentials buckets'` — still `fall-essentials edit is missing from EDITS`.
Run: `npx tsc --noEmit` — exit 0.

- [ ] **Step 5: Commit**

```bash
git add lib/edits.ts lib/edits.test.ts && git commit -m "feat(edits): layer/top/bottom buckets for Fall Essentials

The moodboard is an outfit kit, so the fallback is a union of three
buckets rather than one keyword.

Trousers need a fall signal — the naive rule was 1,392 pieces, i.e.
every trouser in the catalogue including summer linen.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: The EDITS entry — everything except the copy

This is the task that turns all three previous tasks green.

**Files:**
- Modify: `lib/edits.ts` — append a third object to the `EDITS` array, after `jersey-hijabs`
- Test: `lib/edits.test.ts` (no new tests; Tasks 1–3's tests go green here)

**Interfaces:**
- Consumes: `NOT_A_GARMENT`, `TOO_THICK` (Task 1), `IN_FALL_PALETTE` (Task 2), `FE_LAYER`, `FE_TOP`, `FE_BOTTOM` (Task 3).
- Produces: an `Edit` with `slug: 'fall-essentials'`, reachable as `editBySlug('fall-essentials')`.

- [ ] **Step 1: Add the entry**

Append inside the `EDITS` array in `lib/edits.ts`, after the `jersey-hijabs` object's closing `},`:

```ts
  {
    slug: 'fall-essentials',
    title: 'Fall Essentials',
    eyebrow: 'The Edit · Autumn 2026',
    // NOT featured — `featured` only decides which banner comes FIRST on the
    // homepage, and Jersey Hijabs holds it. All three render.
    more: { href: '/directory', label: 'The whole directory' },

    // ---------------------------------------------------------------------
    // PLACEHOLDER HERO — Tina's choice, 2026-08-25: build the page with a
    // temporary hero so the layout and the grid can be reviewed, then swap her
    // own shot in before it goes live.
    //
    // This is the LACE hero, reused. That means the homepage shows the same
    // photograph on two banners, which looks wrong — deliberately. A
    // placeholder that could be mistaken for a finished choice is the more
    // expensive mistake.
    //
    // TO REPLACE: swap the five image fields below for her pair, MEASURE the
    // real pixel ratios (do not round — see the imageRatio doc comment), run
    // `node scripts/optimise-images.mjs` and list only the widths it actually
    // generated. Give the files NEW names; public/ is served with a 4h cache
    // and is not fingerprinted (CLAUDE.md §6, §10.21).
    // ---------------------------------------------------------------------
    image: '/edit-lace-hero-v2.jpg',
    imageMobile: '/edit-lace-hero-mobile-v2.jpg',
    imageRatio: 5504 / 3072,
    imageMobileRatio: 1920 / 2571,
    imageWidths: [640, 1024, 1440, 1920, 2400, 3200, 3840],
    imageMobileWidths: [390, 780, 1170, 1560, 1920],
    imageAlt: 'Placeholder — awaiting the Fall Essentials hero photograph',

    seoTitle: 'Fall Essentials — Gilets, Knits, Blouses and Fall Skirts',
    seoDescription:
      'The fall layers from independent modest houses worldwide — gilets, knits, trench coats, striped blouses and satin skirts, in burgundy, chocolate, olive, camel, cream and rust.',

    styling: {
      // FILLED IN BY TASK 5. Left as a single marked placeholder rather than
      // invented copy: CLAUDE.md §10.18 — brand voice is Tina's product.
      h2: 'PLACEHOLDER — awaiting copy',
      paragraphs: ['PLACEHOLDER — awaiting copy'],
    },

    /**
     * Fall Essentials, from Tina's 12-panel moodboard (`flyingworm1376`) and her
     * fall palette card, both supplied 2026-08-25.
     *
     * TWO GATES, NOT ONE, and that is the whole design. Asked whether hijabs
     * belong, she said: *"im gonna send you a photo of the color pallate i want
     * you to take that and take hijabs with that vibe"*. So:
     *   - CLOTHING is gated by the moodboard's garment vocabulary (FE_LAYER /
     *     FE_TOP / FE_BOTTOM).
     *   - HIJABS are gated by the PALETTE — colour, not garment.
     *
     * `includeHijabs` is therefore set for a different reason than the other two
     * edits: not because the theme happens to include scarves, but because the
     * theme IS a colour story and the scarves are where a colour story lives.
     *
     * Measured 2026-08-25 over in-stock rows: 3,429 pieces, 83 brands —
     * 1,450 tops · 884 hijabs · 526 trousers · 255 skirts · 157 dresses ·
     * 107 abayas · 50 sets.
     *
     * This is the FALLBACK. Tina picks in /staff/curate and those ids replace it
     * entirely, exactly as they do for the other two edits.
     */
    match: (p) =>
      p.garment !== 'swim' &&
      !NOT_A_GARMENT.test(p.title) &&
      !TOO_THICK.test(p.title) &&
      (p.garment === 'hijab' ? IN_FALL_PALETTE(p.title) : FE_LAYER(p) || FE_TOP(p) || FE_BOTTOM(p)),

    includeHijabs: true,
  },
```

- [ ] **Step 2: Run the full edits suite**

Run: `npx vitest run lib/edits.test.ts`
Expected: **PASS**, all blocks. In particular `every edit resolves to at least one product` now covers `fall-essentials`, and `every edit has a unique slug` proves the slug does not collide.

If `fall-essentials guards` / `palette` / `buckets` still fail, the failure is now a real one — read the assertion, do not adjust the test to match the code.

- [ ] **Step 3: Verify the live count matches the plan**

Run:

```bash
npx tsx -e "
import { EDITS } from './lib/edits';
import { productsForEdit } from './lib/products';
const e = EDITS.find(x => x.slug === 'fall-essentials')!;
const items = productsForEdit(e);
const g: Record<string, number> = {};
for (const p of items) g[p.garment] = (g[p.garment] ?? 0) + 1;
console.log('total', items.length, 'brands', new Set(items.map(p => p.brandSlug)).size);
console.log(g);
"
```

Expected: `total 3429 brands 83` and the garment split above, ±a few rows if the nightly refresh has run since 2026-08-25. A number in the hundreds or the tens of thousands means a bucket is wrong — investigate before continuing.

- [ ] **Step 4: Full suite, types, lint**

```bash
rm -f tsconfig.tsbuildinfo && npx tsc --noEmit && npm run lint && npm test
```

Expected: all three exit 0.

- [ ] **Step 5: Commit**

```bash
git add lib/edits.ts && git commit -m "feat(edits): add the Fall Essentials edit

Third edit. Clothing gated by the moodboard vocabulary, hijabs gated by
Tina's six-colour fall palette — the two-gate split she asked for.

3,429 pieces across 83 brands in the fallback. Hero is a marked
placeholder (the lace pair, reused) and the styling copy is a marked
placeholder pending her approval.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: The styling copy — drafted from Tina's words only

**Files:**
- Modify: `lib/edits.ts` (the `styling` block added in Task 4)

**Interfaces:**
- Consumes: the `fall-essentials` entry (Task 4).
- Produces: nothing new.

**§10.18 governs this task.** Tina's reply to invented copy was *"i didnt tell you to add that"*, and the lace edit's styling block is her own writing. The draft below is built ONLY from things she has actually said this session, plus facts that change a buying decision. It is ~150 words — the length she cut the jersey block down to with *"nobody is reading that shit i want you to only write what people will care about"*. **It ships as a draft and must be shown to her before staging is called done.**

- [ ] **Step 1: Replace the placeholder styling block**

```ts
    styling: {
      h2: 'How to build a fall outfit',
      // DRAFT — every claim traces to something Tina said on 2026-08-25:
      // "the striped ones are really, really popular"; "sets that are a little
      // bit thicker in texture"; "outerwear, but not too thick"; "pop-of-color
      // blouses"; "denim skirts ... balloon skirts, and A-line skirts".
      // Nothing here is invented brand voice. Awaiting her cut.
      paragraphs: [
        'Fall dressing is three pieces, not one: a layer, a blouse, and a bottom. Get the layer right and the rest is easy — a [gilet](/blazers-vests) over a white shirt is a whole outfit, and it is the same shirt you already wear in summer.',
        'Keep the outerwear light. A trench or a corduroy coat does everything a padded one does until it is genuinely cold, and it keeps the shape of what is underneath instead of hiding it. Texture is what makes it read as autumn — [corduroy](/jackets-coats), wool, a thicker knit — not weight.',
      ],
      paragraphsBelow: [
        'Stripes are the easiest top to own this season, and a striped long sleeve goes under a gilet, over jeans, and with a satin [skirt](/modest-skirts) without you thinking about it. If you want one thing that is not neutral, make it the blouse.',
        'The six shades to buy in: burgundy, chocolate, olive, camel, cream and rust. They all work with each other, which is the point — any two of them are already an outfit.',
      ],
    },
```

- [ ] **Step 2: Verify the internal links resolve**

Run:

```bash
npx tsx -e "
import { LANES } from './lib/lanes';
const slugs = new Set(LANES.map(l => '/' + l.slug));
for (const href of ['/blazers-vests', '/jackets-coats', '/modest-skirts']) {
  console.log(slugs.has(href) ? 'ok  ' : 'DEAD', href);
}
"
```

Expected: `ok` on all three. A dead internal link in editorial copy is silent — nothing type-checks a string href.

- [ ] **Step 3: Run the suite**

Run: `npm test`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add lib/edits.ts && git commit -m "copy(edits): draft styling block for Fall Essentials

Drafted strictly from Tina's own words on 2026-08-25 and marked as a
draft in the file. ~150 words, the length she cut the jersey block to.
Awaiting her approval before this is anything but a draft.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 5: Show Tina the draft**

Paste the four paragraphs in the chat, say plainly that they are a draft assembled from her own words, and ask her to cut. Do not proceed to Task 6 claiming the copy is done.

---

### Task 6: Verify on staging, and log

**Files:**
- Create: `docs/log/2026-08-25-fall-essentials-edit.md`

**Interfaces:**
- Consumes: everything above.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Build locally**

```bash
rm -f tsconfig.tsbuildinfo && npx tsc --noEmit && npm run lint && npm test && npm run build
```

Expected: all exit 0. `npm run build` should now report **33 routes**, one more than the documented 32 — `/edits/fall-essentials` comes from `generateStaticParams` over `EDITS`. If the count did not increase, the entry is not being picked up.

If another session is live, build in a worktree — `.next` is shared and two builds fight (§10.28 rule 4). Use `cp -al` for a hardlink clone of `node_modules`; a symlink makes Turbopack panic (§10.38).

- [ ] **Step 2: Push to staging**

```bash
git rev-parse --abbrev-ref HEAD   # confirm: staging
git push origin HEAD:staging
git merge-base --is-ancestor HEAD origin/staging && echo "landed"
```

Expected: `landed`. A clean exit code from `push` is not evidence (§10.17).

- [ ] **Step 3: Verify on staging with a real browser**

Wait for the Railway deploy to finish before looking — a screenshot taken a minute after a push shows the previous build (§10.23).

Open, with Playwright or Claude-in-Chrome, and LOOK at:
- `https://themodestyhouse-staging-production.up.railway.app/edits/fall-essentials`
- `https://themodestyhouse-staging-production.up.railway.app/` (three banners now)

Assert:
- The hero renders and is visibly the placeholder.
- The grid is populated, mixes clothing and hijabs, and the hijabs that appear are in-palette.
- The styling block renders above and below the story area, with the three internal links clickable.
- The footer lists three edits.

Then confirm staging is still not indexable:

```bash
curl -sI https://themodestyhouse-staging-production.up.railway.app/edits/fall-essentials | grep -i x-robots-tag
```

Expected: `x-robots-tag: noindex, nofollow, noarchive`.

- [ ] **Step 4: Write the log entry**

Create `docs/log/2026-08-25-fall-essentials-edit.md` using the §9 format: Goal · What changed (files + why) · Verification (commands run and their REAL output, pasted) · Notes / follow-ups.

The follow-ups section must name both open items explicitly:
1. **Hero is a placeholder** — the lace pair, reused. Names the five fields to swap and the measure/optimise/rename steps.
2. **`productIds` not set** — the grid is the automatic fallback until Tina picks in `/staff/curate`. On receipt: verify every id resolves and is in stock, reorder so no house is adjacent and hijabs are spread, and let `lib/edits.test.ts` assert both.

- [ ] **Step 5: Commit and report**

```bash
git add docs/log/2026-08-25-fall-essentials-edit.md && git commit -m "docs(log): Fall Essentials edit

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>" && git push origin HEAD:staging
```

Then report to Tina with the staging URL that was actually opened, the real counts, and the two open follow-ups. **Do not merge to `main`** — that needs her explicit approval, every time (§1).

---

## Open items that are NOT tasks

These are blocked on Tina and are tracked in the Task 6 log entry, not implemented here:

- **The real hero pair.** She said she'd send one.
- **`productIds`.** Her picks from `/staff/curate`.
- **Fall vs Autumn.** The title says Fall, the eyebrow says `Autumn 2026` to match its two siblings. Flagged to her; unchanged unless she says so.
- **seoTitle / seoDescription volume was not measured.** Written to the edit's own vocabulary. The jersey edit's SEO copy was backed by Google Trends comparisons; this one is not, and that difference should not be papered over. Worth a Trends pass before it reaches `main`.
