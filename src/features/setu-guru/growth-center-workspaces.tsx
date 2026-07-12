'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CalendarDays,
  FileCheck2,
  FileWarning,
  Loader2,
  PackageCheck,
  Scale,
  Search,
  Send,
  ShieldCheck,
  Target,
  Users,
} from 'lucide-react';
import { workspacePanelClass, workspacePrimaryButtonClass, workspaceSecondaryButtonClass } from '@/components/ui/workspace-surfaces';
import type { OpportunityCard } from '@/lib/setu-guru/opportunity-finder';
import type { SetuGuruRecommendation } from '@/lib/setu-guru/recommendations';
import { cn } from '@/lib/utils';

type SupplierRow = { leadId: string; label: string; country: string | null; documentCompleteness: number; openRfqCount: number; respondedRfqCount: number; responseQuality: 'responsive' | 'slow' | 'no_data'; compositeScore: number };
export type TradeEventSummary = { id: string; name: string; starts_on: string | null; ends_on: string | null };

function quoteLabel(item: SetuGuruRecommendation) {
  const match = item.title.match(/Q-\d{4}-\d+/i);
  return match?.[0] ?? 'Quote action';
}

function buyerLabel(item: SetuGuruRecommendation) {
  const value = item.title.replace(/^Follow up on\s+/i, '');
  const parts = value.split(/\s+for\s+/i);
  return parts[1] || item.title;
}

export function RevenueWorkspace({ recommendations, selected }: { recommendations?: SetuGuruRecommendation[]; selected?: SetuGuruRecommendation | null }) {
  const source = useMemo(() => recommendations?.length ? recommendations : selected ? [selected] : [], [recommendations, selected]);
  const quoteActions = useMemo(() => source.filter((item) => /quote|buyer|revenue|follow.?up/i.test(`${item.entity_type} ${item.recommendation_type} ${item.title}`)), [source]);
  const atRisk = quoteActions.filter((item) => item.priority === 'urgent' || item.priority === 'high').length;
  const buyers = new Set(quoteActions.map((item) => buyerLabel(item))).size;

  return (
    <section className="border-b border-line bg-surface-2/60 p-4" aria-label="Revenue workspace">
      <div className="grid gap-4 xl:grid-cols-[1.4fr_.8fr]">
        <article className={cn(workspacePanelClass, 'p-4')}>
          <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-wide text-brand-700">Quote follow-up queue</p><h3 className="mt-1 text-base font-medium text-content-primary">Revenue actions needing attention</h3></div><FileCheck2 className="h-5 w-5 text-brand-700" /></div>
          <div className="mt-4 space-y-2">
            {quoteActions.slice(0, 5).map((item) => <Link key={item.id} href={item.action_href || '/quotes'} className="grid gap-3 rounded-card border border-line bg-surface-1 p-3 hover:bg-surface-2 sm:grid-cols-[1.25fr_.8fr_auto] sm:items-center"><div><p className="text-sm font-medium text-content-primary">{buyerLabel(item)}</p><p className="mt-1 text-xs text-content-muted">{quoteLabel(item)}</p></div><div><p className="text-caption uppercase text-content-muted">Why now</p><p className="mt-1 text-xs leading-5 text-content-secondary">{item.reason}</p></div><span className="inline-flex items-center gap-1 text-xs font-medium text-brand-700">Review<ArrowRight className="h-3.5 w-3.5" /></span></Link>)}
            {!quoteActions.length ? <p className="text-sm text-content-secondary">No quote follow-up actions need attention right now.</p> : null}
          </div>
        </article>
        <article className={cn(workspacePanelClass, 'p-4')}>
          <p className="text-xs font-medium uppercase tracking-wide text-brand-700">Revenue overview</p>
          <div className="mt-3 grid grid-cols-2 gap-3"><div className="rounded-card border border-line bg-surface-2 p-3"><p className="text-caption uppercase text-content-muted">Open actions</p><p className="mt-1 text-xl font-medium text-content-primary">{quoteActions.length}</p></div><div className="rounded-card border border-line bg-surface-2 p-3"><p className="text-caption uppercase text-content-muted">At risk</p><p className="mt-1 text-xl font-medium text-danger-fg">{atRisk}</p></div><div className="rounded-card border border-line bg-surface-2 p-3"><p className="text-caption uppercase text-content-muted">Buyers</p><p className="mt-1 text-xl font-medium text-content-primary">{buyers}</p></div><div className="rounded-card border border-line bg-surface-2 p-3"><p className="text-caption uppercase text-content-muted">Next step</p><p className="mt-1 text-sm font-medium text-content-primary">Review oldest first</p></div></div>
          <Link href="/quotes" className={cn(workspacePrimaryButtonClass, 'mt-4 inline-flex min-h-9 items-center gap-2 rounded-ctl px-4 text-sm font-medium')}>Open all quotes<ArrowRight className="h-4 w-4" /></Link>
        </article>
      </div>
    </section>
  );
}

