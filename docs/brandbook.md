<!--
  RECOVERED 2026-09-01. Tina gave this on 2026-07-31, pasted into a chat; it had
  never been committed, so it lived only in conversations/*.jsonl and nothing on
  the site pointed at it. That is why it drifted without anyone noticing.

  READ THE DIVERGENCE SECTION AT THE BOTTOM BEFORE USING ANY VALUE HERE. The
  body below is the brandbook VERBATIM as given, and several of its concrete
  values are no longer what ships — some because Tina changed her mind later,
  which is her right and is the reason this file is not "the source of truth"
  for tokens. app/globals.css is. This is the source of truth for INTENT.
-->

# The Modest House — Brandbook

*by The Tina Aesthetic*

The complete brand reference. Neutral, editorial, expensive-feeling, with aubergine purple used as an accent, not a wash.

---

## 1. Brand at a glance

- **Name:** The Modest House
- **Signature line:** by The Tina Aesthetic
- **Tagline:** modest style, for everyone
- **What it is:** a curated modest-fashion catalogue that links out to where each piece is sold. A fashion house that happens to be a beautiful website.
- **Who it's for:** modest dressers of every kind, hijabi and non-hijabi, Christian modest, Muslim modest, and everyone in between.
- **Feeling:** editorial, grown, quietly expensive, a little sultry. Feminine without being cute. The confidence of Maison Liora, evolved.

---

## 2. The golden rule of the brand

**White page. Clothes carry the colour. Purple is the jewellery.**

The page background is pure white so the clothing photos are the loudest thing on screen. The warm neutrals (sand, greige, taupe) are not the canvas, they are quiet material used in the details: product tile fills, the odd section block, borders, secondary text. Aubergine purple is not the background either, it is the accent that appears only where it earns a moment: the hero band, the footer, the small buttons and details. If a page looks "purple," it is wrong. If it looks like a clean white gallery with elegant neutral details and purple touches, it is right.

This is exactly how Maison Liora worked: purple satin hero, purple footer, neutral everything in between.

---

## 3. Colour

### The base (about 90% of every page)

```
--white        #FFFFFF   page background AND product cards, pure white
--sand         #F1EBE1   product tile fills, subtle blocks (material, not canvas)
--greige       #DED5C7   secondary tiles, warm dividers (material, not canvas)
--taupe        #9A8F86   secondary text, brand labels, captions
--ink          #2B2622   primary text, near-black with warmth
--hairline     #E5DED4   borders, thin lines
```

The page is white. The sand and greige neutrals appear only inside details (tile fills, small blocks, borders), never as the page background.

### The accent (hero, footer, and small details only)

```
--whisper      #EADFE8   the lightest purple, soft tile or hover tint
--plum         #7D4B74   links, small accents
--plum-deep    #5A2C54   buttons (Shop), active states, price on hover
--aubergine    #3B1E3A   hero base, footer base, deepest brand note
```

### The hero and footer gradient (the one rich moment)

The single place purple takes over, a satin nod to the old Maison Liora banner:
```
background: linear-gradient(120deg, #3B1E3A, #5A2C54 55%, #7D4B74);
```

### Where purple is allowed vs not

Allowed: hero band, footer band, Shop buttons, active toggle, active filter chip, small links, tiny accents, one soft purple product tile among many neutral ones.

Not allowed: the page background, large content sections, behind product photos, more than a small fraction of any given screen.

### Vibe theming (the toggle)

The three vibe worlds keep the same neutral base and ink, and swap ONE accent variable. Only the accent and hero mood shift:
```
Elegant      --vibe-accent: #5A2C54   deep plum, quiet luxury
Streetwear   --vibe-accent: #4A4048   muted warm slate
Maximalist   --vibe-accent: #7E2E5E   richer magenta-plum
```
Everything accent-coloured reads from `--vibe-accent`, so the toggle re-skins the site by changing this one value. The neutrals never change.

---

## 4. Typography

Two families. An editorial serif for voice, a clean sans for function.

```
--font-display   'Cormorant Garamond', Georgia, serif
--font-ui        'Inter', 'Helvetica Neue', Arial, sans-serif
```

- **Display serif:** wordmark, hero, section headings. Wide letter-spacing (3 to 6px), thin to regular weight, often uppercase. This is the "expensive fashion house" voice.
- **Sans:** nav, buttons, product names, brand labels, prices, filters, body. Small, clean, quietly tracked.
- Product name may use the serif for an editorial touch; brand and price stay sans.
- Never heavy. Elegance comes from thin weight and whitespace, never from bold.

---

## 5. Shape language: sharp for content, soft for controls

The in-between of fashion-square and SaaS-round. Assign roundness by what the element is.

```
--radius-image     2px     product photos, hero image (gallery-crisp)
--radius-card      4px     product cards, tiles
--radius-section   6px     larger content blocks
--radius-button    999px   buttons, Shop links, filter chips, the vibe toggle
--radius-input     8px     search field, quiz inputs
```

Content stays sharp and editorial. The things you click get friendly, tappable roundness. Never fully rounded (reads as generic SaaS), never fully square (reads as cold).

---

## 6. Space, shadow, motion

- **Whitespace:** generous. The clothes are the hero, give them room.
- **Grid:** `repeat(auto-fit, minmax(160px, 1fr))`, 12 to 14px gaps. Mobile-first (Pinterest-on-phone is the main visitor).
- **Shadows:** almost none. Flat is fashion. One optional whisper-soft shadow on the vibe toggle so it feels liftable. Nowhere else.
- **Motion:** elegant, not bouncy. Soft fades, a slight image zoom on hover, 200 to 300ms ease-out. No springy SaaS animation.

---

## 7. Logo and monogram

- **Wordmark:** THE MODEST HOUSE in display serif, wide tracking, ink colour. Small "by the tina aesthetic" beneath in sans.
- **Monogram:** an M/H mark or crest, echoing the old Maison Liora ML monogram, for the hero, footer, and favicon. Rendered in cream/white on the aubergine gradient.

---

## 8. Components

**Vibe toggle:** persistent bar, three pill options, active filled with `--vibe-accent`, inactive ghosted in taupe. The signature interaction. Gets the one soft shadow.

**Nav:** discovery lanes (New, Dresses, Church, Hijab, Swim, Occasion) in small wide-tracked sans, taupe or plum. Thin hairline under the header.

**Hero:** full-width aubergine gradient band, display-serif tagline, one pill CTA. Re-skins per vibe.

**Filter chips:** pill-shaped, `--sand` or `--whisper` background, ink or plum text; active chip filled with `--vibe-accent`, white text.

**Product card:** white, 4px corners, hairline border, sharp 2px image on a `--sand` or `--greige` fill. Brand (sans, taupe, uppercase), name, price (ink), soft pill Shop button in `--vibe-accent` that clicks out. No shadow; hover lifts the border and gently zooms the image.

**Footer:** aubergine gradient, "Let's connect" in display-serif italic, wordmark and socials (Pinterest first) in sans. Direct echo of the Maison Liora footer.

---

## 9. Do and don't

**Do**
- Keep the base neutral so the clothes pop.
- Use purple in the hero, footer, buttons, and small details only.
- Lean on whitespace and thin type for the expensive feel.
- Keep images sharp, controls rounded.

**Don't**
- Make purple the page background or a large fill.
- Put anything coloured behind product photos (white or neutral only).
- Use heavy shadows, floating cards, or bouncy motion.
- Use heavy font weights or title case in the UI.
- Let any screen read as "a purple website."

---

## 10. The one-line brief

A clean, editorial modest-fashion house on a white canvas with warm neutral details, where the clothes carry the colour and aubergine purple appears only as jewellery: the hero, the footer, and the small details.

---

# Divergence: what actually shipped

Measured from `app/globals.css` and `data/brands.ts` on 2026-09-01, not asserted.
Every line here is a place the built site differs from the document above. Most
look like later decisions of Tina's rather than drift; they are listed so nobody
implements from a stale value.

**Name.** The brandbook says *The Modest House*. The site, the domain and every
piece of copy say **The Modesty House**.

**Colour.** The palette moved warmer and the page is no longer white.

| token | brandbook | shipped | note |
|---|---|---|---|
| page background | `#FFFFFF` pure white | `--parchment #faf7f1` | "White page, clothes carry the colour" is not what ships |
| aubergine | `#3B1E3A` | `#441943` | |
| plum | `#7D4B74` | `#6e4a6b` | |
| ink | `#2B2622` | `#241b24` | |
| hairline | `#E5DED4` | `#e4ddcf` | |
| taupe | `#9A8F86` | `--muted #796e5e` | renamed and darkened |
| sand / greige / whisper / plum-deep | defined | **absent** | never implemented |
| — | not in brandbook | `--brass #a98a5b` | added later; badges and graphic only |
| — | not in brandbook | `--bone #fbfaf6` | cards and surfaces |

**Typography.** Brandbook: Cormorant Garamond + Inter. Shipped: **Bodoni Moda**
(`--font-display`), **Marcellus** (`--font-label`), **Jost** (`--font-ui`) — a
three-family system where the brandbook specified two.

**The vibe toggle** — called "the signature interaction" in §8 — was removed on
2026-08-09 at Tina's request, along with the `/style/[vibe]` pages. The data
survives in `lib/vibes.ts` and is dormant.
→ `docs/log/2026-08-09-remove-style-vibe-feature.md`

**The hero/footer gradient** (`linear-gradient(120deg, #3B1E3A, #5A2C54 55%, #7D4B74)`)
is not what the site uses; the footer is a flat aubergine band.

**Still true, and still worth holding to:** purple as jewellery rather than
wash, flat over shadowed, sharp images and rounded controls, thin weights and
whitespace over bold, elegant motion over bouncy, and §10's one-line brief.
Those are the parts of this document the site has kept.
