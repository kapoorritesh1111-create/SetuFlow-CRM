import { GuruAvatar } from '@/components/ui/guru-avatar';
import Link from 'next/link';
import type { AIInsightLevel, AIGovernanceSummary, AIGovernedDecision, DailyInsightSummary, LeadPrioritySummary, OrderDelayPrediction, QuoteRiskSummary } from '@/features/ai/types/intelligence';

function levelClasses(level: AIInsightLevel) {
  if (level === 'critical') return 'border-rose-200 bg-rose-50 text-rose-700';
  if (level === 'high') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (level === 'medium') return 'border-sky-200 bg-sky-50 text-sky-700';
  return 'border-slate-200 bg-slate-50 text-slate-700';
}

export function AIInsightCard({ title, score, level, reasons }: { title: string; score: number; level: AIInsightLevel; reasons: string[] }) {
  return <div className={`rounded-2xl border p-4 ${levelClasses(level)}`}><p className="text-xs font-semibold uppercase tracking-[0.16em]">{title}</p><p className="mt-2 text-2xl font-semibold">{score}</p><ul className="mt-2 space-y-1 text-xs opacity-90">{reasons.slice(0, 3).map((reason) => <li key={reason}>• {reason}</li>)}</ul></div>;
}

export function AILeadPriorityList({ items }: { items: LeadPrioritySummary[] }) {
  return <div className="space-y-3">{items.map((item) => <div key={item.leadId} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-slate-900">{item.companyName}</p><p className="mt-1 text-xs text-slate-500">{item.ownerLabel ?? 'Unassigned'} · {item.label}</p></div><span className={`rounded-full border px-3 py-1 text-xs font-semibold ${levelClasses(item.level)}`}>{item.score}</span></div><ul className="mt-3 space-y-1 text-sm text-slate-600">{item.reasons.slice(0, 3).map((reason) => <li key={reason}>• {reason}</li>)}</ul></div>)}</div>;
}

export function AIQuoteRiskList({ items }: { items: QuoteRiskSummary[] }) {
  return <div className="space-y-3">{items.map((item) => <div key={item.quoteId} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-slate-900">{item.companyName}</p><p className="mt-1 text-xs text-slate-500">{item.label} · {item.status.replaceAll('_', ' ')}</p></div><span className={`rounded-full border px-3 py-1 text-xs font-semibold ${levelClasses(item.level)}`}>{item.score}</span></div><ul className="mt-3 space-y-1 text-sm text-slate-600">{item.reasons.slice(0, 3).map((reason) => <li key={reason}>• {reason}</li>)}</ul></div>)}</div>;
}

export function AIDailyInsightsList({ items }: { items: DailyInsightSummary[] }) {
  return <div className="space-y-3">{items.map((item) => <div key={item.title} className={`rounded-2xl border p-4 ${levelClasses(item.level)}`}><p className="font-semibold">{item.title}</p><p className="mt-2 text-sm opacity-90">{item.detail}</p></div>)}</div>;
}


export function AICompactActionBrief({
  lane,
  where,
  blocker,
  nextAction,
  guardrail,
  details = [],
  tone = 'neutral',
}: {
  lane: string;
  where: string;
  blocker: string;
  nextAction: string;
  guardrail: string;
  details?: string[];
  tone?: 'neutral' | 'warning' | 'critical';
}) {
  const toneClasses = tone === 'critical'
    ? 'border-rose-200 bg-rose-50'
    : tone === 'warning'
      ? 'border-amber-200 bg-amber-50'
      : 'border-slate-200 bg-white';
  const accentClasses = tone === 'critical'
    ? 'bg-rose-100 text-rose-700'
    : tone === 'warning'
      ? 'bg-amber-100 text-amber-700'
      : 'bg-sky-100 text-sky-700';

  return (
    <section className={`rounded-panel border p-4 ${toneClasses}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${accentClasses}`}><GuruAvatar size="xs" /><span>Setu Guru</span></span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{lane}</span>
          </div>
          <p className="mt-3 text-sm font-semibold text-slate-900">Where you are: <span className="font-normal text-slate-700">{where}</span></p>
          <p className="mt-1 text-sm font-semibold text-slate-900">Blocking you: <span className="font-normal text-slate-700">{blocker}</span></p>
          <p className="mt-1 text-sm font-semibold text-slate-900">Do next: <span className="font-normal text-slate-700">{nextAction}</span></p>
          <p className="mt-3 text-xs text-slate-500">Guardrail: {guardrail}</p>
        </div>
      </div>
      {details.length ? (
        <details className="mt-3 rounded-2xl border border-slate-200 bg-white/80 p-3">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Why this is suggested</summary>
          <ul className="mt-3 space-y-1 text-sm text-slate-600">
            {details.map((detail) => <li key={detail}>• {detail}</li>)}
          </ul>
        </details>
      ) : null}
    </section>
  );
}

export function AIGovernedDecisionPanel({ items, summary }: { items: AIGovernedDecision[]; summary: AIGovernanceSummary }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Recommended decisions</p><p className="mt-2 text-2xl font-semibold text-slate-900">{summary.governedDecisions}</p></div>
        <div className="rounded-3xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Explainable</p><p className="mt-2 text-2xl font-semibold text-slate-900">{summary.explainableDecisions}</p></div>
        <div className="rounded-3xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Bounded</p><p className="mt-2 text-2xl font-semibold text-slate-900">{summary.boundedDecisions}</p></div>
        <div className="rounded-3xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Action-safe</p><p className="mt-2 text-2xl font-semibold text-slate-900">{summary.actionSafeDecisions}</p></div>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <article key={item.id} className="rounded-panel border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${levelClasses(item.severity)}`}>{item.entityKind}</span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">Checked against repo rules</span>
                </div>
                <h3 className="mt-3 text-base font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{item.summary}</p>
                <p className="mt-3 text-sm font-medium text-slate-900">Recommended action: <span className="font-normal text-slate-700">{item.recommendedAction}</span></p>
                <div className="mt-3 grid gap-4 lg:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Why this is suggested</p>
                    <ul className="mt-2 space-y-1 text-sm text-slate-600">{item.rationale.map((reason) => <li key={reason}>• {reason}</li>)}</ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Guardrails</p>
                    <ul className="mt-2 space-y-1 text-sm text-slate-600">{item.guardrails.map((reason) => <li key={reason}>• {reason}</li>)}</ul>
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-500">Bounded by: {item.boundedBy}</p>
              </div>
              <Link href={item.href} className="rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800">Open workspace</Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export function AIOrderDelayPanel({ prediction }: { prediction: OrderDelayPrediction }) {
  return <AIInsightCard title={prediction.label} score={prediction.score} level={prediction.level} reasons={prediction.reasons} />;
}