export function SupplierWorkspace({ recommendations }: { recommendations: SetuGuruRecommendation[] }) {
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let cancelled = false; fetch('/api/setu-guru/supplier-comparison', { cache: 'no-store' }).then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(); if (!cancelled) setSuppliers(body.suppliers ?? []); }).catch(() => { if (!cancelled) setError('Supplier comparison is temporarily unavailable.'); }).finally(() => { if (!cancelled) setLoading(false); }); return () => { cancelled = true; }; }, []);
  const supplierActions = useMemo(() => recommendations.filter((item) => /supplier|rfq|compliance|document/i.test(`${item.entity_type} ${item.recommendation_type} ${item.title}`)), [recommendations]);
  const rfqCount = supplierActions.filter((item) => /rfq/i.test(`${item.recommendation_type} ${item.title}`)).length;
  const complianceCount = supplierActions.filter((item) => /compliance|document/i.test(`${item.recommendation_type} ${item.title}`)).length;
  return <section className="border-b border-line bg-surface-2/60 p-4" aria-label="Supplier workspace"><div className="grid gap-4 xl:grid-cols-[1.4fr_.8fr]"><article className={cn(workspacePanelClass, 'p-4')}><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-wide text-brand-700">Supplier comparison</p><h3 className="mt-1 text-base font-medium text-content-primary">Verified supplier readiness</h3></div><Scale className="h-5 w-5 text-brand-700" /></div>{loading ? <p className="mt-4 flex items-center gap-2 text-sm text-content-muted"><Loader2 className="h-4 w-4 animate-spin" />Comparing suppliers…</p> : null}{error ? <p className="mt-4 text-sm text-danger-fg">{error}</p> : null}{!loading && !error ? <div className="mt-4 space-y-2">{suppliers.slice(0, 5).map((supplier) => <Link key={supplier.leadId} href={`/leads/${supplier.leadId}`} className="grid gap-3 rounded-card border border-line bg-surface-1 p-3 hover:bg-surface-2 sm:grid-cols-[1.4fr_.7fr_.7fr_auto] sm:items-center"><div><p className="text-sm font-medium text-content-primary">{supplier.label}</p><p className="mt-1 text-xs text-content-muted">{supplier.country || 'Country not recorded'}</p></div><div><p className="text-caption uppercase text-content-muted">Documents</p><p className="mt-1 text-sm font-medium">{supplier.documentCompleteness}%</p></div><div><p className="text-caption uppercase text-content-muted">RFQs</p><p className="mt-1 text-sm font-medium">{supplier.respondedRfqCount} responded · {supplier.openRfqCount} open</p></div><div className="text-right"><span className="inline-flex rounded-full bg-success-bg px-2.5 py-1 text-xs font-medium text-success-fg">{supplier.compositeScore}% fit</span></div></Link>)}{!suppliers.length ? <p className="text-sm text-content-secondary">No supplier records are available for comparison yet.</p> : null}</div> : null}</article><div className="space-y-4"><article className={cn(workspacePanelClass, 'p-4')}><div className="flex items-center gap-2"><PackageCheck className="h-5 w-5 text-brand-700" /><h3 className="text-sm font-medium text-content-primary">RFQ assistant</h3></div><p className="mt-2 text-sm leading-6 text-content-secondary">{rfqCount ? `${rfqCount} RFQ action${rfqCount === 1 ? '' : 's'} need attention.` : 'No RFQ exceptions need attention.'}</p><Link href="/leads?type=supplier" className={cn(workspaceSecondaryButtonClass, 'mt-3 inline-flex min-h-9 items-center gap-2 rounded-ctl px-3 text-sm font-medium')}>Open supplier RFQs<Send className="h-4 w-4" /></Link></article><article className={cn(workspacePanelClass, 'p-4')}><div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-brand-700" /><h3 className="text-sm font-medium text-content-primary">Compliance</h3></div><p className="mt-2 text-sm leading-6 text-content-secondary">{complianceCount ? `${complianceCount} document or compliance gap${complianceCount === 1 ? '' : 's'} require review.` : 'No active compliance gaps detected.'}</p><div className="mt-3 flex items-center gap-2 text-xs text-content-muted">{complianceCount ? <FileWarning className="h-4 w-4 text-warning-fg" /> : <FileCheck2 className="h-4 w-4 text-success-fg" />}Based only on records already stored in Setu Flow.</div></article></div></div></section>;
}

