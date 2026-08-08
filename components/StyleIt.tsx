'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { STYLE_PIECES, type Piece } from '@/lib/stylePieces';
// Phosphor, not the ‹ › glyphs these replace. Text glyphs vary in weight and
// alignment across platforms, never match the brand letterforms, and cannot
// take a `weight` prop — CLAUDE.md §6.
import { CaretLeft, CaretRight, ArrowRight } from '@phosphor-icons/react';

const TOPS = STYLE_PIECES.tops;
const BOTTOMS = STYLE_PIECES.bottoms;
const DRESSES = STYLE_PIECES.dresses;

const ARROW = 34;
/** Width was 138, which is narrower than several garments are wide. A flat-lay of
 *  an oversized top is about as wide as it is tall, so in a 138-wide frame width
 *  ran out first and the piece rendered short — 125px against a slim knit's 176px,
 *  which read as the new pieces being a different size from the old ones. At 170
 *  every top is limited by TOP_ART_H instead, so they all come out identical. */
const TOP_FRAME = { w: 170, h: 184 };
/** Tops are capped shorter than the frame; bottoms are not. Letting a top fill
 *  the frame made it 184 tall AND up to 198 wide, next to trousers that are 184
 *  tall but only 74-99 wide — so the top read as much the bigger garment. At 150
 *  a top sits alongside the trousers rather than looming over them, and it is
 *  where the original six already sat (134-176, mean 153).
 *
 *  This is only the fallback: each top carries its own `maxH`, set so they cover
 *  equal AREA rather than equal height (see Piece.maxH). 150 is the median of
 *  those, and applies to any piece added without one. */
const TOP_ART_H = 150;
const SLOT_GAP = 20;    // gap-5 between the two stacked mix slots
const CAPTION_H = 28;   // .eyebrow caption + its mt-3
/** One .eyebrow line. Marcellus carries no line-height of its own, so `normal`
 *  comes from its hhea metrics: (1995 + 573 + 0) / 2048 = 1.2539, which at the
 *  class's 10px is 12.5px. The dress caption stacks onto two lines, and this is
 *  what it costs. */
const CAPTION_LINE = 13;
/** The dress caption runs brand / middot / piece, so it is two lines longer than
 *  a mix slot's single line. */
const DRESS_CAPTION_EXTRA_LINES = 2;
/** The dress frame spans the FULL height of the mix column, so the artwork
 *  centres against the two stacked pieces rather than hugging the top. Derived,
 *  not a literal: the dress column was 76px shorter than the mix column and
 *  top-aligned, so every one of those 76px sat as dead space under the dress.
 *  Sizing the frame this way also keeps the frame's TOP aligned, which is what
 *  holds the arrows level with the top slot's. */
/** Width sets the arrows' distance from the dress, and it is deliberately the
 *  SAME for every dress: the arrows are anchored to the frame, so any per-piece
 *  width makes them jump when you cycle. A frame of 185 (fitting the widest
 *  garment outright) threw them 20px further out on that one dress, which reads
 *  as the controls drifting to the edge.
 *
 *  So the frame is fixed and a wide garment overflows it instead — up to
 *  frame + 2*gap-4 = frame+20 before it touches an arrow. That makes this number
 *  the single dial between the two things being traded:
 *
 *      frame  arrows from centre   widest dress
 *        160        92px              180px
 *        148        86px              168px   <- here
 *        145      84.5px              165px
 *
 *  Pulling the arrows in past this shrinks the abaya faster than it gains, since
 *  the other three dresses are 129-145px and already clear the arrows. */
const DRESS_FRAME = {
  w: 148,
  /* Less the caption lines the dress has and the mix slots do not: without this
     the dress column runs taller than the mix column and hands the mix pieces
     dead space under them — the thing the note above says this height exists to
     remove. */
  h: TOP_FRAME.h * 2 + SLOT_GAP + CAPTION_H - CAPTION_LINE * DRESS_CAPTION_EXTRA_LINES,
};
/** The artwork's own size. The FRAME spans the column so the dress can centre
 *  inside it; this cap stops the dress growing to fill that taller box.
 *
 *  Only the two slim dresses ever reach it — the Floral Chiffon and the abaya
 *  are held by their widths at 287 and 271 — so this number moves those two
 *  alone. At the original 340 they stood a head above the rest; 287 levelled
 *  them exactly with the Floral Chiffon, and 305 sets them a touch above it. */
const DRESS_ART_H = 305;
/** Arrow centres sit at the middle of the TOP frame in BOTH columns, so all
 *  four controls line up across the card. Centring each slot on its own frame
 *  put the dress arrows at 170px and the top arrows at 92px. */
