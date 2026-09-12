import type { Metadata } from 'next';
import Link from 'next/link';
// ssr entrypoint: app/page.tsx is a server component (CLAUDE.md §6).
import { ArrowRight } from '@phosphor-icons/react/dist/ssr';
import { categoryCards } from '@/lib/houses';
import CategoryQuickLinks from '@/components/CategoryQuickLinks';
import DesignerDiscovery from '@/components/DesignerDiscovery';
import PopularShowcase from '@/components/PopularShowcase';
import { EditBanner } from '@/components/EditBanner';
import { EDITS } from '@/lib/edits';
import { POPULAR_ITEM_IDS } from '@/lib/popularItems';
import { ABAYA_PICK_IDS } from '@/lib/abayaPicks';
import { HeroCallouts } from '@/components/HeroCallouts';
import { getProducts } from '@/lib/products';
import { BRANDS } from '@/data/brands';
import { hasBrandPage } from '@/lib/brandPages';
import { regionsWithCounts, brandsInRegion, pins as regionPins, regionSlug, MAP } from '@/lib/brandRegions';
import { withUtm } from '@/lib/outbound';
import { getPosts } from '@/lib/posts';
import { editorialVariant, editorialSrcSet } from '@/lib/staticImage';
import { pageMetadata } from '@/lib/seoCopy';
import { MARKDOWN_HOME_PATH } from '@/lib/agentPaths';
import type { Product } from '@/lib/types';
import type { CardProduct } from '@/lib/compactCatalogue';

// title/description are the keyword-forward SERP-facing copy (lib/seoCopy.ts)
// — deliberately separate from the hero's own h1, which stays untouched.
// pageMetadata also fills in openGraph/twitter, so a share of "/" gets its
// own card instead of falling through to app/layout.tsx's generic one.
const homeMetadata = pageMetadata('/');
// `types` advertises the markdown twin of the site root to agents
// (<link rel="alternate" type="text/markdown" href="/index.md">). Spread, so
// the canonical pageMetadata() sets is kept. docs/log/2026-09-13-agent-discovery-files.md
export const metadata: Metadata = {
  ...homeMetadata,
  alternates: { ...homeMetadata.alternates, types: { 'text/markdown': MARKDOWN_HOME_PATH } },
};

// Curated "By category" showcase, 2026-08-23 — Tina sent a reference mosaic
// (photo + a white label card bottom-left, category name + piece count) and
// one editorial photo each for these six lanes, replacing the auto-picked
// catalogue photos categoryCards() was using here. Piece counts still come
// from categoryCards() (live, not hand-typed) — only the PHOTO and the set
// of six lanes are curated.
const CATEGORY_SHOWCASE: { slug: string; label: string; image: string; zoom?: number; origin?: string }[] = [
  // zoom: 1.12 -> 1.24 — Tina, 2026-08-23: "can u zoom in the pic a lil bit
  // of the dresses," then "zoom the dresses one in a lilbit more." The photo
  // is a full-body shot with headroom/floor either side of the dress in a
  // 3:4 card; a scale on the <img> (not a re-crop of the source file)
  // tightens it without touching the other five cards.
  // Photo swapped 2026-08-24 (Tina: "this one for dresses"), same new-filename
  // rule as the abayas/tops swaps below — dresses.png is untouched on disk.
  { slug: 'modest-dresses', label: 'Dresses', image: '/category/dresses-2' },
  // Photo swapped 2026-08-24 (Tina: "i want this for the co-cord card on the
  // homepage") — a blush lace tunic + trousers set, which reads as a co-ord
  // at card size. New filename per §6; coord-sets.png is untouched on disk.
  { slug: 'modest-sets', label: 'Co-ord Sets', image: '/category/coord-sets-2' },
  // Photo swapped 2026-08-24 (Tina: "this one for skirts"). New filename per §6.
  { slug: 'modest-skirts', label: 'Skirts', image: '/category/skirts-3', zoom: 1.15, origin: '50% 68%' },
  // Same treatment as Dresses above — Tina: "abayas one too."
  // Photo swapped 2026-08-24 (Tina: "change the abaya card picture into
  // this"), for the "by catagory" card specifically, not the Popular Items
  // showcase — a new file (abayas-2.png), never overwriting abayas.png in
  // place, per CLAUDE.md §6's public/ caching rule.
  { slug: 'modest-abayas', label: 'Abayas', image: '/category/abayas-2', zoom: 1.24 },
  // Photo swapped 2026-08-24 (Tina: "this one for tops but center the pic
  // and zoom bit in"). The source and card aspect ratios are close enough
  // that object-fit: cover barely crops anything, so "off-centre" isn't a
  // cover-crop problem here — it's that the model sits left-of-centre in
  // the FRAME (a courtyard with columns filling the right side), and the
  // zoom's `transform-origin` defaults to the box's own centre. Zooming
  // from the box centre would pull MORE empty architecture into frame, not
  // less. `origin` re-anchors the zoom on her instead (roughly torso
  // height, where her figure actually sits in the source).
  { slug: 'modest-tops', label: 'Tops', image: '/category/tops-2', zoom: 1.35, origin: '57% 38%' },
  // Photo swapped 2026-08-24 (Tina: "activewear"). New filename, per §6.
  { slug: 'modest-activewear', label: 'Activewear', image: '/category/activewear-2' },
];

/**
 * The one edit whose banner does NOT sit with the others up the page — it
 * renders below "By category" instead. Tina, 2026-08-25, on Fall Essentials:
 * "and i want it on homepage under by catogory".
 *
 * A slug rather than an array position or a second `featured`-style flag on the
 * Edit type: the placement is a fact about this PAGE's layout, not a property of
 * the edit, and `lib/edits.ts` is also read by /edits/[slug] and the sitemap,
 * which have no opinion about where a homepage banner goes. If a second edit
 * ever needs the lower slot this becomes a Set — do not let it become an
 * implicit "everything after index N".
 */
const EDIT_BELOW_CATEGORIES = 'fall-essentials';

