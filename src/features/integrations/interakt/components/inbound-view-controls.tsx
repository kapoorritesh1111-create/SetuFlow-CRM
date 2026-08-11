'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';

export const INBOUND_COLUMN_OPTIONS = [
  ['contact', 'Contact'],
  ['phone', 'Phone'],
  ['company', 'Company'],
  ['requirement', 'Requirement'],
  ['quantity', 'Quantity'],
  ['source', 'Source'],
  ['owner', 'Owner'],
  ['guru', 'Setu Guru'],
  ['score', 'Score'],
  ['last_activity', 'Last activity'],
  ['needs_reply', 'Needs reply'],
] as const;

const DEFAULT_COLUMNS = ['contact', 'phone', 'company', 'requirement', 'source', 'guru', 'score', 'last_activity'];

export function InboundViewControls({ view = 'review', columns }: { view?: string; columns?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initial = useMemo(() => {
    const requested = String(columns ?? '').split(',').filter(Boolean);
    return requested.length ? requested : DEFAULT_COLUMNS;
  }, [columns]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(initial);

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value); else params.delete(key);
    if (key === 'view') params.delete('review');
    router.push(`/leads/inbound?${params.toString()}`);
  }

  function toggleColumn(id: string) {
    const next = selectedColumns.includes(id)
      ? selectedColumns.filter((item) => item !== id)
      : [...selectedColumns, id];
    if (next.length === 0) return;
    setSelectedColumns(next);
    updateParam('columns', next.join(','));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
        <button type="button" onClick={() => updateParam('view', 'review')} className={`rounded-lg px-3 py-1.5 text-[10px] font-black transition ${view !== 'list' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>▦ Review</button>
        <button type="button" onClick={() => updateParam('view', 'list')} className={`rounded-lg px-3 py-1.5 text-[10px] font-black transition ${view === 'list' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>☷ List</button>
      </div>

      {view === 'list' ? (
        <details className="relative">
          <summary className="cursor-pointer list-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black text-slate-700 shadow-sm">▥ Columns</summary>
          <div className="absolute right-0 z-30 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
            <div className="mb-2 flex items-center justify-between"><p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">Visible columns</p><span className="text-[9px] text-slate-400">{selectedColumns.length}</span></div>
            <div className="space-y-1">
              {INBOUND_COLUMN_OPTIONS.map(([id, label]) => (
                <label key={id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-50">
                  <input type="checkbox" checked={selectedColumns.includes(id)} onChange={() => toggleColumn(id)} className="h-3.5 w-3.5 rounded border-slate-300" />
                  {label}
                </label>
              ))}
            </div>
          </div>
        </details>
      ) : null}
    </div>
  );
}