const ARROW_CENTER_Y = TOP_FRAME.h / 2;
const ARROW_STYLE: React.CSSProperties = {
  width: ARROW, height: ARROW, borderRadius: 999,
  border: '1px solid var(--hairline)', background: 'var(--parchment)', color: 'var(--ink)',
  // alignSelf lives on the button's classes (self-center md:self-start), not
  // here: an inline style would win over them.
};
function Slot({
  piece,
  frame,
  onPrev,
  onNext,
  arrowAt,
  artMaxH,
  stackCaption,
}: {
  piece: Piece;
  frame: { w: number; h: number };
  onPrev: () => void;
  onNext: () => void;
  /** Distance from the frame's top to the arrow centres. Defaults to the frame's
   *  own middle; the dress passes ARROW_CENTER_Y so it matches the top slot. */
  arrowAt?: number;
  /** Caps the artwork's height inside a frame that is taller than the artwork,
   *  so the piece can be CENTRED in the column without being enlarged. */
  artMaxH?: number;
  /** Puts the brand and the piece on separate lines instead of splitting them
   *  with a middot. Costs a CAPTION_LINE of height, which DRESS_FRAME accounts
   *  for, so it is passed only by the dress slot. */
  stackCaption?: boolean;
}) {
  /* piece.maxW is a px cap on the ARTWORK, which may exceed the frame — that is
     how one garment gets bigger without dragging the arrows out with it. It is
     paired with the equivalent percentage so the overflow shrinks along with the
     frame on narrow viewports: as a bare px value it would keep its full size
     while the frame collapsed, and run into the arrows. */
  const artMaxW = piece.maxW
    ? `min(${piece.maxW}px, ${((piece.maxW / frame.w) * 100).toFixed(1)}%)`
    : '100%';

  /* Everything responsive here goes through CSS custom properties rather than a
     viewport check in JS. A `useMediaQuery` would have no answer during SSR, so
     it would either mismatch on hydration or flash the desktop size in first.
     The class names below are static strings, which is also what Tailwind needs
     in order to generate them at all — `w-[${x}px]` would never be emitted. */
  const artDesktop = piece.maxH ?? artMaxH ?? frame.h;
  /* On a phone the frame is FLUID, so the per-piece cap cannot be a pixel value.
     It is a SCALE FACTOR, not a percentage max-height.
     That distinction is the whole bug this replaces: `max-height: 76.1%` against
     a parent whose height comes from `aspect-ratio` computes to `none` in WebKit
     — verified in Playwright's WebKit 26.5, where the same element reported
     `max-height: 76.1%` in Chromium and `none` in WebKit. With no cap the artwork
     rendered at its natural size and covered the captions on Tina's iPhone.
     The image now fills the frame with `object-fit: contain`, which cannot
     overflow in either axis by construction, and this factor reproduces each
     piece's tuned share of it (tops carry their own maxH so they cover equal
     AREA — see Piece.maxH). A transform needs no percentage resolution at all. */
  const artScale = (artDesktop / frame.h).toFixed(3);

  return (
    <div
      className="flex flex-col items-center min-w-0 flex-1 md:flex-initial"
      style={{
        ['--fw' as string]: `${frame.w}px`,
        ['--fh' as string]: `${frame.h}px`,
        // The frame's shape, used to derive its height on a phone once its width
        // is whatever the row leaves over.
        ['--far' as string]: `${frame.w}/${frame.h}`,
        ['--art' as string]: `${artDesktop}px`,
        ['--art-k' as string]: artScale,
        ['--amt' as string]: `${(arrowAt ?? frame.h / 2) - ARROW / 2}px`,
      }}
    >
      {/* minWidth:0 lets the frame shrink instead of overflowing. The arrows
          stay shrink-0, so at narrow widths the ARTWORK gives way, not the
          controls. Without this a fixed 182px frame + two 34px arrows only
          fitted the column at exactly 1220px and spilled at every width below,
          which is what made the dress look off-centre. */}
      {/* The arrows FLANK the artwork at every width. They briefly moved
          underneath on a phone, which was only ever needed to fit the two slots
          side by side; stacked, a 116px frame plus two 34px arrows and their
          gaps is 208px inside a 270px column, so there is no reason to move
          them. */}
      <div className="flex items-start justify-center w-full gap-3" style={{ minWidth: 0 }}>
        <button
          aria-label="Previous"
          onClick={onPrev}
          className="shrink-0 flex items-center justify-center self-center md:self-start mt-0 md:mt-[var(--amt)]"
          style={ARROW_STYLE}
        >
          <CaretLeft size={16} weight="bold" />
        </button>
        <div className="relative flex items-center justify-center min-w-0 flex-1 aspect-[var(--far)] md:flex-none md:aspect-auto md:w-[var(--fw)] md:h-[var(--fh)] max-w-full">
          {/* lazy: this is also what keeps the desktop-only dress column from
              costing a phone anything — a lazy image in a display:none box is
              never fetched. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={piece.src}
            alt={piece.brand ? `${piece.brand} ${piece.label}` : piece.label}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 w-full h-full object-contain scale-[var(--art-k)] md:static md:w-auto md:h-auto md:scale-100 md:max-h-[var(--art)]"
            style={{ maxWidth: artMaxW, objectFit: 'contain', filter: 'drop-shadow(0 10px 12px rgba(90,60,40,0.18))' }}
          />
        </div>
        <button
          aria-label="Next"
          onClick={onNext}
          className="shrink-0 flex items-center justify-center self-center md:self-start mt-0 md:mt-[var(--amt)]"
          style={ARROW_STYLE}
        >
          <CaretRight size={16} weight="bold" />
        </button>
      </div>
      {/* w-full + text-center: the caption is longer than the arrows+image row
          ("GLOW MODESTY · FLORAL CHIFFON"), and as a shrink-to-fit box it set the
          column's width and pulled the artwork off-centre. Filling the column
          decouples the two so the image always sits in the middle. */}
      <div className="eyebrow mt-3 w-full text-center">
        {/* The middot separates two things, so a piece with no brand yet shows
            the garment alone rather than a caption hanging off a stray dot. */}
        {stackCaption ? (
          /* Same three parts as the mix slots, middot and all — only the line
             breaks differ, so the two columns still read as one set of labels.
             The middot sits on its own line, centred between the two. */
          <>
            {piece.brand && (
              <>
                <div style={{ color: 'var(--ink)' }}>{piece.brand}</div>
                <div>·</div>
              </>
            )}
            <div>{piece.label}</div>
          </>
        ) : (
          <>
            {piece.brand && (
              <>
                <span style={{ color: 'var(--ink)' }}>{piece.brand}</span> ·{' '}
              </>
            )}
            {piece.label}
          </>
        )}
      </div>
    </div>
  );
}

