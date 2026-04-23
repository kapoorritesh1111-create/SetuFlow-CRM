'use client';

import Link from 'next/link';
import type { CountryInsight, AttentionItem } from '@/features/dashboard/types';
import type { WorkspaceMode } from '@/features/workspace/types';
import { formatDate } from '@/lib/utils';
import { PRODUCT_ROUTES } from '@/lib/product-contract';

type Props = {
  country: CountryInsight;
  attentionItems: readonly AttentionItem[];
  mode?: WorkspaceMode;
  onClose: () => void;
};

const typeToRole: Record<string, 'buyer' | 'supplier' | 'both'> = {
  'overdue-task':       'both',
  'stalled-lead':       'buyer',
  'compliance-blocker': 'supplier',
  'quote-risk':         'buyer',
};

const severityDot   = { low: 'bg-slate-400', medium: 'bg-amber-400', high: 'bg-orange-500', critical: 'bg-rose-500' } as const;
const severityBar   = { low: 'bg-slate-300', medium: 'bg-amber-400', high: 'bg-orange-500', critical: 'bg-rose-500' } as const;
const severityWidth = { low: '25%', medium: '50%', high: '75%', critical: '100%' } as const;

const roleChip: Record<string, { label: string; cls: string }> = {
  buyer:    { label: 'Buyer',    cls: 'bg-sky-50 text-sky-700 border border-sky-200' },
  supplier: { label: 'Supplier', cls: 'bg-purple-50 text-purple-700 border border-purple-200' },
  both:     { label: 'Shared',   cls: 'bg-slate-100 text-slate-600 border border-slate-200' },
};

