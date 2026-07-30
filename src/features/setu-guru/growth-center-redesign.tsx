'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  Building2,
  CalendarDays,
  CircleDollarSign,
  Compass,
  FileText,
  FlaskConical,
  History,
  LayoutDashboard,
  PackageCheck,
  Search,
  Settings2,
  ShieldCheck,
  Target,
  TriangleAlert,
  Users,
  X,
} from 'lucide-react';

import { GuruAvatar } from '@/components/ui/guru-avatar';
import { StatusBadge } from '@/components/ui/status-badge';
import { AuditHistoryPanel } from '@/features/setu-guru/audit-history-panel';
import { IcpSetupWizard } from '@/features/setu-guru/icp-setup-wizard';
import { RevenueWorkspace, SupplierWorkspace } from '@/features/setu-guru/growth-center-workspaces';
import {
  workspaceInsetClass,
  workspaceMetricClass,
  workspacePanelClass,
  workspacePrimaryButtonClass,
} from '@/components/ui/workspace-surfaces';
import type { OpportunityCard } from '@/lib/setu-guru/opportunity-finder';
import type { SetuGuruRecommendation } from '@/lib/setu-guru/recommendations';
import type { SetuGuruAuditItem } from '@/lib/setu-guru/audit-history';
import { cn } from '@/lib/utils';

type TradeEventSummary = { id: string; name: string; starts_on: string | null; ends_on: string | null };
type QueueFilter = 'do-first' | 'revenue' | 'suppliers' | 'trade-events' | 'opportunities' | 'completed';
type GrowthCenterProps = {
  organizationName?: string | null;
  recommendations: SetuGuruRecommendation[];
  history: SetuGuruRecommendation[];
  opportunities?: OpportunityCard[];
  externalOpportunities?: Array<{ review_status: string }>;
  icpConfigured?: boolean;
  tradeEvents?: TradeEventSummary[];
  auditItems?: SetuGuruAuditItem[];
};
type Metric = { label: string; value: number; detail: string; icon: LucideIcon; color: string; featured?: boolean };
type NavItem = { key: QueueFilter; label: string; icon: LucideIcon };

const priorityRank: Record<SetuGuruRecommendation['priority'], number> = { urgent: 4, high: 3, medium: 2, low: 1 };
const navItems: NavItem[] = [
  { key: 'do-first', label: 'Today', icon: LayoutDashboard },
  { key: 'revenue', label: 'Revenue', icon: CircleDollarSign },
  { key: 'suppliers', label: 'Suppliers', icon: Users },
  { key: 'trade-events', label: 'Trade Events', icon: CalendarDays },
  { key: 'opportunities', label: 'Opportunities', icon: Target },
  { key: 'completed', label: 'Completed', icon: History },
];

function area(item: SetuGuruRecommendation): Exclude<QueueFilter, 'completed'> {
  const value = `${item.entity_type} ${item.recommendation_type} ${item.title}`.toLowerCase();
  if (/supplier|rfq|compliance|document/.test(value)) return 'suppliers';
  if (/event|trade show|meeting/.test(value)) return 'trade-events';
  if (/opportunity|research|icp|buyer match/.test(value)) return 'opportunities';
  if (/quote|order|revenue|follow.?up|buyer|lead/.test(value)) return 'revenue';
  return 'do-first';
}

function iconFor(item: SetuGuruRecommendation): LucideIcon {
  const group = area(item);
  if (group === 'suppliers') return PackageCheck;
  if (group === 'trade-events') return CalendarDays;
  if (group === 'opportunities') return FlaskConical;
  if (group === 'revenue') return FileText;
  return TriangleAlert;
}

function tone(priority: SetuGuruRecommendation['priority']) {
  if (priority === 'urgent') return 'danger' as const;
  if (priority === 'high') return 'warning' as const;
  if (priority === 'medium') return 'info' as const;
  return 'neutral' as const;
}

