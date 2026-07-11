'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
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
import type { SetuGuruRecommendation } from '@/lib/setu-guru/recommendations';
import type { OpportunityCard } from '@/lib/setu-guru/opportunity-finder';
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

const priorityRank: Record<SetuGuruRecommendation['priority'], number> = { urgent: 4, high: 3, medium: 2, low: 1 };
const navItems = [
  ['Today', '/growth-agent', LayoutDashboard],
  ['Revenue', '/quotes', CircleDollarSign],
  ['Suppliers', '/growth-agent/suppliers', Users],
  ['Trade Events', '/trade-events', CalendarDays],
  ['Pipeline', '/pipeline', Target],
  ['Research', '/growth-agent/icp', Search],
  ['History', '/growth-agent#history', History],
  ['Settings', '/growth-agent/icp', Settings2],
] as const;

function area(item: SetuGuruRecommendation): QueueFilter {
  const value = `${item.entity_type} ${item.recommendation_type} ${item.title}`.toLowerCase();
  if (/supplier|rfq|compliance|document/.test(value)) return 'suppliers';
  if (/event|trade show|meeting/.test(value)) return 'trade-events';
  if (/opportunity|research|icp|buyer match/.test(value)) return 'opportunities';
  if (/quote|order|revenue|follow.?up|buyer|lead/.test(value)) return 'revenue';
  return 'do-first';
}

function iconFor(item: SetuGuruRecommendation) {
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

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
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
      <div className="flex items-center gap-2">
        <Link href={item.action_href || '/growth-agent'} className={cn(workspacePrimaryButtonClass, 'inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-ctl px-4 text-sm font-semibold lg:flex-none')}>{item.recommended_action}<ArrowRight className="h-4 w-4" /></Link>
        <button type="button" onClick={onSelect} aria-label={`View details for ${item.title}`} className="grid h-10 w-10 place-items-center rounded-ctl border border-line bg-surface-1 text-content-muted"><MoreHorizontal className="h-4 w-4" /></button>
      </div>
    </article>
  );
}

