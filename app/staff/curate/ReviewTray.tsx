'use client';
import { useEffect, useState } from 'react';
import { Copy, Check } from '@phosphor-icons/react';
import { laneLabel, subtypeLabel } from '@/components/StaffEditControl';
import type { ForcedLane, LayeringSubtype, OuterwearSubtype } from '@/lib/types';

type ListResponse = {
  deletes: { id: string; title: string; url: string; image: string }[];
  moves: { id: string; title: string; url: string; image: string; from: string; to: string }[];
  laneMoves: { id: string; title: string; url: string; image: string; to: ForcedLane; subtype?: LayeringSubtype | OuterwearSubtype }[];
};

export function ReviewTray({ refreshToken = 0 }: { refreshToken?: number }) {
  const [data, setData] = useState<ListResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  // refreshToken bumps whenever RecentlyAdded records a decision (see
  // CurateConsole) — this tray otherwise only fetched once on mount and had
  // no way to learn about a cut made in the sibling component above it.
  useEffect(() => {
    fetch('/api/staff/live-edit/list')
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ deletes: [], moves: [], laneMoves: [] }));
  }, [refreshToken]);

  async function copy() {
    if (!data) return;
    const text = JSON.stringify(data, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setCopyError(false);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError(true);
    }
  }

  if (!data) return <p className="text-sm" style={{ color: 'var(--muted)' }}>Loading…</p>;
  const total = data.deletes.length + data.moves.length + data.laneMoves.length;
  const text = JSON.stringify(data, null, 2);

  return (
    <section>
      <h2 className="serif text-xl mb-1" style={{ color: 'var(--ink)' }}>
        Live catalogue edits — {total} pending
      </h2>
      <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
        Everything moved or deleted from the real site this session. Copy
        this and paste it to Claude to merge into the tracked files.
      </p>
      <button
        onClick={copy}
        disabled={total === 0}
        className="btn-pill mb-4"
        style={{ background: 'var(--aubergine)', color: 'var(--parchment)' }}
      >
        {copied ? <Check size={16} weight="bold" /> : <Copy size={16} weight="bold" />}
        {' '}{copied ? 'Copied' : 'Copy for Claude'}
      </button>
      {copyError && (
        <div className="mb-4">
          <p className="text-sm mb-2" style={{ color: '#b3261e' }}>
            Couldn&apos;t copy automatically — select and copy this instead:
          </p>
          <textarea readOnly value={text} className="w-full h-40 text-xs p-2 border" style={{ borderColor: 'var(--hairline)' }} />
        </div>
      )}
      {data.moves.length > 0 && (
        <>
          <h3 className="eyebrow mb-2">Moves ({data.moves.length})</h3>
          <ul className="mb-6 text-sm">
            {data.moves.map((m) => (
              <li key={m.id} className="mb-1">
                {m.title} — {m.from} → {m.to}
              </li>
            ))}
          </ul>
        </>
      )}
      {data.laneMoves.length > 0 && (
        <>
          <h3 className="eyebrow mb-2">Lane moves ({data.laneMoves.length})</h3>
          <ul className="mb-6 text-sm">
            {data.laneMoves.map((m) => (
              <li key={m.id} className="mb-1">
                {m.title} — {laneLabel(m.to)}
                {m.subtype && ` — ${subtypeLabel(m.to, m.subtype)}`}
              </li>
            ))}
          </ul>
        </>
      )}
      {data.deletes.length > 0 && (
        <>
          <h3 className="eyebrow mb-2">Deletes ({data.deletes.length})</h3>
          <ul className="text-sm">
            {data.deletes.map((d) => (
              <li key={d.id} className="mb-1">{d.title}</li>
            ))}
          </ul>
        </>
      )}
      {total === 0 && <p className="text-sm" style={{ color: 'var(--muted)' }}>Nothing marked yet — go find something on the real site.</p>}
    </section>
  );
}
