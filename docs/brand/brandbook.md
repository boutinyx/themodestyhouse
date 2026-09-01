# The Modesty House — Brand Book

**The real one is the PDF: [`docs/brand/The-Modesty-House-Brand-Book.pdf`](The-Modesty-House-Brand-Book.pdf)**
— Tina's, *Brand Book · Volume One*, 8 pages, made 2026-08-03. It is the source
of truth for the identity. This file is a text transcription so the values are
greppable, an agent can read them without opening a PDF, and a drift check can
be written against them.

Committed 2026-09-01. Until then it lived only in `~/Downloads` and in a chat
attachment, which is why nothing in the codebase pointed at it and why, asked
today whether the project had a brand book, the honest-looking answer from
searching the repo was "no". It did.

> **Superseded:** an earlier markdown draft — *"The Modest House — Brandbook, by
> The Tina Aesthetic"*, 2026-07-31, in
> `conversations/2026-07-31_business-niches-to-modest-house.jsonl` — proposed a
> different name, a white page, Cormorant Garamond + Inter, and a vibe toggle.
> None of that is current. Do not build from it.

---

## 01 · Positioning — "A curator, not a catalogue"

> The Modesty House earns trust by having taste. The brand frames the fashion and
> steps back; the seal does the endorsing.

1. **Fashion leads.** Chrome stays quiet. Aubergine and parchment frame the work,
   never compete with it.
2. **Brass means endorsed.** Gold is reserved for moments of curation: Verified,
   Featured, Editor's Pick.
3. **Warm, never cold.** Welcoming and elegant. Aspirational without being
   exclusive or clinical.

**Line:** *"Where modest fashion is found."*
**Descriptor:** THE MODEST FASHION DIRECTORY.

## 02 · The mark — colourways

Primary is aubergine on parchment. Reverse to parchment on aubergine for depth.
**One colour, always. No gradients.** Four approved treatments: primary
(aubergine on parchment), reverse (parchment on aubergine), stationery (on bone),
foil/seal (on brass).

## 03 · Logo system — lockups & protection

Stacked lockup (mark over THE MODESTY HOUSE) and horizontal lockup (mark, rule,
two-line wordmark). **Clear space equals the height of the side star on all
sides.** Step the mark down as it shrinks:

| size | form |
|---|---|
| 40px+ | full — dotted ring and stars |
| 24–40px | oval |
| <24px | monogram |
| favicon | monogram |

Below ~40px the dotted ring and stars break up, which is what the step-down
exists to prevent.

## 04 · Colour — "Three to own, five to work"

**Core — the identity**

| | hex | rgb | note |
|---|---|---|---|
| Aubergine · primary | `#441943` | 68 25 67 | AAA on parchment |
| Parchment · ground | `#F3EEE4` | 243 238 228 | base surface |
| Antique Brass · accent | `#A98A5B` | 169 138 91 | **graphic use only** |

**Functional — the working system**

| | hex | rgb | note |
|---|---|---|---|
| Ink · text | `#241B24` | 36 27 36 | AAA body |
| Bone · surface | `#FBFAF6` | 251 250 246 | cards |
| Muted · meta | `#8A7D6B` | 138 125 107 | labels, not body |

**Proportion:** parchment 60% · ink 25% · neutral 8% · brass (a sliver).

## 05 · Typography — "Serif for soul, sans for function"

| role | family | use |
|---|---|---|
| Display | **Bodoni Moda** | wordmark, headlines, editorial features. Display only, 24px and up. |
| Labels | **Marcellus** | eyebrows, navigation, badges, section labels. **Always tracked caps.** |
| Text & UI | **Jost** | body copy, listings, filters, buttons, everything functional. |

## 06 · In context

Header: mark + "The Modesty House" left, DIRECTORY / EDITORIAL / DESIGNERS /
ABOUT right, in tracked caps. Listing rows: house name in display serif, then
`CATEGORY · CITY` in tracked caps, with a brass pill on the right for
**✦ VERIFIED** and **✦ EDITOR'S PICK**, or a plain `VIEW →` where there is no
seal. The "Verified by The Modesty House" badge is the mark reversed on
aubergine.

---

# Asset map — where the brand actually lives

Pointers, not copies. Each asset has ONE home; duplicating an image so two
places can each have their own is how a stale one ends up shipping (§10.21).

| asset | file | size | used for |
|---|---|---|---|
| Brand book | `docs/brand/The-Modesty-House-Brand-Book.pdf` | 8pp | the source of truth |
| Carousel brief | `docs/brand/instagram-carousel-brief.md` | — | hand to an outside AI or designer, with the logo |
| Logo, full mark | `public/logo.png` | 707×992, transparent | the site header; copied to `docs/brand/logo.png` for handoff |
| Logo, small | `public/logo-240.webp` | 240×337 | the header's served variant |
| Browser tab icon | `app/favicon.ico` | 16 / 32 / 48 | picked up by filename; no config |
| Web icon | `app/icon.png` | 512×512 | general, and what most scrapers take |
| iOS home screen | `app/apple-icon.png` | 512×512 | Apple touch icon |
| ↳ reference copies | `docs/brand/icon.png`, `docs/brand/favicon.ico` | — | so the icons are visible here beside the rest of the brand |

![The current icon](icon.png)

**`app/` is the live source for all three.** The two copies in this folder are
for looking at, not for deploying: Next.js serves the icons by filename from
`app/`, so changing a copy here changes nothing. If the icons are ever redrawn,
replace them in `app/` FIRST and re-copy — a copy that quietly falls behind the
original is exactly the failure §10.21 is written about. `app/apple-icon.png` is
the same artwork at 512px, so it is not duplicated here.

Copied 2026-09-01 from files dated 2026-08-06.

**The three icons are off-book, on purpose or not — decide before changing
them.** All three are the **four-pointed star inside a double ring**, parchment
on aubergine. The brand book's Logo system page specifies a different small-size
step-down: full mark above ~40px, the oval at 24–40px, and **the monogram**
below that, "for favicons, app icons, and listing avatars".

So the tab, the iOS home screen and every avatar Google or Instagram scrapes
show a decorative element of the mark rather than the mark. There is a real
argument for it — a bare TH at 16px turns to mush where a star stays legible —
which is very likely why it was chosen. It is recorded here so the next person
finds a decision rather than an accident. Not changed on 2026-09-01; Tina's call.

# What ships, measured against it

Checked against `app/globals.css` on 2026-09-01. **The site follows the brand
book.** Two tokens differ, both deliberately, both documented in the CSS itself:

| token | brand book | shipped | why |
|---|---|---|---|
| parchment | `#F3EEE4` | `#faf7f1` | brightened — a look decision |
| muted | `#8A7D6B` | `#796e5e` | **accessibility.** `#8A7D6B` is below the 4.5:1 AA floor and it is the label colour, so axe reported 9–41 contrast failures on every page. `#796e5e` is the lightest value on the same hue that clears AA on both grounds (4.67:1 on parchment, 4.78:1 on bone). |

Everything else matches exactly: aubergine `#441943`, brass `#a98a5b` (badges and
graphic only, never buttons — as the book says), ink `#241b24`, bone `#fbfaf6`,
and the Bodoni Moda / Marcellus / Jost split by role.

`--plum #6e4a6b` and `--hairline #e4ddcf` are in the CSS and not in the book —
a secondary tint of the primary, and a border colour. Not conflicts; extensions.

**Where the code and the book are one thing:** CLAUDE.md §6 already enforces
"brass for badges and graphic only, never buttons", the icon rule, and the token
discipline. This file is where the *reason* lives.
