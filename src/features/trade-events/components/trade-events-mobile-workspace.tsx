import Link from 'next/link';
import { Handshake, Mic2, Plus, ScanLine, UserPlus } from 'lucide-react';
import { EventModeBanner } from './event-mode-banner';
import { getEventTimingLabel } from '@/lib/trade-events/command-center';
import { buildTradeEventsViewModel } from '@/lib/trade-events/view-model';

type Model = ReturnType<typeof buildTradeEventsViewModel>;

function withLeadMode(href: string, leadType: 'buyer' | 'supplier') {
  const join = href.includes('?') ? '&' : '?';
  return `${href}${join}leadType=${leadType}&mode=${leadType === 'supplier' ? 'suppliers' : 'buyers'}`;
}

export function TradeEventsMobileWorkspace({ model }: { model: Model }) {
  const buyerHref = withLeadMode(model.captureHref, 'buyer');
  const supplierHref = withLeadMode(model.captureHref, 'supplier');
  return <div className="space-y-3 lg:hidden">
    <EventModeBanner eventName={String(model.current?.name ?? 'No active event')} statusLabel={model.status === 'live' ? 'Live' : model.status === 'upcoming' ? 'Upcoming' : model.status === 'completed' ? 'Completed' : 'Dates needed'} timingLabel={model.current ? getEventTimingLabel(model.current) : 'Add event'} captureHref={model.captureHref} />
    <section className="grid grid-cols-2 gap-2">
      <Link href={model.scanHref} className="flex min-h-20 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm font-black"><ScanLine className="mb-1 h-5 w-5 text-blue-600" />Scan card / badge</Link>
      <Link href={model.dictateHref} className="flex min-h-20 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm font-black"><Mic2 className="mb-1 h-5 w-5 text-blue-600" />Dictate note</Link>
      <Link href={buyerHref} className="flex min-h-16 items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm font-black"><UserPlus className="mr-2 h-4 w-4 text-blue-600" />Buyer</Link>
      <Link href={supplierHref} className="flex min-h-16 items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm font-black"><Handshake className="mr-2 h-4 w-4 text-blue-600" />Supplier</Link>
    </section>
    <Link href={model.captureHref} className="sticky bottom-3 z-30 flex min-h-14 items-center justify-center rounded-2xl bg-blue-600 text-sm font-black text-white shadow-xl"><Plus className="mr-2 h-5 w-5" />Capture next lead</Link>
  </div>;
}
