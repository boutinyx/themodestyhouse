'use client';
import { useEffect, useState } from 'react';
import { Check, X } from '@phosphor-icons/react';
import type { Product } from '@/lib/types';

type ListResponse = {
  items: Product[];
  decisions: Record<string, 'keep' | 'cut'>;
  cutCount: number;
  mostRecent: string | null;
};

/**
 * The first thing Tina sees on /staff/curate: every product from the most
 * recent ingest (by `firstSeen`, not a hardcoded brand list — see the API
 * route), with Keep/Cut right on the card. Cuts write through
 * /api/staff/curate/decide, the same endpoint the on-page pencil-icon editor
 * uses (components/StaffEditControl.tsx), so they take effect on the live
 * site immediately and show up in the review tray below like any other cut.
 */
export function RecentlyAdded({ onDecision }: { onDecision?: () => void }) {
  const [data, setData] = useState<ListResponse | null>(null);
  const [pending, setPending] = useState<Record<string, 'keep' | 'cut'>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/staff/curate/list?scope=recent')
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ items: [], decisions: {}, cutCount: 0, mostRecent: null }));
  }, []);

  async function decide(id: string, decision: 'keep' | 'cut') {
    setPending((p) => ({ ...p, [id]: decision }));
    setError(null);
    try {
      const res = await fetch('/api/staff/curate/decide', {
        method: 'POST',
        body: JSON.stringify({ id, decision }),
      });
      if (!res.ok) throw new Error(String(res.status));
      onDecision?.();
    } catch {
      setError('That decision didn’t save — try again.');
      setPending((p) => {
        const next = { ...p };
        delete next[id];
        return next;
      });
    }
  }

  if (!data) {
    return <p className="text-sm mb-8" style={{ color: 'var(--muted)' }}>Loading recently added…</p>;
  }

  const { items, decisions, mostRecent } = data;

  return (
    <section className="mb-10">
      <h1 className="serif text-xl mb-1" style={{ color: 'var(--ink)' }}>
        Recently added — {items.length}{mostRecent ? ` (${mostRecent})` : ''}
      </h1>
      <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
        Every product first seen on the most recent ingest. Keep or cut —
        a cut hides the item from the live site right away and appears
        below in the pending tray.
      </p>
      {error && <p className="text-sm mb-3" style={{ color: '#b3261e' }}>{error}</p>}
      {items.length === 0 && (
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          Nothing new since the last refresh.
        </p>
      )}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
        {items.map((p) => {
          const decision = pending[p.id] ?? decisions[p.id] ?? 'keep';
          return (
            <div
              key={p.id}
              className="relative border rounded-lg overflow-hidden"
              style={{ borderColor: 'var(--hairline)', opacity: decision === 'cut' ? 0.45 : 1 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.image} alt="" className="w-full aspect-[3/4] object-cover" loading="lazy" />
              <div className="p-2">
                <div className="text-[11px] mb-0.5" style={{ color: 'var(--muted)' }}>{p.brandName}</div>
                <div className="text-xs mb-2" style={{ color: 'var(--ink)' }}>{p.title}</div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => decide(p.id, 'keep')}
                    disabled={decision === 'keep'}
                    aria-pressed={decision === 'keep'}
                    className="chip inline-flex items-center gap-1 !text-[10px] !py-1"
                    data-active={decision === 'keep'}
                  >
                    <Check size={11} weight="bold" /> Keep
                  </button>
                  <button
                    type="button"
                    onClick={() => decide(p.id, 'cut')}
                    disabled={decision === 'cut'}
                    aria-pressed={decision === 'cut'}
                    className="chip inline-flex items-center gap-1 !text-[10px] !py-1"
                    data-active={decision === 'cut'}
                    style={decision === 'cut' ? { background: '#b3261e', color: '#fff', borderColor: 'transparent' } : undefined}
                  >
                    <X size={11} weight="bold" /> Cut
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
