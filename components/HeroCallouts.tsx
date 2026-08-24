/**
 * The hairline garment credits over the homepage hero photo — a label, a
 * leader line, and a dot on the satin — added 2026-08-21 from Tina's own
 * mockup ("you see the arrows that say hanna atielier i want you to recreate
 * that but maybe a differnt name and before we name the brand we say brand:
 * ...", then "i want you to do it exactly the same as this one").
 *
 * MEASURED OFF THE MOCKUP, not eyeballed — Tina: "i want you to do it exaclty
 * thesame so placmenet the color". The screenshot is a 2x retina capture, so
 * every number below was taken in full-resolution pixels and halved into CSS
 * px: its hero box is 1297x730 CSS, close enough to ours (1440x724 at the
 * width these were checked at) that its label x-positions, its leader heights
 * and its type sizes transfer directly. What transfers is:
 *   - label x  589 and 467 CSS from the hero's left edge — the two labels are
 *     deliberately STAGGERED, they do not share a left edge
 *   - leader heights 150 and 516 CSS from the hero's top
 *   - upper leader: 44px horizontal, then a bend down ~30 degrees to the dot;
 *     lower leader: dead straight
 *   - house name 11px / 0.22em tracking, piece name 13px, 5px apart. These are
 *     SMALLER than the first attempt's 12/15, which looked right in isolation
 *     and was ~18% too big once cropped side by side with the mockup at a
 *     matched scale — the only way to settle it (Tina: "look at the size of the
 *     letters")
 *   - dot 5px (9 full-res px), solid white
 *
 * The label is
 * LEFT-aligned; the house name is a geometric sans (--font-ui, i.e. Jost — the
 * mockup's label type is sans, not the site's usual Marcellus), upper-case and
 * widely tracked, with the piece name UNDER it in the same family, sentence
 * case, a little larger and softer; the leader line leaves from the right of
 * the house-name line, runs horizontally, and — where the dot does not sit on
 * that same line — bends once diagonally down to reach it; the dot is a small
 * solid white circle.
 *
 * THE NAMES ARE THE MOCKUP'S OWN — Tina: "it should be haana & stuff you need
 * to change the names," after being told once that Hanaa Atelier is not a real
 * house. **`Hanaa Atelier` does not exist in `data/brands.ts` or anywhere else**;
 * `Khair` is the real `khair-archives` shortened. That is a deliberate decision
 * of hers, not an oversight, and it is the one place on the site where a label
 * is not a house you can actually click through to — `HeroBrandStrip` below it
 * still scrolls the real 113. Swapping either name for a real house is a
 * one-line edit to CALLOUTS below.
 *
 * GEOMETRY — the part that is easy to get wrong. The hero <img> is
 * `object-cover`, and the source (5461x2472, 2.21:1) is wider than any real
 * viewport box, so it is always HEIGHT-constrained: the full source height maps
 * 1:1 to the hero box and the crop is horizontal-only, centred. A percentage
 * measured off the photograph therefore does NOT equal the same percentage of
 * the hero box. The inner div below reproduces the cover geometry exactly —
 * full height, source aspect ratio, centred — so every number below is a
 * percentage of the PHOTOGRAPH and lands on the same pixel of satin at every
 * width.
 *
 * The line is an <svg> in that same 0-100 photo space with
 * preserveAspectRatio="none", so its points need no pixel maths;
 * `vectorEffect="non-scaling-stroke"` keeps it a hairline despite the
 * non-uniform scale. The dot stays an HTML element — a <circle> in that space
 * would render as an ellipse.
 *
 * Was desktop-only (`hidden lg:block`) — 2026-08-23, Tina: "i want you to add
 * the arrows on the mobile and tablet too." Two different photos are actually
 * in play below `lg`, so this became two calibrations rather than one shared
 * one:
 *   - TABLET (768-1023px) still gets the same desktop photo (hero-home-10 —
 *     the `<picture>` source swap in app/page.tsx only swaps below 768px), so
 *     the existing CALLOUTS/geometry below just needed a wider `md:block`
 *     instead of `lg:block`. The percentages are of the PHOTOGRAPH, not the
 *     box, so they hold at any width as long as the box stays narrower than
 *     the photo's own 2.209 aspect ratio — true from 390px up through desktop.
 *   - PHONE (<768px) shows hero-home-mobile.png instead — a different image
 *     entirely (same two models, a separately-composed portrait crop), so its
 *     dot/label positions could not be derived from the desktop numbers above.
 *     Measured fresh, the same way: took a raw screenshot of the mobile hero
 *     with the text/overlay hidden, worked out the object-cover geometry by
 *     hand (box height maps 1:1 to the photo at every phone width tested,
 *     since 390x844's 0.462 box ratio is narrower than the photo's own 0.5625
 *     — same height-constrained/horizontal-crop-only shape as desktop, just a
 *     different photo), and placed CALLOUTS_MOBILE by eye against that math,
 *     then verified by rendering it and checking the dots land on the hijab
 *     and the sleeve knot rather than guessing blind.
 *
 * SERVER component — static strings and CSS, no state.
 */

