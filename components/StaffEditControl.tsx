'use client';
import { useState } from 'react';
import { Menu } from '@base-ui-components/react/menu';
import { PencilSimple, CaretRight, Trash } from '@phosphor-icons/react';
import { GARMENT_LABELS, GARMENT_VALUES } from '@/lib/tag';
import { LAYERING_SUBTYPE_LABELS, OUTERWEAR_SUBTYPE_LABELS } from '@/lib/specialty';
import { CATEGORY_LANES } from '@/lib/lanes';
import type { Garment, ForcedLane, LayeringSubtype, OuterwearSubtype } from '@/lib/types';

const MOVABLE = GARMENT_VALUES.filter((g) => g !== 'other') as Garment[];
const LAYERING_SUBTYPES = Object.keys(LAYERING_SUBTYPE_LABELS) as LayeringSubtype[];
const OUTERWEAR_SUBTYPES = Object.keys(OUTERWEAR_SUBTYPE_LABELS) as OuterwearSubtype[];
// ForcedLane still carries the single internal value 'outerwear' (see
// lib/specialty.ts's isOuterwear comment) even though it now displays across
// three nav-facing lanes (blazers-vests/cardigans-sweaters/jackets-coats,
// lib/lanes.ts) — none of which is a slug named 'outerwear' any more, so the
// CATEGORY_LANES lookup below would silently fall back to the raw string.
// Named explicitly here instead, since staff picking this destination are
// choosing the FAMILY, then a subtype (below) that determines which of the
// three the item actually lands on.
export const laneLabel = (lane: ForcedLane) =>
  lane === 'outerwear' ? 'Outerwear' : (CATEGORY_LANES.find((l) => l.slug === lane)?.title ?? lane);

// Each lane's subtype lives in its own label map — a layering subtype and an
// outerwear subtype are never valid for the other lane (see the move-lane
// API route), so look the label up in the map matching the move's own lane.
export function subtypeLabel(lane: ForcedLane, subtype: LayeringSubtype | OuterwearSubtype): string | undefined {
  if (lane === 'layering-basics') return LAYERING_SUBTYPE_LABELS[subtype as LayeringSubtype];
  if (lane === 'outerwear') return OUTERWEAR_SUBTYPE_LABELS[subtype as OuterwearSubtype];
  return undefined;
}

// The 8 movable garments map 1:1 onto a category lane slug — everywhere
// except 'other' (never a move destination) every lane in lib/lanes.ts
// whose match is `p.garment === X` (plus modest-swimwear, since
// `garment === 'swim'` already satisfies isSwim()). Used so the picker
// shows the same recognizable names as the site's own nav ("Modest
// Swimwear", "Hijabs & Scarves") instead of the bare garment label.
const GARMENT_LANE_SLUG: Partial<Record<Garment, string>> = {
  dress: 'modest-dresses', abaya: 'modest-abayas', hijab: 'modest-hijabs',
  skirt: 'modest-skirts', top: 'modest-tops', trousers: 'modest-trousers',
  set: 'modest-sets', swim: 'modest-swimwear',
};
export const garmentMoveLabel = (g: Garment): string => {
  const slug = GARMENT_LANE_SLUG[g];
  const lane = slug && CATEGORY_LANES.find((l) => l.slug === slug);
  return lane ? lane.title : GARMENT_LABELS[g];
};

export type StaffEditResult =
  | { type: 'move'; garment: Garment }
  | { type: 'moveLane'; lane: ForcedLane; subtype?: LayeringSubtype | OuterwearSubtype }
  | { type: 'delete' };

