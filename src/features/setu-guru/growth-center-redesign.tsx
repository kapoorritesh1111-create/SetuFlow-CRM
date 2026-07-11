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
  MoreHorizontal,
  PackageCheck,
  Search,
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
import {
  workspaceInsetClass,
  workspaceMetricClass,
  workspacePanelClass,
  workspacePrimaryButtonClass,
  workspaceSecondaryButtonClass,
} from '@/components/ui/workspace-surfaces';
import type { OpportunityCard } from '@/lib/setu-guru/opportunity-finder';
import type { SetuGuruRecommendation } from '@/lib/setu-guru/recommendations';
import { cn } from '@/lib/utils';

type TradeEventSummary = { id: string; name: string; starts_on: string | null; ends_on: string | null };
type QueueFilter = 'do-first' | 'revenue' | 'suppliers' | 'trade-events' | 'opportunities';
type GrowthCenterProps = {
  organizationName?: string | null;
  recommendations: SetuGuruRecommendation[];
  history: SetuGuruRecommendation[];
  opportunities?: OpportunityCard[];
  icpConfigured?: boolean;
  tradeEvents?: TradeEventSummary[];
};
type Metric = { label: string; value: number; icon: LucideIcon; color: string };

const priorityRank: Record<SetuGuruRecommendation['priority'], number> = { urgent: 4, high: 3, medium: 2, low: 1 };
const navItems: Array<[string, string, LucideIcon]> = [
  ['Today', '/growth-agent', LayoutDashboard],
  ['Revenue', '/quotes', CircleDollarSign],
  ['Suppliers', '/growth-agent/suppliers', Users],
  ['Trade Events', '/trade-events', CalendarDays],
  ['Pipeline', '/pipeline', Target],
  ['Research', '/growth-agent/icp', Search],
  ['History', '/growth-agent#history', History],
  ['Settings', '/growth-agent/icp', Settings2],
];

function area(item: SetuGuruRecommendation): QueueFilter {
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
    ?? 'Business impact identified';
}

function WorkItem({ item, active, onSelect }: { item: SetuGuruRecommendation; active: boolean; onSelect: () => void }) {
  const Icon = iconFor(item);
  return (
    <article className={cn('grid gap-4 border-b border-line px-4 py-4 last:border-0 lg:grid-cols-[minmax(220px,1.5fr)_minmax(190px,1.1fr)_minmax(140px,.8fr)_auto] lg:items-center', active && 'bg-surface-2')}>
      <button type="button" onClick={onSelect} className="flex min-w-0 items-start gap-3 text-left">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-card border border-line bg-surface-2 text-brand-700"><Icon className="h-5 w-5" /></span>
        <span className="min-w-0"><strong className="block truncate text-sm text-content-primary">{item.title}</strong><span className="mt-1 block text-xs text-content-muted">{label(item.entity_type)}</span></span>
      </button>
      <button type="button" onClick={onSelect} className="text-left"><strong className="block text-xs text-danger-fg">{item.reason}</strong><span className="mt-1 block text-xs text-content-muted">Updated {new Date(item.updated_at).toLocaleDateString()}</span></button>
      <button type="button" onClick={onSelect} className="text-left"><span className="block text-caption uppercase text-content-muted">Value / impact</span><strong className="mt-1 block text-sm text-content-primary">{businessValue(item)}</strong></button>
      <div className="flex items-center gap-2"><Link href={item.action_href || '/growth-agent'} className={cn(workspacePrimaryButtonClass, 'inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-ctl px-4 text-sm font-semibold lg:flex-none')}>{item.recommended_action}<ArrowRight className="h-4 w-4" /></Link><button type="button" onClick={onSelect} aria-label={`View details for ${item.title}`} className="grid h-10 w-10 place-items-center rounded-ctl border border-line bg-surface-1 text-content-muted"><MoreHorizontal className="h-4 w-4" /></button></div>
    </article>
  );
}

