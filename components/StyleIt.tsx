'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { STYLE_PIECES, type Piece } from '@/lib/stylePieces';

const TOPS = STYLE_PIECES.tops;
const BOTTOMS = STYLE_PIECES.bottoms;
const DRESSES = STYLE_PIECES.dresses;

function Slot({
  piece,
  frame,
  onPrev,
  onNext,
}: {
  piece: Piece;
  frame: { w: number; h: number };
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-3 justify-center">
        <button
          aria-label="Previous"
          onClick={onPrev}
          className="shrink-0 flex items-center justify-center"
          style={{ width: 34, height: 34, borderRadius: 999, border: '1px solid var(--hairline)', background: 'var(--parchment)', color: 'var(--ink)' }}
        >
          ‹
        </button>
        <div className="flex items-center justify-center" style={{ width: frame.w, height: frame.h }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={piece.src}
            alt={`${piece.brand} ${piece.label}`}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', filter: 'drop-shadow(0 10px 12px rgba(90,60,40,0.18))' }}
          />
        </div>
        <button
          aria-label="Next"
          onClick={onNext}
          className="shrink-0 flex items-center justify-center"
          style={{ width: 34, height: 34, borderRadius: 999, border: '1px solid var(--hairline)', background: 'var(--parchment)', color: 'var(--ink)' }}
        >
          ›
        </button>
      </div>
      {/* w-full + text-center: the caption is longer than the arrows+image row
          ("GLOW MODESTY · FLORAL CHIFFON"), and as a shrink-to-fit box it set the
          column's width and pulled the artwork off-centre. Filling the column
          decouples the two so the image always sits in the middle. */}
      <div className="eyebrow mt-3 w-full text-center">
        <span style={{ color: 'var(--ink)' }}>{piece.brand}</span> · {piece.label}
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
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
              <div className="flex-1 flex flex-col items-center justify-center gap-5 mt-4">
                <Slot piece={t} frame={{ w: 138, h: 184 }} onPrev={() => cycle(setTop, TOPS.length, -1)} onNext={() => cycle(setTop, TOPS.length, 1)} />
                <Slot piece={b} frame={{ w: 138, h: 184 }} onPrev={() => cycle(setBottom, BOTTOMS.length, -1)} onNext={() => cycle(setBottom, BOTTOMS.length, 1)} />
              </div>
            </div>

            <div className="hidden md:block" style={{ width: 1, background: 'var(--hairline)' }} />
            <div className="block md:hidden" style={{ height: 1, background: 'var(--hairline)', margin: '24px 0' }} />

            {/* DRESS */}
            <div className="flex-1 flex flex-col items-center px-2" style={{ minWidth: 0 }}>
              <div className="serif italic" style={{ fontSize: 20, color: 'var(--ink)' }}>Or a dress</div>
              <div className="eyebrow mt-1">One &amp; done</div>
              <div className="flex-1 flex items-center justify-center mt-4">
                <Slot piece={DRESSES[dress]} frame={{ w: 182, h: 392 }} onPrev={() => cycle(setDress, DRESSES.length, -1)} onNext={() => cycle(setDress, DRESSES.length, 1)} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
