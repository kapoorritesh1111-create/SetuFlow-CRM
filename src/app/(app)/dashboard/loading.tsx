import { WidgetLoadingState, WidgetMetric, WidgetShell } from '@/components/ui/widget-shell';

export default function DashboardLoading() {
  return (
    <div className="space-y-6 xl:space-y-7">
      <WidgetShell
        eyebrow="Dashboard"
        title="Preparing the command center"
        description="Loading the latest commercial view for this dashboard."
      >
        <WidgetLoadingState lines={2} />
      </WidgetShell>

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-12 2xl:col-span-8">
          <WidgetShell title="KPI strip" description="Loading top commercial signals for the active dashboard view.">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <WidgetMetric key={index} label="Loading" value="—" helper="Loading data" className="animate-pulse" />
              ))}
            </div>
          </WidgetShell>
        </div>

        <div className="xl:col-span-8 2xl:col-span-6">
          <WidgetShell title="Needs attention" description="Loading the next actions that move revenue forward.">
            <WidgetLoadingState lines={4} />
          </WidgetShell>
        </div>

        <div className="xl:col-span-6 2xl:col-span-4">
          <WidgetShell title="Support row" description="Loading pipeline, market, and risk summaries.">
            <WidgetLoadingState lines={4} />
          </WidgetShell>
        </div>
      </div>
    </div>
  );
}