export function MarketCommandPanel({ country, attentionItems, mode = 'all', onClose }: Props) {
  const marketLeadIds = new Set(country.topCompanies.map(c => c.leadId));

  // Filter items to this market AND current role mode
  const marketItems = attentionItems.filter(item => {
    if (!item.leadId || !marketLeadIds.has(item.leadId)) return false;
    const role = typeToRole[item.type] ?? 'both';
    if (mode === 'buyers'    && role === 'supplier') return false;
    if (mode === 'suppliers' && role === 'buyer')    return false;
    return true;
  });

  const modeLabel = mode === 'buyers' ? ' · Buyers' : mode === 'suppliers' ? ' · Suppliers' : '';

  return (
    <div className="mt-4 overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.08)] ring-1 ring-slate-950/[0.02]">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-slate-200/70 px-6 py-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#1F487C]">Market view</p>
            {mode !== 'all' && (
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${mode === 'buyers' ? 'bg-sky-50 text-sky-700 border border-sky-200' : 'bg-purple-50 text-purple-700 border border-purple-200'}`}>
                {mode === 'buyers' ? 'Buyer view' : 'Supplier view'}
              </span>
            )}
          </div>
          <h3 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">{country.countryName}</h3>
          <p className="mt-0.5 text-sm text-slate-500">
            {marketItems.length > 0
              ? `${marketItems.length} action${marketItems.length !== 1 ? 's' : ''} in this market${modeLabel}`
              : `No urgent actions for this market${modeLabel}`}
          </p>
        </div>
        <button type="button" onClick={onClose}
          className="flex-shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
          ✕ Close
        </button>
      </div>

      <div className="grid gap-0 xl:grid-cols-3">
        {/* Panel 1 — Market snapshot */}
        <div className="border-b border-slate-200/70 p-5 xl:border-b-0 xl:border-r">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Market snapshot</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[
              { label: 'Active leads',         value: country.activeLeadCount,        hot: country.activeLeadCount > 5,         risk: false },
              { label: 'Open quotes',          value: country.openQuoteCount,         hot: country.openQuoteCount > 3,          risk: false },
              { label: 'Open RFQs',            value: country.openRfqCount,           hot: false,                               risk: false },
              { label: 'Compliance blockers',  value: country.complianceBlockerCount, hot: false,                               risk: country.complianceBlockerCount > 0 },
            ].map(m => (
              <div key={m.label} className={`rounded-2xl border p-3 ${m.hot ? 'border-amber-200 bg-amber-50/60' : m.risk ? 'border-rose-200 bg-rose-50/60' : 'border-slate-200 bg-slate-50'}`}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">{m.label}</p>
                <p className={`mt-1.5 text-2xl font-semibold ${m.hot ? 'text-amber-700' : m.risk ? 'text-rose-700' : 'text-slate-900'}`}>{m.value}</p>
              </div>
            ))}
          </div>

          {/* Market signals first (AI reasoning stub grounded in data) */}
          <div className="mt-4 rounded-2xl border border-[#1F487C]/20 bg-[#1F487C]/5 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#1F487C]">Market signals</p>
            <ul className="mt-2 space-y-1">
              {country.openQuoteCount > 0 && (
                <li className="text-xs text-slate-700">· {country.openQuoteCount} open quote{country.openQuoteCount !== 1 ? 's' : ''} in motion</li>
              )}
              {country.complianceBlockerCount > 0 && (
                <li className="text-xs text-slate-700">· {country.complianceBlockerCount} compliance blocker{country.complianceBlockerCount !== 1 ? 's' : ''} to clear</li>
              )}
              {country.upcomingTradeEvents.length > 0 && (
                <li className="text-xs text-slate-700">· {country.upcomingTradeEvents.length} trade event{country.upcomingTradeEvents.length !== 1 ? 's' : ''} upcoming</li>
              )}
              {country.activeLeadCount > 0 && (
                <li className="text-xs text-slate-700">· {country.activeLeadCount} active lead{country.activeLeadCount !== 1 ? 's' : ''} in play</li>
              )}
            </ul>
          </div>

          {/* Trade events */}
          {country.upcomingTradeEvents.length > 0 && (
            <div className="mt-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Trade events</p>
              <div className="mt-2 space-y-1.5">
                {country.upcomingTradeEvents.slice(0, 3).map(ev => (
                  <div key={ev.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-900">{ev.name}</p>
                      <p className="text-[10px] text-slate-500">{ev.city ?? 'TBD'}</p>
                    </div>
                    {ev.startsOn && <span className="flex-shrink-0 text-[10px] font-semibold text-slate-500">{formatDate(ev.startsOn)}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Panel 2 — Contextual action queue */}
        <div className="border-b border-slate-200/70 p-5 xl:border-b-0 xl:border-r">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Action queue · {country.countryName}{modeLabel}
          </p>
          {marketItems.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center">
              <p className="text-sm font-semibold text-slate-700">No urgent actions</p>
              <p className="mt-1 text-xs text-slate-500">No immediate action in this market{mode !== 'all' ? ` for ${mode}` : ''}.</p>
            </div>
          ) : (
            <div className="mt-3 space-y-2.5">
              {marketItems.slice(0, 5).map(item => {
                const role = item.leadType ?? typeToRole[item.type] ?? 'both';
                const chip = roleChip[role];
                return (
                  <div key={item.id} className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
                    <div className="flex items-start gap-2.5">
                      <span className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${severityDot[item.severity]}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="text-xs font-semibold text-slate-900">{item.title}</p>
                          <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${chip.cls}`}>{chip.label}</span>
                          {item.stageName ? <span className="rounded-full border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[9px] font-semibold text-indigo-700">{item.stageName}</span> : null}
                          {item.productNames?.[0] ? <span className="rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700">{item.productNames[0]}</span> : null}
                        </div>
                        <p className="mt-0.5 text-[11px] text-slate-500">{item.reason}</p>
                      </div>
                      {item.ctaHref && (
                        <Link href={item.ctaHref} className="flex-shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-white">
                          {item.ctaLabel}
                        </Link>
                      )}
                    </div>
                    <div className="mt-2 h-1 rounded-full bg-slate-100">
                      <div className={`h-1 rounded-full ${severityBar[item.severity]}`} style={{ width: severityWidth[item.severity] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {country.complianceBlockerCount > 0 && (
            <div className="mt-3 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2.5">
              <span className="text-rose-500">⚠</span>
              <div>
                <p className="text-xs font-semibold text-rose-800">{country.complianceBlockerCount} compliance blocker{country.complianceBlockerCount !== 1 ? 's' : ''}</p>
                <p className="text-[10px] text-rose-600">Blocking dispatch or quote progression</p>
              </div>
            </div>
          )}
        </div>

        {/* Panel 3 — Companies + activity */}
        <div className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Top companies</p>
          <div className="mt-3 space-y-2">
            {country.topCompanies.length === 0 ? (
              <p className="text-xs text-slate-400">No companies in this market yet.</p>
            ) : country.topCompanies.map(co => (
              <Link key={co.leadId} href={`${PRODUCT_ROUTES.app.leads}/${co.leadId}`}
                className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 hover:border-slate-300 hover:bg-slate-50">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="truncate text-xs font-semibold text-slate-900">{co.companyName}</p>
                    {co.leadType ? <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${roleChip[co.leadType].cls}`}>{roleChip[co.leadType].label}</span> : null}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                    {co.stageName && <p className="text-[10px] text-slate-500">{co.stageName}</p>}
                    {co.productNames?.[0] ? <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700">{co.productNames[0]}</span> : null}
                  </div>
                </div>
                <span className="flex-shrink-0 text-[10px] text-slate-400">→</span>
              </Link>
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            <Link href={PRODUCT_ROUTES.app.leads}  className="flex-1 rounded-xl bg-[#1F487C] px-3 py-2 text-center text-xs font-semibold text-white hover:bg-[#193769]">Open buyers</Link>
            <Link href={PRODUCT_ROUTES.app.quotes} className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-xs font-semibold text-slate-700 hover:bg-slate-50">Open quotes</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
