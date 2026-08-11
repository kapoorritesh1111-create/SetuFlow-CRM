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
  ['last_activity', 'Activity / sync'],
  ['needs_reply', 'Needs reply'],
] as const;

const DEFAULT_COLUMNS = ['contact', 'phone', 'company', 'requirement', 'source', 'guru', 'score', 'last_activity'];

const premiumStyles = `
  main:has(.setu-inbound-controls) { background: linear-gradient(180deg, #f8fbff 0%, #f8fafc 260px, #f8fafc 100%); }
  .setu-inbound-controls { isolation: isolate; }
  .setu-inbound-controls button, .setu-inbound-controls summary { transition: all 160ms ease; }
  .setu-inbound-controls summary:hover { border-color:#bfdbfe; box-shadow:0 5px 16px rgba(15,23,42,.07); }
  main:has(.setu-inbound-controls) table { width:100%; border-spacing:0; font-variant-numeric:tabular-nums; }
  main:has(.setu-inbound-controls) thead { position:sticky; top:0; z-index:8; box-shadow:inset 0 -1px 0 #e2e8f0; }
  main:has(.setu-inbound-controls) thead th { height:46px; background:rgba(248,250,252,.97)!important; backdrop-filter:blur(10px); color:#475569!important; font-size:10px!important; letter-spacing:.08em!important; }
  main:has(.setu-inbound-controls) tbody td { padding-top:14px!important; padding-bottom:14px!important; vertical-align:middle; font-size:11px; color:#334155; }
  main:has(.setu-inbound-controls) tbody tr { background:#fff; transition:background-color 140ms ease, box-shadow 140ms ease; }
  main:has(.setu-inbound-controls) tbody tr:nth-child(even) { background:rgba(248,250,252,.45); }
  main:has(.setu-inbound-controls) tbody tr:hover { background:rgba(239,246,255,.82)!important; box-shadow:inset 3px 0 0 #3b82f6; }
  main:has(.setu-inbound-controls) tbody td:first-child p:first-child { font-size:12px!important; letter-spacing:-.01em; }
  main:has(.setu-inbound-controls) input, main:has(.setu-inbound-controls) select, main:has(.setu-inbound-controls) textarea { transition:border-color 160ms ease,box-shadow 160ms ease,background-color 160ms ease; }
  main:has(.setu-inbound-controls) input:focus, main:has(.setu-inbound-controls) select:focus, main:has(.setu-inbound-controls) textarea:focus { border-color:#93c5fd!important; box-shadow:0 0 0 3px rgba(59,130,246,.10); outline:none; }
  main:has(.setu-inbound-controls) .shadow-sm { box-shadow:0 1px 2px rgba(15,23,42,.04),0 8px 24px rgba(15,23,42,.035); }
  main:has(.setu-inbound-controls) .rounded-2xl.border.border-slate-200.bg-white { border-color:rgba(203,213,225,.82); }
  main:has(.setu-inbound-controls) .overflow-x-auto { scrollbar-width:thin; scrollbar-color:#cbd5e1 transparent; }
  main:has(.setu-inbound-controls) .overflow-x-auto::-webkit-scrollbar { height:8px; }
  main:has(.setu-inbound-controls) .overflow-x-auto::-webkit-scrollbar-thumb { border-radius:999px; background:#cbd5e1; }
  @media (min-width:1280px) {
    main:has(.setu-inbound-controls) > div { max-width:none!important; width:100%; margin-inline:0!important; }
    #app-content:has(.setu-inbound-controls) > div:last-child { padding-left:clamp(14px,1.1vw,22px)!important; padding-right:clamp(14px,1.1vw,22px)!important; }
  }
  @media (min-width:1600px) {
    main:has(.setu-inbound-controls) tbody td { padding-left:18px!important; padding-right:18px!important; }
    main:has(.setu-inbound-controls) thead th { padding-left:18px!important; padding-right:18px!important; }
  }
`;

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
    <div className="setu-inbound-controls flex flex-wrap items-center gap-2">
      <style dangerouslySetInnerHTML={{ __html: premiumStyles }} />
      <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 shadow-inner">
        <button type="button" onClick={() => updateParam('view', 'review')} className={`rounded-lg px-3 py-1.5 text-[10px] font-black ${view !== 'list' ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200/70' : 'text-slate-500 hover:bg-white/70 hover:text-slate-800'}`}>▦ Review</button>
        <button type="button" onClick={() => updateParam('view', 'list')} className={`rounded-lg px-3 py-1.5 text-[10px] font-black ${view === 'list' ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200/70' : 'text-slate-500 hover:bg-white/70 hover:text-slate-800'}`}>☷ List</button>
      </div>

      {view === 'list' ? (
        <details className="relative">
          <summary className="cursor-pointer list-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black text-slate-700 shadow-sm">▥ Columns <span className="ml-1 text-slate-400">{selectedColumns.length}</span></summary>
          <div className="absolute right-0 z-30 mt-2 w-60 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3"><p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">Visible columns</p><p className="mt-1 text-[9px] text-slate-400">Choose what matters to your sales team.</p></div>
            <div className="space-y-1 p-2">
              {INBOUND_COLUMN_OPTIONS.map(([id, label]) => (
                <label key={id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-blue-50">
                  <input type="checkbox" checked={selectedColumns.includes(id)} onChange={() => toggleColumn(id)} className="h-3.5 w-3.5 rounded border-slate-300 accent-blue-600" />
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