function ActionPanel({ item, onClose }: { item: SetuGuruRecommendation; onClose: () => void }) {
  return (
    <aside className={cn(workspacePanelClass, 'sticky top-4 overflow-hidden')} aria-label="Action detail panel">
      <header className="flex items-center justify-between border-b border-line px-5 py-4"><StatusBadge label={item.priority === 'urgent' ? 'Do first' : item.priority} tone={tone(item.priority)} /><button type="button" onClick={onClose} aria-label="Close action detail" className="grid h-9 w-9 place-items-center rounded-ctl text-content-muted hover:bg-surface-2"><X className="h-4 w-4" /></button></header>
      <div className="p-5">
        <h2 className="text-xl font-semibold text-content-primary">{item.title}</h2><p className="mt-1 text-sm text-content-muted">{label(item.entity_type)}</p>
        <dl className="mt-5 grid grid-cols-2 overflow-hidden rounded-card border border-line bg-line">
          {[['Entity type', label(item.entity_type)], ['Work type', label(item.recommendation_type)], ['Status', label(item.status)], ['Business value', businessValue(item)], ['Created', new Date(item.created_at).toLocaleDateString()], ['Updated', new Date(item.updated_at).toLocaleDateString()]].map(([key, value]) => <div key={key} className="bg-surface-1 p-3"><dt className="text-caption uppercase text-content-muted">{key}</dt><dd className="mt-1 text-xs font-semibold text-content-primary">{value}</dd></div>)}
        </dl>
        <section className="mt-5 border-t border-line pt-5"><h3 className="text-sm font-semibold">Why this needs your attention</h3><p className="mt-2 text-sm leading-6 text-content-secondary">{item.reason}</p></section>
        <section className="mt-5 border-t border-line pt-5"><h3 className="text-sm font-semibold">Business context</h3><p className="mt-2 text-sm leading-6 text-content-secondary">{item.summary || 'No additional context is available for this action.'}</p></section>
        <section className="mt-5 border-t border-line pt-5"><h3 className="text-sm font-semibold">Next best action</h3><p className="mt-2 text-sm leading-6 text-content-secondary">{item.recommended_action}</p></section>
        <div className="mt-6 flex gap-3"><Link href={item.action_href || '/growth-agent'} className={cn(workspacePrimaryButtonClass, 'inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-ctl px-4 text-sm font-semibold')}>{item.recommended_action}<ArrowRight className="h-4 w-4" /></Link><button type="button" className={cn(workspaceSecondaryButtonClass, 'rounded-ctl px-4 text-sm font-semibold')}>Mark complete</button></div>
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
  const counts = { revenue: ordered.filter((item) => area(item) === 'revenue').length, suppliers: ordered.filter((item) => area(item) === 'suppliers').length, 'trade-events': ordered.filter((item) => area(item) === 'trade-events').length, opportunities: opportunities.length };
  const [filter, setFilter] = useState<QueueFilter>('do-first');
  const [selectedId, setSelectedId] = useState<string | null>(ordered[0]?.id ?? null);
  const selected = ordered.find((item) => item.id === selectedId) ?? null;
  const filtered = filter === 'do-first' ? (ordered.filter((item) => item.priority === 'urgent' || item.priority === 'high').length ? ordered.filter((item) => item.priority === 'urgent' || item.priority === 'high') : ordered) : ordered.filter((item) => area(item) === filter);
  const tabs: Array<[QueueFilter, string, number, typeof TriangleAlert]> = [['do-first', 'Do First', urgent + important, TriangleAlert], ['revenue', 'Revenue', counts.revenue, CircleDollarSign], ['suppliers', 'Suppliers', counts.suppliers, PackageCheck], ['trade-events', 'Trade Events', counts['trade-events'], CalendarDays], ['opportunities', 'Opportunities', counts.opportunities, Target]];

  return (
    <main className="pb-10">
      <div className="grid gap-5 xl:grid-cols-[230px_minmax(0,1fr)_340px]">
        <aside className="space-y-4">
          <section className={cn(workspacePanelClass, 'p-4')}><div className="flex items-center gap-3"><GuruAvatar size="md" /><div><p className="text-sm font-semibold text-brand-800">Setu Guru</p><p className="text-xs text-content-muted">{ordered.length} actions today</p></div></div><div className="mt-4 flex flex-wrap gap-2"><StatusBadge label={`${urgent} urgent`} tone="danger" /><StatusBadge label={`${important} important`} tone="warning" /><StatusBadge label={`${planning} planning`} tone="success" /></div><a href="#business-brief" className="mt-4 flex items-center justify-center gap-2 border-t border-line pt-4 text-xs font-semibold text-brand-700">Open today&apos;s brief <ArrowRight className="h-3.5 w-3.5" /></a></section>
          <nav className={cn(workspacePanelClass, 'p-2')} aria-label="Growth Center navigation">{navItems.map(([name, href, Icon], index) => <Link key={name} href={href} className={cn('flex items-center gap-3 rounded-ctl px-3 py-2.5 text-sm text-content-secondary hover:bg-surface-2', index === 0 && 'bg-info-bg font-semibold text-brand-800')}><Icon className="h-4 w-4" />{name}</Link>)}<div className={cn(workspaceInsetClass, 'm-2 mt-4 p-3 text-center text-xs leading-5 text-content-muted')}>Organized by business outcome, not recommendation type.</div></nav>
        </aside>

        <section id="business-brief" className={cn(workspacePanelClass, 'min-w-0 overflow-hidden')}>
          <header className="flex flex-col gap-4 border-b border-line px-5 py-5 md:flex-row md:items-start md:justify-between"><div><p className="text-xs font-semibold uppercase text-brand-700">Today · Business brief</p><h1 className="mt-2 text-2xl font-semibold text-content-primary">{greeting()}, Ritesh</h1><p className="mt-1 text-sm text-content-secondary">Here is what needs your attention across {organizationName || 'your business'} today.</p></div><div className="flex gap-2"><button type="button" className={cn(workspaceSecondaryButtonClass, 'min-h-10 rounded-ctl px-4 text-sm font-semibold')}>Refresh</button><div className={cn(workspaceInsetClass, 'inline-flex min-h-10 items-center gap-2 px-4 text-sm')}><CalendarDays className="h-4 w-4" />{new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div></div></header>
          <div className="grid gap-3 p-4 sm:grid-cols-2 2xl:grid-cols-4">{[["Actions at risk", urgent + important, TriangleAlert, 'text-danger-fg'], ['Revenue actions', counts.revenue, CircleDollarSign, 'text-success-fg'], ['Completed this week', completed, CheckCircle2, 'text-info-fg'], ['New opportunities', opportunities.length, Target, 'text-brand-700']].map(([name, value, Icon, color]) => <div key={String(name)} className={workspaceMetricClass}><p className="text-caption uppercase text-content-muted">{String(name)}</p><div className="mt-3 flex items-end justify-between"><p className={cn('text-2xl font-semibold', String(color))}>{String(value)}</p><Icon className={cn('h-5 w-5', String(color))} /></div></div>)}</div>
          <div className="flex overflow-x-auto border-y border-line px-4" role="tablist">{tabs.map(([key, name, count, Icon]) => <button key={key} type="button" onClick={() => setFilter(key)} role="tab" aria-selected={filter === key} className={cn('flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm', filter === key ? 'border-brand-700 font-semibold text-content-primary' : 'border-transparent text-content-muted')}><Icon className="h-4 w-4" />{name} ({count})</button>)}</div>
          <div className="min-h-72">{filtered.length ? filtered.map((item) => <WorkItem key={item.id} item={item} active={item.id === selectedId} onSelect={() => setSelectedId(item.id)} />) : <div className="grid min-h-72 place-items-center p-8 text-center"><div><ShieldCheck className="mx-auto h-9 w-9 text-success-fg" /><h2 className="mt-3 text-base font-semibold">No actions in this workspace</h2><p className="mt-1 text-sm text-content-muted">Setu Guru will place verified business actions here when they need attention.</p></div></div>}</div>
          {tradeEvents.length ? <div className="border-t border-line p-4"><p className="mb-3 text-caption uppercase text-content-muted">Recent trade events</p><div className="grid gap-2 sm:grid-cols-2">{tradeEvents.slice(0, 2).map((event) => <Link key={event.id} href={`/growth-agent/trade-events/${event.id}`} className={cn(workspaceInsetClass, 'flex items-center justify-between p-3 text-sm font-semibold')}><span className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-brand-700" />{event.name}</span><ArrowRight className="h-4 w-4" /></Link>)}</div></div> : null}
        </section>

        <div className="hidden xl:block">{selected ? <ActionPanel item={selected} onClose={() => setSelectedId(null)} /> : <aside className={cn(workspacePanelClass, 'grid min-h-80 place-items-center p-6 text-center')}><div><Building2 className="mx-auto h-8 w-8 text-content-muted" /><p className="mt-3 text-sm font-semibold">Select a work item</p><p className="mt-1 text-xs text-content-muted">See who, what, why, value, and the next action.</p></div></aside>}</div>
      </div>
      {selected ? <div className="mt-5 xl:hidden"><ActionPanel item={selected} onClose={() => setSelectedId(null)} /></div> : null}
      {!icpConfigured ? <section className={cn(workspacePanelClass, 'mt-5 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between')}><div className="flex items-start gap-3"><Sparkles className="mt-0.5 h-5 w-5 text-brand-700" /><div><h2 className="text-sm font-semibold">Improve opportunity matching</h2><p className="mt-1 text-sm text-content-muted">Set up your ideal customer profile so Research can prioritize the right buyers.</p></div></div><Link href="/growth-agent/icp" className={cn(workspaceSecondaryButtonClass, 'inline-flex min-h-10 items-center justify-center rounded-ctl px-4 text-sm font-semibold')}>Set up ICP</Link></section> : null}
    </main>
  );
}