export default function StyleIt() {
  const [top, setTop] = useState(0);
  const [bottom, setBottom] = useState(0);
  const [dress, setDress] = useState(0);
  const [auto, setAuto] = useState(true);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const shuffle = useCallback(() => {
    setTop(Math.floor(Math.random() * TOPS.length));
    setBottom(Math.floor(Math.random() * BOTTOMS.length));
    setDress(Math.floor(Math.random() * DRESSES.length));
  }, []);

  useEffect(() => {
    if (!auto) return;
    timer.current = setInterval(shuffle, 2600);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [auto, shuffle]);

  const takeOver = () => setAuto(false);
  const cycle = (set: React.Dispatch<React.SetStateAction<number>>, len: number, dir: number) => {
    takeOver();
    set((i) => (i + dir + len) % len);
  };

  const t = TOPS[top];
  const b = BOTTOMS[bottom];

  return (
    <section className="max-w-[1220px] mx-auto px-8 py-10 md:py-20">
      {/* flex-column on a phone, grid from md up.
          `items-stretch` matters: `items-center` on a flex column acts on the
          HORIZONTAL axis and would shrink the copy to its content width, which it
          does not do in the grid. */}
      <div className="flex flex-col items-stretch gap-6 md:grid md:grid-cols-[0.85fr_1.15fr] md:gap-12 md:items-center">
        {/* The left column is ONE grid item on desktop and `display: contents` on
            a phone.
            That is what lets the phone put the controls and the "Shop X + Y" link
            BELOW the picker card (Tina's ask) while desktop keeps them in the left
            column, from a single copy of the markup: `contents` dissolves this
            wrapper on a phone so its three children become flex items of the row
            above and can be ordered around the card, and `md:block` restores it to
            a normal grid item above 768px.
            The first attempt placed all four as separate grid cells instead, and
            it regressed desktop badly: the card is taller than the copy, so the
            three left-hand rows stretched to match it and opened a large gap
            between the paragraph and the buttons. As one item there is only one
            row to stretch, and the margins below control the spacing exactly as
            they did before. */}
        <div className="contents md:block">
        {/* COPY — left */}
        <div className="order-1">
          <h2 className="serif" style={{ fontSize: 'clamp(40px,5.6vw,64px)', lineHeight: 1.02, color: 'var(--ink)' }}>
            Every modest brand,
            <br />
            <span className="italic" style={{ color: 'var(--plum)' }}>in one house.</span>
          </h2>
          <p className="mt-5 max-w-sm" style={{ color: 'var(--muted)', fontSize: 15, lineHeight: 1.6 }}>
            Discover and shop hundreds of modest labels in one place. Mix a top from one house
            with a skirt from another — or find the dress.
          </p>
          </div>

          {/* CONTROLS. order-3 puts them after the card on a phone; on desktop
              they are simply the next block inside this wrapper, with the margin
              they always had.
              The ! modifiers are needed because .btn-pill and .nav-link set their
              own padding and font-size in globals.css, and a plain utility would
              be a specificity coin-toss against them. */}
          <div className="order-3 flex items-center gap-2 md:gap-3 md:mt-8">
            <button
              className="btn-pill !text-[11px] !px-3.5 !py-2 md:!text-xs md:!px-[18px]"
              onClick={() => { takeOver(); shuffle(); }}
            >
              ✦ Style me
            </button>
            <button
              onClick={() => setAuto((a) => !a)}
              className="nav-link !text-[11px] md:!text-xs"
              style={{ border: '1px solid var(--hairline)', borderRadius: 999, padding: '7px 14px', background: 'transparent' }}
            >
              {auto ? '❚❚ Pause' : '▷ Auto'}
            </button>
          </div>

          <Link
            href="/directory"
            className="nav-link order-4 flex md:inline-flex items-center gap-1.5 !text-[11px] md:!text-xs md:mt-5"
          >
            Shop {t.brand} + {b.brand} <ArrowRight size={12} weight="bold" />
          </Link>
        </div>

        {/* PICKER CARD — right */}
        {/* Tighter padding on a phone — 20px a side was 40px of the 326 available,
            and every pixel of it comes off the garment. */}
        <div
          className="order-2 px-3 py-4 md:px-5 md:py-[22px]"
          style={{ background: 'var(--bone)', border: '1px solid var(--hairline)', borderRadius: 18, boxShadow: '0 30px 60px -34px rgba(68,25,67,0.22)' }}
        >
          <div className="flex flex-col md:flex-row">
            {/* MIX */}
            <div className="flex-1 flex flex-col items-center px-0 md:px-2" style={{ minWidth: 0 }}>
              <div className="serif italic" style={{ fontSize: 20, color: 'var(--ink)' }}>Mix &amp; match</div>
              <div className="eyebrow mt-1">Top + Bottom</div>
              {/* Stacked at every width. It was briefly side by side on a phone;
                  Tina reverted that. On a phone each frame is now FLUID — it
                  takes whatever the row has left after the arrows — so the
                  garment is as large as the screen allows and the block grows
                  taller to fit it, rather than being pinned to a fixed size. */}
              <div className="flex-1 w-full flex flex-col items-center justify-start gap-4 md:gap-5 mt-4">
                <Slot piece={t} frame={TOP_FRAME} artMaxH={TOP_ART_H} onPrev={() => cycle(setTop, TOPS.length, -1)} onNext={() => cycle(setTop, TOPS.length, 1)} />
                <Slot piece={b} frame={TOP_FRAME} onPrev={() => cycle(setBottom, BOTTOMS.length, -1)} onNext={() => cycle(setBottom, BOTTOMS.length, 1)} />
              </div>
            </div>

            <div className="hidden md:block" style={{ width: 1, background: 'var(--hairline)' }} />

            {/* DRESS — desktop only.
                On a phone this used to stack UNDER the mix-and-match column, which
                made the card roughly twice as tall as the screen and pushed the
                whole picker into a long scroll. Tina's call: the phone shows the
                mix-and-match pair only.

                Hidden with CSS rather than removed from the tree, deliberately:
                dropping it conditionally would need a viewport check that does not
                exist during SSR, so it would either mismatch on hydration or flash
                the dress in before removing it. The images below carry
                loading="lazy", and a lazy image inside a display:none box is never
                fetched — verified, see docs/log/2026-08-07-mobile-overhaul.md — so
                the hidden column costs a phone no bytes.

                NOTE: the paragraph on the left still reads "or find the dress".
                That is Tina's copy and is left untouched (§10.18). */}
            <div className="hidden md:flex flex-1 flex-col items-center px-2" style={{ minWidth: 0 }}>
              <div className="serif italic" style={{ fontSize: 20, color: 'var(--ink)' }}>Or a dress</div>
              <div className="eyebrow mt-1">One &amp; done</div>
              <div className="flex-1 flex items-start justify-center mt-4">
                <Slot piece={DRESSES[dress]} frame={DRESS_FRAME} arrowAt={ARROW_CENTER_Y} artMaxH={DRESS_ART_H} stackCaption onPrev={() => cycle(setDress, DRESSES.length, -1)} onNext={() => cycle(setDress, DRESSES.length, 1)} />
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
