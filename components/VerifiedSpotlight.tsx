import Link from 'next/link';
// ssr entrypoint: this is a server component (CLAUDE.md §6).
import { ArrowRight, Sparkle } from '@phosphor-icons/react/dist/ssr';
import { shopifyImage } from '@/lib/shopifyImage';

type House = {
  slug: string;
  name: string;
  image?: string;
  homepage: string;
  category: string;
  city: string;
};

const POS = ['p1', 'p2', 'p4', 'p3']; // p3 (last) is the front / verified card
const FALLBACK = [
  'linear-gradient(160deg,#c9cbb0,#8f9670)',
  'linear-gradient(160deg,#efe7dc,#d8c9b4)',
  'linear-gradient(160deg,#bfc6cf,#8793a1)',
  'linear-gradient(160deg,#e7d7d0,#b98f88)',
];
const OVERLAY = 'linear-gradient(180deg,transparent 42%,rgba(28,12,34,.86))';

export default function VerifiedSpotlight({ houses }: { houses: House[] }) {
  const list = houses.slice(0, 4);
  if (list.length === 0) return null;

  return (
    <section className="tmh-verified-sec">
      <div className="tmh-vin">
        {/* LEFT: text */}
        <div className="tmh-vtext">
          <h2 className="tmh-title">Houses that just<br />earned the <em>seal</em>.</h2>
          {/* Was "craft, sizing and ethics" — a third wording of the seal
              standard, different from /about's ("craft and design", the one
              place it's actually defined) and the homepage's own apply block.
              "Ethics" was never defined or evidenced anywhere on the site. */}
          <p className="tmh-copy">
            Every label here has passed our review for craft and design, freshly
            stamped and added to the house.
          </p>
          {/* Phosphor, not &rarr; (CLAUDE.md §6). The underline is on the link
              itself, so the icon has to sit inside it to be underlined too. */}
          <Link className="tmh-link" href="/designers">
            All designers <ArrowRight size={13} weight="bold" />
          </Link>
        </div>

        {/* RIGHT: fanned cards */}
        <div className="tmh-stage">
          {list.map((h, i) => {
            const verified = i === list.length - 1;
            // A CSS background cannot carry srcset, so the width is requested
            // directly. The card renders ~228px wide; 460 covers it at 2x. One
            // of these was measured at 155KB before.
            const bg = h.image
              ? `${OVERLAY}, url("${shopifyImage(h.image, 460)}")`
              : `${OVERLAY}, ${FALLBACK[i % FALLBACK.length]}`;
            return (
              <a
                key={h.slug}
                href={h.homepage}
                target="_blank"
                rel="noopener noreferrer sponsored"
                data-brand={h.slug}
                data-surface="spotlight"
                className={`tmh-card ${POS[i] || 'p1'}`}
                style={{ backgroundImage: bg }}
              >
                {/* Phosphor Sparkle, not &#10022; (CLAUDE.md §6). The character
                    is a four-pointed star with no bold weight, and at the sizes
                    this badge takes it fell back to a system font. */}
                {verified && (
                  <span className="tmh-badge">
                    <Sparkle size={10} weight="fill" />
                    Verified
                  </span>
                )}
                <div className="tmh-cap">
                  <h3>{h.name}</h3>
                  <p>{h.category} &middot; {h.city}</p>
                </div>
              </a>
            );
          })}
        </div>
      </div>

      <style>{`
        /* overflow-x: clip, because the mobile rule below nudges the stage with
           a transform — and a transform DOES contribute to scrollable overflow
           even though it does not change the layout box. (The note on that rule
           used to claim the opposite; it was wrong.) The stage carries ~9.5% of
           empty width on its right — the cards only span 0-90.5% of it — so the
           nudge pushes that EMPTY strip past the right edge and the document
           gained 3px of horizontal scroll at 430px. Nothing visible is clipped:
           at 430 the rightmost card lands at 413.9px against a 414px content
           edge.
           clip, not hidden: hidden would make this a scroll container.
           NOTE, again: NO BACKTICKS anywhere in this block. It lives inside a
           template literal and one of them closes the string and breaks the
           whole component — which is exactly what happened when this comment was
           first written, two lines under the existing warning saying so. */
        .tmh-verified-sec{padding:80px 32px;overflow-x:clip}
        .tmh-vin{max-width:1220px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center}
        .tmh-stage{order:1}
        .tmh-vtext{order:2}

        .tmh-eyebrow{font-family:var(--font-label),serif;text-transform:uppercase;letter-spacing:.3em;font-size:12px;color:var(--brass);margin-bottom:18px}
        .tmh-title{font-family:var(--font-display),serif;font-weight:500;font-size:clamp(40px,5.6vw,64px);line-height:1.02;color:var(--ink)}
        .tmh-title em{font-style:italic;color:var(--plum)}
        .tmh-copy{color:#6f6353;font-size:17px;line-height:1.6;max-width:42ch;margin-top:22px}
        .tmh-link{display:inline-flex;align-items:center;gap:6px;min-height:32px;margin-top:26px;font-family:var(--font-label),serif;text-transform:uppercase;letter-spacing:.18em;font-size:12px;color:var(--aubergine);border-bottom:1px solid var(--aubergine);padding-bottom:3px}

        /* PROPORTIONAL, not fixed. The fan used to be a 560x500 stage holding
           238px cards, which is why it could not shrink and why the phone had to
           throw it away for a flat scrolling row. Expressed as an aspect-ratio
           box with a percentage-width card, the WHOLE fan scales with whatever
           width it is given — the p1–p4 offsets are already percentages, so they
           follow for free.

           At desktop this is a no-op: the column is 586px, max-width caps the
           stage at 560, 560 x 500/560 = 500px tall, and 42.5% of 560 = 238px.
           Identical to the numbers it replaces. It also fixes a latent bug
           between 820 and 1220px, where the two-column grid gave the stage less
           than 560px but the cards stayed 238px and the fan spilled out. */
        /* container-type, so everything INSIDE the fan can be sized against the
           fan's own width rather than the viewport's.
           This is the fix for a real defect: the type below used to be restated
           at a 820px media query — 28px/11px above it, 17px/8px below — on the
           assumption that below 820 the stage is phone-sized. It is not. The
           stage is max-width:560, so anywhere from about 600 to 820px it is at
           its FULL desktop size while the media query is still handing it the
           phone's 17px and 8px. Measured on an iPad in portrait: 238px cards
           carrying 8px captions.
           Against the container there is no such gap. cqi is 1% of the stage's
           inline size, so 5cqi is 28px at 560 and 17.9px at 358 — the two values
           that were being hand-written — and every width between resolves on the
           same line instead of jumping at a breakpoint. The clamps pin both
           ends to the sizes already signed off, with ONE deliberate exception:
           the meta line and the badge floor at 9px, not the 8px the phone used
           to hard-code. 8px uppercase at 0.14em tracking is below anything
           readable, and the proportional value dips under 9 again in the
           820-1220 band where the stage is about 456px wide — so a 9px floor is
           what makes the whole range legible. It is a 1px change to a signed-off
           composition and is worth saying out loud rather than shipping quietly. */
        .tmh-stage{position:relative;width:100%;max-width:560px;aspect-ratio:560/500;container-type:inline-size}
        .tmh-card{
          position:absolute;width:42.5%;aspect-ratio:3/4;border-radius:16px;overflow:hidden;
          border:clamp(4px,1.07cqi,6px) solid var(--bone);
          background-size:cover;background-position:center;
          box-shadow:0 34px 60px -30px rgba(42,18,38,.55);
          transform:rotate(var(--rot));
          transition:transform .35s ease, box-shadow .35s ease;
        }
        .tmh-card:hover{transform:rotate(0) translateY(-10px) scale(1.02);box-shadow:0 44px 70px -30px rgba(42,18,38,.6);z-index:20}
        .p1{left:0%;  top:6%;  --rot:-8deg; z-index:3}
        .p2{left:24%; top:0;   --rot:5deg;  z-index:1}
        .p4{left:48%; top:4%;  --rot:9deg;  z-index:2}
        .p3{left:15%; top:22%; --rot:2deg;  z-index:5}

        .tmh-badge{
          position:absolute;top:clamp(9px,2.86cqi,16px);left:clamp(9px,2.86cqi,16px);
          display:inline-flex;align-items:center;gap:clamp(4px,1.07cqi,6px);
          background:var(--brass);color:var(--ink);border-radius:30px;
          padding:clamp(4px,1.07cqi,6px) clamp(9px,2.5cqi,14px);
          font-family:var(--font-label),serif;text-transform:uppercase;letter-spacing:.12em;
          font-size:clamp(9px,1.96cqi,11px);
        }
        .tmh-cap{position:absolute;left:clamp(12px,3.93cqi,22px);bottom:clamp(12px,3.93cqi,22px);right:clamp(10px,3.57cqi,20px);color:var(--parchment)}
        .tmh-cap h3{font-family:var(--font-display),serif;font-weight:500;font-size:clamp(17px,5cqi,28px);line-height:1}
        .tmh-cap p{font-family:var(--font-label),serif;text-transform:uppercase;letter-spacing:.14em;font-size:clamp(9px,1.96cqi,11px);margin-top:clamp(4px,1.25cqi,7px);opacity:.9}

        @media (prefers-reduced-motion:reduce){.tmh-card{transition:none}}
        @media (max-width:820px){
          .tmh-vin{grid-template-columns:1fr;gap:30px}
          .tmh-vtext{order:0}
          .tmh-stage{order:1}

          /* THE FAN IS KEPT ON A PHONE, just smaller — Tina's call, from the
             desktop rendering. It used to be replaced here by a horizontally
             scrolling row of upright cards, which lost the tilt, the overlap and
             the whole point of the composition.

             Nothing about the geometry is restated: .tmh-stage is an
             aspect-ratio box and .tmh-card is a percentage of it, so the fan
             simply redraws at whatever width the phone gives it. Only the things
             that do NOT scale with a percentage are adjusted below — type, border
             and inset are absolute lengths, and at ~40% of the desktop card they
             would otherwise swamp it.

             Tighter section padding buys the fan 32px of width, which is a whole
             card-width of ~9%. */
          /* 40px, matching the py-10 every other section drops to on a phone —
             80px top and bottom put 160px of dead space between each one. */
          /* 16px, so the fanned cards get the full width — but that put the
             HEADING and copy 16px from the edge while every other section on the
             page sits at 32px (px-8), and the text read as falling off the left.
             Measured: this heading at 16, "By category" and "Chosen by hand"
             both at 32. The text gets the missing 16 back below; only the stage
             keeps the wider bleed.
             NOTE: no backticks in this block — it lives inside a template
             literal, and one closes the string and breaks the whole component. */
          .tmh-verified-sec{padding:40px 16px}
          .tmh-vtext{padding-left:16px;padding-right:16px}

          /* The cards span 0%–90.5% of the stage (p4 sits at 48% and is 42.5%
             wide), so the leftover 9.5% is all on the right and the cluster
             reads left-of-centre. On desktop the stage sits in a wide column and
             it is invisible; in a 390px viewport it is a 34px gap against 16px.
             A transform, not a margin, so the stage's layout box is unchanged.
             NOTE what that does and does not buy: a transform is invisible to
             layout but it DOES contribute to scrollable overflow, so this alone
             still gave the document 3px of horizontal scroll at 430px. The
             overflow-x: clip on the section is the other half of the fix.
             4.75% — half the leftover — not 17px. Same thing at 358px wide,
             which is what 17px was measured for, but it stays correct once the
             stage is bigger: at tablet size the fixed 17px was a fifth of the
             nudge it needed to be.
             margin-inline goes with it. In ONE column the stage is capped at
             560px, so from about 600px up it stopped filling its row and sat
             hard left with a growing band of empty parchment beside it — 227px
             of it at 819px wide, which read as a section that had failed to
             load. Centred, the fan is the composition again at every width. */
          .tmh-stage{margin-inline:auto;transform:translateX(4.75%)}

          /* The front / verified card centred. The three behind it span 0%–90.5%
             (p4 sits at 48% and cards are 42.5% wide), so the cluster's centre is
             45.25%; a 42.5%-wide card centres on that at left:24%. It was 15%,
             which put its centre at 36.25% — visibly left of the stack it sits in
             front of. Combined with the 12px nudge above, its centre lands within
             5px of the viewport centre at 390px.
             Mobile only: the desktop composition is the one Tina already signed
             off, and its asymmetry reads as deliberate at that size. */
          .p3{left:24%}

          .tmh-card{box-shadow:0 18px 34px -20px rgba(42,18,38,.5)}
          /* No hover on a touch screen, and :hover sticks after a tap. */
          .tmh-card:hover{transform:rotate(var(--rot));box-shadow:0 18px 34px -20px rgba(42,18,38,.5)}

          /* Nothing about the TYPE is restated here any more. Border width,
             caption inset, badge inset, and both font sizes are container
             queries on .tmh-stage above, so they scale with the fan itself
             rather than stepping at a viewport width the fan does not share.
             This block is now layout only: one column, tighter section padding,
             the stage centred, and the front card recentred over the stack. */
        }
      `}</style>
    </section>
  );
}
