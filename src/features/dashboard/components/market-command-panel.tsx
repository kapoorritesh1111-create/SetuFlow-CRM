'use client';

import Link from 'next/link';
import type { CountryInsight, AttentionItem } from '@/features/dashboard/types';
import { formatDate } from '@/lib/utils';
import { PRODUCT_ROUTES } from '@/lib/product-contract';

type MarketCommandPanelProps = {
  country: CountryInsight;
  attentionItems: readonly AttentionItem[];
  onClose: () => void;
};

const severityBar = {
  low: 'bg-slate-300',
  medium: 'bg-amber-400',
  high: 'bg-orange-500',
  critical: 'bg-rose-500',
} as const;

const severityDot = {
  low: 'bg-slate-400',
  medium: 'bg-amber-400',
  high: 'bg-orange-500',
  critical: 'bg-rose-500',
} as const;

export function MarketCommandPanel({ country, attentionItems, onClose }: MarketCommandPanelProps) {
  // Filter attention items to this market's leads
  const marketLeadIds = new Set(country.topCompanies.map(c => c.leadId));
  const marketItems = attentionItems.filter(item => item.leadId && marketLeadIds.has(item.leadId));
  const globalItems = attentionItems.filter(item => !item.leadId || !marketLeadIds.has(item.leadId));

  const totalValue = country.openQuoteCount; // proxy for value — real deal_value sum would need query
  const hasBlockers = country.complianceBlockerCount > 0;

  return (
    <div className="mt-4 overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.08)] ring-1 ring-slate-950/[0.02]">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-slate-200/70 px-6 py-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#1F487C]">
            Market drill-down
          </p>
          <h3 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
            {country.countryName}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {marketItems.length > 0
              ? `${marketItems.length} action${marketItems.length !== 1 ? 's' : ''} requiring attention in this market`
              : 'No urgent actions for this market right now'}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex-shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          ✕ Close
        </button>
      </div>

      <div className="grid gap-0 xl:grid-cols-[1fr_1fr_1fr]">
        {/* Panel 1 — Market metrics */}
        <div className="border-b border-slate-200/70 p-5 xl:border-b-0 xl:border-r">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Market snapshot
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[
              { label: 'Active leads', value: country.activeLeadCount, intent: country.activeLeadCount > 5 ? 'hot' : 'normal' },
              { label: 'Open quotes', value: country.openQuoteCount, intent: country.openQuoteCount > 3 ? 'hot' : 'normal' },
              { label: 'Open RFQs', value: country.openRfqCount, intent: 'normal' },
              { label: 'Compliance blockers', value: country.complianceBlockerCount, intent: country.complianceBlockerCount > 0 ? 'risk' : 'normal' },
            ].map(metric => (
              <div key={metric.label} className={`rounded-2xl border p-3 ${metric.intent === 'hot' ? 'border-amber-200 bg-amber-50/60' : metric.intent === 'risk' ? 'border-rose-200 bg-rose-50/60' : 'border-slate-200 bg-slate-50'}`}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{metric.label}</p>
                <p className={`mt-1.5 text-2xl font-semibold ${metric.intent === 'hot' ? 'text-amber-700' : metric.intent === 'risk' ? 'text-rose-700' : 'text-slate-900'}`}>
                  {metric.value}
                </p>
              </div>
            ))}
          </div>

          {/* Trade events */}
          {country.upcomingTradeEvents.length > 0 && (
            <div className="mt-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Trade events
              </p>
              <div className="mt-2 space-y-2">
                {country.upcomingTradeEvents.slice(0, 3).map(event => (
                  <div key={event.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-900">{event.name}</p>
                      <p className="text-[10px] text-slate-500">{event.city ?? 'TBD'}</p>
                    </div>
                    {event.startsOn && (
                      <span className="flex-shrink-0 text-[10px] font-semibold text-slate-500">
                        {formatDate(event.startsOn)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Panel 2 — Action queue for this market */}
        <div className="border-b border-slate-200/70 p-5 xl:border-b-0 xl:border-r">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Action queue · {country.countryName}
          </p>
          {marketItems.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center">
              <p className="text-sm font-semibold text-slate-700">No urgent actions</p>
              <p className="mt-1 text-xs text-slate-500">This market is clear right now.</p>
            </div>
          ) : (
            <div className="mt-3 space-y-2.5">
              {marketItems.slice(0, 5).map(item => (
                <div key={item.id} className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
                  <div className="flex items-start gap-2.5">
                    <span className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${severityDot[item.severity]}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-900">{item.title}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">{item.reason}</p>
                    </div>
                    {item.ctaHref && (
                      <Link href={item.ctaHref} className="flex-shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-white">
                        {item.ctaLabel}
                      </Link>
                    )}
                  </div>
                  <div className="mt-2 h-1 rounded-full bg-slate-100">
                    <div className={`h-1 rounded-full ${severityBar[item.severity]}`} style={{ width: item.severity === 'critical' ? '100%' : item.severity === 'high' ? '75%' : item.severity === 'medium' ? '50%' : '25%' }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Blocker call-out */}
          {hasBlockers && (
            <div className="mt-3 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2.5">
              <span className="text-rose-500">⚠</span>
              <div>
                <p className="text-xs font-semibold text-rose-800">
                  {country.complianceBlockerCount} compliance blocker{country.complianceBlockerCount !== 1 ? 's' : ''}
                </p>
                <p className="text-[10px] text-rose-600">Blocking dispatch or quote progression</p>
              </div>
            </div>
          )}
        </div>

        {/* Panel 3 — Top companies + recent activity */}
        <div className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Top companies
          </p>
          <div className="mt-3 space-y-2">
            {country.topCompanies.length === 0 ? (
              <p className="text-xs text-slate-400">No companies assigned to this market yet.</p>
            ) : (
              country.topCompanies.map(company => (
                <Link
                  key={company.leadId}
                  href={`${PRODUCT_ROUTES.app.leads}/${company.leadId}`}
                  className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 hover:border-slate-300 hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-slate-900">{company.companyName}</p>
                    {company.stageName && (
                      <p className="text-[10px] text-slate-500">{company.stageName}</p>
                    )}
                  </div>
                  <span className="flex-shrink-0 text-[10px] text-slate-400">→</span>
                </Link>
              ))
            )}
          </div>

          {country.recentActivity.length > 0 && (
            <>
              <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Recent activity
              </p>
              <div className="mt-2 space-y-2">
                {country.recentActivity.slice(0, 3).map(activity => (
                  <div key={activity.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-xs text-slate-700">{activity.message}</p>
                    {activity.occurredAt && (
                      <p className="mt-0.5 text-[10px] text-slate-400">{formatDate(activity.occurredAt)}</p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Market CTA */}
          <div className="mt-4 flex gap-2">
            <Link
              href={PRODUCT_ROUTES.app.leads}
              className="flex-1 rounded-xl bg-[#1F487C] px-3 py-2 text-center text-xs font-semibold text-white hover:bg-[#193769]"
            >
              Open Leads
            </Link>
            <Link
              href={PRODUCT_ROUTES.app.quotes}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Open Quotes
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
