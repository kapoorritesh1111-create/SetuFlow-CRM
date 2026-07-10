import Link from 'next/link';
import { ArrowRight, CheckCircle2, Sparkles, TriangleAlert } from 'lucide-react';

import { GuruAvatar } from '@/components/ui/guru-avatar';
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge';
import {
  workspacePanelClass,
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
    .slice(0, 3);
}

function CompactRecommendation({ recommendation }: { recommendation: SetuGuruRecommendation }) {
  return (
    <Link
      href={recommendation.action_href || '/growth-agent'}
      className="group flex min-w-0 items-center justify-between gap-3 rounded-card border border-line bg-surface-1 px-4 py-3 transition hover:border-brand-300 hover:bg-brand-50/40"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-content-primary">{recommendation.title}</p>
          <StatusBadge label={recommendation.priority} tone={priorityTone(recommendation.priority)} />
        </div>
        <p className="mt-1 truncate text-xs text-content-secondary">{recommendation.recommended_action}</p>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-content-muted transition group-hover:translate-x-0.5 group-hover:text-brand-700" aria-hidden="true" />
    </Link>
  );
}

export async function SetuGuruDashboardStrip({ organizationId }: { organizationId: string }) {
  try {
    const recommendations = await getGrowthCenterRecommendations(organizationId);
    const topRecommendations = orderedTopRecommendations(recommendations.open);
    const remainingCount = Math.max(0, recommendations.open.length - topRecommendations.length);

    return (
      <section className={cn(workspacePanelClass, 'mb-5 overflow-hidden')} aria-labelledby="setu-guru-dashboard-heading">
        <div className="flex flex-col gap-3 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <GuruAvatar size="sm" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="flex items-center gap-1.5 text-caption uppercase text-brand-700">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    Setu Guru
                  </p>
                  {recommendations.open.length ? (
                    <span className="text-xs text-content-muted">{recommendations.open.length} open actions</span>
                  ) : null}
                </div>
                <h2 id="setu-guru-dashboard-heading" className="mt-0.5 text-base font-semibold text-content-primary">
                  {topRecommendations.length ? 'Top actions needing attention' : 'Your priority queue is clear'}
                </h2>
              </div>
            </div>
            <Link
              href="/growth-agent"
              className={cn(
                workspaceSecondaryButtonClass,
                'inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-ctl px-3.5 text-sm font-semibold',
              )}
            >
              View all{remainingCount ? ` ${recommendations.open.length}` : ''}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          {topRecommendations.length ? (
            <div className="grid gap-2 lg:grid-cols-3">
              {topRecommendations.map((recommendation) => (
                <CompactRecommendation key={recommendation.id} recommendation={recommendation} />
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-card bg-success-bg px-3 py-2.5 text-sm text-success-fg">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              No open Setu Guru recommendations.
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
      <section className={cn(workspacePanelClass, 'mb-5 px-4 py-3')} aria-label="Setu Guru recommendations unavailable">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <TriangleAlert className="h-4 w-4 text-warning-fg" aria-hidden="true" />
            <p className="text-sm text-content-secondary">Setu Guru recommendations are temporarily unavailable.</p>
          </div>
          <Link href="/growth-agent" className="text-sm font-semibold text-brand-700 hover:text-brand-800">
            Open Growth Center
          </Link>
        </div>
      </section>
    );
  }
}

export function SetuGuruDashboardStripLoading() {
  return (
    <section className={cn(workspacePanelClass, 'mb-5 p-4')} aria-label="Loading Setu Guru recommendations">
      <div className="h-16 animate-pulse rounded-card bg-surface-2" />
    </section>
  );
}
