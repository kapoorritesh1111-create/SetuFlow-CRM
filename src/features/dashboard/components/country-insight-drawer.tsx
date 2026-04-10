'use client';

import { useEffect, useRef } from 'react';
import { WidgetEmptyState } from '@/components/ui/widget-shell';
import type { CountryInsight } from '@/features/dashboard/types';
import { cn, formatDate, formatDateTime } from '@/lib/utils';

export function CountryInsightDrawer({
  country,
  open,
  onClose,
}: {
  country?: CountryInsight;
  open: boolean;
  onClose: () => void;
}) {
  const drawerRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) {
      const activeElement = document.activeElement;
      if (activeElement instanceof HTMLElement && drawerRef.current?.contains(activeElement)) {
        activeElement.blur();
      }
      return;
    }

    closeButtonRef.current?.focus();
  }, [open]);

  const handleClose = () => {
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement && drawerRef.current?.contains(activeElement)) {
      activeElement.blur();
    }
    onClose();
  };

  return (
    <aside
      ref={drawerRef}
      className={cn(
        'fixed inset-y-0 right-0 z-40 w-full max-w-xl transform border-l border-slate-200/80 bg-white shadow-[0_0_60px_rgba(15,23,42,0.16)] transition duration-300',
        open ? 'translate-x-0' : 'translate-x-full',
      )}
      inert={!open}
      tabIndex={-1}
      aria-label="Country details drawer"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-slate-200/70 px-6 py-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700">Country drilldown</p>
            <h3 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
              {country?.countryName ?? 'No country selected'}
            </h3>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={handleClose}
            className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700"
          >
            Close
          </button>
        </div>

        <div className="space-y-6 overflow-y-auto px-6 py-6">
          {country ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Active leads', country.activeLeadCount],
                  ['Open RFQs', country.openRfqCount],
                  ['Open quotes', country.openQuoteCount],
                  ['Compliance blockers', country.complianceBlockerCount],
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-2xl border border-slate-200/70 bg-slate-50 px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
                  </div>
                ))}
              </div>

              <section>
                <h4 className="text-sm font-semibold text-slate-950">Top companies</h4>
                <div className="mt-3 space-y-3">
                  {country.topCompanies.length ? (
                    country.topCompanies.map((item) => (
                      <div key={item.leadId} className="rounded-2xl border border-slate-200/70 px-4 py-3">
                        <div className="font-medium text-slate-900">{item.companyName || 'Unnamed company'}</div>
                        <div className="text-sm text-slate-500">{item.stageName ?? 'Stage not assigned'}</div>
                      </div>
                    ))
                  ) : (
                    <WidgetEmptyState title="No companies yet" />
                  )}
                </div>
              </section>

              <section>
                <h4 className="text-sm font-semibold text-slate-950">Recent activity</h4>
                <div className="mt-3 space-y-3">
                  {country.recentActivity.length ? (
                    country.recentActivity.map((item) => (
                      <div key={item.id} className="rounded-2xl border border-slate-200/70 px-4 py-3">
                        <div className="text-sm font-medium text-slate-900">{item.message || 'Activity update'}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {item.occurredAt ? formatDateTime(item.occurredAt) : 'Time unavailable'}
                        </div>
                      </div>
                    ))
                  ) : (
                    <WidgetEmptyState title="No recent activity" />
                  )}
                </div>
              </section>

              <section>
                <h4 className="text-sm font-semibold text-slate-950">Upcoming trade events</h4>
                <div className="mt-3 space-y-3">
                  {country.upcomingTradeEvents.length ? (
                    country.upcomingTradeEvents.map((event) => (
                      <div key={event.id} className="rounded-2xl border border-slate-200/70 px-4 py-3">
                        <div className="text-sm font-medium text-slate-900">{event.name || 'Trade event'}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {event.city ?? 'City TBD'} · {event.startsOn ? formatDate(event.startsOn) : 'Date TBD'}
                        </div>
                      </div>
                    ))
                  ) : (
                    <WidgetEmptyState title="No upcoming trade events" />
                  )}
                </div>
              </section>
            </>
          ) : (
            <WidgetEmptyState
              title="Select a country from the map"
              description="Click any highlighted country to open a commercial drilldown."
              className="mt-8"
            />
          )}
        </div>
      </div>
    </aside>
  );
}
