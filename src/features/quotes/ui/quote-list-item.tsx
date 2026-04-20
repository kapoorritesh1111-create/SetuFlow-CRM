import Link from 'next/link';
import type { QuoteWorkspaceListItem } from '@/features/quotes/types/workspace';

function labelizeStatus(value: string) {
  return value.replaceAll('_', ' ');
}

export function QuoteListItem({ item, selected }: { item: QuoteWorkspaceListItem; selected: boolean }) {
  return (
    <Link
      href={`/quotes?quoteId=${item.id}`}
      className={`block rounded-2xl border px-4 py-3 transition ${selected ? 'border-brand-500 bg-brand-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{item.companyName}</p>
          <p className="mt-1 text-xs text-slate-500">{item.contactName ?? 'No contact'} • {item.quoteNumber ?? item.id.slice(0, 8)}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-700">{labelizeStatus(item.status)}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
        <span>{item.totalVersions} versions</span>
        <span>{item.negotiationCount} negotiations</span>
        <span>{item.historyCount} history items</span>
        {item.hasAcceptedContract ? <span className="font-semibold text-brand-700">Order handoff visible</span> : null}
      </div>
      {item.lastNegotiationMessage ? <p className="mt-3 line-clamp-2 text-sm text-slate-600">{item.lastNegotiationMessage}</p> : null}
    </Link>
  );
}
