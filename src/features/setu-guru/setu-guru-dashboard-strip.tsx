import Link from 'next/link';
import { ArrowRight, CheckCircle2, Sparkles, TriangleAlert } from 'lucide-react';

import { GuruAvatar } from '@/components/ui/guru-avatar';
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge';
import {
  workspaceInsetClass,
  workspacePanelClass,
  workspacePrimaryButtonClass,
  workspaceSecondaryButtonClass,
} from '@/components/ui/workspace-surfaces';
import { getGrowthCenterRecommendations, type SetuGuruRecommendation } from '@/lib/setu-guru/recommendations';
import { cn } from '@/lib/utils';

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

function orderedTopRecommendations(items: SetuGuruRecommendation[]) {
  return [...items]
    .sort((a, b) => {
      const priorityDifference = priorityRank[b.priority] - priorityRank[a.priority];
      return priorityDifference || Date.parse(b.created_at) - Date.parse(a.created_at);
    })
    .slice(0, 5);
}

function DashboardRecommendationItem({ recommendation }: { recommendation: SetuGuruRecommendation }) {
  return (
    <article className={cn(workspaceInsetClass, 'flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between')}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-content-primary">{recommendation.title}</h3>
          <StatusBadge label={recommendation.priority} tone={priorityTone(recommendation.priority)} />
        </div>
        <p className="mt-1 text-sm leading-6 text-content-secondary">{recommendation.reason}</p>
        <p className="mt-2 text-sm font-medium text-content-primary">{recommendation.recommended_action}</p>
      </div>
      <Link
        href={recommendation.action_href || '/growth-agent'}
        className={cn(
          workspacePrimaryButtonClass,
          'inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-ctl px-4 text-sm font-semibold',
        )}
      >
        Take action
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </article>
  );
}

export async function SetuGuruDashboardStrip({ organizationId }: { organizationId: string }) {
  try {
    const recommendations = await getGrowthCenterRecommendations(organizationId);
    const topRecommendations = orderedTopRecommendations(recommendations.open);

    return (
      <section className={cn(workspacePanelClass, 'mb-5 overflow-hidden')} aria-labelledby="setu-guru-dashboard-heading">
        <div className="border-b border-line bg-brand-950 px-5 py-4 text-white sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <GuruAvatar size="md" />
              <div>
                <p className="flex items-center gap-2 text-caption uppercase text-white/70">
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  Setu Guru trade actions
                </p>
                <h2 id="setu-guru-dashboard-heading" className="mt-1 text-lg font-semibold text-white">
                  {topRecommendations.length ? 'What needs attention next' : 'Your priority queue is clear'}
                </h2>
                <p className="mt-1 text-sm leading-6 text-white/75">
                  Buyer, quote, supplier, RFQ, and trade-event actions prioritized from your CRM activity.
                </p>
              </div>
            </div>
            <Link
              href="/growth-agent"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-ctl border border-white/20 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              Open Growth Center
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="space-y-3 p-4 sm:p-5">
          {topRecommendations.length ? (
            topRecommendations.map((recommendation) => (
              <DashboardRecommendationItem key={recommendation.id} recommendation={recommendation} />
            ))
          ) : (
            <div className={cn(workspaceInsetClass, 'flex items-start gap-3 p-4')}>
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-success-solid" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-content-primary">No open Setu Guru recommendations</p>
                <p className="mt-1 text-sm leading-6 text-content-secondary">
                  New recommendations will appear when CRM activity shows a clear, explainable next action.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>
    );
  } catch (error) {
    console.error('[setu-guru-dashboard] recommendations unavailable', {
      organizationId,
      error: error instanceof Error ? error.message : String(error),
    });

    return (
      <section className={cn(workspacePanelClass, 'mb-5 p-5')} aria-label="Setu Guru recommendations unavailable">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-card bg-warning-bg p-2.5 text-warning-fg">
              <TriangleAlert className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-content-primary">Setu Guru recommendations are temporarily unavailable</p>
              <p className="mt-1 text-sm leading-6 text-content-secondary">
                Your dashboard and CRM records are still available. No data was changed.
              </p>
            </div>
          </div>
          <Link
            href="/growth-agent"
            className={cn(
              workspaceSecondaryButtonClass,
              'inline-flex min-h-10 items-center justify-center gap-2 rounded-ctl px-4 text-sm font-semibold',
            )}
          >
            Open Growth Center
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    );
  }
}

export function SetuGuruDashboardStripLoading() {
  return (
    <section className={cn(workspacePanelClass, 'mb-5 overflow-hidden')} aria-label="Loading Setu Guru recommendations">
      <div className="h-28 animate-pulse bg-brand-950" />
      <div className="space-y-3 p-4 sm:p-5">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-card bg-surface-2" />
        ))}
      </div>
    </section>
  );
}
