'use client';

import Link from 'next/link';
import { AlertTriangle, CheckCircle2, FileImage, PackageCheck, Printer, RefreshCcw, Truck } from 'lucide-react';
import type { SetuGuruRecommendation } from '@/lib/setu-guru/recommendations';
import { workspaceMetricClass, workspacePanelClass, workspacePrimaryButtonClass } from '@/components/ui/workspace-surfaces';
import { cn } from '@/lib/utils';

function isPackaging(item: SetuGuruRecommendation) {
  return item.entity_type.startsWith('packaging_') || item.recommendation_type.startsWith('packaging_');
}

function group(item: SetuGuruRecommendation) {
  const value = `${item.recommendation_type} ${item.title}`.toLowerCase();
  if (/template|moq|price|cost|specification|family/.test(value)) return 'Quote readiness';
  if (/artwork|proof|design/.test(value)) return 'Artwork & proofs';
  if (/dispatch|packed|shipment/.test(value)) return 'Dispatch';
  if (/production|printing|prepress|pre.press|converting|finishing|qc/.test(value)) return 'Production';
  if (/repeat|reorder|cross.sell|reactivation|upgrade/.test(value)) return 'Repeat orders';
  return 'Overview';
}

function actionLabel(item: SetuGuruRecommendation) {
  const href = item.action_href || '';
  if (href.startsWith('/design-queue')) return 'Open Design Queue';
  if (href.startsWith('/dispatch-board')) return 'Open Dispatch Board';
  if (href.startsWith('/admin/packaging-templates')) return 'Open template';
  if (href.startsWith('/orders')) return 'Open order';
  if (href.startsWith('/quotes')) return 'Open quote';
  return 'Review action';
}

export function PackagingOperationsWorkspace({ recommendations }: { recommendations: SetuGuruRecommendation[] }) {
  const items = recommendations.filter(isPackaging);
  const urgent = items.filter((item) => item.priority === 'urgent' || item.priority === 'high').length;
  const design = items.filter((item) => /artwork|proof|design/.test(item.recommendation_type)).length;
  const production = items.filter((item) => /production|printing|prepress|dispatch/.test(item.recommendation_type)).length;
  const templates = items.filter((item) => /template|moq|specification/.test(item.recommendation_type)).length;

  return (
    <section className="space-y-4" aria-label="Packaging Operations">
      <header className={cn(workspacePanelClass, 'p-5')}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-brand-700">Packaging Intelligence</p>
            <h1 className="mt-1 text-xl font-medium text-content-primary">Packaging Operations</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-content-secondary">Quote readiness, artwork and proofs, production, dispatch, template health, and repeat-order signals from this Packaging workspace.</p>
          </div>
          <form action="/api/setu-guru/recommendations/generate" method="post">
            <button type="submit" className={cn(workspacePrimaryButtonClass, 'inline-flex min-h-10 items-center gap-2 rounded-ctl px-4 text-sm font-medium')}><RefreshCcw className="h-4 w-4" />Refresh intelligence</button>
          </form>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className={workspaceMetricClass}><p className="text-caption uppercase text-content-muted">At risk</p><div className="mt-3 flex items-end justify-between"><p className="text-2xl font-medium text-danger-fg">{urgent}</p><AlertTriangle className="h-5 w-5 text-danger-fg" /></div></div>
          <div className={workspaceMetricClass}><p className="text-caption uppercase text-content-muted">Artwork & proofs</p><div className="mt-3 flex items-end justify-between"><p className="text-2xl font-medium text-brand-700">{design}</p><FileImage className="h-5 w-5 text-brand-700" /></div></div>
          <div className={workspaceMetricClass}><p className="text-caption uppercase text-content-muted">Production / dispatch</p><div className="mt-3 flex items-end justify-between"><p className="text-2xl font-medium text-info-fg">{production}</p><Printer className="h-5 w-5 text-info-fg" /></div></div>
          <div className={workspaceMetricClass}><p className="text-caption uppercase text-content-muted">Quote / template</p><div className="mt-3 flex items-end justify-between"><p className="text-2xl font-medium text-success-fg">{templates}</p><PackageCheck className="h-5 w-5 text-success-fg" /></div></div>
        </div>
      </header>

      {!items.length ? (
        <div className={cn(workspacePanelClass, 'grid min-h-72 place-items-center p-8 text-center')}>
          <div><CheckCircle2 className="mx-auto h-9 w-9 text-success-fg" /><p className="mt-3 text-sm font-medium text-content-primary">No open Packaging Intelligence actions</p><p className="mt-1 max-w-xl text-xs leading-5 text-content-muted">Refresh intelligence to evaluate live specifications, pricing templates, accepted artwork/proofs, production stages, dispatch, and order handoff. A clear queue does not replace operator review.</p></div>
        </div>
      ) : (
        <div className={cn(workspacePanelClass, 'overflow-hidden')}>
          <div className="border-b border-line px-5 py-4"><h2 className="text-sm font-medium text-content-primary">Open Packaging actions ({items.length})</h2><p className="mt-1 text-xs text-content-muted">Nothing is approved, sent, priced, advanced, or dispatched automatically.</p></div>
          <div className="divide-y divide-line">
            {items.map((item) => (
              <article key={item.id} className="grid gap-4 p-4 lg:grid-cols-[minmax(220px,1.4fr)_minmax(220px,1.2fr)_130px_auto] lg:items-center">
                <div><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-card border border-line bg-surface-2 text-brand-700">{group(item) === 'Dispatch' ? <Truck className="h-5 w-5" /> : <PackageCheck className="h-5 w-5" />}</span><div><p className="text-sm font-medium text-content-primary">{item.title}</p><p className="mt-1 text-xs text-content-muted">{group(item)}</p></div></div></div>
                <div><p className="text-caption uppercase text-content-muted">Why now</p><p className="mt-1 text-sm leading-5 text-content-secondary">{item.reason}</p></div>
                <div><p className="text-caption uppercase text-content-muted">Priority</p><p className={cn('mt-1 text-sm font-medium', item.priority === 'urgent' ? 'text-danger-fg' : item.priority === 'high' ? 'text-warning-fg' : 'text-content-primary')}>{item.priority}</p></div>
                <Link href={item.action_href || '/growth-agent'} className={cn(workspacePrimaryButtonClass, 'inline-flex min-h-9 items-center justify-center rounded-ctl px-4 text-sm font-medium')}>{actionLabel(item)}</Link>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
