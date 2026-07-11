'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  FileText,
  FlaskConical,
  History,
  LayoutDashboard,
  PackageCheck,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  TriangleAlert,
  Users,
  X,
} from 'lucide-react';

import { GuruAvatar } from '@/components/ui/guru-avatar';
import { StatusBadge } from '@/components/ui/status-badge';
import { AuditHistoryPanel } from '@/features/setu-guru/audit-history-panel';
import {
  workspaceInsetClass,
  workspaceMetricClass,
  workspacePanelClass,
  workspacePrimaryButtonClass,
  workspaceSecondaryButtonClass,
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
  icpConfigured?: boolean;
  tradeEvents?: TradeEventSummary[];
  auditItems?: SetuGuruAuditItem[];
};
type Metric = { label: string; value: number; icon: LucideIcon; color: string };
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
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/45 p-4 pt-10 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title}>
      <div className={cn('w-full overflow-hidden rounded-2xl border border-line bg-surface-1 shadow-2xl', wide ? 'max-w-6xl' : 'max-w-4xl')}>
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-base font-semibold text-content-primary">{title}</h2>
          <button type="button" onClick={onClose} aria-label={`Close ${title}`} className="grid h-9 w-9 place-items-center rounded-ctl text-content-muted hover:bg-surface-2"><X className="h-4 w-4" /></button>
        </header>
        <div className="max-h-[82vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function WorkItem({ item, active, onSelect }: { item: SetuGuruRecommendation; active: boolean; onSelect: () => void }) {
  const Icon = iconFor(item);
  return (
    <article className={cn('grid gap-4 border-b border-line px-4 py-4 last:border-0 lg:grid-cols-[minmax(220px,1.45fr)_minmax(210px,1.2fr)_minmax(130px,.7fr)_auto] lg:items-center', active && 'bg-surface-2')}>
      <button type="button" onClick={onSelect} className="flex min-w-0 items-start gap-3 text-left">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-card border border-line bg-surface-2 text-brand-700"><Icon className="h-5 w-5" /></span>
        <span className="min-w-0"><strong className="block truncate text-sm text-content-primary">{item.title}</strong><span className="mt-1 block text-xs text-content-muted">{label(item.entity_type)}</span></span>
      </button>
      <button type="button" onClick={onSelect} className="text-left"><strong className="block text-xs text-danger-fg">{item.reason}</strong><span className="mt-1 block text-xs text-content-muted">Updated {new Date(item.updated_at).toLocaleDateString()}</span></button>
      <button type="button" onClick={onSelect} className="text-left"><span className="block text-caption uppercase text-content-muted">Value / impact</span><strong className="mt-1 block text-sm text-content-primary">{businessValue(item)}</strong></button>
      <Link href={item.action_href || '/growth-agent'} className={cn(workspacePrimaryButtonClass, 'inline-flex min-h-9 min-w-28 items-center justify-center gap-2 rounded-ctl px-4 text-sm font-semibold')}>{shortAction(item)}<ArrowRight className="h-4 w-4" /></Link>
    </article>
  );
}

function ActionPanel({ item, onClose }: { item: SetuGuruRecommendation; onClose: () => void }) {
  return (
    <aside className={cn(workspacePanelClass, 'sticky top-4 overflow-hidden')} aria-label="Action detail panel">
      <header className="flex items-center justify-between border-b border-line px-5 py-4"><StatusBadge label={item.priority === 'urgent' ? 'Do first' : item.priority} tone={tone(item.priority)} /><button type="button" onClick={onClose} aria-label="Close action detail" className="grid h-9 w-9 place-items-center rounded-ctl text-content-muted hover:bg-surface-2"><X className="h-4 w-4" /></button></header>
      <div className="p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">{label(item.entity_type)}</p>
        <h2 className="mt-2 text-xl font-semibold leading-7 text-content-primary">{item.title}</h2>
        <section className="mt-5 rounded-card border border-line bg-surface-2 p-4"><p className="text-caption uppercase text-content-muted">Why now</p><p className="mt-2 text-sm leading-6 text-content-secondary">{item.reason}</p></section>
        <section className="mt-4 grid grid-cols-2 gap-3"><div className={cn(workspaceInsetClass, 'p-3')}><p className="text-caption uppercase text-content-muted">Business impact</p><p className="mt-2 text-sm font-semibold text-content-primary">{businessValue(item)}</p></div><div className={cn(workspaceInsetClass, 'p-3')}><p className="text-caption uppercase text-content-muted">Status</p><p className="mt-2 text-sm font-semibold text-content-primary">{label(item.status)}</p></div></section>
        <section className="mt-5 border-t border-line pt-5"><h3 className="text-sm font-semibold">Next step</h3><p className="mt-2 text-sm leading-6 text-content-secondary">{shortAction(item)} and confirm the latest record details.</p></section>
        <Link href={item.action_href || '/growth-agent'} className={cn(workspacePrimaryButtonClass, 'mt-6 inline-flex min-h-10 items-center justify-center gap-2 rounded-ctl px-4 text-sm font-semibold')}>{shortAction(item)}<ArrowRight className="h-4 w-4" /></Link>
        <p className="mt-4 text-xs text-content-muted">You stay in control. Nothing is sent automatically.</p>
      </div>
    </aside>
  );
}

