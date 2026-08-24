import type { Product } from './types';

/**
 * /edits/[slug] — a shoppable EDIT: campaign hero, then the pieces.
 *
 * Not an editorial post. Tina, 2026-08-24, after I proposed a written
 * explainer: *"this is for a normal blogpost what i was talking about more was
 * something like this"* + the aabcollection.com "The Art Of Summer / HIGH
 * SUMMER 2026 / SHOP NEW IN" hero. Then, on the lace one specifically:
 * *"its going to be only items and maybe somewhere an explanation how you can
 * style it but mostly items"*.
 *
 * So the shape is deliberate and the ratio is the point: hero, grid, and one
 * short styling block placed AFTER the grid — the same ordering rule
 * lib/laneAnswers.ts already follows, for the same reason. A shopper wants the
 * pieces first.
 *
 * WHY THIS IS ITS OWN ROUTE and not a lane. A lane is a garment category
 * (`lib/lanes.ts`) and every lane owns a permanent slice of the catalogue. An
 * edit is a THEME cutting across categories — lace runs through abayas,
 * dresses, tops, skirts and hijabs at once — and it is allowed to be seasonal
 * and to be retired. Adding "lace" to LANES would have put it in the nav, the
 * footer and the category grid as though it were a permanent department.
 *
 * SEO note: an edit page is a COLLECTION page, which matters more than it
 * sounds. Checked on 2026-08-24: the SERPs for commercial queries like
 * `lace hijab` and `modest dress` are made of collection and product pages, not
 * articles — so a written post cannot rank for them and a page of this shape
 * can. That is the whole reason this route exists rather than a fourth blog
 * post. → docs/log/2026-08-24-modest-trend-research-for-edit.md
 */
export type Edit = {
  slug: string;
  /** Big display title over the hero. */
  title: string;
  /** Small caps line under it — the "HIGH SUMMER 2026" slot. */
  eyebrow: string;
  /** One line of hero copy. Kept short: it sits over a photograph. */
  dek: string;
  /** Hero photograph, from public/. Give a NEW filename when replacing it —
   *  public/ is served with a 4h cache and is not fingerprinted (CLAUDE.md §6). */
  image: string;
  imageAlt: string;
  /** <title> and meta description. Written to the query the page is FOR. */
  seoTitle: string;
  seoDescription: string;
  /** The styling block after the grid. Real content, server-rendered.
   *
   *  Tina's words, not generated — she wrote the lace one on 2026-08-24 and
   *  §10.18 is the reason that matters: the mechanism is mine, the voice is
   *  hers. Anything written here that she has not said should be marked as a
   *  placeholder, the way the first draft of this block was.
   *
   *  FOLLOW-UP she raised in the same message: *"in the future I wanna make a
   *  list of what it means by structure. Or by proportion or silhouette,
   *  because I'm gonna use that a lot"*. A shared glossary of those terms would
   *  be linkable from every edit's styling block rather than re-explained in
   *  each one. Not built — noted here so it is not lost. */
  styling: { h2: string; paragraphs: string[] };
  /**
   * Which pieces belong. A predicate over the published catalogue rather than a
   * hand-listed set of ids: a hand-listed edit goes stale silently the moment a
   * brand delists something, and this catalogue turns over nightly
   * (`.github/workflows/refresh.yml`).
   */
  match: (p: Product) => boolean;
  /**
   * Whether hijabs may appear.
   *
   * READ THIS BEFORE COPYING IT. CLAUDE.md Invariant 5 says hijabs never appear
   * in mixed grids — they belong to their own lane. That rule exists so a
   * general clothing grid is not diluted by 3,000 scarves, and it stands.
   *
   * An edit is the case the rule did not anticipate: a THEME, where excluding
   * hijabs would remove the part that makes the theme true. For lace it would
   * cut the 41 lace hijabs — which are the cheapest lace in the directory
   * ($6.90) and therefore the entire evidence for calling the edit "everyday".
   * So this is opt-in, per edit, and defaults to OFF so no future edit inherits
   * the exception by accident.
   */
  includeHijabs?: boolean;
};