function ActionPanel({ item, onClose }: { item: SetuGuruRecommendation; onClose: () => void }) {
  return (
    <aside className={cn(workspacePanelClass, 'sticky top-4 overflow-hidden')} aria-label="Action detail panel">
      <header className="flex items-center justify-between border-b border-line px-5 py-4"><StatusBadge label={item.priority === 'urgent' ? 'Do first' : item.priority} tone={tone(item.priority)} /><button type="button" onClick={onClose} aria-label="Close action detail" className="grid h-9 w-9 place-items-center rounded-ctl text-content-muted hover:bg-surface-2"><X className="h-4 w-4" /></button></header>
      <div className="p-5">
        <h2 className="text-xl font-semibold text-content-primary">{item.title}</h2><p className="mt-1 text-sm text-content-muted">{label(item.entity_type)}</p>
        <dl className="mt-5 grid grid-cols-2 overflow-hidden rounded-card border border-line bg-line">{[['Entity type', label(item.entity_type)], ['Work type', label(item.recommendation_type)], ['Status', label(item.status)], ['Business value', businessValue(item)]].map(([key, value]) => <div key={key} className="bg-surface-1 p-3"><dt className="text-caption uppercase text-content-muted">{key}</dt><dd className="mt-1 text-xs font-semibold text-content-primary">{value}</dd></div>)}</dl>
        <section className="mt-5 border-t border-line pt-5"><h3 className="text-sm font-semibold">Why this needs your attention</h3><p className="mt-2 text-sm leading-6 text-content-secondary">{item.reason}</p></section>
        <section className="mt-5 border-t border-line pt-5"><h3 className="text-sm font-semibold">Next best action</h3><p className="mt-2 text-sm leading-6 text-content-secondary">{item.recommended_action}</p></section>
        <Link href={item.action_href || '/growth-agent'} className={cn(workspacePrimaryButtonClass, 'mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-ctl px-4 text-sm font-semibold')}>{item.recommended_action}<ArrowRight className="h-4 w-4" /></Link>
        <p className="mt-4 text-xs text-content-muted">Nothing is sent or changed without your approval.</p>
      </div>
    </aside>
  );
}

