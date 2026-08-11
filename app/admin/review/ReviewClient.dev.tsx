'use client';
import { useEffect, useState } from 'react';
import { GARMENT_VALUES, GARMENT_LABELS } from '@/lib/tag';
import type { Garment } from '@/lib/types';

type ReviewEntry = {
  id: string; title: string; url: string; why: string;
  titleGuess?: Garment; typeGuess?: Garment;
};

export default function ReviewClient() {
  const [items, setItems] = useState<ReviewEntry[]>([]);
  const [overrides, setOverrides] = useState<Record<string, Garment>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/garment-review/list')
      .then((r) => r.json())
      .then((d) => { setItems(d.items || []); setOverrides(d.overrides || {}); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function setGarment(id: string, garment: Garment) {
    setOverrides((prev) => ({ ...prev, [id]: garment }));
    await fetch('/api/admin/garment-review', {
      method: 'POST', body: JSON.stringify({ id, garment }),
    });
  }

  if (loading) return <main className="p-6">Loading review queue…</main>;
  const pending = items.filter((it) => !overrides[it.id]);
  if (items.length === 0) return <main className="p-6">Nothing in the review queue.</main>;

  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold mb-1">Garment review — {pending.length} pending / {items.length} total</h1>
      <p className="mb-4 text-sm text-gray-500">Held back from publish until a garment is set here.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map((it) => (
          <div key={it.id} className={`border rounded p-3 ${overrides[it.id] ? 'opacity-40' : ''}`}>
            <div className="text-xs text-gray-500">{it.why}</div>
            <a href={it.url} target="_blank" rel="noopener noreferrer" className="font-medium underline">{it.title}</a>
            <div className="text-xs text-gray-500 mt-1">
              title guess: {it.titleGuess ?? '—'} · type guess: {it.typeGuess ?? '—'}
            </div>
            <select
              className="mt-2 border rounded px-2 py-1 text-sm"
              value={overrides[it.id] ?? ''}
              onChange={(e) => setGarment(it.id, e.target.value as Garment)}
            >
              <option value="" disabled>Set garment…</option>
              {GARMENT_VALUES.map((g) => (
                <option key={g} value={g}>{GARMENT_LABELS[g]}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </main>
  );
}
