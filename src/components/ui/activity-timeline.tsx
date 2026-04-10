import { formatDateTime } from '@/lib/utils';
import type { ActivityEvent } from '@/lib/activity-timeline';

function formatMetadata(event: ActivityEvent) {
  const metadata = event.metadata ?? {};
  if (event.type === 'stage_changed') {
    const from = metadata.from ?? 'No stage';
    const to = metadata.to ?? 'No stage';
    return `Stage moved: ${from} → ${to}`;
  }

  const ordered = Object.entries(metadata).filter(([, value]) => Boolean(value));
  return ordered
    .map(([key, value]) => `${key.replace(/_/g, ' ')}: ${value}`)
    .join(' · ');
}

export function ActivityTimeline({ events, emptyLabel = 'No activity available yet.' }: { events: ActivityEvent[]; emptyLabel?: string }) {
  if (!events.length) {
    return <p className="text-sm text-slate-500">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-3">
      {events.map((event) => {
        const metadataLine = formatMetadata(event);
        return (
          <article key={event.id} className="rounded-[1.5rem] border border-white/70 bg-white/95 p-4 text-sm text-slate-600 shadow-[0_14px_35px_rgba(15,23,42,0.06)] ring-1 ring-slate-950/[0.03] backdrop-blur">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-semibold text-slate-900">{event.title}</p>
                {event.actor ? <p className="mt-1 text-xs text-slate-500">Actor: {event.actor}</p> : null}
              </div>
              <p className="rounded-full border border-slate-200 bg-slate-50/90 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">{formatDateTime(event.timestamp)}</p>
            </div>
            {metadataLine ? <p className="mt-2 text-xs text-slate-500">{metadataLine}</p> : null}
          </article>
        );
      })}
    </div>
  );
}