export function GrowthCenter({ organizationName, recommendations, history, opportunities = [], icpConfigured = false, tradeEvents = [] }: GrowthCenterProps) {
  const ordered = useMemo(() => [...recommendations].sort((a, b) => priorityRank[b.priority] - priorityRank[a.priority] || Date.parse(b.created_at) - Date.parse(a.created_at)), [recommendations]);
  const urgent = ordered.filter((item) => item.priority === 'urgent').length;
  const important = ordered.filter((item) => item.priority === 'high').length;
  const planning = ordered.length - urgent - important;
  const completed = history.filter((item) => Date.now() - Date.parse(item.updated_at) <= 604800000).length;
  const counts = { revenue: ordered.filter((item) => area(item) === 'revenue').length, suppliers: ordered.filter((item) => area(item) === 'suppliers').length, events: ordered.filter((item) => area(item) === 'trade-events').length };
  const [filter, setFilter] = useState<QueueFilter>('do-first');
  const [selectedId, setSelectedId] = useState<string | null>(ordered[0]?.id ?? null);
  const selected = ordered.find((item) => item.id === selectedId) ?? null;
  const urgentItems = ordered.filter((item) => item.priority === 'urgent' || item.priority === 'high');
  const filtered = filter === 'do-first' ? (urgentItems.length ? urgentItems : ordered) : ordered.filter((item) => area(item) === filter);
  const tabs: Array<[QueueFilter, string, number, LucideIcon]> = [['do-first', 'Do First', urgent + important, TriangleAlert], ['revenue', 'Revenue', counts.revenue, CircleDollarSign], ['suppliers', 'Suppliers', counts.suppliers, PackageCheck], ['trade-events', 'Trade Events', counts.events, CalendarDays], ['opportunities', 'Opportunities', opportunities.length, Target]];
  const metrics: Metric[] = [
    { label: 'Actions at risk', value: urgent + important, icon: TriangleAlert, color: 'text-danger-fg' },
    { label: 'Revenue actions', value: counts.revenue, icon: CircleDollarSign, color: 'text-success-fg' },
    { label: 'Completed this week', value: completed, icon: CheckCircle2, color: 'text-info-fg' },
    { label: 'New opportunities', value: opportunities.length, icon: Target, color: 'text-brand-700' },
  ];

  return (
    <main className="pb-10">
      <div className="grid gap-5 xl:grid-cols-[230px_minmax(0,1fr)_340px]">
        <aside className="space-y-4"><section className={cn(workspacePanelClass, 'p-4')}><div className="flex items-center gap-3"><GuruAvatar size="md" /><div><p className="text-sm font-semibold text-brand-800">Setu Guru</p><p className="text-xs text-content-muted">{ordered.length} actions today</p></div></div><div className="mt-4 flex flex-wrap gap-2"><StatusBadge label={`${urgent} urgent`} tone="danger" /><StatusBadge label={`${important} important`} tone="warning" /><StatusBadge label={`${planning} planning`} tone="success" /></div></section><nav className={cn(workspacePanelClass, 'p-2')} aria-label="Growth Center navigation">{navItems.map(([name, href, Icon], index) => <Link key={name} href={href} className={cn('flex items-center gap-3 rounded-ctl px-3 py-2.5 text-sm text-content-secondary hover:bg-surface-2', index === 0 && 'bg-info-bg font-semibold text-brand-800')}><Icon className="h-4 w-4" />{name}</Link>)}</nav></aside>
        <section className={cn(workspacePanelClass, 'min-w-0 overflow-hidden')}><header className="border-b border-line px-5 py-5"><p className="text-xs font-semibold uppercase text-brand-700">Today · Business brief</p><h1 className="mt-2 text-2xl font-semibold text-content-primary">Trade Growth Command Center</h1><p className="mt-1 text-sm text-content-secondary">Here is what needs attention across {organizationName || 'your business'} today.</p></header><div className="grid gap-3 p-4 sm:grid-cols-2 2xl:grid-cols-4">{metrics.map(({ label: metricLabel, value, icon: Icon, color }) => <div key={metricLabel} className={workspaceMetricClass}><p className="text-caption uppercase text-content-muted">{metricLabel}</p><div className="mt-3 flex items-end justify-between"><p className={cn('text-2xl font-semibold', color)}>{value}</p><Icon className={cn('h-5 w-5', color)} /></div></div>)}</div><div className="flex overflow-x-auto border-y border-line px-4" role="tablist">{tabs.map(([key, name, count, Icon]) => <button key={key} type="button" onClick={() => setFilter(key)} role="tab" aria-selected={filter === key} className={cn('flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm', filter === key ? 'border-brand-700 font-semibold text-content-primary' : 'border-transparent text-content-muted')}><Icon className="h-4 w-4" />{name} ({count})</button>)}</div><div className="min-h-72">{filtered.length ? filtered.map((item) => <WorkItem key={item.id} item={item} active={item.id === selectedId} onSelect={() => setSelectedId(item.id)} />) : <div className="grid min-h-72 place-items-center p-8 text-center"><ShieldCheck className="h-9 w-9 text-success-fg" /></div>}</div>{tradeEvents.length ? <div className="border-t border-line p-4">{tradeEvents.slice(0, 2).map((event) => <Link key={event.id} href={`/growth-agent/trade-events/${event.id}`} className="mr-4 text-sm font-semibold text-brand-700">{event.name}</Link>)}</div> : null}</section>
        <div className="hidden xl:block">{selected ? <ActionPanel item={selected} onClose={() => setSelectedId(null)} /> : <aside className={cn(workspacePanelClass, 'grid min-h-80 place-items-center p-6 text-center')}><Building2 className="h-8 w-8 text-content-muted" /></aside>}</div>
      </div>
      {selected ? <div className="mt-5 xl:hidden"><ActionPanel item={selected} onClose={() => setSelectedId(null)} /></div> : null}
      {!icpConfigured ? <section className={cn(workspacePanelClass, 'mt-5 flex items-center justify-between p-5')}><div className="flex items-center gap-3"><Sparkles className="h-5 w-5 text-brand-700" /><p className="text-sm">Set up your ICP to improve opportunity matching.</p></div><Link href="/growth-agent/icp" className={cn(workspaceSecondaryButtonClass, 'rounded-ctl px-4 py-2 text-sm font-semibold')}>Set up ICP</Link></section> : null}
    </main>
  );
}
