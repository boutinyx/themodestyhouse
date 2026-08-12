'use client';
import { useEffect, useState } from 'react';
import { Copy, Check } from '@phosphor-icons/react';
import { laneLabel } from '@/components/StaffEditControl';
import { LAYERING_SUBTYPE_LABELS } from '@/lib/specialty';
import type { ForcedLane, LayeringSubtype } from '@/lib/types';

type ListResponse = {
  deletes: { id: string; title: string; url: string; image: string }[];
  moves: { id: string; title: string; url: string; image: string; from: string; to: string }[];
  laneMoves: { id: string; title: string; url: string; image: string; to: ForcedLane; subtype?: LayeringSubtype }[];
};

export function ReviewTray() {
  const [data, setData] = useState<ListResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  useEffect(() => {
    fetch('/api/staff/live-edit/list')
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ deletes: [], moves: [], laneMoves: [] }));
  }, []);

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

  if (!data) return <main className="p-6">Loading…</main>;
  const total = data.deletes.length + data.moves.length + data.laneMoves.length;
  const text = JSON.stringify(data, null, 2);

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <h1 className="serif text-xl mb-1" style={{ color: 'var(--ink)' }}>
        Live catalogue edits — {total} pending
      </h1>
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
          <h2 className="eyebrow mb-2">Moves ({data.moves.length})</h2>
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
          <h2 className="eyebrow mb-2">Lane moves ({data.laneMoves.length})</h2>
          <ul className="mb-6 text-sm">
            {data.laneMoves.map((m) => (
              <li key={m.id} className="mb-1">
                {m.title} — {laneLabel(m.to)}
                {m.subtype && ` — ${LAYERING_SUBTYPE_LABELS[m.subtype]}`}
              </li>
            ))}
          </ul>
        </>
      )}
      {data.deletes.length > 0 && (
        <>
          <h2 className="eyebrow mb-2">Deletes ({data.deletes.length})</h2>
          <ul className="text-sm">
            {data.deletes.map((d) => (
              <li key={d.id} className="mb-1">{d.title}</li>
            ))}
          </ul>
        </>
      )}
      {total === 0 && <p className="text-sm" style={{ color: 'var(--muted)' }}>Nothing marked yet — go find something on the real site.</p>}
    </main>
  );
}
