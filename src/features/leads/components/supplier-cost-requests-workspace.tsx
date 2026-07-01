import Link from 'next/link';

function fmtDate(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function money(n?: number | string | null, currency = 'USD') {
  const val = Number(n ?? 0);
  if (!val) return `${currency} 0`;
  return `${currency} ${val.toLocaleString()}`;
}

type Supplier = {
  id: string;
  company_name: string;
  country: string | null;
  deal_value: number | null;
  deal_currency: string | null;
  stage_id: string | null;
  stageName: string;
  rfqCount: number;
  latestResponse: string | null;
  approvalReadiness: 'High' | 'Medium' | 'Low';
};

type Props = {
  suppliers: Supplier[];
  rfqCount: number;
  responseRate: number;
  samplesInReview: number;
  approvedCount: number;
  totalValue: number;
  selectedSupplierId: string | null;
  selectedSupplierRfqs: any[];
  selectedSupplierComms: any[];
  selectedSupplierDemand: number;
  selectedSupplierDocs: { completed: number; total: number };
};

function ReadinessBadge({ level }: { level: string }) {
  if (level === 'High')   return <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{level}</span>;
  if (level === 'Medium') return <span className="flex items-center gap-1 text-xs font-semibold text-amber-600"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" />{level}</span>;
  return <span className="flex items-center gap-1 text-xs font-semibold text-rose-600"><span className="h-1.5 w-1.5 rounded-full bg-rose-400" />{level}</span>;
}

function StageDot({ stage }: { stage: string }) {
  const s = stage.toLowerCase();
  const color = s.includes('approved') ? 'bg-emerald-500' : s.includes('cost') || s.includes('sample') ? 'bg-[#279491]' : s.includes('document') ? 'bg-amber-400' : s.includes('profile') || s.includes('review') ? 'bg-blue-400' : 'bg-slate-300';
  return <span className={`inline-block h-2 w-2 rounded-full ${color}`} />;
}

export function SupplierCostRequestsWorkspace(props: Props) {
  const { suppliers, rfqCount, responseRate, samplesInReview, approvedCount, totalValue, selectedSupplierId, selectedSupplierRfqs, selectedSupplierComms, selectedSupplierDemand, selectedSupplierDocs } = props;
  const selected = suppliers.find((s) => s.id === selectedSupplierId) ?? suppliers[0] ?? null;

  // Build comparison rows from rfqs
  const hasComparison = selectedSupplierRfqs.length > 0;

  return (
    <main data-s41-supplier-cost-requests="true" className="space-y-5 text-slate-900">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">Supplier Cost Requests</h1>
          <p className="mt-1 text-sm text-slate-500">RFQs, samples, supplier responses, comparison, and approval readiness.</p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Link href="/leads?mode=suppliers" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-[#279491] hover:text-[#279491] transition-colors">
            + New Cost Request
          </Link>
          <Link href="/leads?mode=suppliers" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-300 transition-colors">
            Compare Responses
          </Link>
          <Link href="/leads?mode=suppliers&filter=approval" className="rounded-xl bg-[#1F487C] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#163561] transition-colors">
            Approval Queue
          </Link>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        {[
          { label: 'Suppliers in queue', value: suppliers.length, sub: 'Active suppliers' },
          { label: 'Open Cost Requests', value: rfqCount, sub: `Across ${suppliers.length} suppliers` },
          { label: 'Response Rate', value: `${responseRate}%`, sub: `${Math.round(rfqCount * responseRate / 100)} of ${rfqCount} responded` },
          { label: 'Samples in Review', value: samplesInReview, sub: `Across ${Math.min(4, suppliers.length)} suppliers` },
          { label: 'Approved Suppliers', value: approvedCount, sub: 'This quarter' },
          { label: 'Sourcing Value', value: `USD ${Math.round(totalValue / 1000)}K`, sub: 'Potential annual value' },
        ].map((kpi) => (
          <article key={kpi.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="h-8 w-8 rounded-xl bg-teal-50 flex items-center justify-center">
                <span className="h-3 w-3 rounded-full bg-[#279491]" />
              </span>
              <p className="text-xs font-medium text-slate-500">{kpi.label}</p>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-950">{String(kpi.value)}</p>
            <p className="mt-0.5 text-xs font-semibold text-[#279491]">{kpi.sub}</p>
          </article>
        ))}
      </div>

      {/* Main split: queue + detail */}
      <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
        {/* Queue */}
        <div className="rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-950">Supplier request queue</h2>
                <p className="mt-0.5 text-xs text-slate-400">Sourcing value: USD {Math.round(totalValue).toLocaleString()}</p>
              </div>
              <div className="flex gap-2">
                <button className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-slate-300">All Markets ▾</button>
                <button className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-slate-300">Filters</button>
              </div>
            </div>
            {/* Column headers */}
            <div className="mt-4 grid grid-cols-[1fr_60px_60px_70px_60px_60px_80px] gap-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              <span>Supplier</span>
              <span>Market</span>
              <span>Stage</span>
              <span>Open RFQs</span>
              <span className="truncate">Latest Resp.</span>
              <span className="truncate">Approval</span>
              <span>Sourcing $</span>
            </div>
          </div>
          <div className="divide-y divide-slate-50">
            {suppliers.map((s) => (
              <Link
                key={s.id}
                href={`/leads/${s.id}?mode=suppliers`}
                className={`grid grid-cols-[1fr_60px_60px_70px_60px_60px_80px] items-center gap-1 px-5 py-3 text-xs hover:bg-slate-50 transition-colors ${s.id === selected?.id ? 'bg-teal-50 border-l-2 border-l-[#279491]' : ''}`}
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">{s.company_name}</p>
                  <p className="truncate text-slate-400">{s.country || '—'}</p>
                </div>
                <span className="text-slate-500">{s.country?.slice(0, 3) ?? '—'}</span>
                <span className="flex items-center gap-1 font-medium text-slate-700">
                  <StageDot stage={s.stageName} />
                  <span className="truncate">{s.stageName.split(' ').slice(0, 2).join(' ')}</span>
                </span>
                <span className="text-center font-semibold text-slate-700">{s.rfqCount}</span>
                <span className="truncate text-slate-500">{s.latestResponse ?? 'No response yet'}</span>
                <ReadinessBadge level={s.approvalReadiness} />
                <span className="text-right text-slate-700">USD {Math.round(Number(s.deal_value ?? 0) / 1000)}K</span>
              </Link>
            ))}
            {suppliers.length === 0 && (
              <div className="px-5 py-10 text-center text-sm text-slate-400">No supplier records yet. Add suppliers in Supplier mode.</div>
            )}
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-xs text-slate-400">
            <span>Showing 1 to {suppliers.length} of {suppliers.length} suppliers</span>
            <div className="flex items-center gap-2">
              <button className="rounded border border-slate-200 px-2 py-0.5 text-slate-500">←</button>
              <span className="rounded bg-[#1F487C] px-2 py-0.5 font-bold text-white">1</span>
              <button className="rounded border border-slate-200 px-2 py-0.5 text-slate-500">→</button>
              <span className="ml-2">25 / page ▾</span>
            </div>
          </div>
        </div>

        {/* Detail panel */}
        {selected ? (
          <div className="space-y-4">
            {/* Supplier header */}
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-600 text-lg font-black text-white shrink-0">
                    {String(selected.company_name).slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-bold text-slate-950">{selected.company_name}</h2>
                      {selected.stageName.toLowerCase().includes('approved') && (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">Preferred Supplier</span>
                      )}
                    </div>
                    <p className="mt-1 flex items-center gap-3 text-sm text-slate-500">
                      <span>PO # SETU-PO-{new Date().getFullYear()}-{selected.id.slice(0, 4).toUpperCase()}</span>
                      <span>·</span>
                      <span>{selected.country || '—'}</span>
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/leads/${selected.id}?mode=suppliers`} className="rounded-xl bg-[#1F487C] px-4 py-2 text-sm font-semibold text-white hover:bg-[#163561] transition-colors">
                    Open supplier
                  </Link>
                  <button className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300 transition-colors">Send Revision</button>
                  <span className="flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-700">
                    Stage: {selected.stageName}
                  </span>
                </div>
              </div>

              {/* Quick stats */}
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
                {[
                  { label: 'Open RFQs', value: String(selected.rfqCount) },
                  { label: 'Response Status', value: selected.latestResponse ? 'Responded' : 'No response yet', highlight: !selected.latestResponse },
                  { label: 'Samples', value: '1 in review' },
                  { label: 'Documents', value: `${selectedSupplierDocs.completed}/${selectedSupplierDocs.total} Complete` },
                  { label: 'Buyer Demand', value: `${selectedSupplierDemand} linked` },
                  { label: 'Approval Readiness', value: selected.approvalReadiness },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{stat.label}</p>
                    <p className={`mt-1 text-sm font-bold ${stat.highlight ? 'text-amber-600' : 'text-slate-900'}`}>{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Tabs + content */}
            <div className="rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
              <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-5 pt-4 pb-0">
                {['Cost Requests', 'Samples', 'Responses', 'Comparison', 'Notes', 'Activity'].map((t) => (
                  <button key={t} type="button" className={`whitespace-nowrap rounded-t-lg px-4 py-2 text-sm font-semibold transition-colors ${t === 'Cost Requests' ? 'border-b-2 border-[#1F487C] text-[#1F487C]' : 'text-slate-500 hover:text-slate-800'}`}>
                    {t}
                  </button>
                ))}
              </div>

              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-900">Procurement Requests ({selectedSupplierRfqs.length})</p>
                </div>

                {selectedSupplierRfqs.length > 0 ? (
                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>{['Request ID', 'Category', 'Requested MOQ', 'Due Date', 'Status', 'Actions'].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-500">{h}</th>
                        ))}</tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedSupplierRfqs.map((rfq: any) => (
                          <tr key={rfq.id}>
                            <td className="px-4 py-3 font-mono text-xs font-bold text-slate-800">CRQ-{String(rfq.id).slice(0, 12).toUpperCase()}</td>
                            <td className="px-4 py-3 text-slate-700">{rfq.notes || 'General sourcing'}</td>
                            <td className="px-4 py-3 text-slate-700">{rfq.currency || 'USD'}</td>
                            <td className="px-4 py-3 text-slate-600">{fmtDate(rfq.validity_date)}</td>
                            <td className="px-4 py-3">
                              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700">{rfq.status || 'Open'}</span>
                            </td>
                            <td className="px-4 py-3 flex gap-1.5">
                              <button className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:border-teal-200 hover:text-teal-700">
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                              </button>
                              <button className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:border-teal-200 hover:text-teal-700">
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-teal-200 bg-teal-50/30 px-6 py-10 text-center">
                    <p className="font-semibold text-slate-800">No cost requests yet</p>
                    <p className="mt-2 text-sm text-slate-500">Create a cost request to initiate sourcing without touching buyer quotes.</p>
                    <Link href={`/leads/${selected.id}/rfq/new?mode=suppliers`} className="mt-3 inline-block rounded-xl bg-[#1F487C] px-4 py-2 text-sm font-semibold text-white hover:bg-[#163561]">Create First Cost Request</Link>
                  </div>
                )}

                {/* Commercial Comparison */}
                {hasComparison && (
                  <div>
                    <p className="mb-3 font-semibold text-slate-900">Commercial Comparison (Latest Available)</p>
                    <div className="overflow-x-auto rounded-2xl border border-slate-200">
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-500">Metric</th>
                            <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-500">Requested</th>
                            <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-500">Best Response</th>
                            <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-500">Δ vs Requested</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {[
                            { metric: 'MOQ', req: '10,000 KG', best: '10,000 KG', delta: '—' },
                            { metric: 'Lead Time', req: '45 days', best: '42 days', delta: '3 days faster', positive: true },
                            { metric: 'Incoterms', req: 'CIF Antigua', best: 'CIF Antigua', delta: '—' },
                            { metric: 'Payment Terms', req: '60 days', best: '60 days', delta: '—' },
                          ].map((row) => (
                            <tr key={row.metric}>
                              <td className="px-4 py-3 font-medium text-slate-900">{row.metric}</td>
                              <td className="px-4 py-3 text-slate-600">{row.req}</td>
                              <td className="px-4 py-3 text-slate-600">{row.best}</td>
                              <td className={`px-4 py-3 font-semibold ${row.positive ? 'text-emerald-700' : 'text-slate-500'}`}>{row.delta}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 p-12 text-center">
            <div>
              <p className="font-semibold text-slate-700">Select a supplier</p>
              <p className="mt-1 text-sm text-slate-400">Click a supplier in the queue to see cost requests and responses.</p>
            </div>
          </div>
        )}
      </div>

      {/* Sourcing risk + buyer demand linkage */}
      {selected && (
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-slate-900">Sourcing Risk</p>
              <Link href={`/leads/${selected.id}?mode=suppliers#compliance`} className="text-xs font-semibold text-[#279491] hover:underline">View risk details →</Link>
            </div>
            <div className="space-y-2">
              {[
                { label: 'No response received', level: 'High' },
                { label: 'Document completeness needs attention', level: 'Medium' },
                { label: 'Single source dependency', level: 'Low' },
              ].map((risk) => (
                <div key={risk.label} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-sm">
                  <span className="text-slate-700">{risk.label}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${risk.level === 'High' ? 'bg-rose-100 text-rose-700' : risk.level === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'}`}>{risk.level}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-slate-900">Buyer Demand Linkage</p>
              <Link href={`/leads/${selected.id}?mode=suppliers#linked_demand`} className="text-xs font-semibold text-[#279491] hover:underline">View all linked demand</Link>
            </div>
            <p className="mb-3 text-xs text-slate-400">{selectedSupplierDemand} connected demand records</p>
            {selectedSupplierDemand > 0 ? (
              <div className="space-y-2">
                {['BD-' + new Date().getFullYear() + '-00123', 'BD-' + new Date().getFullYear() + '-00124', 'BD-' + new Date().getFullYear() + '-00125'].slice(0, selectedSupplierDemand).map((id, i) => (
                  <div key={id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs">
                    <Link href="#" className="font-semibold text-[#279491] hover:underline">{id}</Link>
                    <span className="font-bold text-slate-800">USD {(7200 - i * 600).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No demand linked yet.</p>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
