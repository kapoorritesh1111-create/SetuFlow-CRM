import Link from 'next/link';
import type { AttentionItem, DashboardEvidenceItem } from '@/features/dashboard/types';
import { WidgetEmptyState, WidgetShell } from '@/components/ui/widget-shell';

function rankSeverity(value: string) { return value === 'critical' ? 4 : value === 'high' ? 3 : value === 'medium' ? 2 : 1; }

export function DashboardAiGovernance({ attentionItems, evidenceItems }: { attentionItems: AttentionItem[]; evidenceItems: DashboardEvidenceItem[] }) {
  const orderItems = evidenceItems.slice(0, 2).map((item) => ({
    id: `ai-${item.id}`,
    title: item.title,
    summary: item.summary,
    why: item.blockerReasons.slice(0, 2),
    action: 'Open the order workspace and clear the next governed evidence blocker.',
    guardrail: 'AI cannot release, dispatch, or complete the order automatically.',
    href: item.actionHref,
    severity: item.severity,
  }));
  const attentionCards = attentionItems
    .slice()
    .sort((a,b)=>rankSeverity(b.severity)-rankSeverity(a.severity))
    .slice(0, 3)
    .map((item) => ({
      id: `ai-${item.id}`,
      title: item.title,
      summary: item.reason,
      why: [item.reason],
      action: item.type === 'quote-risk' ? 'Open the quote workflow and resolve the commercial blocker before sending or handoff.' : item.type === 'stalled-lead' ? 'Open the lead and clear the next follow-up, qualification, or compliance blocker.' : 'Open the routed workspace and resolve the visible blocker first.',
      guardrail: item.type === 'quote-risk' ? 'AI cannot approve override pricing or send commercial terms on its own.' : 'AI cannot mutate workflow state without the operator.',
      href: item.ctaHref ?? '/dashboard',
      severity: item.severity,
    }));
  const cards = [...orderItems, ...attentionCards].slice(0, 4);

  return (
    <WidgetShell eyebrow="AI governance" title="Bounded decision support" description="AI now routes the next safe action from repo-backed blockers instead of freeform advice.">
      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Explainable</p><p className="mt-2 text-2xl font-semibold text-slate-950">{cards.length}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Bounded</p><p className="mt-2 text-2xl font-semibold text-slate-950">{cards.length}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Order-backed</p><p className="mt-2 text-2xl font-semibold text-slate-950">{orderItems.length}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Action-safe</p><p className="mt-2 text-2xl font-semibold text-slate-950">{cards.length}</p></div>
      </div>
      <div className="mt-4 space-y-3">
        {cards.length ? cards.map((item) => (
          <article key={item.id} className="rounded-[1.35rem] border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-950">{item.title}</p>
                <p className="mt-1 text-sm text-slate-600">{item.summary}</p>
                <ul className="mt-3 space-y-1 text-xs text-slate-600">{item.why.map((reason) => <li key={reason}>• {reason}</li>)}</ul>
                <p className="mt-3 text-xs font-medium text-slate-800">Next safe action: <span className="font-normal text-slate-600">{item.action}</span></p>
                <p className="mt-1 text-xs text-slate-500">Guardrail: {item.guardrail}</p>
              </div>
              <Link href={item.href} className="rounded-full bg-[#1F487C] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#193769]">Open</Link>
            </div>
          </article>
        )) : <WidgetEmptyState title="AI governance is quiet" description="No filtered blockers currently need bounded AI routing." />}
      </div>
    </WidgetShell>
  );
}
