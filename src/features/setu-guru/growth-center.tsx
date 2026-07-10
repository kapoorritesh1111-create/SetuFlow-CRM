import Link from 'next/link';
import {
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  FileText,
  History,
  PackageCheck,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';

import { GuruAvatar } from '@/components/ui/guru-avatar';
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge';
import {
  workspaceHeroClass,
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

type GrowthCenterProps = {
  organizationName?: string | null;
  recommendations: SetuGuruRecommendation[];
  history: SetuGuruRecommendation[];
  opportunities?: OpportunityCard[];
  icpConfigured?: boolean;
  tradeEvents?: TradeEventSummary[];
};

type ActionSection = {
  key: string;
  title: string;
  description: string;
  href: string;
  icon: typeof Users;
  emptyTitle: string;
  matches: (recommendation: SetuGuruRecommendation) => boolean;
};

const sections: ActionSection[] = [
  {
    key: 'buyers',
    title: 'Buyer opportunities',
    description: 'Outreach, catalog, and buyer follow-up actions.',
    href: '/leads',
    icon: Users,
    emptyTitle: 'No buyer actions need attention',
    matches: (item) => ['lead', 'buyer'].includes(item.entity_type),
  },
  {
    key: 'quotes',
    title: 'Quote actions',
    description: 'Quote requests and sent quotes waiting for action.',
    href: '/quotes',
    icon: FileText,
    emptyTitle: 'No quote follow-ups are due',
    matches: (item) => item.entity_type === 'quote' || item.recommendation_type.includes('quote'),
  },
  {
    key: 'suppliers',
    title: 'Supplier actions',
    description: 'RFQs, documents, capability, and sourcing blockers.',
    href: '/leads?type=supplier',
    icon: PackageCheck,
    emptyTitle: 'No supplier blockers found',
    matches: (item) => ['supplier', 'rfq'].includes(item.entity_type),
  },
  {
    key: 'events',
    title: 'Trade event actions',
    description: 'Post-show leads and event work needing attention.',
    href: '/trade-events',
    icon: CalendarDays,
    emptyTitle: 'No trade event actions are due',
    matches: (item) => item.entity_type === 'trade_event' || item.recommendation_type.includes('trade_event'),
  },
];

const priorityRank: Record<SetuGuruRecommendation['priority'], number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};

function priorityTone(priority: SetuGuruRecommendation['priority']): StatusTone {
  if (priority === 'urgent') return 'danger';
  if (priority === 'high') return 'warning';
  if (priority === 'medium') return 'info';
  return 'neutral';
}

function RecommendationCard({ recommendation, compact = false }: { recommendation: SetuGuruRecommendation; compact?: boolean }) {
  const href = recommendation.action_href || '/growth-agent';

  return (
    <article className={cn(workspaceInsetClass, compact ? 'p-3.5' : 'p-4')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-content-primary">{recommendation.title}</h3>
          <p className="mt-1 text-sm leading-6 text-content-secondary">{recommendation.summary || recommendation.reason}</p>
        </div>
        <StatusBadge label={recommendation.priority} tone={priorityTone(recommendation.priority)} />
      </div>
      {!compact ? (
        <div className="mt-3 rounded-card bg-surface-2 px-3 py-2.5">
          <p className="text-caption uppercase text-content-muted">Why this matters</p>
          <p className="mt-1 text-sm leading-6 text-content-secondary">{recommendation.reason}</p>
        </div>
      ) : null}
      <div className="mt-3 flex flex-col gap-2 border-t border-line pt-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-content-primary">{recommendation.recommended_action}</p>
        <Link
          href={href}
          className={cn(
            workspacePrimaryButtonClass,
            'inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-ctl px-3.5 text-sm font-semibold',
          )}
        >
          Open record
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

function ActionArea({ section, items }: { section: ActionSection; items: SetuGuruRecommendation[] }) {
  const Icon = section.icon;
  const visible = items.slice(0, 3);
  const remaining = items.slice(3);

  return (
    <section className={cn(workspacePanelClass, 'p-5')}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-card bg-accent-50 p-2.5 text-accent-700">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-content-primary">{section.title}</h2>
            <p className="mt-1 text-sm leading-6 text-content-secondary">{section.description}</p>
          </div>
        </div>
        <StatusBadge label={`${items.length} open`} tone={items.length ? 'info' : 'neutral'} />
      </div>

      <div className="mt-4 space-y-3">
        {visible.length ? visible.map((item) => <RecommendationCard key={item.id} recommendation={item} compact />) : (
          <div className={cn(workspaceInsetClass, 'p-4')}>
            <p className="text-sm font-semibold text-content-primary">{section.emptyTitle}</p>
            <Link href={section.href} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:text-brand-800">
              Open workspace
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        )}

        {remaining.length ? (
          <details className="group rounded-card border border-line bg-surface-1">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-content-primary">
              Show {remaining.length} more
              <ChevronDown className="h-4 w-4 transition group-open:rotate-180" aria-hidden="true" />
            </summary>
            <div className="space-y-3 border-t border-line p-3">
              {remaining.map((item) => <RecommendationCard key={item.id} recommendation={item} compact />)}
            </div>
          </details>
        ) : null}
      </div>
    </section>
  );
}

export function GrowthCenter({ organizationName, recommendations, history, opportunities = [], icpConfigured = false, tradeEvents = [] }: GrowthCenterProps) {
  const ordered = [...recommendations].sort((a, b) => {
    const priorityDifference = priorityRank[b.priority] - priorityRank[a.priority];
    return priorityDifference || Date.parse(b.created_at) - Date.parse(a.created_at);
  });
  const urgentCount = ordered.filter((item) => item.priority === 'urgent').length;
  const priorityItems = ordered.slice(0, 4);
  const priorityIds = new Set(priorityItems.map((item) => item.id));
  const remainingItems = ordered.filter((item) => !priorityIds.has(item.id));

  return (
    <main className="space-y-5 pb-10">
      <section className={workspaceHeroClass}>
        <div className="flex flex-col gap-6 p-6 lg:flex-row lg:items-center lg:justify-between lg:p-8">
          <div className="flex items-start gap-4">
            <GuruAvatar size="lg" />
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-accent-700">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Setu Guru
              </div>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-content-primary">Growth Center</h1>
              <p className="mt-2 max-w-2xl text-base leading-7 text-content-secondary">
                Know which buyer, supplier, quote, RFQ, follow-up, and trade event action needs attention next.
              </p>
              <p className="mt-3 text-sm text-content-muted">
                {organizationName ? `${organizationName} · ` : ''}The CRM stores the work. Setu Guru moves the work forward.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href="/growth-agent/suppliers"
              className={cn(workspaceSecondaryButtonClass, 'inline-flex min-h-11 items-center justify-center gap-2 rounded-ctl px-5 text-sm font-semibold')}
            >
              Compare suppliers
              <PackageCheck className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/growth-agent/icp"
              className={cn(workspaceSecondaryButtonClass, 'inline-flex min-h-11 items-center justify-center gap-2 rounded-ctl px-5 text-sm font-semibold')}
            >
              Set up your ICP
              <Users className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/setu-guru"
              className={cn(workspaceSecondaryButtonClass, 'inline-flex min-h-11 items-center justify-center gap-2 rounded-ctl px-5 text-sm font-semibold')}
            >
              Open Setu Guru
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section className={cn(workspacePanelClass, 'p-5 lg:p-6')}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-brand-700">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Today&apos;s recommendations
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-content-primary">
              {ordered.length ? 'Your trade action queue is ready' : 'No urgent trade actions right now'}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-content-secondary">
              Every recommendation explains why it matters and connects to a CRM action. Nothing is sent or changed without your approval.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className={workspaceMetricClass}>
              <p className="text-2xl font-bold text-content-primary">{ordered.length}</p>
              <p className="mt-1 text-caption uppercase text-content-muted">Open actions</p>
            </div>
            <div className={workspaceMetricClass}>
              <p className="text-2xl font-bold text-content-primary">{urgentCount}</p>
              <p className="mt-1 text-caption uppercase text-content-muted">Urgent today</p>
            </div>
          </div>
        </div>
      </section>

      {priorityItems.length ? (
        <section className="space-y-3" aria-labelledby="priority-actions-heading">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 id="priority-actions-heading" className="text-xl font-semibold text-content-primary">Priority actions</h2>
              <p className="mt-1 text-sm text-content-secondary">The four highest-priority actions across your trade workflow.</p>
            </div>
            <div className="hidden items-center gap-2 text-sm text-content-muted sm:flex">
              <Building2 className="h-4 w-4" aria-hidden="true" />
              Organization scoped
            </div>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {priorityItems.map((item) => <RecommendationCard key={item.id} recommendation={item} />)}
          </div>
        </section>
      ) : null}

      <section className={cn(workspacePanelClass, 'p-5 lg:p-6')} aria-labelledby="opportunity-finder-heading">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-card bg-accent-50 p-2.5 text-accent-700">
              <Target className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="opportunity-finder-heading" className="text-base font-semibold text-content-primary">Opportunity Finder</h2>
              <p className="mt-1 text-sm leading-6 text-content-secondary">
                Existing CRM leads scored against your ICP profile. No public enrichment yet — phase 1 uses only what is already in Setu Flow.
              </p>
            </div>
          </div>
          {!icpConfigured ? (
            <Link
              href="/growth-agent/icp"
              className={cn(workspaceSecondaryButtonClass, 'inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-ctl px-3.5 text-sm font-semibold')}
            >
              Set up your ICP
            </Link>
          ) : null}
        </div>

        {!icpConfigured ? (
          <div className={cn(workspaceInsetClass, 'mt-4 p-4')}>
            <p className="text-sm font-semibold text-content-primary">Set up your ICP to see scored opportunities</p>
            <p className="mt-1 text-sm text-content-secondary">
              Setu Guru needs your target products, markets, and buyer types before it can score existing leads.
            </p>
          </div>
        ) : opportunities.length ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {opportunities.map((opportunity) => (
              <Link
                key={opportunity.leadId}
                href={`/leads/${opportunity.leadId}`}
                className={cn(workspaceInsetClass, 'block p-4 transition hover:-translate-y-0.5 hover:shadow-card')}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-content-primary">{opportunity.label}</p>
                    <p className="mt-1 text-xs text-content-muted">
                      {opportunity.signalSource}
                      {opportunity.country ? ` · ${opportunity.country}` : ''}
                    </p>
                  </div>
                  <StatusBadge
                    label={`Fit ${opportunity.fitScore.score}`}
                    tone={opportunity.fitScore.score >= 65 ? 'success' : 'info'}
                  />
                </div>
                <p className="mt-3 text-sm text-content-secondary">{opportunity.recommendedAction}</p>
              </Link>
            ))}
          </div>
        ) : (
          <div className={cn(workspaceInsetClass, 'mt-4 p-4')}>
            <p className="text-sm font-semibold text-content-primary">No high-fit opportunities found right now</p>
            <p className="mt-1 text-sm text-content-secondary">Setu Guru checked your existing leads against your ICP and found no strong matches today.</p>
          </div>
        )}
      </section>

      {tradeEvents.length ? (
        <section className={cn(workspacePanelClass, 'p-5 lg:p-6')} aria-labelledby="trade-event-assistant-heading">
          <div className="flex items-start gap-3">
            <div className="rounded-card bg-accent-50 p-2.5 text-accent-700">
              <CalendarDays className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="trade-event-assistant-heading" className="text-base font-semibold text-content-primary">Trade Event Assistant</h2>
              <p className="mt-1 text-sm leading-6 text-content-secondary">Pre-show prioritization and post-show follow-up, per event.</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {tradeEvents.map((event) => (
              <Link
                key={event.id}
                href={`/growth-agent/trade-events/${event.id}`}
                className={cn(workspaceInsetClass, 'inline-flex items-center gap-2 rounded-ctl px-3.5 py-2 text-sm font-semibold text-content-primary transition hover:-translate-y-0.5 hover:shadow-card')}
              >
                {event.name}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section aria-labelledby="action-areas-heading">
        <div className="mb-4">
          <h2 id="action-areas-heading" className="text-xl font-semibold text-content-primary">Remaining action areas</h2>
          <p className="mt-1 text-sm text-content-secondary">Priority cards are not repeated below. Expand a section only when you need the full queue.</p>
        </div>
        <div className="grid items-start gap-4 xl:grid-cols-2">
          {sections.map((section) => (
            <ActionArea key={section.key} section={section} items={remainingItems.filter(section.matches)} />
          ))}
        </div>
      </section>

      <section className={cn(workspacePanelClass, 'p-5')}>
        <div className="flex items-start gap-3">
          <div className="rounded-card bg-surface-2 p-2.5 text-content-secondary">
            <History className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-content-primary">AI action history</h2>
            <p className="mt-1 text-sm leading-6 text-content-secondary">
              Completed, dismissed, and expired recommendations are recorded for accountability.
            </p>
            <div className="mt-4 space-y-2">
              {history.length ? history.slice(0, 5).map((item) => (
                <div key={item.id} className={cn(workspaceInsetClass, 'flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between')}>
                  <div>
                    <p className="text-sm font-medium text-content-primary">{item.title}</p>
                    <p className="mt-1 text-xs text-content-muted">{item.recommended_action}</p>
                  </div>
                  <StatusBadge label={item.status} tone={item.status === 'completed' ? 'success' : item.status === 'dismissed' ? 'neutral' : 'warning'} />
                </div>
              )) : (
                <div className={cn(workspaceInsetClass, 'flex items-start gap-3 p-4')}>
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-success-solid" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-content-primary">No AI action history yet</p>
                    <p className="mt-1 text-sm text-content-secondary">Completed and dismissed recommendations will appear here.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
