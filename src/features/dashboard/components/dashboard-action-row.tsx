import type { AttentionItem, RecentActivityItem } from '@/features/dashboard/types';
import { NeedsAttentionCard } from './needs-attention-card';
import { RecentActivityCard } from './recent-activity-card';
import { DashboardWidgetErrorBoundary } from './dashboard-widget-error-boundary';

export function DashboardActionRow({ attentionItems, recentActivity, onFocusAttention }: { attentionItems: AttentionItem[]; recentActivity: RecentActivityItem[]; onFocusAttention?: (item: AttentionItem) => void }) {
  return (
    <section className="grid gap-6 xl:grid-cols-2">
      <DashboardWidgetErrorBoundary
        title="Needs Attention"
        description="Top priority action queue."
        eyebrow="Action zone"
        fallbackTitle="Needs Attention unavailable"
        fallbackDescription="The action queue hit a runtime issue. Other dashboard widgets are still available."
      >
        <NeedsAttentionCard items={attentionItems} onFocus={onFocusAttention} />
      </DashboardWidgetErrorBoundary>
      <DashboardWidgetErrorBoundary
        title="Recent Activity"
        description="Latest meaningful commercial events."
        eyebrow="Action zone"
        fallbackTitle="Recent Activity unavailable"
        fallbackDescription="The recent activity widget hit a runtime issue. Other dashboard widgets are still available."
      >
        <RecentActivityCard items={recentActivity} />
      </DashboardWidgetErrorBoundary>
    </section>
  );
}
