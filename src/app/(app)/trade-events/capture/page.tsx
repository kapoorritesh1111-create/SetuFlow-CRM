import Link from 'next/link';
import { WorkspaceState } from '@/components/ui/workspace-state';
import { EventQuickCapturePanel } from '@/features/trade-events/components/event-quick-capture-panel';
import { TradeEventUpgradePreview } from '@/features/trade-events/components/trade-event-upgrade-preview';
import { TrialCapturePanel } from '@/features/trade-events/components/trial-capture-panel';
import { getTradeEventCapturePageData } from '@/features/trade-events/server/capture-page-data';
import { requireWorkspace } from '@/lib/workspace/auth';

const first = (value?: string | string[]) => Array.isArray(value) ? value[0] ?? '' : value ?? '';

export default async function TradeEventsCapturePage({ searchParams }: { searchParams?: { eventId?: string | string[]; source?: string | string[]; leadType?: string | string[] } }) {
  const workspace = await requireWorkspace();
  if (!workspace.membership || !workspace.organization) return <WorkspaceState eyebrow="Trade event capture" title="Workspace membership needed" description="No active organization membership could be loaded." primaryActionHref="/dashboard" primaryActionLabel="Go to dashboard" />;

  const requestedEventId = first(searchParams?.eventId).trim();
  const source = first(searchParams?.source).trim();
  const leadType = first(searchParams?.leadType).trim();
  const data = await getTradeEventCapturePageData(workspace.organization.id, requestedEventId);
  const modeLabel = source === 'scan' ? 'Scan card' : source === 'dictate' ? 'Dictate note' : leadType === 'supplier' ? 'Capture supplier' : 'Capture buyer';

  return <div className="space-y-5 pb-6">
    <div className="flex flex-col gap-3 rounded-hero border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div><p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">Trade event capture</p><h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">{data.isTradeShowTrial ? `${modeLabel}: Type, Dictate, or Scan` : 'Fast booth capture'}</h1><p className="mt-1 text-sm font-medium text-slate-600">{data.isTradeShowTrial ? 'Trial entries stay separate from CRM leads until the approved handoff.' : 'Save first, enrich later. Existing contacts and repeat event conversations are linked instead of duplicated.'}</p></div>
      <Link href="/trade-events" className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 px-4 text-sm font-black text-blue-700">Back to event</Link>
    </div>
    {data.eventError ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">Trade events could not be loaded: {data.eventError}</div> : null}
    {data.isTradeShowTrial ? <><TrialCapturePanel events={data.events} reusableTerms={data.reusableTerms} /><TradeEventUpgradePreview /></> : <EventQuickCapturePanel events={data.events} showPackaging={data.showPackaging} />}
  </div>;
}
