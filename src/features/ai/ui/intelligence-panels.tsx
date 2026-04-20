import type { AIInsightLevel, DailyInsightSummary, LeadPrioritySummary, OrderDelayPrediction, QuoteRiskSummary } from '@/features/ai/types/intelligence';

function levelClasses(level: AIInsightLevel) {
  if (level === 'critical') return 'border-rose-200 bg-rose-50 text-rose-700';
  if (level === 'high') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (level === 'medium') return 'border-sky-200 bg-sky-50 text-sky-700';
  return 'border-slate-200 bg-slate-50 text-slate-700';
}

export function AIInsightCard({ title, score, level, reasons }: { title: string; score: number; level: AIInsightLevel; reasons: string[] }) {
  return (
    <div className={`rounded-2xl border p-4 ${levelClasses(level)}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em]">{title}</p>
      <p className="mt-2 text-2xl font-semibold">{score}</p>
      <ul className="mt-2 space-y-1 text-xs opacity-90">
        {reasons.slice(0, 3).map((reason) => <li key={reason}>• {reason}</li>)}
      </ul>
    </div>
  );
}

export function AILeadPriorityList({ items }: { items: LeadPrioritySummary[] }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.leadId} className="rounded-2xl border border-slate-200 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-900">{item.companyName}</p>
              <p className="mt-1 text-xs text-slate-500">{item.ownerLabel ?? 'Unassigned'} · {item.label}</p>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${levelClasses(item.level)}`}>{item.score}</span>
          </div>
          <ul className="mt-3 space-y-1 text-sm text-slate-600">
            {item.reasons.slice(0, 3).map((reason) => <li key={reason}>• {reason}</li>)}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function AIQuoteRiskList({ items }: { items: QuoteRiskSummary[] }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.quoteId} className="rounded-2xl border border-slate-200 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-900">{item.companyName}</p>
              <p className="mt-1 text-xs text-slate-500">{item.label} · {item.status.replaceAll('_', ' ')}</p>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${levelClasses(item.level)}`}>{item.score}</span>
          </div>
          <ul className="mt-3 space-y-1 text-sm text-slate-600">
            {item.reasons.slice(0, 3).map((reason) => <li key={reason}>• {reason}</li>)}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function AIDailyInsightsList({ items }: { items: DailyInsightSummary[] }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.title} className={`rounded-2xl border p-4 ${levelClasses(item.level)}`}>
          <p className="font-semibold">{item.title}</p>
          <p className="mt-2 text-sm opacity-90">{item.detail}</p>
        </div>
      ))}
    </div>
  );
}

export function AIOrderDelayPanel({ prediction }: { prediction: OrderDelayPrediction }) {
  return <AIInsightCard title={prediction.label} score={prediction.score} level={prediction.level} reasons={prediction.reasons} />;
}
