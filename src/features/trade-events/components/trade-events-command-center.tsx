import Link from 'next/link';
import { Plus } from 'lucide-react';
import { QueryIssuesAlert } from '@/components/ui/query-issues-alert';
import { WorkspaceState } from '@/components/ui/workspace-state';
import type { TradeEventsCommandCenterData } from '@/lib/trade-events/query';
import { buildTradeEventsViewModel } from '@/lib/trade-events/view-model';
import { TradeEventsCurrentWorkspace } from './trade-events-current-workspace';
import { TradeEventsEventList } from './trade-events-event-list';
import { TradeEventsMobileWorkspace } from './trade-events-mobile-workspace';

type Props = { data: TradeEventsCommandCenterData; isTradeShowTrial: boolean; notice?: string; lockedModule?: string; view?: string };

export function TradeEventsCommandCenter({ data, isTradeShowTrial, notice, lockedModule, view }: Props) {
  const model = buildTradeEventsViewModel(data, isTradeShowTrial);
  const activeView: 'my' | 'discover' | 'past' = view === 'discover' ? 'discover' : view === 'past' ? 'past' : 'my';
  return <div className="space-y-4 pb-28 text-slate-950 lg:pb-8">
    <QueryIssuesAlert issues={data.queryIssues} />
    {notice === 'capture-converted' ? <WorkspaceState eyebrow={isTradeShowTrial ? 'Event entry saved' : 'Lead saved'} title="Booth capture is ready for follow-up" description="Keep capturing, then review the event work from the CRM." primaryActionHref={model.captureHref} primaryActionLabel="Capture another" secondaryActionHref="/leads?view=trade-event" secondaryActionLabel="Review leads" /> : null}
    {lockedModule && isTradeShowTrial ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-900">This area is preview-only during the Trade Show Trial. Capture and follow-up tools remain active.</div> : null}
    {model.duplicateCount > 0 ? <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-950"><b>{model.duplicateCount} exact duplicate event {model.duplicateCount === 1 ? 'record is' : 'records are'} grouped safely.</b> Existing event history remains intact.</div> : null}
    {model.possibleCount > 0 ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"><b>{model.possibleCount} possible event match {model.possibleCount === 1 ? 'needs' : 'need'} review.</b> Ambiguous events are not silently combined.</div> : null}
    <header className="flex items-end justify-between gap-3"><div><p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">Trade Command Center</p><h1 className="text-3xl font-black tracking-[-0.04em]">Trade events</h1><p className="mt-1 text-sm font-medium text-slate-500">Desktop for planning and follow-up. Mobile for fast booth capture.</p></div><Link href="/admin/trade-events" className="hidden min-h-11 items-center rounded-xl bg-slate-950 px-4 text-sm font-black text-white sm:inline-flex"><Plus className="mr-2 h-4 w-4" />Add event</Link></header>
    <nav className="flex gap-1 rounded-2xl border border-slate-200 bg-white p-1">{[['my','My Events'],['discover','Discover Events'],['past','Past Events']].map(([key,label]) => <Link key={key} href={key === 'my' ? '/trade-events' : `/trade-events?view=${key}`} className={`flex-1 rounded-xl px-3 py-2 text-center text-sm font-black ${activeView === key ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>{label}</Link>)}</nav>
    {activeView === 'discover' ? <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-700">Setu Guru discovery</p><h2 className="mt-2 text-2xl font-black">Verified recommendations only</h2><p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-slate-600">Future recommendations will use organization profile, products, target markets and verified event outcomes. Expired or unrelated hard-coded suggestions are not used.</p><div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm font-semibold text-slate-600">No verified organization-specific recommendations are available yet. Setu Flow will leave this space empty instead of inventing a recommendation.</div></section> : <><TradeEventsMobileWorkspace model={model} />{activeView === 'my' ? <TradeEventsCurrentWorkspace model={model} /> : null}<TradeEventsEventList model={model} view={activeView} entries={data.entries} leads={data.leads} /></>}
  </div>;
}
