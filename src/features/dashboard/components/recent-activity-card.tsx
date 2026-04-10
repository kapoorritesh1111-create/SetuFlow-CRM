import { WidgetEmptyState, WidgetShell } from '@/components/ui/widget-shell';
import { formatDateTime } from '@/lib/utils';
import type { RecentActivityItem } from '@/features/dashboard/types';

const iconMap: Record<string, string> = {
  activity: '•',
  quote: '$',
  rfq: 'R',
  task: '✓',
};

export function RecentActivityCard({ items }: { items: ReadonlyArray<RecentActivityItem> }) {
  return (
    <WidgetShell title="Recent Activity" description="Latest meaningful commercial events." eyebrow="Action zone">
      {items.length ? (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex items-start gap-3 rounded-[1.2rem] border border-slate-200/70 bg-white px-4 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">{iconMap[item.iconKey] ?? '•'}</div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900">{item.message}</p>
                <p className="mt-1 text-xs text-slate-500">{formatDateTime(item.timestamp)}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <WidgetEmptyState title="No recent activity yet" description="Activity updates appear once leads, RFQs, quotes, and tasks start moving." />
      )}
    </WidgetShell>
  );
}
