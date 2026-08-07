'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { STYLE_PIECES, type Piece } from '@/lib/stylePieces';

const TOPS = STYLE_PIECES.tops;
const BOTTOMS = STYLE_PIECES.bottoms;
const DRESSES = STYLE_PIECES.dresses;

const ARROW = 34;
const TOP_FRAME = { w: 138, h: 184 };
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
 *  287px is the Floral Chiffon's height, which is set by width rather than by
 *  this cap. At the old 340 the two slimmer dresses ran to the full cap and so
 *  stood a head taller than it; matching the cap to it levels all four. */
const DRESS_ART_H = 287;
/** Arrow centres sit at the middle of the TOP frame in BOTH columns, so all
 *  four controls line up across the card. Centring each slot on its own frame
 *  put the dress arrows at 170px and the top arrows at 92px. */
const ARROW_CENTER_Y = TOP_FRAME.h / 2;
const ARROW_STYLE: React.CSSProperties = {
  width: ARROW, height: ARROW, borderRadius: 999,
  border: '1px solid var(--hairline)', background: 'var(--parchment)', color: 'var(--ink)',
  alignSelf: 'flex-start',
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

  return (
    <div className="flex flex-col items-center">
      {/* minWidth:0 lets the frame shrink instead of overflowing. The arrows
          stay shrink-0, so at narrow widths the ARTWORK gives way, not the
          controls. Without this a fixed 182px frame + two 34px arrows only
          fitted the column at exactly 1220px and spilled at every width below,
          which is what made the dress look off-centre. */}
      <div className="flex items-start gap-3 justify-center w-full" style={{ minWidth: 0 }}>
        <button
          aria-label="Previous"
          onClick={onPrev}
          className="shrink-0 flex items-center justify-center"
          style={{ ...ARROW_STYLE, marginTop: (arrowAt ?? frame.h / 2) - ARROW / 2 }}
        >
          ‹
        </button>
        <div className="flex items-center justify-center" style={{ width: frame.w, maxWidth: '100%', height: frame.h, minWidth: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={piece.src}
            alt={`${piece.brand} ${piece.label}`}
            style={{ maxWidth: artMaxW, maxHeight: artMaxH ?? '100%', objectFit: 'contain', filter: 'drop-shadow(0 10px 12px rgba(90,60,40,0.18))' }}
          />
        </div>
        <button
          aria-label="Next"
          onClick={onNext}
          className="shrink-0 flex items-center justify-center"
          style={{ ...ARROW_STYLE, marginTop: (arrowAt ?? frame.h / 2) - ARROW / 2 }}
        >
          ›
        </button>
      </div>
      {/* w-full + text-center: the caption is longer than the arrows+image row
          ("GLOW MODESTY · FLORAL CHIFFON"), and as a shrink-to-fit box it set the
          column's width and pulled the artwork off-centre. Filling the column
          decouples the two so the image always sits in the middle. */}
      <div className="eyebrow mt-3 w-full text-center">
        {stackCaption ? (
          /* Same three parts as the mix slots, middot and all — only the line
             breaks differ, so the two columns still read as one set of labels.
             The middot sits on its own line, centred between the two. */
          <>
            <div style={{ color: 'var(--ink)' }}>{piece.brand}</div>
            <div>·</div>
            <div>{piece.label}</div>
          </>
        ) : (
          <>
            <span style={{ color: 'var(--ink)' }}>{piece.brand}</span> · {piece.label}
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
    <section className="max-w-[1220px] mx-auto px-8 py-20">
      <div className="grid grid-cols-1 md:grid-cols-[0.85fr_1.15fr] gap-12 items-center">
        {/* COPY — left */}
        <div>
          <h2 className="serif" style={{ fontSize: 'clamp(40px,5.6vw,64px)', lineHeight: 1.02, color: 'var(--ink)' }}>
            Every modest brand,
            <br />
            <span className="italic" style={{ color: 'var(--plum)' }}>in one house.</span>
          </h2>
          <p className="mt-5 max-w-sm" style={{ color: 'var(--muted)', fontSize: 15, lineHeight: 1.6 }}>
            Discover and shop hundreds of modest labels in one place. Mix a top from one house
            with a skirt from another — or find the dress.
          </p>
          <div className="mt-8 flex items-center gap-3">
            <button className="btn-pill" onClick={() => { takeOver(); shuffle(); }}>✦ Style me</button>
            <button
              onClick={() => setAuto((a) => !a)}
              className="nav-link"
              style={{ border: '1px solid var(--hairline)', borderRadius: 999, padding: '9px 18px', background: 'transparent' }}
            >
              {auto ? '❚❚ Pause' : '▷ Auto'}
            </button>
          </div>
          <Link href="/directory" className="nav-link inline-block mt-5">Shop {t.brand} + {b.brand} →</Link>
        </div>

        {/* PICKER CARD — right */}
        <div style={{ background: 'var(--bone)', border: '1px solid var(--hairline)', borderRadius: 18, padding: '22px 20px', boxShadow: '0 30px 60px -34px rgba(68,25,67,0.22)' }}>
          <div className="flex flex-col md:flex-row">
            {/* MIX */}
            <div className="flex-1 flex flex-col items-center px-2" style={{ minWidth: 0 }}>
              <div className="serif italic" style={{ fontSize: 20, color: 'var(--ink)' }}>Mix &amp; match</div>
              <div className="eyebrow mt-1">Top + Bottom</div>
              <div className="flex-1 flex flex-col items-center justify-start gap-5 mt-4">
                <Slot piece={t} frame={TOP_FRAME} onPrev={() => cycle(setTop, TOPS.length, -1)} onNext={() => cycle(setTop, TOPS.length, 1)} />
                <Slot piece={b} frame={TOP_FRAME} onPrev={() => cycle(setBottom, BOTTOMS.length, -1)} onNext={() => cycle(setBottom, BOTTOMS.length, 1)} />
              </div>
            </div>

            <div className="hidden md:block" style={{ width: 1, background: 'var(--hairline)' }} />
            <div className="block md:hidden" style={{ height: 1, background: 'var(--hairline)', margin: '24px 0' }} />

            {/* DRESS */}
            <div className="flex-1 flex flex-col items-center px-2" style={{ minWidth: 0 }}>
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