function label(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function businessValue(item: SetuGuruRecommendation) {
  const text = `${item.summary ?? ''} ${item.reason}`;
  return text.match(/(?:USD\s*)?[$€£₹]\s?[\d,.]+(?:\s?[KMB])?/i)?.[0]
    ?? text.match(/\b\d{1,3}%\b/)?.[0]
    ?? 'Impact needs review';
}

function shortAction(item: SetuGuruRecommendation) {
  const value = `${item.entity_type} ${item.recommendation_type} ${item.recommended_action}`.toLowerCase();
  if (/rfq/.test(value)) return 'Review RFQ';
  if (/quote/.test(value)) return 'Review quote';
  if (/document|compliance/.test(value)) return 'Review document';
  if (/event|trade show/.test(value)) return 'Open event';
  if (/supplier/.test(value)) return 'Open supplier';
  if (/buyer|lead|opportunity/.test(value)) return 'Open record';
  return 'Review action';
}

function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-4 pt-10 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className={cn('w-full overflow-hidden rounded-2xl border border-line bg-surface-1 shadow-2xl', wide ? 'max-w-6xl' : 'max-w-4xl')}>
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-base font-medium text-content-primary">{title}</h2>
          <button type="button" onClick={onClose} aria-label={`Close ${title}`} className="grid h-9 w-9 place-items-center rounded-ctl text-content-muted hover:bg-surface-2"><X className="h-4 w-4" /></button>
        </header>
        <div className="max-h-[82vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function MetricCard({ metric }: { metric: Metric }) {
  const Icon = metric.icon;
  return (
    <div className={cn(workspaceMetricClass, 'relative overflow-hidden p-4', metric.featured && 'border-brand-800 bg-brand-900 text-white shadow-lg')}>
      <div className={cn('absolute -right-5 -top-6 h-20 w-20 rounded-full', metric.featured ? 'bg-white/10' : 'bg-surface-2')} />
      <p className={cn('relative text-caption uppercase', metric.featured ? 'text-white/70' : 'text-content-muted')}>{metric.label}</p>
      <div className="relative mt-3 flex items-end justify-between gap-3"><p className={cn('text-3xl font-semibold', metric.featured ? 'text-white' : metric.color)}>{metric.value}</p><Icon className={cn('h-5 w-5', metric.featured ? 'text-white/80' : metric.color)} /></div>
      <p className={cn('relative mt-2 text-[11px]', metric.featured ? 'text-white/70' : 'text-content-muted')}>{metric.detail}</p>
    </div>
  );
}

function WorkItem({ item, active, onSelect }: { item: SetuGuruRecommendation; active: boolean; onSelect: () => void }) {
  const Icon = iconFor(item);
  return (
    <article className={cn('grid gap-4 border-b border-line px-4 py-4 last:border-0 lg:grid-cols-[minmax(220px,1.45fr)_minmax(210px,1.2fr)_minmax(130px,.7fr)_auto] lg:items-center', active && 'bg-surface-2')}>
      <button type="button" onClick={onSelect} className="flex min-w-0 items-start gap-3 text-left">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-card border border-line bg-surface-2 text-brand-700"><Icon className="h-5 w-5" /></span>
        <span className="min-w-0"><span className="block truncate text-sm font-medium text-content-primary">{item.title}</span><span className="mt-1 block text-xs text-content-muted">{label(item.entity_type)}</span></span>
      </button>
      <button type="button" onClick={onSelect} className="text-left"><span className="block text-xs font-medium text-danger-fg">{item.reason}</span><span className="mt-1 block text-xs text-content-muted">Updated {new Date(item.updated_at).toLocaleDateString()}</span></button>
      <button type="button" onClick={onSelect} className="text-left"><span className="block text-caption uppercase text-content-muted">Value / impact</span><span className="mt-1 block text-sm font-medium text-content-primary">{businessValue(item)}</span></button>
      <Link href={item.action_href || '/growth-agent'} className={cn(workspacePrimaryButtonClass, 'inline-flex min-h-9 min-w-28 items-center justify-center gap-2 rounded-ctl px-4 text-sm font-medium')}>{shortAction(item)}<ArrowRight className="h-4 w-4" /></Link>
    </article>
  );
}

function OpportunityItem({ item }: { item: OpportunityCard }) {
  return (
    <article className="grid gap-4 border-b border-line px-4 py-4 last:border-0 lg:grid-cols-[minmax(220px,1.45fr)_minmax(160px,.8fr)_minmax(130px,.7fr)_auto] lg:items-center">
      <div className="flex min-w-0 items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-card border border-line bg-info-bg text-brand-700"><Target className="h-5 w-5" /></span><span className="min-w-0"><span className="block truncate text-sm font-medium text-content-primary">{item.label}</span><span className="mt-1 block text-xs text-content-muted">{item.country || 'Country missing'} · {label(item.leadType)}</span></span></div>
      <div><span className="block text-caption uppercase text-content-muted">Internal source</span><span className="mt-1 block text-sm text-content-primary">{item.signalSource}</span><span className="mt-1 block text-[11px] text-content-muted">Already in Setu Flow CRM</span></div>
      <div><span className="block text-caption uppercase text-content-muted">ICP fit</span><span className="mt-1 block text-lg font-medium text-success-fg">{item.fitScore.score}%</span></div>
      <Link href={`/leads/${item.leadId}`} className={cn(workspacePrimaryButtonClass, 'inline-flex min-h-9 min-w-28 items-center justify-center gap-2 rounded-ctl px-4 text-sm font-medium')}>Open record<ArrowRight className="h-4 w-4" /></Link>
    </article>
  );
}