export default function Home() {
  const cats = categoryCards();
  const catCountBySlug = new Map(cats.map((c) => [c.slug, c.count]));
  const posts = getPosts();
  const feature = posts[0];
  const moreStories = posts.slice(1, 4);
  // Looked up from the live catalogue, not duplicated — see
  // lib/popularItems.ts's own comment for why. filter(Boolean) drops any id
  // that's been cut or delisted since the list was written, rather than
  // rendering a dead card for it.
  const productById = new Map(getProducts().map((p) => [p.id, p]));
  // Narrowed to CardProduct's 9 fields rather than handed the whole Product —
  // CLAUDE.md §8: every field on whatever a client component receives is
  // serialised into this page's RSC payload, and `Product` carries occasion/
  // season/activity arrays, lifecycle and lane-override fields that no card
  // ever reads. Two rails share this, so it lives here once.
  const railCards = (ids: readonly string[]): CardProduct[] =>
    ids
      .map((id) => productById.get(id))
      .filter((p): p is Product => Boolean(p))
      .map((p) => ({
        id: p.id,
        brandSlug: p.brandSlug,
        garment: p.garment,
        title: p.title,
        brandName: p.brandName,
        price: p.price,
        currency: p.currency,
        image: p.image,
        url: p.url,
        ...(p.altUrl ? { altUrl: p.altUrl } : {}),
      }));
  const popularItems = railCards(POPULAR_ITEM_IDS);
  // "Our picks on abayas" — the second rail, under the Everyday Lace banner.
  const abayaPicks = railCards(ABAYA_PICK_IDS);

  // DESIGNER DISCOVERY. Flattened HERE, on the server, rather than handing
  // <DesignerDiscovery> the Brand records: it is a client component, so every
  // field on whatever it receives is serialised into the page — and `Brand`
  // carries `description`, several hundred words each for the sealed houses.
  // Same rule as CardProduct vs Product (CLAUDE.md §8).
  // The internal/external split matches app/designers/page.tsx — which moved
  // from `b.description` to `hasBrandPage()` on 2026-08-26 and left this copy
  // behind, still claiming parity it no longer had. A house has a page of ours
  // when it has ENOUGH PIECES, not when someone got round to writing about it,
  // so 84 houses with real pages were being linked past, to their own
  // storefronts, from the highest-authority page on the site. One without a
  // page still goes to its storefront, which needs rel="sponsored" and a
  // withUtm'd href (§6).
  const discoveryRegions = regionsWithCounts().map((r) => ({
    name: r.name,
    count: r.count,
    // Built here so the slug logic stays in lib/brandRegions.ts and the client
    // component never turns a region NAME into a URL by string-munging.
    href: `/designers?region=${regionSlug(r.name)}`,
    brands: brandsInRegion(r.name).map((b) => {
      const internal = hasBrandPage(b.slug) ? `/designers/${b.slug}` : null;
      return {
        name: b.name,
        city: b.city,
        href: internal ?? withUtm(b.homepage, 'designer-discovery'),
        external: !internal,
      };
    }),
  }));
  const discoveryPins = regionPins().map((p) => ({
    x: p.x, y: p.y, n: p.n, region: p.region, city: p.city,
  }));

  return (
    // A <main> landmark. Every other page has one; the homepage did not, so the
    // whole of it was outside any landmark and "skip to content" had nothing to
    // skip to. app/[lane], /about, /designers, /directory, /editorial,
    // /favourites and the legal shell all already do this.
    <main className="home-sections">
      {/* HERO — editorial modest-fashion image */}
      <section>
        {/* .hero-vh, not an inline height. The height has to be `100svh` with a
            `100vh` fallback, and the same property cannot be declared twice in a
            React style object — the second wins outright and the first is not a
            fallback at all. `100vh` on iOS is the URL-bar-COLLAPSED height, so
            the hero was taller than the screen it was measured against: the
            search field sat lower than the optical centre and the bottom of the
            photograph was under the browser chrome. */}
        {/* data-hero is read by components/Header.tsx, which goes transparent
            with a dark wash for exactly as long as this element still reaches
            past the bottom of the header. An attribute rather than an id or a
            class so it cannot be mistaken for a styling hook and quietly
            renamed — CLAUDE.md §10.29's rename trap. */}
        <div data-hero className="relative overflow-hidden hero-vh" style={{ background: 'var(--aubergine)' }}>
          {/* The LCP element on a phone. It was one 1920px JPEG (227KB) served
              to every width; a 390px viewport now takes the 640 variant at 19KB.
              fetchPriority=high because it is above the fold and must not queue
              behind the lazy grid images below it. */}
          {/* hero-home-10.jpg, 2026-08-21, later the same day — Tina: "cut
              off the top and bottom a little bit so the text is in the
              middle." Object-cover on this hero is height-constrained at
              every real viewport (source is 1.94:1, wider than any
              hero-vh box), so the full source height always maps 1:1 to
              the box — nothing is vertically cropped by CSS, only left/
              right. The fixed text overlay therefore sat at a fixed
              fraction of hero-home-9's frame, which had a chandelier
              already touching the top edge and a lot of plain floor at
              the bottom — visually unbalanced despite a near-symmetric
              pixel split, because the floor carries far less visual
              weight than the chandelier. 100px trimmed off the top
              (chandelier already meets the edge — no more than this) and
              250px off the bottom (the one place with real dead room):
              5461x2822 -> 5461x2472. See optimise-images.mjs's job
              comment. Same top+bottom crop direction as hero-8/hero-9,
              now on both edges; still no objectPosition/transform. */}
          {/* 2026-08-22 — phone gets its own genuine 9:16 portrait crop
              (hero-home-mobile.png, same two models/setting) instead of
              object-cover squeezing the 1.94:1 landscape hero-home-10 into a
              tall phone box. That squeeze was upscaling past the source's
              native resolution below 768px (object-cover needed ~1864px of
              image to cover a 390x844 box, wider than the 1440px variant
              being served) — this <picture>/<source> swap is the fix, not a
              CSS-only one, because no amount of objectPosition changes which
              PIXELS exist to crop from. 768px matches the Tailwind `md:`
              breakpoint already used elsewhere on this page. */}
          <picture style={{ display: 'contents' }}>
            <source
              media="(max-width: 767px)"
              srcSet="/hero-home-mobile-640.webp 640w, /hero-home-mobile-828.webp 828w, /hero-home-mobile-1080.webp 1080w, /hero-home-mobile-1290.webp 1290w"
              sizes="100vw"
            />
            <img
              src="/hero-home-10-1440.webp"
              srcSet="/hero-home-10-640.webp 640w, /hero-home-10-1024.webp 1024w, /hero-home-10-1440.webp 1440w, /hero-home-10-1920.webp 1920w, /hero-home-10-2400.webp 2400w"
              sizes="100vw"
              alt="Two women in satin hijabs and abayas in an ornate, chandelier-lit hallway"
              className="absolute inset-0 w-full h-full object-cover"
              fetchPriority="high"
              decoding="async"
            />
          </picture>
          {/* Inverse-spotlight overlay, steepened 2026-08-21 — Tina: "i
              want the vibe more like this" (her own reference mockup, sent
              several times this session). Sampled its hero pixel-by-pixel:
              the background there isn't just darker, it's near-solid black
              (RGB values of 8-30) for roughly the left two-thirds, then
              switches to essentially full, undarkened brightness where the
              models are — a hard, editorial contrast rather than the soft
              wide fade this had. Centre/size unchanged (68%/40%, ellipse
              60%/70% — still correctly positioned on the models).
              The steep 0->0.15->0.78->0.92 version of the outer stops
              (matching the reference exactly) read as too dark once live —
              Tina: "the left side is tooo dark" — so those two outer stops
              came down to 0.5/0.62, then up to 0.58/0.7 ("it can be a
              little darker"), then back down to 0.46/0.58 ("make the dark
              overlay a little lighter") — still the same steep SHAPE
              throughout, only the ceiling moved each time. Then Tina asked
              for the INNER stops specifically ("the overlay ON THE WOMEN...
              a little darker") — those were still 0/0.12, i.e. the models
              were nearly untouched by any darkening at all. Moved to
              0.08/0.22, then further to 0.16/0.32 ("more") — outer
              background stops (0.46/0.58) still untouched by either of
              these two changes. */}
          {/* 2026-08-22 — this went through several wrong turns before
              landing here: first hidden entirely below `md:` for the new
              mobile photo ("no darker overlay"), then made flat/uniform with
              no breakpoint split at all ("the dark overlay should be for the
              entirety of the hero") — both reverted. What she actually wants,
              stated explicitly: the radial spotlight above (darker at the
              edges, "left is darker etc") stays as-is but ONLY on desktop;
              mobile AND tablet get a DIFFERENT, flat/even tint across the
              whole hero instead — "i want the whole hero to be evenly dark."
              Split at `lg` (1024px, matching the `md:`/`lg:` padding tiers
              already on this hero's copy block) rather than `md` (768px), so
              tablet gets the flat treatment together with phone, not with
              desktop. */}
          <div
            className="absolute inset-0 hidden lg:block"
            style={{
              background:
                'radial-gradient(ellipse 60% 70% at 68% 40%, rgba(0,0,0,0.16) 0%, rgba(0,0,0,0.32) 35%, rgba(0,0,0,0.46) 60%, rgba(0,0,0,0.58) 100%)',
            }}
          />
          <div className="absolute inset-0 lg:hidden" style={{ background: 'rgba(0,0,0,0.42)' }} />
          {/* The scrolling brand-name strip that sat here from 2026-08-21 was
              removed the same night — Tina: "can you get rid of the banner
              with the brands." components/HeroBrandStrip.tsx is left on disk
              and un-imported, the same way lib/vibes.ts was kept when the
              Aesthetic filter came out, so putting it back is one import and
              one line rather than a rebuild. */}
          {/* Garment credits, added 2026-08-21 from Tina's own mockup — a
              hairline leader line from a label into a dot on the satin, one
              per model, each reading "BRAND: <house>" + the piece. Sits above
              the darkening overlay and below the copy block, and is
              pointer-events-none so it can never swallow a click meant for
              the headline's links. See components/HeroCallouts.tsx for why
              the coordinates are percentages of the PHOTOGRAPH rather than of
              this box, and why the house names are real ones. */}
          <HeroCallouts />
          {/* 2026-08-21 — third revision the same day. Tina: "can you also
              de the text same size and check the text into the archive for
              everything modest" — two asks: (1) the headline text goes
              BACK to "The archive for everything modest," the site's
              original, long-standing tagline (CLAUDE.md, app/layout.tsx,
              public/llms.txt all already carry it — see the 2026-08-19 log
              this once superseded, now un-superseded), in its original
              sentence-case + italic-accent treatment, not the all-caps
              "MODESTY, WITHOUT COMPROMISE." styling from the mockup pass;
              (2) the font size goes back up to the SAME clamp the very
              first left-aligned pass used (40-96px) rather than the
              slightly smaller one the 3-line mockup headline needed
              (36-84px) to avoid overflowing at that length. The subhead and
              outlined "Explore the archive" CTA from the mockup pass are
              UNCHANGED — she asked to change the headline text specifically,
              not to remove what was added around it.
              Sized down again minutes later — Tina: "its far to big make
              the letters smaller." 96px was the same ceiling the very
              first left-aligned pass used for a SHORTER two-line headline;
              at this width it read oversized. Dropped to clamp(30px, 4.5vw,
              64px) — close to the original pre-left-alignment size
              (text-4xl/text-6xl, ~36-60px) rather than another guess.
              uppercase added last — Tina: "can you make it all caps." Text
              content is unchanged ("The archive for everything modest.");
              only the CSS transform changed, so the italic on "everything"
              still applies to the same word, just rendered upper-case.
              maxWidth added right after — Tina: "its too long now it
              touches the women." Upper-casing widens the same characters
              (caps have no descenders/ascenders to economise on and are
              generally wider per-letter than mixed case in this typeface),
              so "EVERYTHING MODEST." on one line reached far enough right
              to meet the models on the photo's right side. Capping the
              headline at 620px forces "EVERYTHING" onto its own line
              (three lines total instead of two), which is what actually
              creates the gap — the models' position in the photo is fixed,
              so the fix has to be making the text stop short of them, not
              moving them. */}
          {/* 2026-08-21 — fourth revision. Tina sent a new mockup crop
              (headline + subline only, no buttons pictured) and said: "i
              want this text and i want a button shop but i dont want a
              pill i just want an stipe under and another button with
              disigners." Three changes from the previous state:
              (1) headline text back to "Everything modest. Finally in one
              place." — the SAME text/markup the very first left-aligned
              pass used (see docs/log/2026-08-21-hero-headline-left-bigger.md),
              re-added here rather than reinvented, still under the
              `uppercase` class and the 620px maxWidth from the last two
              revisions so it doesn't reach the models.
              (2) subhead replaced with her new line, longer than the
              previous one, so its own max-width is capped too (620px, same
              figure as the headline) — the old subhead had no cap and
              didn't need one at this length, this one would run under the
              models otherwise.
              (3) the single outlined "Explore the archive" PILL is gone,
              replaced by two plain text links — "Shop" and "Designers" —
              each with a bottom border instead of a filled/outlined
              button shape ("i dont want a pill i just want an stipe
              under"). Neither is `.btn-pill` at all this time, since a
              pill was exactly what she said no to. */}
          {/* 2026-08-22 — centred + bigger on mobile and tablet only, Tina's
              own reference (aab's mobile hero: big bold text centred in the
              middle of the screen): "i want you to do it lik this for mobile
              and tablet so text bigger and in the middle." `lg:items-start
              lg:text-left` restores the original left-aligned desktop layout
              untouched above 1024px — same breakpoint as the overlay split
              above. The headline's own bigger mobile/tablet size lives in
              `.hero-h1` (globals.css), since inline styles can't carry a
              responsive override the way a CSS class + media query can. */}
          <div className="relative h-full flex flex-col items-center justify-center text-center lg:items-start lg:text-left px-6 md:px-16 lg:px-24">
            {/* 2026-08-21: forced 4-line one-phrase-per-line breaks
                (EVERYTHING / MODEST. / FINALLY IN / ONE PLACE.) landed,
                then immediately: "it reads so fucked up now its like a
                block." Four short, choppy lines stacked with no italic and
                no varying rhythm read exactly as a solid block rather than
                a headline — reverted to natural two-line wrapping (one
                <br/>, same as every earlier pass this session before the
                tight-break detour), letting the browser break "Finally in
                one place." wherever it naturally fits inside the 620px
                cap instead of forcing every phrase onto its own line.
                uppercase dropped, then title-cased four specific words
                ("m bigger letter i big letter o big letter and p big
                letter" — Modest / In / One / Place), then both undone in
                the same breath — Tina: "nvm revert and put it in caps."
                Back to `uppercase`, then dropped again for good — Tina:
                "i want no caps and letters bigger rhan now." Sentence
                case, and the clamp raised 24-52px -> 30-64px (the same
                ceiling the very first "make it bigger" pass used, before
                the all-caps detour). letterSpacing added right after —
                Tina: "make the spacing between the letters a tiny bit
                smaller." Was unset (the font's own default tracking);
                -0.01em pulls it in slightly without visibly cramming
                letters together at this size.
                2026-08-22: headline's FIRST line changed again — Tina:
                "Every modest brand. Finally in one place. i want to
                change text to this." "Everything modest." -> "Every
                modest brand." — the second line and every style property
                unchanged at the time.
                "i want 3 rows" immediately after was read as the brand
                strip (see HeroBrandStrip.tsx's own note on that detour) —
                she meant this headline: "im sorry i mean the text should
                be in 3 not the banner with the brands." Split onto three
                explicit lines: "Every" / "modest brand." / "Finally in
                one place." — "Every" alone as a short opening beat, then
                the rest of each original sentence keeps its own line,
                rather than breaking mid-sentence some other way. */}
            <h1
              className="serif hero-h1"
              style={{
                color: 'var(--parchment)',
                textShadow: '0 2px 30px rgba(0,0,0,0.55)',
                lineHeight: 1.05,
                maxWidth: 620,
              }}
            >
              Every modest brand.
              <br />
              One place.
            </h1>
            {/* Subhead: --font-ui (Jost), not --font-label — a plain body
                sentence, not another uppercase label, so it takes the
                site's body typeface rather than the small-caps one
                .eyebrow/.badge use. Lower opacity white rather than a flat
                --muted (which is tuned for LIGHT backgrounds) so it reads
                as "quieter than the headline," not a different, muddier
                colour on a dark photo.
                2026-08-21, second pass: Tina supplied this exact new copy
                ("Discover pieces from 200+ independent modest brands,
                curated in one place") to replace the "A worldwide
                collection of modest fashion" line from earlier the same
                day. The brand count is changed from her "200+" to "100+":
                `data/brands.ts` holds 113 brands as of this edit, so 200+
                would be a false claim on a live page, not a style choice —
                100+ is the honest, safely-round-down version of the same
                sentence. Flagged to her rather than silently shipping
                either the inflated number or a silent edit with no
                explanation. */}
            <p
              className="mt-6"
              style={{
                fontFamily: 'var(--font-ui)',
                fontSize: 'clamp(15px, 1.6vw, 19px)',
                color: 'rgba(251,250,246,0.78)',
                textShadow: '0 2px 20px rgba(0,0,0,0.5)',
                maxWidth: 620,
              }}
            >
              Discover pieces from 100+ independent modest brands,
              <br />
              curated in one place.
            </p>
            {/* 2026-08-22 — "Explore Designers" removed, Tina: "i want this
                one gone in the hero." Shop the Archive (added the same day
                from her reference crop, see the removed comment in git
                history), relabelled "Shop New In" on 2026-09-01 when
                /directory was replaced by /new-in, is now the only CTA — no longer a matched pair, so
                no `gap`/flex-row wrapper needed either. /designers is still
                reachable from the header nav; this was hero real estate
                only. */}
            {/* 2026-08-23 — desktop-only now (`hidden lg:inline-block`).
                Tina's own reference (aab's mobile hero again): "Every modest
                brand. One place. Discover pieces... needs to be centered in
                the middle and shop needs to be on the bottom like aabs" —
                on mobile/tablet the button is no longer part of this
                centered headline+subhead group at all, it's the separate,
                absolutely-positioned copy right below instead, pinned near
                the true bottom of the hero independent of where the text
                block centers. Desktop is untouched: still inline, still
                mt-9 below the subhead. */}
            <Link
              href="/new-in"
              className="uppercase mt-9 hidden lg:inline-block"
              style={{
                fontFamily: 'var(--font-label), serif',
                letterSpacing: '0.14em',
                fontSize: 14,
                color: 'var(--ink)',
                background: 'var(--parchment)',
                padding: '14px 28px',
                borderRadius: 'var(--radius-card)',
              }}
            >
              Shop New In
            </Link>
          </div>
          <div className="absolute inset-x-0 bottom-16 flex justify-center lg:hidden">
            <Link
              href="/new-in"
              className="uppercase inline-block"
              style={{
                fontFamily: 'var(--font-label), serif',
                letterSpacing: '0.14em',
                fontSize: 14,
                color: 'var(--ink)',
                background: 'var(--parchment)',
                padding: '14px 28px',
                borderRadius: 'var(--radius-card)',
              }}
            >
              Shop New In
            </Link>
          </div>
        </div>
      </section>

      {/* CATEGORY QUICK LINKS — the Abayas/Dresses/Sets/Hijabs icon
          strip, restored here 2026-08-24 ("can i get this strip back but make
          the icons and text purple"), in its original position as a sibling
          <section> immediately after the hero — the same slot the 2026-08-22
          revert put it back into before it was dropped again.
          Its icons, labels and arrows are now `--aubergine` rather than
          brass/ink; the parchment background is unchanged. See the component's
          own header comment for why aubergine and not plum.

          (The brand banner that briefly stood in this slot from 2026-08-23
          moved ABOVE the header the same day — Tina: "i want it above the
          header" — so it lives in app/layout.tsx now and is not affected.) */}
      <CategoryQuickLinks />

      {/* POPULAR ITEMS — full-bleed showcase rail, replaced the StyleIt
          mix-and-match picker 2026-08-23 (Tina: "instead of our 'Every
          modest brand, in one house.' block with the outfit picker... a
          showcase like this with popular items"). Heading centred per her
          "text centered in the middle" — every other homepage section
          heading here is left-aligned, so this is deliberately the
          exception, not a copy-paste of the pattern below. */}
      <section className="py-10 md:py-20">
        {/* SIZE, 2026-08-24 — Tina, pointing at this one: "Popular items from
            brands. the titles like these need to be smaller." All FOUR of the
            homepage's section headings moved together, so they stay a set:
            this, "By category.", the band's (now "Are you a modest fashion
            house?", which keeps its +2px) and the Edit section's, which was
            "Reading, not just shopping." until Tina had it removed on 2026-08-26
            ("get rid of this text") — so that set is three headings now. The
            band's lost its "Apply for the seal." sentence on 2026-08-25 when the
            band became a marketing pitch; the SIZE is what this note is about and
            that is unchanged.
              clamp(28px,4vw,44px) -> clamp(24px,3vw,34px)   [44px -> 34px desktop]
              clamp(28px,4vw,46px) -> clamp(24px,3vw,36px)   [the band one]
            NOT changed: EditBanner's edit title, clamp(40px,5.6vw,64px) in its
            own <style> block — a deliberately larger tier, not this set.
            (VerifiedSpotlight's "Houses that just earned the seal." was the other
            one at that size; it was unmounted 2026-08-25, see below.) */}
        <h2
          className="serif text-center max-w-[1220px] mx-auto px-8"
          style={{ fontSize: 'clamp(24px,3vw,34px)', lineHeight: 1.05, color: 'var(--ink)' }}
        >
          Popular items <span className="italic" style={{ color: 'var(--plum)' }}>from brands.</span>
        </h2>
        <div className="mt-8 md:mt-10">
          <PopularShowcase items={popularItems} />
        </div>
      </section>

      {/* THE EDIT — full-bleed campaign banner into /edits/[slug].
          Added 2026-08-24 ("put it on the hompage"). Placed here, directly
          after Popular Items and where the "Chosen by hand" rail used to sit,
          so the homepage still has one editorial beat between the two product
          rails rather than running Popular Items straight into the next section.
          (That next section was the Verified Spotlight until 2026-08-25; it is
          "By category" now.)
          Renders ONE edit — the one flagged `featured` in lib/edits.ts — rather
          than all of them, so this never grows into a stack of full-bleed
          banners down the homepage. */}
      {/* EVERY edit, featured one first. Tina, 2026-08-25: "i want both edits
          to show in homepage". `featured` no longer decides WHICH banner shows,
          only which comes first — kept rather than deleted because the order
          still needs to be a visible decision rather than an array position.
          Worth watching if a third edit ever lands: these are full-bleed and
          16:9, so each one is most of a screen. At that point this wants to
          become a cap or a different treatment, not three stacked banners. */}
      {[...EDITS]
        .filter((e) => e.slug !== EDIT_BELOW_CATEGORIES)
        .sort((a, b) => Number(b.featured ?? false) - Number(a.featured ?? false))
        .map((e) => (
          <EditBanner key={e.slug} edit={e} />
        ))}

      {/* OUR PICKS ON ABAYAS — a second PopularShowcase rail, placed here
          2026-08-25 on Tina's instruction ("i want it under everyday lace"),
          i.e. after the edit banners, which is where Everyday Lace sits
          (Jersey Hijabs carries `featured`, so it renders first). Heading copy
          is hers verbatim, "our picks on abayas" — the plum italic on the last
          word is the treatment the sibling rail's heading already uses, not
          added words.

          Same component, same 17 hand-picked ids in her order (lib/abayaPicks
          .ts). Reused rather than forked: everything that rail already solved
          — the full-bleed breakout, the edge fade, the wheel/drag traps
          documented at length in PopularShowcase.tsx — applies identically
          here, and a second copy would drift from it.

          Note these are ALL garment: 'abaya', so every card takes that
          component's object-contain branch ("zoom the picture on the abayas a
          little out"). That is correct, but it means this whole row is
          letterboxed white where the Popular Items row is mostly filled.

          NO BOTTOM PADDING — Tina, 2026-08-25: "there is a lot of space between
          our picks on abayas and by catogory fix that". Measured before
          changing anything: the two sections do not have a gap of their own
          (they are flush, 0px between their boxes), so the whitespace was
          purely this section's `pb-20` (80px) stacked on "By category"'s own
          `pt-20` (80px), 168px in total from the last price to that heading.
          Only ONE of the two needs to own that space, and it should be the
          section that is not being edited — so the padding comes off here, not
          off "By category", which also borders other sections. Note the row's
          captions are ragged (a two-line title pushes the section box taller
          than the single-line cards next to it), so under most cards the gap
          READ as ~28px more than it measured. */}
      <section className="pt-10 md:pt-20">
        <h2
          className="serif text-center max-w-[1220px] mx-auto px-8"
          style={{ fontSize: 'clamp(24px,3vw,34px)', lineHeight: 1.05, color: 'var(--ink)' }}
        >
          Our picks on <span className="italic" style={{ color: 'var(--plum)' }}>abayas.</span>
        </h2>
        <div className="mt-8 md:mt-10">
          <PopularShowcase items={abayaPicks} surface="abaya-picks" />
        </div>
      </section>

      {/* The "Chosen by hand" editor's-picks rail stood here until 2026-08-24,
          when Tina cut it ("this block in homepage is going to go"). It was a
          12-item, one-product-per-brand slice of the whole catalogue with an
          "All products" link to /directory.
          components/EditorsRail.tsx STAYS — app/product/[brandSlug]/[shopifyId]
          renders it as the related-items rail (badgeLabel={null}).
          Removing this also drops the homepage's SECOND uncached getProducts()
          call; see CLAUDE.md §8 on getProducts re-parsing 5.6 MB per call. */}

      {/* The "Houses that just earned the seal." spotlight — four fanned cards
          with the seal copy beside them — stood here until 2026-08-25, when Tina
          replaced it with the Designer Discovery band below ("change this one
          into the one we had that says Houses that just earned the seal"),
          confirmed against the three readings of that sentence before acting.

          components/VerifiedSpotlight.tsx is KEPT, not deleted: it is a whole
          layout with its own <style> block and nothing else on the site renders
          anything like it, so remounting it is a one-line change. It now has
          zero imports. It is KEPT deliberately, unlike components/EditMagazine.tsx
          and components/HeroSearch.tsx, which were both deleted on 2026-08-26:
          those two were dead weight (and EditMagazine was invented editorial
          copy), whereas this is a real layout of Tina's that nothing else
          replaces.

          What went with it, worth knowing before anyone calls this a pure
          removal: it was the only surface naming the seal on the homepage above
          the fold-ish, and it carried an "All designers" link to /designers.
          That link is not lost — <DesignerDiscovery> below has its own
          "Explore all designers". Note the band further down is now a MARKETING
          pitch end to end — as of 2026-08-25 it no longer mentions the seal at
          all, in its heading, its body or its button. /about and the footer are
          the only places the seal is named and explained. */}

      {/* BROWSE BY CATEGORY */}
      {/* px-4 md:px-8, not the site's usual px-8 everywhere — Tina, on the
          aab-mosaic redesign: "they need to be also less space ont he edges
          of the screen." Reduced on mobile only (px-8 unchanged from md up),
          since her reference screenshots of aab's own grid were mobile-width
          captures with a noticeably tighter edge margin than this section's
          usual side padding. Heading/link row above the grid shares the same
          section padding, so nothing about them goes out of alignment. */}
      {/* EDGE PADDING, 2026-08-25 — deliberately ASYMMETRIC on a phone, at
          Tina's instruction: "im missing some whitespace on the right side",
          then, asked which whitespace she meant, "on the right side of the
          screen edge".
          Measured her own screenshot first rather than trusting an emulator:
          at 1179 device px (iPhone 14/15 Pro, 393pt at 3x) the card block ran
          x 12..1169, i.e. 12 device px left and 9-12 right — 4pt each side,
          already symmetric. So this is not a bug being corrected, it is more
          room on the right because she asked for it.
          pl stays at 4px because she asked for exactly the opposite in August
          ("they need to be also less space ont he edges of the screen"), which
          is why this was px-1 in the first place; widening both would have
          walked that back without being asked. md: is unchanged at px-8.

          The sequence, and the misreading in the middle of it: pr-4 (16px)
          -> "now its too much" -> pr-2 (8px) -> "1px more" -> pr-[9px] ->
          "1xp more on the right" -> pr-[10px] -> "its still too much
          whitespace".
          Those two "1px more"s were read as ADD a pixel. Given she had just
          said 16px was too much and then said 10px was still too much, they
          almost certainly meant take one pixel MORE OFF. Re-read that way the
          whole sequence is monotonic downward, which is the only reading under
          which her last message is not a contradiction. So: 6px, i.e. where two
          decrements from 8px land.
          An ARBITRARY value rather than a scale step, deliberately: Tailwind's
          scale jumps 4px -> 8px here. Do not "tidy" it onto the scale. */}
      <section className="max-w-[1220px] mx-auto pl-1 pr-[6px] md:px-8 py-10 md:py-20">
        {/* Centered, no "All categories" link — Tina: "By category. needs to
            be in the middle All categories gone." Every card in the grid
            below already links to its own lane, and /directory is reachable
            from the header nav, so this wasn't the only way to reach it. */}
        <div className="text-center mb-8">
          <h2 className="serif mt-2" style={{ fontSize: 'clamp(24px,3vw,34px)', lineHeight: 1.05, color: 'var(--ink)' }}>By category.</h2>
        </div>
        <div className="tmh-showcase-grid">
          {CATEGORY_SHOWCASE.map((c) => {
            const count = catCountBySlug.get(c.slug) ?? 0;
            return (
              <Link key={c.slug} href={`/${c.slug}`} className="tmh-showcase-card group">
                <div className="tmh-showcase-photo">
                  {/* ALL SIX ARE LAZY, including the first row. This was
                      `loading={i < 3 ? undefined : 'lazy'}` — the habit of
                      "never lazy-load the first row", which is correct when the
                      row is at the top of the DOCUMENT and wrong here: measured
                      on production 2026-08-26, these tiles sit at y=3012px on a
                      390px phone whose fold is 844px, and y=4238px at 1440.
                      An eager <img> in the SSR shell is additionally hoisted by
                      React 19 into a <link rel="preload" as="image"> in the
                      <head>, so three below-fold tiles were fetched at HIGH
                      priority ahead of the LCP hero — which then took 3.0s of a
                      9Mbps pipe to arrive, for an LCP of 3.96s.
                      → docs/log/2026-08-26-homepage-lcp-preload-contention.md

                      `sizes` is 50vw below 820px, NOT the `(max-width: 480px)
                      100vw` it used to carry. That clause described a
                      single-column phone layout globals.css DELETED on
                      2026-08-25 ("NO single-column rule below 480px any more" —
                      the grid is repeat(2, 1fr) all the way down now); nobody
                      updated `sizes` with it. So the browser was told each tile
                      needed a full 390px of viewport when it actually renders at
                      187px, and picked the -1000 variant where -700 (DPR 3) or
                      -400 (DPR 2) is right. Measured, all six tiles: 1038KB at
                      -1000, 606KB at -700, 226KB at -400. CLAUDE.md §8 — "a new
                      `sizes` value must match the grid it describes". */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`${c.image}-700.webp`}
                    srcSet={`${c.image}-400.webp 400w, ${c.image}-700.webp 700w, ${c.image}-1000.webp 1000w`}
                    sizes="(max-width: 820px) 50vw, 33vw"
                    alt={c.label}
                    loading="lazy"
                    decoding="async"
                    style={{
                      ...(c.zoom ? { ['--card-zoom' as string]: c.zoom } : {}),
                      ...(c.origin ? { ['--card-origin' as string]: c.origin } : {}),
                    }}
                  />
                  <div className="tmh-showcase-shop">Shop {c.label}</div>
                </div>
                <div className="tmh-showcase-caption">{c.label}</div>
                {count > 0 && <div className="tmh-showcase-count">{count} pieces</div>}
              </Link>
            );
          })}
        </div>
      </section>

      {/* FALL ESSENTIALS — the third edit banner, deliberately NOT with the
          other two up the page. Tina, 2026-08-25: "and i want it on homepage
          under by catogory". See EDIT_BELOW_CATEGORIES above for why the slug
          lives in this file rather than as a flag on the Edit type. */}
      {EDITS.filter((e) => e.slug === EDIT_BELOW_CATEGORIES).map((e) => (
        <EditBanner key={e.slug} edit={e} />
      ))}

      {/* DESIGNER DISCOVERY — dotted world map + expandable region rows.
          Sits between "By category" and the seal band so the homepage reads
          browse the clothes -> see who makes them -> are you a house? apply.
          Built 2026-08-25 from Tina's reference screenshot; the numbers are
          computed from data/brands.ts by lib/brandRegions.ts, never placed.
          NOTE Africa is genuinely 0 and is therefore not rendered as a row —
          see the module docstring. */}
      <DesignerDiscovery
        regions={discoveryRegions}
        pins={discoveryPins}
        totalBrands={BRANDS.length}
        totalPlaces={new Set(BRANDS.map((b) => b.city)).size}
        mapW={MAP.W}
        mapH={MAP.H}
      />

      {/* ORDER, 2026-08-26 — Tina: "i want the modest fashion market with the
          modesty house block to swap places with the guides". The editorial
          cards now come first and the designer/market band closes the page.
          Both blocks moved WHOLE, comments included, so their own history
          travels with them; nothing inside either was edited. */}
      {/* THE EDIT */}
      {/* pt split out of the `py` pair, 2026-08-26 — the other half of the
          map/guides seam. Cut on DESKTOP only (80px -> 40px) and left at 40px on
          a phone: Tina asked for the seam tighter, then "can i get the spacing
          back on mobile tho". `pt-10` with no `md:` variant is what says that.
          See the matching note in components/DesignerDiscovery.tsx; the two have
          to move together or the gap only half closes. Bottom padding
          untouched. */}
      <section className="max-w-[1220px] mx-auto px-8 pt-10 pb-10 md:pb-20">
        {/* The "Reading, not just shopping." h2 was removed 2026-08-26 — Tina:
            "get rid of this text". `justify-end` replaces `justify-between`,
            which with only one child left would have pushed "All stories" to the
            LEFT edge rather than leaving it where it was.
            The section now has no heading of its own. That is deliberate and
            hers; the cards carry their own titles.
            `hidden md:flex`, not plain `flex`: this row's only remaining child
            is the desktop-only "All stories" link, so below md it was an empty
            box still contributing its `mb-8` — measured 32px of dead space above
            the feature card on a phone once the heading came out. */}
        <div className="hidden md:flex items-end justify-end mb-8">
          {/* Under the content on a phone, like its two siblings — see the
              `md:!hidden` twin at the foot of this section. */}
          <Link href="/editorial" className="nav-link !hidden md:!inline-flex items-center gap-1.5">All stories <ArrowRight size={13} weight="bold" /></Link>
        </div>
        {/* KNOWN AND ACCEPTED, so please do not "fix" it again.
            `moreStories` is posts.slice(1, 4) — this layout wants three stories
            in the right column and content/editorial holds two posts, so it gets
            one. At 1440 that is a 110px card beside a 460px feature and about
            350px of empty parchment under it.
            It was made to collapse to a single column below two side stories on
            2026-08-09, and Tina reverted that the same day: it took the feature
            from 674px to 1156px and turned the second story into a full-width
            110px letterbox with its thumbnail marooned at one end, which trades a
            vertical gap for a horizontal one. This is her composition and it
            resolves itself the moment a third post is published — the answer is a
            post, not a breakpoint. */}
        {feature && (
          <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-8">
            {/* `edit-feature-card` carries the height: 460px from md up, a true
                16:9 below it. Tina, 2026-08-25: "i wanted the editorials on the
                end of the homepage to be that [16:9] or at least the most recent
                one". A class rather than the inline `minHeight` it replaces,
                because an inline style cannot be responsive.
                768px is where this grid already collapses to one column
                (`md:grid-cols-[1.5fr_1fr]` on the parent), so the card changes
                shape exactly where it stops sharing a row. */}
            <Link href={`/editorial/${feature.slug}`} className="edit-feature-card relative block overflow-hidden" style={{ borderRadius: 8, background: 'var(--aubergine)' }}>
              {feature.image && (
                // Lazy for the same reason as the category tiles above: this
                // card sits at y=5420px on a 390px phone. Left eager, React 19
                // hoists it into a <head> preload and fetches 262KB at high
                // priority against the hero.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={editorialVariant(feature.image, 900) ?? feature.image}
                  srcSet={editorialSrcSet(feature.image)}
                  sizes="(max-width: 768px) 100vw, 60vw"
                  alt={feature.imageAlt || ''}
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              )}
              {/* The scrim fades out at 55% of the card, which is tuned to the
                  460px desktop card. On the 183px 16:9 phone card that covers
                  ~82px while the caption is 116px, so the eyebrow sat on bright
                  photograph and was barely readable. `.edit-feature-scrim` is
                  the hook for the phone override in globals.css. */}
              <div className="edit-feature-scrim absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(36,27,36,0.78), rgba(36,27,36,0) 55%)' }} />
              {/* The caption is sized down on a phone by `.edit-feature-card`'s
                  own media query (globals.css). Measured at 390px with the 460px
                  card's values still in place: the caption came to 209px inside
                  a 183px card, so `overflow-hidden` clipped the top of the
                  title — 26px of it. The classes below are the hooks for that
                  override; the desktop values stay inline. */}
              <div className="edit-feature-caption absolute inset-x-0 bottom-0 p-7">
                <div className="eyebrow" style={{ color: '#e7d3b6' }}>{feature.category}</div>
                {/* fontSize lives in .edit-feature-title (globals.css), NOT
                    inline. It was inline at 30px, and an inline style beats a
                    class outright — so the phone override in the media query was
                    silently doing nothing and the title stayed 30px on a 183px
                    card. Colour and line-height stay here per §6. */}
                <div className="edit-feature-title serif mt-2" style={{ color: 'var(--parchment)', lineHeight: 1.08 }}>{feature.title}</div>
              </div>
            </Link>
            {moreStories.length > 0 && (
              <div className="flex flex-col gap-4">
                {moreStories.map((s) => (
                  <Link key={s.slug} href={`/editorial/${s.slug}`} className="flex gap-4 p-3 items-center" style={{ border: '1px solid var(--hairline)', borderRadius: 8, background: 'var(--bone)' }}>
                    <div className="shrink-0 overflow-hidden" style={{ width: 84, height: 84, borderRadius: 4, background: '#ece5d8' }}>
                      {s.image && (
                        // An 84px square that was being served the 1696px original.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={editorialVariant(s.image, 400) ?? s.image}
                          alt={s.imageAlt || ''}
                          className="w-full h-full object-cover"
                          width={84}
                          height={84}
                          loading="lazy"
                          decoding="async"
                        />
                      )}
                    </div>
                    <div>
                      <div className="eyebrow">{s.category}</div>
                      {/* Size in .edit-more-title (globals.css), not inline —
                          an inline style beats a class, which is exactly how the
                          feature card above ended up ignoring its own phone
                          font-size for a day. Colour and line-height stay
                          inline per §6. */}
                      <div className="edit-more-title serif mt-1" style={{ color: 'var(--ink)', lineHeight: 1.2 }}>{s.title}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
        <Link href="/editorial" className="nav-link md:!hidden inline-flex items-center gap-1.5 mt-6">
          All stories <ArrowRight size={13} weight="bold" />
        </Link>
      </section>

      {/* FOR DESIGNERS. Step 2 used to read "We review craft, sizing and
          ethics" — a different standard than /about's own definition of the
          seal ("A seal is a judgement about craft and design"), and "ethics"
          was never defined or evidenced anywhere. Unified to /about's wording,
          the one place the standard is actually spelled out. */}
      {/* DRAPE BACKGROUND, 2026-08-25 — third photograph on this band today.
          Tina replaced the plum satin macro with her own generated image
          ("Satijngolven in aubergine, bessen en lila.png", 1672x941) and asked
          for the copy centred: "use this one and put the text in middle".
          The .webp variants were generated in ONE step from her PNG, not via the
          committed .jpg — see the fall hero's entry in optimise-images.mjs.

          THIS PICTURE INVERTS THE BAND. The previous two were dark all over, so
          the copy was reversed out in parchment. This one is drapery framing a
          BRIGHT CREAM CENTRE, which is exactly where she wants the words — so
          parchment-on-cream would have been invisible and every colour on the
          band had to flip to dark. Measured, not guessed; see the note below.

          Applied HERE, not on `.aubergine-band` — /about/page.tsx uses that same
          class and must not inherit a homepage photograph. The class's flat
          aubergine survives as the fallback if the image ever fails to load,
          which is also why the copy keeps explicit inline colours rather than
          inheriting. */}
      <section className="aubergine-band my-10 md:my-20 relative overflow-hidden min-h-[340px] md:min-h-[440px] flex items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/seal-band-drape-1440.webp"
          srcSet="/seal-band-drape-640.webp 640w, /seal-band-drape-1024.webp 1024w, /seal-band-drape-1440.webp 1440w, /seal-band-drape-1672.webp 1672w"
          sizes="100vw"
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
          decoding="async"
        />
        {/* DARKER OVERLAY, 2026-08-25 — Tina: "make the banner a bit tinner and
            put a darker overlay on it", then, when the first attempt used the
            aubergine token: "i said darker not purple overlay".
            So it is BLACK, `rgba(0,0,0,0.60)`. That distinction is the whole
            point of this note: an aubergine wash at 0.75 does darken the band,
            but it also drags the drapery's own plum towards one flat hue and
            turns the cream wall lilac — it tints, it does not dim. Black takes
            the luminance down and leaves the photograph's colour alone; the
            satin stays purple because the satin IS purple.
            Flat, not a ramp: the copy is centred now, so there is no side to
            weight it towards.

            0.60 IS NOT A GUESS. Measured on the live render at 390/820/1440 by
            sampling the WORST pixel inside each text element's own rect. The
            picture's middle is a bright cream wall, so a light overlay parks the
            band in the mid-tones — the one place where neither dark nor light
            type works. Black, with the copy reversed out (heading / steps):
              0.35   2.70 / 2.25    0.55   5.09 / 4.20   <- steps still short
              0.45   3.68 / 3.06    0.60   6.10 / 5.00   <- shipped
              0.50   4.32 / 3.58    0.65   7.35 / 6.00
            0.55 is the trap: the heading passes at 5.09 and it looks finished,
            while the step text is at 4.20 against a 4.5 threshold.

            THE ONE CASUALTY IS THE GOLD NUMERALS. `--brass-on-dark` is 6.08:1 on
            FLAT aubergine, but here the residual cream keeps the background too
            light and it never reaches AA at any overlay this side of erasing the
            photograph: 3.12 at black 0.60, 3.71 at 0.65. So the numerals are
            --parchment, an existing token, rather than a new lighter brass
            invented for one band. Tina was told; #e8d3ac measures 5.02 at this
            overlay and is the fix if she wants the gold back.

            The button keeps its brass override for the same reason it had one
            before: on a dark band `.btn-pill`'s own aubergine has no edge
            against the background. */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: 'rgba(0,0,0,0.60)' }}
        />
        <div className="relative w-full max-w-[1220px] mx-auto px-8 py-10 md:py-20">
          {/* 62ch, widened from 46ch when Tina's marketing copy landed. 46ch was
              set when the band was BRIGHT and the copy had to stay inside the
              picture's clear cream centre (about 42% of the frame's width); with a
              uniform black overlay the whole band is dark, so the column no longer
              has to dodge the drapes. Measured at 1440: 46ch wrapped the new
              paragraph to SIX lines and pushed the band to 555px, undoing the "a bit
              thinner" it had just been given. 62ch is four lines and 488px, and
              contrast is unchanged (6.18 / 5.28 / 6.95) because the extra width
              reaches into the drapes, which are DARKER than the centre, not
              brighter. 70ch would be three lines and 442px if it ever needs to be
              thinner still. */}
          <div className="max-w-[62ch] mx-auto text-center">
            <div>
              {/* "Are you a modest fashion house?" and NOTHING after it, 2026-08-25.
                  The title was restored an hour earlier ("i did wnated you to keep the
                  old title") and then Tina, seeing it rendered: "apply for the seal
                  ccan go". Only the italic second sentence went — she named that
                  phrase, not the title — which also settles the contradiction the
                  band had while both existed: a heading saying "Apply for the seal"
                  over a body and a button selling marketing.
                  Size unchanged at clamp(24px,3vw,36px)/1.05: this is one of the four
                  homepage headings that move as a set (see the note at the top of this
                  file), so it is not free to drift. */}
              <h2 className="serif mt-3" style={{ fontSize: 'clamp(24px,3vw,36px)', lineHeight: 1.05, color: 'var(--parchment)' }}>
                Are you a modest fashion house?
              </h2>
              {/* Tina's copy, 2026-08-25, verbatim — do not rewrite it (§10.18: the
                  words on this site are hers). It is the lead paragraph under the
                  title, not a replacement for it. It arrived as three sentences and
                  she cut it twice, each time quoting the exact span she wanted gone:
                  first the clause "From launch features to curated campaigns," and
                  then the whole second sentence, "We'll help you reach the women
                  already looking for what you create." One sentence is what is left,
                  and it is deliberately one sentence — not a paragraph short of its
                  padding.
                  #e7d8e4 and 17-19px: the band's own body colour and roughly its body
                  size, so it reads as prose under a display heading rather than as a
                  second heading. Measured on the live render, so it is the same
                  colour the three steps below already use and are measured at. */}
              <p className="mt-4" style={{ fontSize: 'clamp(15px,1.15vw,17px)', lineHeight: 1.6, color: '#e7d8e4' }}>
                The Modesty House is the next stop for modest brands ready to be seen.
              </p>
              {/* space-y-1.5 (6px), halved from space-y-3 (12px) — Tina: "letss
                  spaing between these", pointing at the three steps. mt-6 above it
                  is the gap from the lead paragraph and is deliberately NOT reduced
                  with it: the ask was the spacing between the steps, and closing the
                  gap to the paragraph as well would merge the list into the prose. */}
              <ol className="mt-6 space-y-1.5">
                {[
                  'Tell us about your brand and goals',
                  'Choose how you want to be seen',
                  'Get discovered by the right audience',
                ].map((step, i) => (
                  <li key={i} className="flex gap-3 justify-center" style={{ color: '#e7d8e4' }}>
                    {/* --parchment, and NOT either brass token — the one thing this
                        band lost when it went dark over a cream-centred photograph.
                        Measured against the overlaid picture: --brass-on-dark 3.12,
                        --brass 1.53, --aubergine 1.55, --parchment 6.87. The italic
                        serif is what still separates the numeral from the step text. */}
                    <span className="serif italic" style={{ color: 'var(--parchment)' }}>{['i', 'ii', 'iii'][i]}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              {/* Brass again. The override went away for a few hours when this band
                  was bright and a brass pill measured 1.28:1 against the photograph;
                  with the 0.75 overlay the band is dark, so `.btn-pill`'s own
                  aubergine is the one with no edge and brass is right again. */}
              {/* GOLD PILL, WHITE LETTERS, 2026-08-25 — Tina: "yk what revert back to
                  the gold but do white letters". Both halves are overrides: `.btn-pill`
                  is aubergine-on-parchment by default, so the background goes back to
                  --brass and the colour is pinned to --parchment rather than left to
                  inherit --ink, which is what the gold pill carried all evening.

                  KNOWN AND ACCEPTED, so please do not silently "fix" it: white on
                  --brass measures 3.03:1, under the 4.5 AA threshold for 12px text.
                  The pill's other pairings, for scale — gold with --ink letters 5.15
                  (what this was), purple with white letters 13.40 (what it was for
                  about ten minutes). What white buys is the pill's EDGE: gold is
                  2.52:1 against the band behind it where aubergine was 1.75, so the
                  control reads as a control and its label does not.
                  If the letters need to pass while staying white, the fix is a deeper
                  gold: #87693e is 4.77:1 and still reads as brass. Offered to Tina;
                  this is her call and she has made it. */}
              <Link href="/contact?topic=marketing" className="btn-pill inline-block mt-8" style={{ background: 'var(--brass)', color: 'var(--parchment)' }}>
                Market with The Modesty House
              </Link>
            </div>
          </div>
        </div>
      </section>

    </main>
  );
}
