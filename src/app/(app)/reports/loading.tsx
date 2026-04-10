import { WidgetLoadingState, WidgetMetric, WidgetShell } from '@/components/ui/widget-shell';

export default function ReportsLoading() {
  return (
    <div className="space-y-6">
      <WidgetShell
        eyebrow="Reporting"
        title="Loading reports"
        description="Preparing summary metrics, stage distribution, audit context, and commercial variance totals for the active workspace."
      >
        <WidgetLoadingState lines={2} />
      </WidgetShell>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <WidgetMetric key={index} label="Loading" value="—" helper="Report totals are loading" className="animate-pulse" />
        ))}
      </div>

      <WidgetShell title="Commercial reporting" description="Loading stage coverage, pricing variance, and audit context.">
        <WidgetLoadingState lines={5} />
      </WidgetShell>
    </div>
  );
}
