import { WidgetLoadingState, WidgetMetric, WidgetShell } from '@/components/ui/widget-shell';

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <WidgetShell
        eyebrow="Dashboard"
        title="Loading dashboard widgets"
        description="Preparing the reusable widget containers and responsive layout engine for the active workspace."
      >
        <WidgetLoadingState lines={2} />
      </WidgetShell>

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-12 2xl:col-span-8">
          <WidgetShell title="Metrics overview" description="Loading summary metrics for the active dashboard.">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <WidgetMetric key={index} label="Loading" value="—" helper="Widget data is loading" className="animate-pulse" />
              ))}
            </div>
          </WidgetShell>
        </div>

        <div className="xl:col-span-8 2xl:col-span-6">
          <WidgetShell title="Follow-up queue" description="Loading prioritized activity for the current journey.">
            <WidgetLoadingState lines={4} />
          </WidgetShell>
        </div>

        <div className="xl:col-span-6 2xl:col-span-4">
          <WidgetShell title="Stage mix" description="Loading current stage and coverage summaries.">
            <WidgetLoadingState lines={4} />
          </WidgetShell>
        </div>
      </div>
    </div>
  );
}