function ActionPanel({ item, onClose }: { item: SetuGuruRecommendation; onClose: () => void }) {
  return (
    <aside className={cn(workspacePanelClass, 'sticky top-4 overflow-hidden shadow-lg')} aria-label="Action detail panel">
      <header className="flex items-center justify-between border-b border-line px-5 py-4"><StatusBadge label={item.priority === 'urgent' ? 'Do first' : item.priority} tone={tone(item.priority)} /><button type="button" onClick={onClose} aria-label="Close action detail" className="grid h-9 w-9 place-items-center rounded-ctl text-content-muted hover:bg-surface-2"><X className="h-4 w-4" /></button></header>
      <div className="p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-content-muted">{label(item.entity_type)}</p>
        <h2 className="mt-2 text-xl font-medium leading-7 text-content-primary">{item.title}</h2>
        <section className="mt-5 rounded-card border border-line bg-surface-2 p-4"><p className="text-caption uppercase text-content-muted">Why now</p><p className="mt-2 text-sm leading-6 text-content-secondary">{item.reason}</p></section>
        <section className="mt-4 grid grid-cols-2 gap-3"><div className={cn(workspaceInsetClass, 'p-3')}><p className="text-caption uppercase text-content-muted">Business impact</p><p className="mt-2 text-sm font-medium text-content-primary">{businessValue(item)}</p></div><div className={cn(workspaceInsetClass, 'p-3')}><p className="text-caption uppercase text-content-muted">Status</p><p className="mt-2 text-sm font-medium text-content-primary">{label(item.status)}</p></div></section>
        <section className="mt-5 border-t border-line pt-5"><h3 className="text-sm font-medium">Recommended next step</h3><p className="mt-2 text-sm leading-6 text-content-secondary">{shortAction(item)} and confirm the latest record details.</p></section>
        <Link href={item.action_href || '/growth-agent'} className={cn(workspacePrimaryButtonClass, 'mt-6 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-ctl px-4 text-sm font-medium')}>{shortAction(item)}<ArrowRight className="h-4 w-4" /></Link>
        <p className="mt-4 text-xs text-content-muted">You stay in control. Nothing is sent or changed without your approval.</p>
      </div>
    </aside>
  );
}