export function ResearchWorkspace({ opportunities, icpConfigured }: { opportunities: OpportunityCard[]; icpConfigured: boolean }) {
  const top = opportunities.slice(0, 5);
  const average = top.length ? Math.round(top.reduce((sum, item) => sum + item.fitScore.score, 0) / top.length) : 0;
  return <section className="border-b border-line bg-surface-2/60 p-4" aria-label="Research workspace"><div className="grid gap-4 xl:grid-cols-[1.4fr_.8fr]"><article className={cn(workspacePanelClass, 'p-4')}><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-wide text-brand-700">Opportunity finder</p><h3 className="mt-1 text-base font-medium text-content-primary">Best-fit records already in your CRM</h3></div><Target className="h-5 w-5 text-brand-700" /></div><div className="mt-4 space-y-2">{top.map((item) => <Link key={item.leadId} href={`/leads/${item.leadId}`} className="grid gap-3 rounded-card border border-line bg-surface-1 p-3 hover:bg-surface-2 sm:grid-cols-[1.2fr_.7fr_.8fr_auto] sm:items-center"><div><p className="text-sm font-medium text-content-primary">{item.label}</p><p className="mt-1 text-xs text-content-muted">{item.country || 'Market not recorded'} · {item.signalSource}</p></div><div><p className="text-caption uppercase text-content-muted">Fit</p><p className="mt-1 text-sm font-medium text-success-fg">{item.fitScore.score}%</p></div><div><p className="text-caption uppercase text-content-muted">Why</p><p className="mt-1 line-clamp-2 text-xs text-content-secondary">{item.fitScore.reasons?.[0] || 'Matches your saved ICP.'}</p></div><span className="inline-flex items-center gap-1 text-xs font-medium text-brand-700">Review<ArrowRight className="h-3.5 w-3.5" /></span></Link>)}{!top.length ? <p className="text-sm text-content-secondary">{icpConfigured ? 'No CRM records currently meet the opportunity threshold.' : 'Set up your ICP to start verified opportunity matching.'}</p> : null}</div></article><div className="space-y-4"><article className={cn(workspacePanelClass, 'p-4')}><div className="flex items-center gap-2"><Search className="h-5 w-5 text-brand-700" /><h3 className="text-sm font-medium text-content-primary">Research overview</h3></div><div className="mt-3 grid grid-cols-2 gap-3"><div className="rounded-card border border-line bg-surface-2 p-3"><p className="text-caption uppercase text-content-muted">Matches</p><p className="mt-1 text-xl font-medium">{opportunities.length}</p></div><div className="rounded-card border border-line bg-surface-2 p-3"><p className="text-caption uppercase text-content-muted">Avg. fit</p><p className="mt-1 text-xl font-medium">{average}%</p></div></div><p className="mt-3 text-xs leading-5 text-content-muted">Scores use stored CRM facts and your saved ICP. Missing information is never invented.</p></article><article className={cn(workspacePanelClass, 'p-4')}><div className="flex items-center gap-2"><Users className="h-5 w-5 text-brand-700" /><h3 className="text-sm font-medium text-content-primary">ICP status</h3></div><p className="mt-2 text-sm text-content-secondary">{icpConfigured ? 'Your matching preferences are active.' : 'ICP setup is required before opportunity scoring can run.'}</p></article></div></div></section>;
}

export function TradeEventWorkspace({ tradeEvents, recommendations }: { tradeEvents: TradeEventSummary[]; recommendations: SetuGuruRecommendation[] }) {
  const eventActions = recommendations.filter((item) => /event|trade show|meeting/i.test(`${item.entity_type} ${item.recommendation_type} ${item.title}`));
  return <section className="border-b border-line bg-surface-2/60 p-4" aria-label="Trade event workspace"><div className="grid gap-4 xl:grid-cols-[1.4fr_.8fr]"><article className={cn(workspacePanelClass, 'p-4')}><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-wide text-brand-700">Trade event assistant</p><h3 className="mt-1 text-base font-medium text-content-primary">Prepare, prioritize, and follow up</h3></div><CalendarDays className="h-5 w-5 text-brand-700" /></div><div className="mt-4 space-y-2">{tradeEvents.map((event) => <Link key={event.id} href={`/growth-agent/trade-events/${event.id}`} className="grid gap-3 rounded-card border border-line bg-surface-1 p-3 hover:bg-surface-2 sm:grid-cols-[1.3fr_.7fr_auto] sm:items-center"><div><p className="text-sm font-medium text-content-primary">{event.name}</p><p className="mt-1 text-xs text-content-muted">{event.starts_on ? new Date(event.starts_on).toLocaleDateString() : 'Date not recorded'}</p></div><div><p className="text-caption uppercase text-content-muted">Workspace</p><p className="mt-1 text-xs text-content-secondary">Pre-show · Post-show · Summary</p></div><span className="inline-flex items-center gap-1 text-xs font-medium text-brand-700">Open<ArrowRight className="h-3.5 w-3.5" /></span></Link>)}{!tradeEvents.length ? <p className="text-sm text-content-secondary">No trade events are available yet.</p> : null}</div></article><article className={cn(workspacePanelClass, 'p-4')}><p className="text-xs font-medium uppercase tracking-wide text-brand-700">Event attention</p><div className="mt-3 grid grid-cols-2 gap-3"><div className="rounded-card border border-line bg-surface-2 p-3"><p className="text-caption uppercase text-content-muted">Events</p><p className="mt-1 text-xl font-medium">{tradeEvents.length}</p></div><div className="rounded-card border border-line bg-surface-2 p-3"><p className="text-caption uppercase text-content-muted">Actions</p><p className="mt-1 text-xl font-medium text-warning-fg">{eventActions.length}</p></div></div><p className="mt-3 text-sm leading-6 text-content-secondary">Prioritize untouched leads and time-sensitive follow-up before opening another event.</p></article></div></section>;
}
