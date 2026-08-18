'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardCheck, FileImage, PackageCheck, Printer, RefreshCcw, ThumbsDown, ThumbsUp, Truck } from 'lucide-react';
import type { SetuGuruRecommendation } from '@/lib/setu-guru/recommendations';
import { workspaceMetricClass, workspacePanelClass, workspacePrimaryButtonClass, workspaceSecondaryButtonClass } from '@/components/ui/workspace-surfaces';
import { cn } from '@/lib/utils';

export type PackagingOperationsCategory = 'Overview' | 'Quote readiness' | 'Artwork & proofs' | 'Production' | 'Dispatch' | 'Template health' | 'Repeat orders';

const categories: PackagingOperationsCategory[] = ['Overview', 'Quote readiness', 'Artwork & proofs', 'Production', 'Dispatch', 'Template health', 'Repeat orders'];

function isPackaging(item: SetuGuruRecommendation) {
  return item.entity_type.startsWith('packaging_') || item.recommendation_type.startsWith('packaging_');
}

function categoryFor(item: SetuGuruRecommendation): PackagingOperationsCategory {
  const value = `${item.recommendation_type} ${item.title} ${item.reason}`.toLowerCase();
  if (/template|moq|price|cost|specification|family|process/.test(value)) return /template/.test(value) ? 'Template health' : 'Quote readiness';
  if (/artwork|proof|design/.test(value)) return 'Artwork & proofs';
  if (/dispatch|packed|shipment|freight/.test(value)) return 'Dispatch';
  if (/production|printing|prepress|pre.press|converting|finishing|qc/.test(value)) return 'Production';
  if (/repeat|reorder|cross.sell|reactivation|upgrade/.test(value)) return 'Repeat orders';
  return 'Overview';
}

function actionLabel(item: SetuGuruRecommendation) {
  const href = item.action_href || '';
  if (href.startsWith('/design-queue')) return 'Open Design Queue';
  if (href.startsWith('/dispatch-board')) return 'Open Dispatch Board';
  if (href.startsWith('/admin/packaging-templates') || href.startsWith('/admin/packaging-pricing-templates')) return 'Open pricing template';
  if (href.startsWith('/admin/packaging-families')) return 'Open service family';
  if (href.startsWith('/orders')) return 'Open order';
  if (href.startsWith('/leads')) return 'Open customer';
  if (href.startsWith('/quotes')) return 'Open quote';
  return 'Review source record';
}

type LearningTotals = { generated: number; open: number; completed: number; helpful: number; falsePositive: number };

type Props = {
  recommendations: SetuGuruRecommendation[];
  initialCategory?: PackagingOperationsCategory;
};