/** Accessories and oddments that match a fabric word but are not the edit.
 *  Same class of false positive as CLAUDE.md §10.10 — a keyword is evidence,
 *  never proof. Checked against real titles: "Velvet Cap Grip" (an AUD11
 *  undercap grip) and "Leather Cap with Embroidery Detail" both matched their
 *  fabric word and are plainly not feature pieces. */
const NOT_A_GARMENT = /\bpin\b|magnet|\bsock\b|glove|\bbag\b|clutch|jewel|earring|necklace|\bgrip\b|gift card|\bcard\b/i;

/**
 * "lace-up" is a FASTENING, not the fabric.
 *
 * Caught 2026-08-24 while checking whether the catalogue really holds the item
 * types Tina described. `/\blace\b/` matched **57 of 428** pieces that contain
 * no lace at all — "Lace-Up Corset Cotton Shirt", "Eyelet Lace Up Maxi Dress",
 * "Lace Up Back Tencel Maxi Dress - Denim". Cotton poplin, tencel and denim
 * garments with a drawstring, sitting in an edit about lace.
 *
 * 13% of the grid. Straight out of CLAUDE.md §10.10: a keyword match is
 * evidence FOR a category, never proof, and every rule over third-party titles
 * needs its negative case tested before it ships. I shipped this one without
 * doing that.
 */
const LACE_UP = /lace[-\s]?up/i;

export const EDITS: Edit[] = [
  {
    slug: 'everyday-lace',
    title: 'Everyday Lace',
    eyebrow: 'The Edit · Autumn 2026',
    dek: 'Not saved for the occasion.',
    // PLACEHOLDER — reusing an existing editorial photograph so the page is
    // real and shippable today. It is not a lace shot. Replace with a proper
    // hero under a NEW filename (never overwrite in public/ — §6, §10.21).
    image: '/editorial/lookbook.jpg',
    imageAlt: 'A woman in a lace-trimmed modest outfit',
    seoTitle: 'Everyday Lace — Lace Hijabs, Abayas and Dresses',
    seoDescription:
      'Lace across the directory, from £5 lace-trim hijabs to lace abayas — from independent modest houses worldwide. Prices and links to each brand.',
    styling: {
      h2: 'Why lace works, and what to put it with',
      paragraphs: [
        'Lace adds detail without changing the outfit. That is the whole reason it earns a place in an everyday wardrobe — you are not rebuilding a look, you are giving one you already own the bit of flair it was missing. If something feels boring, you do not need a different outfit. You need one lace piece in it.',
        'The rule is to wear it with something structured. Structured does not mean stiff, and it does not mean the opposite of flowy — a satin skirt is flowy and still structured, because it falls in one straight line. It moves, but it never goes soft. Soft is the thing to avoid: lace against soft reads as one blurry texture and you lose the lace completely.',
        'Denim is the easiest version of this. It works because it is soft against hard, and those two are about as far apart as fabrics get, so each one makes the other more obvious. A lace top under a denim jacket. A lace-trim scarf with jeans. You do not have to think about it beyond that.',
        'Then contrast, which lace loves. Black lace against white pulls every eye straight to the lace, because nothing else in the outfit is competing for the attention. Put that same black lace on black and it quietly disappears into everything around it.',
      ],
    },
    match: (p) => /\blace\b/i.test(p.title) && !LACE_UP.test(p.title) && !NOT_A_GARMENT.test(p.title),
    includeHijabs: true,
  },
];

export function editBySlug(slug: string): Edit | undefined {
  return EDITS.find((e) => e.slug === slug);
}

/* NOTE ON WHAT IS *NOT* IN THIS FILE.
 * `productsForEdit()` lives in lib/products.ts, not here, and the only import
 * above is a TYPE import (erased at compile time). That is deliberate: this
 * module is imported by components/Footer.tsx to list the live edits, and
 * anything that reaches lib/products.ts reaches `node:fs`. Footer happens to be
 * a server component today, but Invariant 10 exists because that is exactly the
 * kind of thing that changes later and fails confusingly. Keeping the edit
 * DEFINITIONS client-safe means no future 'use client' file can break by
 * importing them. */