type Callout = {
  /**
   * House name from data/brands.ts, split across lines the way the mockup
   * writes its own ("HANAA" over "ATELIER") — Tina: "same name how they are
   * written". The LAST line is what the leader attaches to.
   */
  brand: string[];
  /** The garment the dot sits on. */
  piece: string;
  /** Left edge of the label block, as a % of the PHOTOGRAPH. */
  labelX: number;
  /** Vertical centre of the house-name line, and the height the leader runs at. */
  lineY: number;
  /** Where the leader starts — hand-set to clear the end of the house-name text. */
  lineStart: number;
  /** Where the leader bends down towards the dot. Omit for a straight run. */
  bend?: number;
  /** The dot, on the garment. */
  dotX: number;
  dotY: number;
};

const CALLOUTS: Callout[] = [
  // BOTH callouts belong to the FRONT model in the lilac satin — Tina: "look
  // they are only at the light purple woman." The mockup credits one woman's
  // two garments, hijab and abaya; it never labels the model behind her.
  //
  // Upper — her hijab, but the dot does NOT sit on the fabric. Tina: "look
  // where they have placed the arrowes, 1 next to the head." Measured on the
  // mockup: at the dot's row its background runs dark out to x=1665 and the
  // head silhouette starts at 1670, with the dot at 1622 — i.e. **23 CSS px
  // clear of the head, in the dark**, at brow height. The same scan on the live
  // hero puts our silhouette edge at x=833, so the dot goes at 805.
  {
    brand: ['Khair'],
    piece: 'Satin Silk Hijab',
    labelX: 47.75,
    lineY: 20.7,
    lineStart: 51.1,
    bend: 53.7,
    dotX: 55.19,
    dotY: 22.65,
  },
  // Lower — "one inside of the elbow." On the mockup the dot sits on the
  // sleeve's inner crease, 41.5 x 67.5 CSS px up-and-left of the waist knot;
  // scaled by 1.11 (our hero is 1440 wide against the mockup's 1297) that is 46
  // x 75 from our own knot at (785, 715), so the dot goes at (739, 640). Set
  // further LEFT than the upper callout — the mockup's stagger, not an
  // accident: its two labels do not share a left edge.
  {
    brand: ['Hanaa', 'Atelier'],
    piece: 'Draped Satin Abaya',
    labelX: 39.7,
    lineY: 76.24,
    lineStart: 44.06,
    dotX: 51.06,
    dotY: 76.24,
  },
];

// Sampled off the mockup rather than chosen. The leader reads (135,115,100)
// over a (51,26,11) background, i.e. white at ~0.40 alpha. The piece line is
// NOT the same colour as the house name — it peaks at (216,209,222), a light
// lilac, against the house name's near-white (248,247,245).
// Toned down 2026-08-22 — Tina: "can you make the things with the arrows a lil
// lighter." Everything drops roughly a quarter of its weight against the photo;
// the RELATIVE order is preserved (name brightest, piece a shade lilac and
// softer, leader softest of all), because that hierarchy is what the mockup's
// own sampled values had.
const LINE = 'rgba(255,255,255,0.28)';
const NAME = 'rgba(251,250,246,0.78)';
const PIECE = 'rgba(220,214,233,0.68)';
// Line box for a house-name line: the mockup stacks "HANAA"/"ATELIER" 16 CSS
// px apart (32px in its 2x capture).
const NAME_LINE = 16;

// Fresh calibration against hero-home-mobile.png (1728x3072, 0.5625 aspect —
// the phone-only photo, see app/page.tsx's <picture> source). Same two
// garments, same model (she's on the LEFT in this crop, not the right — the
// mobile photo is a separately-composed portrait, not a slice of the desktop
// one, so left/right is not assumed to carry over).
// 2026-08-23 — Tina placed these herself in callout-designer.html (the
// drag-and-drop tool built for exactly this) and sent the generated code
// back verbatim: elbow leaders this time, not the straight ones from the
// first pass. Unused as of the same day ("get rid of the ones on tablet and
// phone" — see HeroCallouts() below) — left in place rather than deleted,
// same reasoning as HeroBrandStrip.tsx/lib/vibes.ts.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const CALLOUTS_MOBILE: Callout[] = [
  {
    brand: ['Khair'],
    piece: 'Satin Silk Hijab',
    labelX: 26.02,
    lineY: 13.16,
    lineStart: 50.35,
    bend: 56.06,
    dotX: 64.62,
    dotY: 22.5,
  },
  {
    brand: ['Hanaa', 'Atelier'],
    piece: 'Draped Satin Abaya',
    labelX: 21.58,
    lineY: 76.05,
    lineStart: 54.56,
    bend: 59.24,
    dotX: 65.32,
    dotY: 71.84,
  },
];