export function PackagingOperationsWorkspace({ recommendations, initialCategory = 'Overview' }: Props) {
  const items = useMemo(() => recommendations.filter(isPackaging), [recommendations]);
  const urgent = items.filter((item) => item.priority === 'urgent' || item.priority === 'high').length;
  const design = items.filter((item) => categoryFor(item) === 'Artwork & proofs').length;
  const production = items.filter((item) => ['Production', 'Dispatch'].includes(categoryFor(item))).length;
  const templates = items.filter((item) => ['Quote readiness', 'Template health'].includes(categoryFor(item))).length;
  const [category, setCategory] = useState<PackagingOperationsCategory>(initialCategory);
  const [learning, setLearning] = useState<LearningTotals | null>(null);
  const [feedbackState, setFeedbackState] = useState<Record<string, string>>({});

  useEffect(() => setCategory(initialCategory), [initialCategory]);
  useEffect(() => {
    fetch('/api/setu-guru/packaging-learning', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((body) => setLearning(body?.totals ?? null))
      .catch(() => setLearning(null));
  }, []);

  const visibleItems = category === 'Overview' ? items : items.filter((item) => categoryFor(item) === category);

  async function feedback(item: SetuGuruRecommendation, value: 'helpful' | 'false_positive') {
    setFeedbackState((current) => ({ ...current, [item.id]: 'saving' }));
    const response = await fetch('/api/setu-guru/packaging-learning', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recommendationId: item.id, entityType: item.entity_type, entityId: item.entity_id, recommendationType: item.recommendation_type, feedback: value }),
    });
    setFeedbackState((current) => ({ ...current, [item.id]: response.ok ? value : 'error' }));
  }

  return <section className="space-y-4" aria-label="Packaging Operations">
    <header className={cn(workspacePanelClass, 'p-5')}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-brand-700">Growth Work Queue · Packaging vertical</p>
          <h1 className="mt-1 text-xl font-medium text-content-primary">Packaging Operations</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-content-secondary">Use this workspace to find Packaging records that need a person’s attention before quoting, artwork approval, production or dispatch. This is different from Pricing Intelligence, which analyzes prices and margins.</p>
        </div>
        <form action="/api/setu-guru/recommendations/generate" method="post">
          <button type="submit" className={cn(workspacePrimaryButtonClass, 'inline-flex min-h-10 items-center gap-2 rounded-ctl px-4 text-sm font-medium')}><RefreshCcw className="h-4 w-4" />Refresh Packaging Operations</button>
        </form>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        <Guide number="1" title="Refresh the review queue" text="Click Refresh Packaging Operations once to compare current quotes, proofs, jobs, orders and templates." />
        <Guide number="2" title="Open the source record" text="Every action explains what needs attention and links to the exact quote, template, Design Queue, order or Dispatch Board." />
        <Guide number="3" title="Fix, verify and refresh" text="Complete the work in the source record, confirm it saved, then refresh this queue. Nothing changes automatically." />
      </div>

      <div className="mt-4 rounded-ctl border border-info-border bg-info-bg p-4 text-sm text-info-fg">
        <strong>Important:</strong> A recommendation is a review prompt, not a completed task. Packaging Operations never approves pricing, sends a quote, approves artwork, advances production or dispatches an order for you.
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className={workspaceMetricClass}><p className="text-caption uppercase text-content-muted">High attention</p><div className="mt-3 flex items-end justify-between"><p className="text-2xl font-medium text-danger-fg">{urgent}</p><AlertTriangle className="h-5 w-5 text-danger-fg" /></div></div>
        <div className={workspaceMetricClass}><p className="text-caption uppercase text-content-muted">Artwork & proofs</p><div className="mt-3 flex items-end justify-between"><p className="text-2xl font-medium text-brand-700">{design}</p><FileImage className="h-5 w-5 text-brand-700" /></div></div>
        <div className={workspaceMetricClass}><p className="text-caption uppercase text-content-muted">Production / dispatch</p><div className="mt-3 flex items-end justify-between"><p className="text-2xl font-medium text-info-fg">{production}</p><Printer className="h-5 w-5 text-info-fg" /></div></div>
        <div className={workspaceMetricClass}><p className="text-caption uppercase text-content-muted">Quote / template</p><div className="mt-3 flex items-end justify-between"><p className="text-2xl font-medium text-success-fg">{templates}</p><PackageCheck className="h-5 w-5 text-success-fg" /></div></div>
      </div>
    </header>

    <nav className={cn(workspacePanelClass, 'flex gap-2 overflow-x-auto p-2')} aria-label="Packaging Operations categories">
      {categories.map((item) => {
        const count = item === 'Overview' ? items.length : items.filter((recommendation) => categoryFor(recommendation) === item).length;
        return <button key={item} type="button" onClick={() => setCategory(item)} aria-pressed={category === item} className={cn('inline-flex min-h-10 shrink-0 items-center gap-2 rounded-ctl px-4 text-sm font-medium', category === item ? 'bg-brand-800 text-white' : 'text-content-secondary hover:bg-surface-2')}>{item}<span className={cn('rounded-full px-2 py-0.5 text-xs', category === item ? 'bg-white/15 text-white' : 'bg-surface-2 text-content-muted')}>{count}</span></button>;
      })}
    </nav>

    {learning ? <section className={cn(workspacePanelClass, 'p-4')}><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Learning loop</p><h2 className="mt-1 text-sm font-medium text-content-primary">Recommendation quality</h2><p className="mt-1 text-xs text-content-muted">Helpful and Not relevant feedback measures review quality. It never changes operational rules automatically.</p></div><Link href="/dashboard/analytics" className={cn(workspaceSecondaryButtonClass, 'rounded-ctl px-3 py-2 text-xs font-medium')}>Open Packaging Analytics</Link></div><div className="mt-4 grid gap-3 sm:grid-cols-5"><Mini label="Generated" value={learning.generated} /><Mini label="Open" value={learning.open} /><Mini label="Completed" value={learning.completed} /><Mini label="Helpful" value={learning.helpful} /><Mini label="Not relevant" value={learning.falsePositive} /></div></section> : null}

    {!visibleItems.length ? <div className={cn(workspacePanelClass, 'grid min-h-72 place-items-center p-8 text-center')}><div><CheckCircle2 className="mx-auto h-9 w-9 text-success-fg" /><p className="mt-3 text-sm font-medium text-content-primary">No open actions in {category}</p><p className="mt-1 max-w-xl text-xs leading-5 text-content-muted">This means there is no current recommendation in this category after the last refresh. It does not prove that every Packaging record is complete. Continue normal operator review in Quotes, Design Queue, Orders and Dispatch Board.</p></div></div> : <div className={cn(workspacePanelClass, 'overflow-hidden')}>
      <div className="border-b border-line px-5 py-4"><h2 className="text-sm font-medium text-content-primary">{category} actions ({visibleItems.length})</h2><p className="mt-1 text-xs text-content-muted">Open the linked record, complete the named work, verify the saved result, then refresh Packaging Operations.</p></div>
      <div className="divide-y divide-line">{visibleItems.map((item) => <article key={item.id} className="grid gap-4 p-5 xl:grid-cols-[minmax(220px,1.15fr)_minmax(220px,1fr)_minmax(220px,1fr)_190px] xl:items-start">
        <div><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-card border border-line bg-surface-2 text-brand-700">{categoryFor(item) === 'Dispatch' ? <Truck className="h-5 w-5" /> : categoryFor(item) === 'Artwork & proofs' ? <FileImage className="h-5 w-5" /> : <ClipboardCheck className="h-5 w-5" />}</span><div><p className="text-sm font-medium text-content-primary">{item.title}</p><p className="mt-1 text-xs text-content-muted">{categoryFor(item)} · {item.priority} priority</p>{item.summary ? <p className="mt-2 text-xs leading-5 text-content-secondary">{item.summary}</p> : null}</div></div></div>
        <div><p className="text-caption uppercase text-content-muted">Why this appeared</p><p className="mt-1 text-sm leading-5 text-content-secondary">{item.reason || 'The current source record needs operator review.'}</p></div>
        <div><p className="text-caption uppercase text-content-muted">What to do next</p><p className="mt-1 text-sm leading-5 text-content-secondary">{item.recommended_action || 'Open the source record, review the details and complete the required action.'}</p></div>
        <div className="space-y-2"><Link href={item.action_href || '/growth-agent?workspace=packaging'} className={cn(workspacePrimaryButtonClass, 'inline-flex min-h-9 w-full items-center justify-center rounded-ctl px-4 text-sm font-medium')}>{actionLabel(item)}</Link><div className="flex gap-2"><button type="button" disabled={feedbackState[item.id] === 'saving'} onClick={() => feedback(item, 'helpful')} className={cn(workspaceSecondaryButtonClass, 'inline-flex min-h-8 flex-1 items-center justify-center gap-1 rounded-ctl px-2 text-xs')}><ThumbsUp className="h-3.5 w-3.5" />{feedbackState[item.id] === 'helpful' ? 'Saved' : 'Helpful'}</button><button type="button" disabled={feedbackState[item.id] === 'saving'} onClick={() => feedback(item, 'false_positive')} className={cn(workspaceSecondaryButtonClass, 'inline-flex min-h-8 flex-1 items-center justify-center gap-1 rounded-ctl px-2 text-xs')}><ThumbsDown className="h-3.5 w-3.5" />{feedbackState[item.id] === 'false_positive' ? 'Saved' : 'Not relevant'}</button></div></div>
      </article>)}</div>
    </div>}
  </section>;
}

function Guide({ number, title, text }: { number: string; title: string; text: string }) {
  return <div className="rounded-card border border-line bg-surface-2 p-4"><div className="flex items-start gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-800 text-xs font-semibold text-white">{number}</span><div><p className="text-sm font-medium text-content-primary">{title}</p><p className="mt-1 text-xs leading-5 text-content-muted">{text}</p></div></div></div>;
}

function Mini({ label, value }: { label: string; value: number }) {
  return <div className="rounded-ctl border border-line bg-surface-2 p-3"><p className="text-caption uppercase text-content-muted">{label}</p><p className="mt-1 text-lg font-medium text-content-primary">{value}</p></div>;
}