export function GrowthCenter({ organizationName, recommendations, history, opportunities = [], icpConfigured = false, tradeEvents = [], auditItems = [] }: GrowthCenterProps) {
  const ordered = useMemo(() => [...recommendations].sort((a, b) => priorityRank[b.priority] - priorityRank[a.priority] || Date.parse(b.created_at) - Date.parse(a.created_at)), [recommendations]);
  const completedItems = useMemo(() => [...history].sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at)), [history]);
  const urgent = ordered.filter((item) => item.priority === 'urgent').length;
  const important = ordered.filter((item) => item.priority === 'high').length;
  const planning = ordered.length - urgent - important;
  const completed = completedItems.filter((item) => Date.now() - Date.parse(item.updated_at) <= 604800000).length;
  const counts = { revenue: ordered.filter((item) => area(item) === 'revenue').length, suppliers: ordered.filter((item) => area(item) === 'suppliers').length, events: ordered.filter((item) => area(item) === 'trade-events').length };
  const [filter, setFilter] = useState<QueueFilter>('do-first');
  const [selectedId, setSelectedId] = useState<string | null>(ordered[0]?.id ?? null);
  const [showIcp, setShowIcp] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const urgentItems = ordered.filter((item) => item.priority === 'urgent' || item.priority === 'high');
  const filtered = filter === 'completed' ? completedItems : filter === 'do-first' ? (urgentItems.length ? urgentItems : ordered) : ordered.filter((item) => area(item) === filter);
  const selected = [...ordered, ...completedItems].find((item) => item.id === selectedId) ?? filtered[0] ?? null;
  const tabs: Array<[QueueFilter, string, number, LucideIcon]> = [['do-first', 'Do First', urgent + important, TriangleAlert], ['revenue', 'Revenue', counts.revenue, CircleDollarSign], ['suppliers', 'Suppliers', counts.suppliers, PackageCheck], ['trade-events', 'Trade Events', counts.events, CalendarDays], ['opportunities', 'Opportunities', opportunities.length, Target]];
  const metrics: Metric[] = [
    { label: 'Actions at risk', value: urgent + important, icon: TriangleAlert, color: 'text-danger-fg' },
    { label: 'Revenue actions', value: counts.revenue, icon: CircleDollarSign, color: 'text-success-fg' },
    { label: 'Completed this week', value: completed, icon: CheckCircle2, color: 'text-info-fg' },
    { label: 'New opportunities', value: opportunities.length, icon: Target, color: 'text-brand-700' },
  ];

  function changeFilter(next: QueueFilter) {
    setFilter(next);
    const source = next === 'completed' ? completedItems : next === 'do-first' ? (urgentItems.length ? urgentItems : ordered) : ordered.filter((item) => area(item) === next);
    setSelectedId(source[0]?.id ?? null);
  }

  return (
    <main className="pb-10">
      <div className="grid gap-5 xl:grid-cols-[210px_minmax(0,1fr)_320px]">
        <aside className="space-y-4">
          <section className={cn(workspacePanelClass, 'p-4')}><div className="flex items-center gap-3"><GuruAvatar size="md" /><div><p className="text-sm font-semibold text-brand-800">Setu Guru</p><p className="text-xs text-content-muted">{ordered.length} actions today</p></div></div><div className="mt-4 flex flex-wrap gap-2"><StatusBadge label={`${urgent} urgent`} tone="danger" /><StatusBadge label={`${important} important`} tone="warning" /><StatusBadge label={`${planning} planning`} tone="success" /></div></section>
          <nav className={cn(workspacePanelClass, 'p-2')} aria-label="Growth Center filters">{navItems.map(({ key, label: navLabel, icon: Icon }) => <button key={key} type="button" onClick={() => changeFilter(key)} aria-pressed={filter === key} className={cn('flex w-full items-center gap-3 rounded-ctl px-3 py-2.5 text-left text-sm text-content-secondary hover:bg-surface-2', filter === key && 'bg-info-bg font-semibold text-brand-800')}><Icon className="h-4 w-4" />{navLabel}</button>)}</nav>
          <button type="button" onClick={() => setShowIcp(true)} className={cn(workspacePanelClass, 'w-full p-3 text-left hover:bg-surface-2')}><div className="flex items-center gap-2"><Settings2 className="h-4 w-4 text-brand-700" /><p className="text-xs font-semibold text-content-primary">Set up ICP</p></div><p className="mt-1 text-xs leading-5 text-content-muted">{icpConfigured ? 'Review matching preferences' : 'Configure products, markets and buyer fit'}</p><span className="mt-3 inline-flex text-xs font-semibold text-brand-700">Open setup</span></button>
        </aside>
        <section className={cn(workspacePanelClass, 'min-w-0 overflow-hidden')}>
          <header className="border-b border-line px-5 py-5"><p className="text-xs font-semibold uppercase text-brand-700">Today · Business brief</p><h1 className="mt-2 text-2xl font-semibold text-content-primary">Trade Growth Command Center</h1><p className="mt-1 text-sm text-content-secondary">Here is what needs attention across {organizationName || 'your business'} today.</p></header>
          <div className="grid gap-3 p-4 sm:grid-cols-2 2xl:grid-cols-4">{metrics.map(({ label: metricLabel, value, icon: Icon, color }) => <div key={metricLabel} className={workspaceMetricClass}><p className="text-caption uppercase text-content-muted">{metricLabel}</p><div className="mt-3 flex items-end justify-between"><p className={cn('text-2xl font-semibold', color)}>{value}</p><Icon className={cn('h-5 w-5', color)} /></div></div>)}</div>
          <div className="flex overflow-x-auto border-y border-line px-4" role="tablist">{tabs.map(([key, name, count, Icon]) => <button key={key} type="button" onClick={() => changeFilter(key)} role="tab" aria-selected={filter === key} className={cn('flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm', filter === key ? 'border-brand-700 font-semibold text-content-primary' : 'border-transparent text-content-muted')}><Icon className="h-4 w-4" />{name} ({count})</button>)}</div>
          <div className="min-h-72">{filtered.length ? filtered.map((item) => <WorkItem key={item.id} item={item} active={item.id === selected?.id} onSelect={() => setSelectedId(item.id)} />) : <div className="grid min-h-72 place-items-center p-8 text-center"><div><ShieldCheck className="mx-auto h-9 w-9 text-success-fg" /><p className="mt-3 text-sm font-semibold text-content-primary">No actions in this view</p><p className="mt-1 text-xs text-content-muted">Setu Guru will place verified work here when attention is needed.</p></div></div>}</div>
          {tradeEvents.length ? <div className="border-t border-line p-4">{tradeEvents.slice(0, 2).map((event) => <Link key={event.id} href={`/growth-agent/trade-events/${event.id}`} className="mr-4 text-sm font-semibold text-brand-700">{event.name}</Link>)}</div> : null}
        </section>
        <div className="space-y-4">
          <div className="hidden xl:block">{selected ? <ActionPanel item={selected} onClose={() => setSelectedId(null)} /> : <aside className={cn(workspacePanelClass, 'grid min-h-80 place-items-center p-6 text-center')}><Building2 className="h-8 w-8 text-content-muted" /></aside>}</div>
          <button type="button" onClick={() => setShowAudit(true)} className={cn(workspacePanelClass, 'hidden w-full p-4 text-left hover:bg-surface-2 xl:block')}><div className="flex items-center justify-between"><div className="flex items-center gap-2"><History className="h-4 w-4 text-brand-700" /><p className="text-sm font-semibold text-content-primary">Setu Guru activity</p></div><span className="text-xs font-semibold text-brand-700">View</span></div><p className="mt-2 text-xs leading-5 text-content-muted">{auditItems.length ? `${auditItems.length} recorded actions and approvals` : 'No activity recorded yet'}</p></button>
        </div>
      </div>
      {selected ? <div className="mt-5 xl:hidden"><ActionPanel item={selected} onClose={() => setSelectedId(null)} /></div> : null}
      <button type="button" onClick={() => setShowAudit(true)} className={cn(workspacePanelClass, 'mt-5 flex w-full items-center justify-between p-4 text-left xl:hidden')}><span className="flex items-center gap-2 text-sm font-semibold"><History className="h-4 w-4 text-brand-700" />Setu Guru activity</span><span className="text-xs font-semibold text-brand-700">View</span></button>

      {showIcp ? <Modal title="Set up ICP" onClose={() => setShowIcp(false)} wide><iframe title="ICP setup" src="/growth-agent/icp" className="h-[76vh] w-full bg-surface-1" /></Modal> : null}
      {showAudit ? <Modal title="Setu Guru activity and approval audit" onClose={() => setShowAudit(false)} wide><div className="p-4"><AuditHistoryPanel items={auditItems} /></div></Modal> : null}
    </main>
  );
}