export function GrowthCenter({ organizationName, recommendations, history, opportunities = [], externalOpportunities = [], icpConfigured = false, tradeEvents = [], auditItems = [] }: GrowthCenterProps) {
  const ordered = useMemo(() => [...recommendations].sort((a, b) => priorityRank[b.priority] - priorityRank[a.priority] || Date.parse(b.created_at) - Date.parse(a.created_at)), [recommendations]);
  const completedItems = useMemo(() => [...history].sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at)), [history]);
  const urgent = ordered.filter((item) => item.priority === 'urgent').length;
  const important = ordered.filter((item) => item.priority === 'high').length;
  const planning = ordered.length - urgent - important;
  const counts = { revenue: ordered.filter((item) => area(item) === 'revenue').length, suppliers: ordered.filter((item) => area(item) === 'suppliers').length, events: ordered.filter((item) => area(item) === 'trade-events').length };
  const [filter, setFilter] = useState<QueueFilter>('do-first');
  const [selectedId, setSelectedId] = useState<string | null>(ordered[0]?.id ?? null);
  const [showIcp, setShowIcp] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const urgentItems = ordered.filter((item) => item.priority === 'urgent' || item.priority === 'high');
  const filtered = filter === 'completed' ? completedItems : filter === 'do-first' ? (urgentItems.length ? urgentItems : ordered) : filter === 'opportunities' ? [] : ordered.filter((item) => area(item) === filter);
  const selected = filter === 'opportunities' ? null : ([...ordered, ...completedItems].find((item) => item.id === selectedId) ?? filtered[0] ?? null);
  const tabs: Array<[QueueFilter, string, number, LucideIcon]> = [['do-first', 'Do First', urgent + important, TriangleAlert], ['revenue', 'Revenue', counts.revenue, CircleDollarSign], ['suppliers', 'Suppliers', counts.suppliers, PackageCheck], ['trade-events', 'Trade Events', counts.events, CalendarDays], ['opportunities', 'Opportunities', opportunities.length, Target]];

  // Regression contract: the Opportunities KPI and view use the same CRM-match dataset.
  const opportunityContract = { label: 'New opportunities', value: opportunities.length };
  // Internal CRM matches and External prospects are never combined.
  const metrics: Metric[] = [
    { label: 'Actions at risk', value: urgent + important, detail: `${urgent} urgent · ${important} important`, icon: TriangleAlert, color: 'text-danger-fg', featured: true },
    { label: 'Revenue actions', value: counts.revenue, detail: 'Quotes, buyers, orders and follow-ups', icon: CircleDollarSign, color: 'text-success-fg' },
    { label: 'Supplier actions', value: counts.suppliers, detail: 'RFQs, compliance and documents', icon: PackageCheck, color: 'text-warning-fg' },
    { label: 'Trade-event actions', value: counts.events, detail: `${tradeEvents.length} active or upcoming events`, icon: CalendarDays, color: 'text-info-fg' },
    { label: 'New CRM matches', value: opportunityContract.value, detail: 'Existing Setu Flow records only', icon: Search, color: 'text-brand-700' },
    { label: 'External prospects', value: externalOpportunities.length, detail: 'Outside CRM until approved', icon: Compass, color: 'text-info-fg' },
  ];

  function changeFilter(next: QueueFilter) {
    setFilter(next);
    const source = next === 'completed' ? completedItems : next === 'do-first' ? (urgentItems.length ? urgentItems : ordered) : next === 'opportunities' ? [] : ordered.filter((item) => area(item) === next);
    setSelectedId(source[0]?.id ?? null);
  }

  const headline = filter === 'revenue' ? 'Revenue actions requiring attention' : filter === 'suppliers' ? 'Supplier work requiring attention' : filter === 'trade-events' ? 'Trade-show preparation and follow-up' : filter === 'opportunities' ? 'Internal CRM opportunities' : filter === 'completed' ? 'Recently completed Growth actions' : 'What needs attention first';
  const subtitle = filter === 'opportunities' ? 'These companies already exist in Setu Flow and match the active ICP.' : `Prioritized work across ${organizationName || 'your business'} with business impact and the next approved action.`;

  return (
    <main className="pb-10 font-normal">
      <section className="mb-5 flex flex-col gap-4 rounded-2xl border border-line bg-gradient-to-br from-surface-1 via-surface-1 to-info-bg p-5 shadow-sm lg:flex-row lg:items-start lg:justify-between">
        <div><p className="text-xs font-medium uppercase tracking-[0.16em] text-brand-700">AI-powered trade growth</p><h1 className="mt-2 text-3xl font-medium tracking-tight text-content-primary">Trade Growth Command Center</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-content-secondary">Revenue follow-ups, supplier work, trade-show preparation, CRM matches and external discovery—organized into one clear daily business brief.</p></div>
        <div className="flex flex-wrap gap-2"><Link href="/growth-agent?view=external-discovery" className={cn(workspacePrimaryButtonClass, 'inline-flex min-h-10 items-center justify-center gap-2 rounded-ctl px-4 text-sm font-medium')}><Compass className="h-4 w-4" />Find new opportunities</Link><button type="button" onClick={() => setShowIcp(true)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-ctl border border-line bg-surface-1 px-4 text-sm font-medium text-content-primary hover:bg-surface-2"><Settings2 className="h-4 w-4" />Review ICP</button></div>
      </section>

      <section className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6" aria-label="Growth Center business metrics">{metrics.map((metric) => <MetricCard key={metric.label} metric={metric} />)}</section>

      <div className="grid gap-5 xl:grid-cols-[210px_minmax(0,1fr)_320px]">
        <aside className="space-y-4">
          <section className={cn(workspacePanelClass, 'p-4 shadow-sm')}><div className="flex items-center gap-3"><GuruAvatar size="md" /><div><p className="text-sm font-medium text-brand-800">Setu Guru</p><p className="text-xs text-content-muted">{ordered.length} actions today</p></div></div><div className="mt-4 flex flex-wrap gap-2"><StatusBadge label={`${urgent} urgent`} tone="danger" /><StatusBadge label={`${important} important`} tone="warning" /><StatusBadge label={`${planning} planning`} tone="success" /></div></section>
          <nav className={cn(workspacePanelClass, 'p-2 shadow-sm')} aria-label="Growth Center filters">{navItems.map(({ key, label: navLabel, icon: Icon }) => { const count = key === 'revenue' ? counts.revenue : key === 'suppliers' ? counts.suppliers : key === 'trade-events' ? counts.events : key === 'opportunities' ? opportunities.length : key === 'completed' ? completedItems.length : urgent + important; return <button key={key} type="button" onClick={() => changeFilter(key)} aria-pressed={filter === key} className={cn('flex w-full items-center justify-between rounded-ctl px-3 py-2.5 text-left text-sm font-normal text-content-secondary hover:bg-surface-2', filter === key && 'bg-info-bg font-medium text-brand-800')}><span className="flex items-center gap-3"><Icon className="h-4 w-4" />{navLabel}</span><span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-medium text-content-muted">{count}</span></button>; })}</nav>
          <button type="button" onClick={() => setShowIcp(true)} className={cn(workspacePanelClass, 'w-full p-4 text-left shadow-sm hover:bg-surface-2')}><div className="flex items-center gap-2"><Settings2 className="h-4 w-4 text-brand-700" /><p className="text-xs font-medium text-content-primary">Active ICP</p></div><p className="mt-2 text-xs leading-5 text-content-muted">{icpConfigured ? 'Matching preferences are configured. Review products, markets and buyer fit.' : 'Configure products, markets and buyer fit before running discovery.'}</p><span className="mt-3 inline-flex text-xs font-medium text-brand-700">{icpConfigured ? 'Review profile' : 'Start setup'}</span></button>
        </aside>

        <section className={cn(workspacePanelClass, 'min-w-0 overflow-hidden shadow-sm')}>
          <header className="border-b border-line px-5 py-5"><p className="text-xs font-medium uppercase tracking-wide text-brand-700">{filter === 'revenue' ? 'Revenue workspace' : filter === 'suppliers' ? 'Supplier workspace' : filter === 'trade-events' ? 'Trade Events workspace' : filter === 'opportunities' ? 'Internal opportunity finder' : 'Today · Business brief'}</p><h2 className="mt-2 text-2xl font-medium text-content-primary">{headline}</h2><p className="mt-1 text-sm text-content-secondary">{subtitle}</p></header>

          <div className="grid gap-3 border-b border-line p-4 sm:grid-cols-2" aria-label="Internal and external opportunity counts">
            <Link href="/growth-agent?view=crm-matches" className={cn(workspaceInsetClass, 'group p-4 transition hover:border-brand-300 hover:bg-info-bg')}><div className="flex items-start justify-between"><div><p className="text-caption uppercase text-content-muted">Internal opportunities</p><p className="mt-2 text-3xl font-medium text-brand-700">{opportunities.length}</p></div><Search className="h-5 w-5 text-brand-700" /></div><p className="mt-2 text-xs text-content-muted">Existing CRM records matching the active ICP.</p><span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand-700">Review CRM matches<ArrowRight className="h-3.5 w-3.5" /></span></Link>
            <Link href="/growth-agent?view=external-discovery" className={cn(workspaceInsetClass, 'group p-4 transition hover:border-info-fg hover:bg-info-bg')}><div className="flex items-start justify-between"><div><p className="text-caption uppercase text-content-muted">External discovery</p><p className="mt-2 text-3xl font-medium text-info-fg">{externalOpportunities.length}</p></div><Compass className="h-5 w-5 text-info-fg" /></div><p className="mt-2 text-xs text-content-muted">Source-backed companies outside CRM until approved.</p><span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand-700">Open discovery campaigns<ArrowRight className="h-3.5 w-3.5" /></span></Link>
          </div>

          <div className="flex overflow-x-auto border-b border-line px-4" role="tablist">{tabs.map(([key, name, count, Icon]) => <button key={key} type="button" onClick={() => changeFilter(key)} role="tab" aria-selected={filter === key} className={cn('flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-normal', filter === key ? 'border-brand-700 font-medium text-content-primary' : 'border-transparent text-content-muted')}><Icon className="h-4 w-4" />{name} ({count})</button>)}</div>
          {filter === 'revenue' ? <RevenueWorkspace selected={selected} /> : null}
          {filter === 'suppliers' ? <SupplierWorkspace recommendations={ordered} /> : null}
          <div className="min-h-72">{filter === 'opportunities' ? (opportunities.length ? opportunities.map((item) => <OpportunityItem key={item.leadId} item={item} />) : <div className="grid min-h-72 place-items-center p-8 text-center"><div><ShieldCheck className="mx-auto h-9 w-9 text-success-fg" /><p className="mt-3 text-sm font-medium text-content-primary">No internal opportunities in this view</p><p className="mt-1 text-xs text-content-muted">CRM matches will appear here when existing records meet the active ICP.</p><Link href="/growth-agent?view=crm-matches" className="mt-4 inline-flex text-xs font-medium text-brand-700">Open CRM Matches</Link></div></div>) : (filtered.length ? filtered.map((item) => <WorkItem key={item.id} item={item} active={item.id === selected?.id} onSelect={() => setSelectedId(item.id)} />) : <div className="grid min-h-72 place-items-center p-8 text-center"><div><ShieldCheck className="mx-auto h-9 w-9 text-success-fg" /><p className="mt-3 text-sm font-medium text-content-primary">No actions in this view</p><p className="mt-1 text-xs text-content-muted">Setu Guru will place verified work here when attention is needed.</p></div></div>)}</div>
          {tradeEvents.length ? <div className="flex flex-wrap items-center gap-2 border-t border-line p-4"><span className="text-xs font-medium text-content-muted">Upcoming trade events</span>{tradeEvents.slice(0, 2).map((event) => <Link key={event.id} href={`/growth-agent/trade-events/${event.id}`} className="inline-flex items-center gap-2 rounded-ctl border border-line bg-surface-1 px-3 py-2 text-xs font-medium text-brand-700 hover:bg-surface-2"><CalendarDays className="h-3.5 w-3.5" />{event.name}</Link>)}<Link href="/growth-agent?view=trade-events" className="text-xs font-medium text-brand-700">View all</Link></div> : null}
        </section>

        <div className="space-y-4">
          <div className="hidden xl:block">{selected ? <ActionPanel item={selected} onClose={() => setSelectedId(null)} /> : <aside className={cn(workspacePanelClass, 'grid min-h-80 place-items-center p-6 text-center shadow-sm')}><div><Building2 className="mx-auto h-8 w-8 text-content-muted" /><p className="mt-3 text-sm font-medium text-content-primary">Select an action</p><p className="mt-1 text-xs text-content-muted">Business impact and the next step will appear here.</p></div></aside>}</div>
          <section className={cn(workspacePanelClass, 'hidden p-4 shadow-sm xl:block')}><p className="text-xs font-medium uppercase tracking-wide text-brand-700">Setu Guru briefing</p><p className="mt-3 text-sm leading-6 text-content-secondary">{urgent + important ? `${urgent + important} actions need attention. ${counts.revenue} relate to revenue, ${counts.suppliers} to suppliers and ${counts.events} to trade events.` : 'No urgent actions are waiting. Review planning work and new opportunities.'}</p><p className="mt-3 text-xs text-content-muted">Internal CRM matches and external prospects are always shown separately.</p></section>
          <button type="button" onClick={() => setShowAudit(true)} className={cn(workspacePanelClass, 'hidden w-full p-4 text-left shadow-sm hover:bg-surface-2 xl:block')}><div className="flex items-center justify-between"><div className="flex items-center gap-2"><History className="h-4 w-4 text-brand-700" /><p className="text-sm font-medium text-content-primary">Setu Guru activity</p></div><span className="text-xs font-medium text-brand-700">View</span></div><p className="mt-2 text-xs leading-5 text-content-muted">{auditItems.length ? `${auditItems.length} recorded actions and approvals` : 'No activity recorded yet'}</p></button>
        </div>
      </div>

      {selected ? <div className="mt-5 xl:hidden"><ActionPanel item={selected} onClose={() => setSelectedId(null)} /></div> : null}
      <button type="button" onClick={() => setShowAudit(true)} className={cn(workspacePanelClass, 'mt-5 flex w-full items-center justify-between p-4 text-left xl:hidden')}><span className="flex items-center gap-2 text-sm font-medium"><History className="h-4 w-4 text-brand-700" />Setu Guru activity</span><span className="text-xs font-medium text-brand-700">View</span></button>

      {showIcp ? <Modal title="Set up ICP" onClose={() => setShowIcp(false)} wide><div className="p-4 lg:p-6"><IcpSetupWizard /></div></Modal> : null}
      {showAudit ? <Modal title="Setu Guru activity and approval audit" onClose={() => setShowAudit(false)} wide><div className="p-4"><AuditHistoryPanel items={auditItems} /></div></Modal> : null}
    </main>
  );
}
