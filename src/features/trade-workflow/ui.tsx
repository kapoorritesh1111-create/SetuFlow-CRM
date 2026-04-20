import type { TradeReadinessSignal } from '@/features/trade-workflow/types';
import { signalToneClasses } from '@/features/trade-workflow/logic';

export function TradeSignalGrid({ title, signals }: { title: string; signals: TradeReadinessSignal[] }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</p>
      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {signals.map((signal) => (
          <div key={signal.label} className={`rounded-2xl border p-3 ${signalToneClasses(signal.tone)}`}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em]">{signal.label}</p>
            <p className="mt-2 text-lg font-semibold">{signal.value}</p>
            <p className="mt-1 text-xs opacity-90">{signal.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
