'use client';
import { useState, useCallback } from 'react';
import { StaffEditControl, type StaffEditResult, laneLabel, garmentMoveLabel, subtypeLabel } from '@/components/StaffEditControl';
import { currentCategoryLabel } from '@/lib/lanes';
import type { Product } from '@/lib/types';

type ListResponse = {
  items: Product[];
  decisions: Record<string, 'keep' | 'cut'>;
  cutCount: number;
};

/**
 * Every CURRENTLY PUBLISHED product for one brand, not just today's
 * arrivals (RecentlyAdded, above, only ever shows same-day rows) — for
 * reviewing a brand wholesale after a data-pipeline change, e.g. Touché
 * Privé's dual-store-only policy (docs/log/2026-08-15-touche-prive-dual-only-policy.md).
 *
 * Shows the SAME category a shopper would see it under right now
 * (lib/lanes.ts::currentCategoryLabel — the real lane-matching logic, not a
 * re-derived guess) and the SAME pencil-icon editor (StaffEditControl) the
 * live site's cards already use, so correcting a category here behaves
 * identically to correcting it while browsing normally.
 */
export function BrandReview({ onDecision }: { onDecision?: () => void }) {
  const [brandInput, setBrandInput] = useState('touche-prive');
  const [activeBrand, setActiveBrand] = useState<string | null>(null);
  const [data, setData] = useState<ListResponse | null>(null);
  const [staffState, setStaffState] = useState<Record<string, StaffEditResult>>({});

  const load = useCallback((brand: string) => {
    if (!brand) return;
    setActiveBrand(brand);
    setData(null);
    setStaffState({});
    fetch(`/api/staff/curate/list?scope=brand&brand=${encodeURIComponent(brand)}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ items: [], decisions: {}, cutCount: 0 }));
  }, []);

  function onChanged(id: string, result: StaffEditResult) {
    setStaffState((s) => ({ ...s, [id]: result }));
    onDecision?.();
  }

  return (
    <section className="mb-10">
      <h2 className="serif text-xl mb-1" style={{ color: 'var(--ink)' }}>Review a brand</h2>
      <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
        Every currently published product for one brand, its current
        category, and the same pencil-icon editor as the live site.
      </p>
      <div className="flex gap-2 mb-5">
        <input
          value={brandInput}
          onChange={(e) => setBrandInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') load(brandInput.trim()); }}
          placeholder="brand slug, e.g. touche-prive"
          className="border rounded px-3 py-2 text-sm"
          style={{ borderColor: 'var(--hairline)' }}
        />
        <button type="button" onClick={() => load(brandInput.trim())} className="btn-pill !py-2 !px-4 text-sm">
          Review
        </button>
      </div>

      {activeBrand && !data && (
        <p className="text-sm" style={{ color: 'var(--muted)' }}>Loading “{activeBrand}”…</p>
      )}

      {data && (
        <>
          <p className="text-sm mb-3" style={{ color: 'var(--muted)' }}>
            {data.items.length} published product{data.items.length === 1 ? '' : 's'} for “{activeBrand}”.
          </p>
          {data.items.length === 0 && (
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              Nothing published for that brand slug right now.
            </p>
          )}
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
            {data.items.map((p) => {
              const state = staffState[p.id];
              const categoryLabel =
                state?.type === 'move' ? garmentMoveLabel(state.garment)
                : state?.type === 'moveLane' ? `${laneLabel(state.lane)}${state.subtype ? ` — ${subtypeLabel(state.lane, state.subtype)}` : ''}`
                : state?.type === 'delete' ? 'Removed'
                : currentCategoryLabel(p);
              return (
                <div
                  key={p.id}
                  className="relative border rounded-lg overflow-hidden"
                  style={{ borderColor: 'var(--hairline)', opacity: state?.type === 'delete' ? 0.4 : 1 }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.image} alt="" className="w-full aspect-[3/4] object-cover" loading="lazy" />
                  <StaffEditControl id={p.id} garment={p.garment} onChanged={(r) => onChanged(p.id, r)} />
                  <div className="p-2">
                    <div className="text-[11px] mb-0.5" style={{ color: 'var(--muted)' }}>{p.brandName}</div>
                    <div className="text-xs mb-1" style={{ color: 'var(--ink)' }}>{p.title}</div>
                    <div
                      className="text-[10px] font-medium uppercase tracking-wide"
                      style={{ color: state?.type === 'delete' ? '#b3261e' : 'var(--aubergine)' }}
                    >
                      {categoryLabel}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