export function StaffEditControl({
  id,
  garment,
  onChanged,
}: {
  id: string;
  garment: Garment;
  onChanged: (r: StaffEditResult) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function move(to: Garment) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/staff/live-edit/move', {
        method: 'POST',
        body: JSON.stringify({ id, garment: to }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      onChanged({ type: 'move', garment: to });
    } catch {
      setError('Move failed — try again.');
    } finally {
      setBusy(false);
    }
  }

  async function moveLane(lane: ForcedLane, subtype?: LayeringSubtype | OuterwearSubtype) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/staff/live-edit/move-lane', {
        method: 'POST',
        body: JSON.stringify({ id, lane, subtype }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      onChanged({ type: 'moveLane', lane, subtype });
    } catch {
      setError('Move failed — try again.');
    } finally {
      setBusy(false);
    }
  }

  async function del() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/staff/curate/decide', {
        method: 'POST',
        body: JSON.stringify({ id, decision: 'cut' }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      onChanged({ type: 'delete' });
    } catch {
      setError('Delete failed — try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Menu.Root>
      <Menu.Trigger
        disabled={busy}
        aria-label="Edit this product (staff)"
        className="absolute bottom-2 left-2 z-30 w-8 h-8 rounded-full flex items-center justify-center"
        style={{ background: 'rgba(255,255,255,0.92)', color: 'var(--aubergine)', lineHeight: 1 }}
      >
        <PencilSimple size={16} weight="bold" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={6} align="start" className="z-50">
          <Menu.Popup
            className="rounded-xl border min-w-[180px] p-2"
            style={{ background: '#fff', borderColor: 'var(--hairline)', boxShadow: '0 8px 30px rgba(43,38,34,0.14)' }}
          >
            <Menu.SubmenuRoot>
              <Menu.SubmenuTrigger className="menu-row flex items-center justify-between">
                Move to
                <CaretRight size={12} weight="bold" />
              </Menu.SubmenuTrigger>
              <Menu.Portal>
                <Menu.Positioner sideOffset={4} align="start" className="z-50">
                  <Menu.Popup
                    className="rounded-xl border min-w-[160px] p-2"
                    style={{ background: '#fff', borderColor: 'var(--hairline)', boxShadow: '0 8px 30px rgba(43,38,34,0.14)' }}
                  >
                    <Menu.RadioGroup value={garment} onValueChange={(v) => move(v as Garment)}>
                      {MOVABLE.map((g) => (
                        <Menu.RadioItem key={g} value={g} closeOnClick className="menu-row" data-active={garment === g}>
                          {garmentMoveLabel(g)}
                        </Menu.RadioItem>
                      ))}
                    </Menu.RadioGroup>
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.SubmenuRoot>
            {/* The two specialty lanes garment can't reach — isActivewear/
                isLayering classify from title text, not `garment`, so they
                need the dedicated forcedLane override (lib/specialty.ts). */}
            <Menu.Item onClick={() => moveLane('modest-activewear')} closeOnClick className="menu-row">
              Move to {laneLabel('modest-activewear')}
            </Menu.Item>
            <Menu.SubmenuRoot>
              <Menu.SubmenuTrigger className="menu-row flex items-center justify-between">
                {laneLabel('layering-basics')}
                <CaretRight size={12} weight="bold" />
              </Menu.SubmenuTrigger>
              <Menu.Portal>
                <Menu.Positioner sideOffset={4} align="start" className="z-50">
                  <Menu.Popup
                    className="rounded-xl border min-w-[190px] p-2"
                    style={{ background: '#fff', borderColor: 'var(--hairline)', boxShadow: '0 8px 30px rgba(43,38,34,0.14)' }}
                  >
                    {LAYERING_SUBTYPES.map((s) => (
                      <Menu.Item
                        key={s}
                        onClick={() => moveLane('layering-basics', s)}
                        closeOnClick
                        className="menu-row"
                      >
                        {LAYERING_SUBTYPE_LABELS[s]}
                      </Menu.Item>
                    ))}
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.SubmenuRoot>
            <Menu.SubmenuRoot>
              <Menu.SubmenuTrigger className="menu-row flex items-center justify-between">
                {laneLabel('outerwear')}
                <CaretRight size={12} weight="bold" />
              </Menu.SubmenuTrigger>
              <Menu.Portal>
                <Menu.Positioner sideOffset={4} align="start" className="z-50">
                  <Menu.Popup
                    className="rounded-xl border min-w-[190px] p-2"
                    style={{ background: '#fff', borderColor: 'var(--hairline)', boxShadow: '0 8px 30px rgba(43,38,34,0.14)' }}
                  >
                    {OUTERWEAR_SUBTYPES.map((s) => (
                      <Menu.Item
                        key={s}
                        onClick={() => moveLane('outerwear', s)}
                        closeOnClick
                        className="menu-row"
                      >
                        {OUTERWEAR_SUBTYPE_LABELS[s]}
                      </Menu.Item>
                    ))}
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.SubmenuRoot>
            <Menu.Item
              onClick={del}
              closeOnClick
              className="menu-row"
              style={{ color: '#b3261e' }}
            >
              <Trash size={14} weight="bold" style={{ marginRight: 6, verticalAlign: -2 }} />
              Delete
            </Menu.Item>
            {error && <div style={{ padding: '4px 8px', fontSize: 12, color: '#b3261e' }}>{error}</div>}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
