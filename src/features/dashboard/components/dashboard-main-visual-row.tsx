import type { DashboardLeadHealthDatum, DashboardStageCount } from '@/features/dashboard/types';
import { PipelineStageChartCard } from './pipeline-stage-chart-card';
import { DashboardWidgetErrorBoundary } from './dashboard-widget-error-boundary';

export function DashboardMainVisualRow({ stageCounts, leadHealth: _leadHealth }: { stageCounts: DashboardStageCount[]; leadHealth: DashboardLeadHealthDatum[] }) {
  return (
    <section className="grid gap-6 xl:grid-cols-12">
      <div className="xl:col-span-12">
        <DashboardWidgetErrorBoundary
          title="Pipeline Chart"
          description="Stage visibility by active opportunity count."
          eyebrow="Main visual"
          fallbackTitle="Pipeline chart unavailable"
          fallbackDescription="The stage visualization hit a runtime issue. Other dashboard widgets are still available."
        >
          <PipelineStageChartCard items={stageCounts} />
        </DashboardWidgetErrorBoundary>
      </div>
    </section>
  );
}
