import type { DashboardLeadHealthDatum, DashboardStageCount } from '@/features/dashboard/types';
import { LeadHealthDonutCard } from './lead-health-donut-card';
import { PipelineStageChartCard } from './pipeline-stage-chart-card';
import { DashboardWidgetErrorBoundary } from './dashboard-widget-error-boundary';

export function DashboardMainVisualRow({ stageCounts, leadHealth }: { stageCounts: DashboardStageCount[]; leadHealth: DashboardLeadHealthDatum[] }) {
  return (
    <section className="grid gap-6 xl:grid-cols-12">
      <div className="xl:col-span-8">
        <DashboardWidgetErrorBoundary
          title="Pipeline Chart"
          description="Stage visibility by open lead count."
          eyebrow="Main visual"
          fallbackTitle="Pipeline chart unavailable"
          fallbackDescription="The stage visualization hit a runtime issue. Other dashboard widgets are still available."
        >
          <PipelineStageChartCard items={stageCounts} />
        </DashboardWidgetErrorBoundary>
      </div>
      <div className="xl:col-span-4">
        <DashboardWidgetErrorBoundary
          title="Lead Health"
          description="Healthy vs at-risk vs blocked."
          eyebrow="Main visual"
          fallbackTitle="Lead health unavailable"
          fallbackDescription="The lead health visualization hit a runtime issue. Other dashboard widgets are still available."
        >
          <LeadHealthDonutCard items={leadHealth} />
        </DashboardWidgetErrorBoundary>
      </div>
    </section>
  );
}
