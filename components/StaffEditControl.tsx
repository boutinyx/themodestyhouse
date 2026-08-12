'use client';
import { useState } from 'react';
import { Menu } from '@base-ui-components/react/menu';
import { PencilSimple, CaretRight, Trash } from '@phosphor-icons/react';
import { GARMENT_LABELS, GARMENT_VALUES } from '@/lib/tag';
import type { Garment } from '@/lib/types';

const MOVABLE = GARMENT_VALUES.filter((g) => g !== 'other') as Garment[];

export type StaffEditResult = { type: 'move'; garment: Garment } | { type: 'delete' };

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
        className="absolute top-2 left-2 z-30 w-8 h-8 rounded-full flex items-center justify-center"
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
                          {GARMENT_LABELS[g]}
                        </Menu.RadioItem>
                      ))}
                    </Menu.RadioGroup>
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