function CalloutGroup({
  callouts,
  aspectRatio,
  className,
  nameFontFamily = 'var(--font-ui)',
  pieceFontFamily = 'var(--font-ui)',
  joinBrandOneLine = false,
  dotSize = 5,
  dotHalo = '0 0 10px rgba(0,0,0,0.35)',
}: {
  callouts: Callout[];
  aspectRatio: string;
  className: string;
  /** Mobile matches Tina's own callout-designer.html reference — a serif
   * (--font-label) rather than the desktop mockup's geometric sans. */
  nameFontFamily?: string;
  pieceFontFamily?: string;
  /** Desktop stacks multi-line brands ("HANAA" / "ATELIER"); the mobile
   * reference joins them on one line ("HANAA / ATELIER") instead. */
  joinBrandOneLine?: boolean;
  dotSize?: number;
  dotHalo?: string;
}) {
  return (
    <div className={`absolute inset-0 z-10 pointer-events-none ${className}`}>
      {/* The cover-geometry mirror: same height as the hero box, the source's
          own aspect ratio, centred — i.e. exactly the rectangle the <img>
          occupies once object-cover has scaled and cropped it. */}
      <div
        className="absolute top-0 bottom-0 left-1/2"
        style={{ transform: 'translateX(-50%)', height: '100%', aspectRatio }}
      >
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
        >
          {callouts.map((c) => (
            <polyline
              key={c.brand.join(' ')}
              points={
                c.bend === undefined
                  ? `${c.lineStart},${c.lineY} ${c.dotX},${c.dotY}`
                  : `${c.lineStart},${c.lineY} ${c.bend},${c.lineY} ${c.dotX},${c.dotY}`
              }
              fill="none"
              stroke={LINE}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>

        {callouts.map((c) => (
          <div key={c.brand.join(' ')}>
            {/* Label block, left-aligned, hung so that the LAST house-name
                line's centre — not the block's centre — sits on lineY, which is
                what the leader has to meet. Every earlier line stacks above it,
                so the offset is (lines - 0.5) x the 16px line box. */}
            <div
              className="absolute"
              style={{
                left: `${c.labelX}%`,
                top: `${c.lineY}%`,
                transform: `translateY(-${((joinBrandOneLine ? 1 : c.brand.length) - 0.5) * NAME_LINE}px)`,
                whiteSpace: 'nowrap',
              }}
            >
              {joinBrandOneLine ? (
                <div
                  className="uppercase"
                  style={{
                    fontFamily: nameFontFamily,
                    fontSize: 11,
                    lineHeight: `${NAME_LINE}px`,
                    letterSpacing: '0.22em',
                    color: NAME,
                    textShadow: '0 1px 10px rgba(0,0,0,0.5)',
                  }}
                >
                  {c.brand.filter(Boolean).join(' / ')}
                </div>
              ) : (
                c.brand.map((line) => (
                  <div
                    key={line}
                    className="uppercase"
                    style={{
                      fontFamily: nameFontFamily,
                      fontSize: 11,
                      lineHeight: `${NAME_LINE}px`,
                      letterSpacing: '0.22em',
                      color: NAME,
                      textShadow: '0 1px 10px rgba(0,0,0,0.5)',
                    }}
                  >
                    {line}
                  </div>
                ))
              )}
              <div
                style={{
                  fontFamily: pieceFontFamily,
                  fontSize: 13,
                  lineHeight: '17px',
                  marginTop: 5,
                  color: PIECE,
                  textShadow: '0 1px 10px rgba(0,0,0,0.5)',
                }}
              >
                {c.piece}
              </div>
            </div>
            {/* Dot. Its own width/height are pulled back by half so the CENTRE
                lands on the coordinate the leader ends at. */}
            <span
              className="absolute"
              style={{
                left: `${c.dotX}%`,
                top: `${c.dotY}%`,
                width: dotSize,
                height: dotSize,
                marginLeft: -dotSize / 2,
                marginTop: -dotSize / 2,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.8)',
                boxShadow: dotHalo,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function HeroCallouts() {
  // 2026-08-23 — Tina: "fuck it get rid of the ones on tablet and phone."
  // Back to desktop-only (`hidden lg:block`, the original pre-2026-08-23
  // behaviour), after a full round of adding them to mobile/tablet
  // (CALLOUTS_MOBILE + the md:block widening below), recalibrating twice,
  // building callout-designer.html so she could place them by hand, and
  // restyling to match her own reference screenshot. CALLOUTS_MOBILE and
  // CalloutGroup's mobile style props are left in place, unused, same
  // reasoning as HeroBrandStrip.tsx/lib/vibes.ts — cheap to bring back if she
  // changes her mind, not deleted outright.
  return <CalloutGroup callouts={CALLOUTS} aspectRatio="5461 / 2472" className="hidden lg:block" />;
}
