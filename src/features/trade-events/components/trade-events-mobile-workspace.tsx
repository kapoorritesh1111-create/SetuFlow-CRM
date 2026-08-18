import { Handshake, Mic2, Plus, ScanLine, UserPlus } from 'lucide-react';
import { EventModeBanner } from './event-mode-banner';
import { OfflineAwareCaptureLink } from './offline-aware-capture-link';
import { getEventTimingLabel } from '@/lib/trade-events/command-center';
import { buildTradeEventsViewModel } from '@/lib/trade-events/view-model';

type Model = ReturnType<typeof buildTradeEventsViewModel>;

function withLeadMode(href: string, leadType: 'buyer' | 'supplier') {
  const join = href.includes('?') ? '&' : '?';
  return `${href}${join}leadType=${leadType}&mode=${leadType === 'supplier' ? 'suppliers' : 'buyers'}`;
}

function offlineHref(eventId: string | null | undefined, leadType: 'buyer' | 'supplier' = 'buyer') {
  if (!eventId) return '/trade-events';
  const params = new URLSearchParams({ eventId, leadType });
  return `/trade-events/offline-capture?${params.toString()}`;
}

export function TradeEventsMobileWorkspace({ model }: { model: Model }) {
  const buyerHref = withLeadMode(model.captureHref, 'buyer');
  const supplierHref = withLeadMode(model.captureHref, 'supplier');
  const currentEventId = model.current?.id ? String(model.current.id) : null;
  const defaultOfflineHref = offlineHref(currentEventId);
  return <div className="space-y-3 lg:hidden">
    <EventModeBanner eventName={String(model.current?.name ?? 'No active event')} statusLabel={model.status === 'live' ? 'Live' : model.status === 'upcoming' ? 'Upcoming' : model.status === 'completed' ? 'Completed' : 'Dates needed'} timingLabel={model.current ? getEventTimingLabel(model.current) : 'Add event'} captureHref={model.captureHref} offlineCaptureHref={defaultOfflineHref} />
    <section className="grid grid-cols-2 gap-2">
      <OfflineAwareCaptureLink href={model.scanHref} offlineHref={defaultOfflineHref} className="flex min-h-20 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm font-black"><ScanLine className="mb-1 h-5 w-5 text-blue-600" />Scan card / badge</OfflineAwareCaptureLink>
      <OfflineAwareCaptureLink href={model.dictateHref} offlineHref={defaultOfflineHref} className="flex min-h-20 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm font-black"><Mic2 className="mb-1 h-5 w-5 text-blue-600" />Dictate note</OfflineAwareCaptureLink>
      <OfflineAwareCaptureLink href={buyerHref} offlineHref={offlineHref(currentEventId, 'buyer')} className="flex min-h-16 items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm font-black"><UserPlus className="mr-2 h-4 w-4 text-blue-600" />Buyer</OfflineAwareCaptureLink>
      <OfflineAwareCaptureLink href={supplierHref} offlineHref={offlineHref(currentEventId, 'supplier')} className="flex min-h-16 items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm font-black"><Handshake className="mr-2 h-4 w-4 text-blue-600" />Supplier</OfflineAwareCaptureLink>
    </section>
    <OfflineAwareCaptureLink href={model.captureHref} offlineHref={defaultOfflineHref} className="sticky bottom-3 z-30 flex min-h-14 items-center justify-center rounded-2xl bg-blue-600 text-sm font-black text-white shadow-xl"><Plus className="mr-2 h-5 w-5" />Capture next lead</OfflineAwareCaptureLink>
  </div>;
}
