import Link from 'next/link';
import { CheckCircle2, Circle } from 'lucide-react';
import { eventReadiness, type CommandCenterEvent } from '@/lib/trade-events/command-center';

export function EventReadinessPanel({ event }: { event: CommandCenterEvent }) {
  const readiness = eventReadiness(event);
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Event readiness</p>
          <h3 className="mt-1 text-lg font-black text-slate-950">{readiness.score}% ready</h3>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">{readiness.complete}/{readiness.total}</span>
      </div>
      <div className="mt-4 space-y-2">
        {readiness.checks.map((item) => (
          <div key={item.key} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
            {item.done ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> : <Circle className="h-4 w-4 shrink-0 text-slate-300" />}
            <span>{item.label}</span>
          </div>
        ))}
      </div>
      {readiness.score < 100 ? <Link href={`/admin/trade-events?eventId=${encodeURIComponent(String(event.id ?? ''))}`} className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-4 text-sm font-black text-blue-700">Complete event setup</Link> : null}
    </section>
  );
}
