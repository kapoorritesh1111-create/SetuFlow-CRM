'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  getSupplierApprovalState,
  getSupplierCapabilityCompleteness,
  getSupplierComplianceReadiness,
  getSupplierOfferComparison,
  getSupplierResponseRows,
  getSupplierDemandMatches,
  type SupplierCommandCenterData,
} from '@/lib/supplier-workflow';
import { getJourneyTerminology } from '@/lib/journey';
import { approveSupplier, markSupplierUnderReview, rejectSupplier, setSupplierInactive } from '@/features/leads/canonical/actions';

const supplierTerms = getJourneyTerminology('supplier');

type SupplierTab =
  | 'overview'
  | 'capability'
  | 'compliance'
  | 'cost_requests'
  | 'responses'
  | 'approval'
  | 'linked_demand'
  | 'performance'
  | 'activity';

const JOURNEY_PHASES = [
  { n: 1, label: 'Capture',    key: 'capture' },
  { n: 2, label: 'Verify',     key: 'verify' },
  { n: 3, label: 'Compliance', key: 'compliance' },
  { n: 4, label: 'Sourcing',   key: 'sourcing' },
  { n: 5, label: 'Approval',   key: 'approval' },
  { n: 6, label: 'Performance',key: 'performance' },
];

function fmtDate(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function money(val?: number | string | null, currency = 'USD') {
  const n = Number(val ?? 0);
  if (!n) return '—';
  return `${currency} ${n.toLocaleString()}`;
}

function stageToPhaseIndex(stageName: string) {
  const s = stageName.toLowerCase();
  if (s.includes('approved')) return 5;
  if (s.includes('cost') || s.includes('sample') || s.includes('response')) return 4;
  if (s.includes('compliance') || s.includes('document')) return 3;
  if (s.includes('capability') || s.includes('profile') || s.includes('verify')) return 2;
  if (s.includes('new') || s.includes('capture')) return 1;
  return 2;
}

function phaseStatus(phaseIdx: number, currentPhase: number): 'done' | 'active' | 'pending' {
  if (phaseIdx < currentPhase) return 'done';
  if (phaseIdx === currentPhase) return 'active';
  return 'pending';
}

function MetricPill({ label, value, sub, tone = 'slate', wide }: { label: string; value: string; sub: string; tone?: 'slate' | 'teal' | 'amber' | 'rose' | 'emerald'; wide?: boolean }) {
  const colors = {
    slate:   'bg-white border-slate-200 text-slate-900',
    teal:    'bg-teal-50 border-teal-200 text-teal-900',
    amber:   'bg-amber-50 border-amber-200 text-amber-900',
    rose:    'bg-rose-50 border-rose-200 text-rose-900',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-900',
  }[tone];
  return (
    <div className={`rounded-2xl border px-5 py-4 shadow-sm ${colors} ${wide ? 'col-span-2 sm:col-span-1' : ''}`}>
      <p className="text-[10px] font-semibold uppercase tracking-widest opacity-60">{label}</p>
      <p className="mt-1.5 text-2xl font-bold leading-none">{value}</p>
      <p className="mt-1 text-xs font-medium opacity-65">{sub}</p>
    </div>
  );
}

function FieldGrid({ rows }: { rows: Array<{ label: string; value?: string | null }> }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map(({ label, value }) => (
        <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
          <dt className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{label}</dt>
          <dd className="mt-1 text-sm font-semibold text-slate-900">{value || '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

function TabBtn({ id, label, active, badge, onClick }: { id: string; label: string; active: boolean; badge?: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-all ${
        active
          ? 'bg-[#1F487C] text-white shadow-sm'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {label}
      {badge ? (
        <span className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${active ? 'bg-white/20 text-white' : 'bg-slate-300 text-slate-700'}`}>
          {badge}
        </span>
      ) : null}
    </button>
  );
}

function SectionHead({ title, action, actionHref }: { title: string; action?: string; actionHref?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{title}</p>
      {action && actionHref && (
        <Link href={actionHref} className="text-xs font-semibold text-[#279491] hover:underline">{action}</Link>
      )}
    </div>
  );
}

function EmptyCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-teal-200 bg-teal-50/30 px-6 py-10 text-center">
      <p className="font-semibold text-slate-800">{title}</p>
      <p className="mt-2 text-sm text-slate-500">{desc}</p>
    </div>
  );
}

function RiskBadge({ level }: { level: string }) {
  const l = level.toLowerCase();
  if (l.includes('high')) return <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-700">High</span>;
  if (l.includes('med')) return <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700">Medium</span>;
  return <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">Low</span>;
}

function ReadinessBar({ pct, tone }: { pct: number; tone: 'teal' | 'amber' | 'rose' }) {
  const bg = { teal: 'bg-[#279491]', amber: 'bg-amber-400', rose: 'bg-rose-400' }[tone];
  return (
    <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100">
      <div className={`h-full rounded-full ${bg} transition-all`} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  );
}

export function SupplierCommandCenter({ data }: { data: SupplierCommandCenterData }) {
  const [activeTab, setActiveTab] = useState<SupplierTab>('overview');
  const lead = data?.lead ?? {};
  const workflow = data?.workflow ?? {};
  const capability = workflow?.supplierCapability ?? {};
  const documents = Array.isArray(data?.documents) ? data.documents : [];
  const complianceItems = Array.isArray(data?.complianceItems) ? data.complianceItems : [];
  const rfqs = Array.isArray(data?.rfqs) ? data.rfqs : [];
  const quotes = Array.isArray(data?.quotes) ? data.quotes : [];
  const activities = Array.isArray(data?.activities) ? data.activities : [];
  const communications = Array.isArray(data?.communications) ? data.communications : [];
  const productInterests = Array.isArray(data?.linkedProducts) ? data.linkedProducts : [];
  const linkedMarkets = Array.isArray(data?.linkedMarkets) ? data.linkedMarkets : [];
  const stages = Array.isArray(data?.stages) ? data.stages : [];
  const stageName = stages.find((s: any) => s.id === lead?.stage_id)?.name || 'New Supplier';
  const ownerName =
    data?.profiles?.find?.((p: any) => p.id === lead?.owner_user_id)?.full_name ||
    data?.profiles?.find?.((p: any) => p.id === lead?.owner_user_id)?.username ||
    'Unassigned';

  const readiness = useMemo(() => getSupplierComplianceReadiness({ documents, complianceItems }), [documents, complianceItems]);
  const capComp = useMemo(() => getSupplierCapabilityCompleteness(capability), [capability]);
  const approval = useMemo(() => getSupplierApprovalState({ capability, stageName, readiness }), [capability, stageName, readiness]);
  const responseRows = useMemo(() => getSupplierResponseRows({ rfqs, communications, quotes }), [rfqs, communications, quotes]);
  const offerComp = useMemo(() => getSupplierOfferComparison(responseRows), [responseRows]);
  const demandMatches = useMemo(
    () => getSupplierDemandMatches({ supplierProducts: productInterests, supplierMarkets: linkedMarkets, buyerDemand: data?.buyerDemand ?? [] }),
    [productInterests, linkedMarkets, data?.buyerDemand]
  );

  const missingCount = readiness.missingMandatory.length;
  const canApprove = approval.canApprove;
  const currentPhase = stageToPhaseIndex(stageName);

  const tabs: Array<{ id: SupplierTab; label: string; badge?: number }> = [
    { id: 'overview',      label: 'Overview' },
    { id: 'capability',    label: 'Capability' },
    { id: 'compliance',    label: 'Compliance', badge: missingCount || undefined },
    { id: 'cost_requests', label: 'Cost Requests', badge: rfqs.length || undefined },
    { id: 'responses',     label: 'Responses', badge: responseRows.length || undefined },
    { id: 'approval',      label: 'Approval' },
    { id: 'linked_demand', label: 'Linked Demand', badge: demandMatches.length || undefined },
    { id: 'performance',   label: 'Performance' },
    { id: 'activity',      label: 'Activity' },
  ];

  // Outstanding gaps for next best actions sidebar
  const gaps: Array<{ label: string; risk: string }> = [
    ...(missingCount ? [{ label: 'Company profile documents', risk: 'High' }] : []),
    ...(capComp.percent < 50 ? [{ label: 'Product certifications', risk: 'High' }] : []),
    ...(capComp.percent < 80 ? [{ label: 'Banking & payment details', risk: 'Medium' }] : []),
  ];

  return (
    <div data-s41-supplier-command-center="true" className="mx-auto max-w-[1560px] space-y-5 p-4 pb-24 md:p-6">
      {/* ─── Header ─── */}
      <div className="rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
        {/* Top bar */}
        <div className="border-b border-slate-100 px-6 py-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#279491]">Supplier Workspace</p>
          <p className="mt-0.5 text-sm text-slate-500">Qualification, compliance, cost requests, response tracking, and approval in one place.</p>
        </div>

        {/* Company + meta + actions */}
        <div className="flex flex-col gap-5 px-6 py-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex min-w-0 gap-5">
            {/* Avatar */}
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-teal-600 text-xl font-black text-white">
              {String(lead?.company_name ?? 'S').slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-slate-950">{lead?.company_name ?? 'Supplier profile'}</h1>
                <span className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-800">
                  Stage: {stageName}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-8 gap-y-1 text-sm text-slate-600 sm:flex sm:flex-wrap sm:gap-x-6">
                <span><span className="text-slate-400">Owner</span> &nbsp;<span className="font-semibold text-slate-800">{ownerName}</span></span>
                <span><span className="text-slate-400">Country</span> &nbsp;<span className="font-semibold text-slate-800">{lead?.country || '—'}</span></span>
                <span><span className="text-slate-400">Sourcing Value (YTD)</span> &nbsp;<span className="font-semibold text-slate-800">{money(lead?.deal_value, lead?.deal_currency)}</span></span>
                <span><span className="text-slate-400">Response SLA</span> &nbsp;<span className="font-semibold text-slate-800">5 business days</span></span>
                <span>
                  <span className="text-slate-400">Approval Readiness</span> &nbsp;
                  <span className={`font-semibold ${canApprove ? 'text-emerald-700' : capComp.percent >= 70 ? 'text-amber-600' : 'text-rose-600'}`}>
                    {canApprove ? 'Ready' : capComp.percent >= 70 ? 'Medium' : 'Low'}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Action rail */}
          <div className="flex shrink-0 flex-col gap-2 xl:min-w-[200px]">
            <Link
              href={`/leads/${lead?.id}/rfq/new?mode=suppliers`}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#1F487C] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#163561] transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Create Cost Request
            </Link>
            <Link href="/documents?mode=suppliers" className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-teal-200 hover:text-teal-700 transition-colors">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
              Request Documents
            </Link>
            <Link href={`/leads/${lead?.id}/rfq/new?request=sample&mode=suppliers`} className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-teal-200 hover:text-teal-700 transition-colors">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
              Request Sample
            </Link>
            <form action={markSupplierUnderReview}>
              <input type="hidden" name="lead_id" value={lead?.id ?? ''} />
              <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#279491]/30 bg-teal-50 px-4 py-2.5 text-sm font-semibold text-[#279491] hover:bg-teal-100 transition-colors">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                Start Approval Review
              </button>
            </form>
          </div>
        </div>

        {/* Journey phase strip */}
        <div className="overflow-x-auto border-t border-slate-100 px-6 py-4">
          <ol className="flex min-w-[600px] items-center gap-0">
            {JOURNEY_PHASES.map((phase, i) => {
              const status = phaseStatus(phase.n, currentPhase);
              const isLast = i === JOURNEY_PHASES.length - 1;
              return (
                <li key={phase.key} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                      status === 'done'   ? 'bg-[#279491] text-white' :
                      status === 'active' ? 'border-2 border-[#1F487C] bg-[#1F487C] text-white shadow-md' :
                      'border-2 border-slate-200 bg-white text-slate-400'
                    }`}>
                      {status === 'done' ? (
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      ) : phase.n}
                    </div>
                    <span className={`mt-1.5 text-[11px] font-semibold ${status === 'active' ? 'text-[#1F487C]' : status === 'done' ? 'text-[#279491]' : 'text-slate-400'}`}>
                      {phase.label}
                    </span>
                    <span className={`text-[10px] ${status === 'active' ? 'text-[#1F487C]/80 font-medium' : 'text-slate-400'}`}>
                      {status === 'done' ? 'Completed' : status === 'active' ? 'In Progress' : 'Pending'}
                    </span>
                  </div>
                  {!isLast && (
                    <div className={`mx-2 h-0.5 flex-1 ${i < currentPhase - 1 ? 'bg-[#279491]' : 'bg-slate-200'}`} />
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {/* ─── Metric row ─── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <MetricPill
          label="Verification"
          value={`${capComp.percent}%`}
          sub={capComp.percent >= 70 ? 'Profile Verified' : 'Needs completion'}
          tone={capComp.percent >= 70 ? 'teal' : 'amber'}
        />
        <MetricPill
          label="Capability Fit"
          value={`${Math.min(100, capComp.percent + 13)}%`}
          sub={capComp.percent >= 70 ? 'Good Match' : 'Incomplete'}
          tone={capComp.percent >= 70 ? 'teal' : 'amber'}
        />
        <MetricPill
          label="Documents Readiness"
          value={`${readiness.completedCount}/${Math.max(readiness.totalCount, 9)}`}
          sub={`${readiness.totalCount > 0 ? Math.round((readiness.completedCount / Math.max(readiness.totalCount, 9)) * 100) : 0}% Complete`}
          tone={missingCount ? 'amber' : readiness.completedCount > 0 ? 'emerald' : 'slate'}
        />
        <MetricPill
          label="Cost Requests"
          value={String(rfqs.length)}
          sub="Open Requests"
          tone={rfqs.length > 0 ? 'teal' : 'slate'}
        />
        <MetricPill
          label="Responses"
          value={String(responseRows.length)}
          sub={responseRows.length ? offerComp.bestSummary : 'No Responses Yet'}
          tone={responseRows.length ? 'teal' : 'slate'}
        />
        <MetricPill
          label="Linked Demand"
          value={String(demandMatches.length)}
          sub="Buyer Demands"
          tone={demandMatches.length ? 'emerald' : 'slate'}
        />
      </div>

      {/* ─── Main content: tabs left + sidebar right ─── */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* Tab panel */}
        <div className="rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
          {/* Tab bar */}
          <div className="overflow-x-auto border-b border-slate-100 px-5 pt-4 pb-0">
            <div className="flex gap-2 pb-4">
              {tabs.map((t) => (
                <TabBtn
                  key={t.id}
                  id={t.id}
                  label={t.label}
                  active={activeTab === t.id}
                  badge={t.badge}
                  onClick={() => setActiveTab(t.id)}
                />
              ))}
            </div>
          </div>

          <div className="p-5">
            {/* OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-5">
                <div className="grid gap-5 lg:grid-cols-2">
                  {/* Profile snapshot */}
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Supplier Profile Snapshot</p>
                      <Link href={`/leads/${lead?.id}`} className="text-xs font-semibold text-[#279491] hover:underline">✏ Edit Profile</Link>
                    </div>
                    <FieldGrid rows={[
                      { label: 'Contact',  value: lead?.contact_name },
                      { label: 'Email',    value: lead?.email },
                      { label: 'Phone',    value: lead?.phone },
                      { label: 'Country',  value: lead?.country },
                      { label: 'Source',   value: lead?.source_label },
                      { label: 'Updated',  value: fmtDate(lead?.updated_at) },
                    ]} />
                  </div>

                  {/* Capability & Compliance + Linked Demand summary */}
                  <div className="space-y-4">
                    <div>
                      <SectionHead title="Capability & Compliance Summary" action="View All" actionHref="#capability" />
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Top Capabilities</p>
                          <ul className="mt-2 space-y-1.5">
                            {productInterests.slice(0, 3).map((p: any) => (
                              <li key={p.id} className="flex items-center gap-2 text-xs font-medium text-slate-700">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#279491]" />
                                {p.name || p.label || 'Product'}
                              </li>
                            ))}
                            {productInterests.length === 0 && <li className="text-xs text-slate-400">No capabilities mapped</li>}
                          </ul>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Compliance Overview</p>
                          <div className="mt-2 space-y-1.5">
                            {[
                              { label: 'Certificates', total: 5 },
                              { label: 'Certifications', total: 4 },
                              { label: 'Policies', total: 3 },
                            ].map(({ label, total }) => {
                              const done = Math.min(readiness.completedCount, total);
                              return (
                                <div key={label} className="flex items-center justify-between text-xs">
                                  <span className="text-slate-600">{label}</span>
                                  <span className="font-semibold text-slate-800">{done}/{total} Complete</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <SectionHead title="Linked Demand Overview" action="View All" actionHref="#linked_demand" />
                      {demandMatches.length ? (
                        <div className="space-y-1.5">
                          {demandMatches.slice(0, 3).map((m) => (
                            <div key={m.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs">
                              <span className="font-medium text-slate-800">{m.title}</span>
                              <span className="flex items-center gap-1 text-[#279491]">
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                {m.confidence === 'High confidence' ? '2 Linked Demands' : '1 Linked Demand'}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 text-xs text-slate-500">No linked buyer demand yet. Match by category/product and market after response review.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* CAPABILITY */}
            {activeTab === 'capability' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-teal-900">Capability completeness: {capComp.percent}%</p>
                    <ReadinessBar pct={capComp.percent} tone={capComp.percent >= 70 ? 'teal' : 'amber'} />
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${capComp.percent >= 70 ? 'bg-teal-200 text-teal-800' : 'bg-amber-200 text-amber-800'}`}>
                    {capComp.completed}/{capComp.total} fields
                  </span>
                </div>
                <FieldGrid rows={[
                  { label: 'Capability Category', value: capability.category },
                  { label: 'MOQ',                  value: capability.moq },
                  { label: 'Production Capacity',  value: capability.productionCapacity },
                  { label: 'Lead Time',             value: capability.leadTime },
                  { label: 'Payment Terms',         value: capability.paymentTerms },
                  { label: 'Incoterms',             value: capability.incoterms },
                  { label: 'Export Markets',        value: capability.exportMarkets },
                  { label: 'Risk Status',           value: capability.riskStatus },
                  { label: 'Approval Status',       value: capability.approvalStatus },
                ]} />
                <FieldGrid rows={[
                  { label: 'Reliability Score',   value: capability.reliabilityScore },
                  { label: 'Quality Score',       value: capability.qualityScore },
                  { label: 'Response Speed',      value: capability.responseTimeScore },
                ]} />
              </div>
            )}

            {/* COMPLIANCE */}
            {activeTab === 'compliance' && (
              <div className="space-y-4">
                <div className={`rounded-2xl border px-4 py-3 ${missingCount ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
                  <p className={`text-sm font-semibold ${missingCount ? 'text-amber-900' : 'text-emerald-900'}`}>
                    Document readiness: {readiness.completedCount}/{Math.max(readiness.totalCount, 9)} · {missingCount ? `${missingCount} mandatory missing` : 'Approval gate clear'}
                  </p>
                  <ReadinessBar pct={readiness.totalCount > 0 ? (readiness.completedCount / Math.max(readiness.totalCount, 9)) * 100 : 0} tone={missingCount ? 'amber' : 'teal'} />
                </div>
                {documents.length > 0 ? (
                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>{['Document', 'Type', 'Status', 'Uploaded'].map((h) => <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-500">{h}</th>)}</tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {documents.map((doc: any) => (
                          <tr key={doc.id}>
                            <td className="px-4 py-3 font-medium text-slate-900">{doc.file_name || 'Document'}</td>
                            <td className="px-4 py-3 text-slate-600">{doc.doc_type || '—'}</td>
                            <td className="px-4 py-3">
                              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${['approved','complete','waived'].includes(String(doc.status).toLowerCase()) ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                {doc.status || 'pending'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-600">{fmtDate(doc.uploaded_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyCard
                    title="No compliance documents yet"
                    desc="Request supplier profile, business registration, factory profile, certifications, quality docs, and Incoterms capability documents."
                  />
                )}
              </div>
            )}

            {/* COST REQUESTS */}
            {activeTab === 'cost_requests' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-700">Procurement Requests ({rfqs.length})</p>
                  <Link href={`/leads/${lead?.id}/rfq/new?mode=suppliers`} className="rounded-xl bg-[#1F487C] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#163561]">+ New Cost Request</Link>
                </div>
                {rfqs.length > 0 ? (
                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>{['Request ID', 'Category', 'Req. MOQ', 'Due Date', 'Status', 'Actions'].map((h) => <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-500">{h}</th>)}</tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {rfqs.map((rfq: any) => (
                          <tr key={rfq.id}>
                            <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-800">CRQ-{String(rfq.id).slice(0, 12).toUpperCase()}</td>
                            <td className="px-4 py-3 text-slate-700">{rfq.notes || 'General sourcing'}</td>
                            <td className="px-4 py-3 text-slate-700">{rfq.currency || 'USD'}</td>
                            <td className="px-4 py-3 text-slate-600">{fmtDate(rfq.validity_date)}</td>
                            <td className="px-4 py-3">
                              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">{rfq.status || 'Open'}</span>
                            </td>
                            <td className="px-4 py-3">
                              <button className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:border-teal-200 hover:text-teal-700">View</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyCard title="No cost requests yet" desc="Use Request Cost to initiate a sourcing request without touching the buyer quote workspace." />
                )}
              </div>
            )}

            {/* RESPONSES */}
            {activeTab === 'responses' && (
              <div className="space-y-4">
                {responseRows.length > 0 && (
                  <div className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-medium text-teal-900">
                    <span className="font-semibold">Commercial Comparison: </span>{offerComp.bestSummary}
                  </div>
                )}
                {responseRows.length > 0 ? (
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
                        {responseRows.map((row) => (
                          <tr key={row.id}>
                            <td className="px-4 py-3 font-medium text-slate-900">{row.label}</td>
                            <td className="px-4 py-3 text-slate-600">{row.moq || '—'}</td>
                            <td className="px-4 py-3 text-slate-600">{row.leadTime || '—'}</td>
                            <td className="px-4 py-3 text-slate-600">{row.price || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyCard title="No supplier responses yet" desc="Responses received through RFQs, communications, or notes will appear here with side-by-side comparison." />
                )}
              </div>
            )}

            {/* APPROVAL */}
            {activeTab === 'approval' && (
              <div className="space-y-4">
                <div className={`rounded-2xl border px-5 py-4 ${canApprove ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
                  <p className={`font-semibold ${canApprove ? 'text-emerald-900' : 'text-amber-900'}`}>
                    {canApprove ? 'Supplier can be approved' : 'Supplier approval is blocked'}
                  </p>
                  <p className={`mt-1 text-sm ${canApprove ? 'text-emerald-700' : 'text-amber-700'}`}>{approval.reason}</p>
                </div>
                {approval.blockers.map((b) => (
                  <p key={b} className="rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm text-amber-800">{b}</p>
                ))}
                <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-4">
                  <form action={markSupplierUnderReview}>
                    <input type="hidden" name="lead_id" value={lead?.id ?? ''} />
                    <button className="w-full rounded-xl border border-teal-200 bg-white px-4 py-2.5 text-sm font-semibold text-teal-800 hover:bg-teal-50 transition-colors">Mark Under Review</button>
                  </form>
                  <form action={approveSupplier}>
                    <input type="hidden" name="lead_id" value={lead?.id ?? ''} />
                    <button disabled={!canApprove} className={`w-full rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${canApprove ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100' : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'}`}>
                      Approve Supplier
                    </button>
                  </form>
                  <form action={rejectSupplier} className="space-y-2">
                    <input type="hidden" name="lead_id" value={lead?.id ?? ''} />
                    <input name="reason" required placeholder="Rejection reason" className="w-full rounded-xl border border-rose-200 px-3 py-2 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-300" />
                    <button className="w-full rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-100 transition-colors">Reject Supplier</button>
                  </form>
                  <form action={setSupplierInactive} className="space-y-2">
                    <input type="hidden" name="lead_id" value={lead?.id ?? ''} />
                    <input name="reason" required placeholder="Inactive reason" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300" />
                    <button className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors">Set Inactive</button>
                  </form>
                </div>
              </div>
            )}

            {/* LINKED DEMAND */}
            {activeTab === 'linked_demand' && (
              demandMatches.length ? (
                <div className="space-y-3">
                  {demandMatches.map((m) => (
                    <div key={m.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="font-semibold text-slate-900">{m.title}</p>
                      <p className="mt-1 text-sm text-slate-600">{m.reason}</p>
                      <p className="mt-1 text-xs font-medium text-[#279491]">{m.confidence}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyCard
                  title="No linked buyer demand yet"
                  desc="Approved and under-review suppliers are matched to buyer RFQs by category, product interest, and target market."
                />
              )
            )}

            {/* PERFORMANCE */}
            {activeTab === 'performance' && (
              <div className="space-y-4">
                <FieldGrid rows={[
                  { label: 'Reliability',         value: capability.reliabilityScore },
                  { label: 'Quality',             value: capability.qualityScore },
                  { label: 'Response Speed',      value: capability.responseTimeScore },
                  { label: 'Risk Status',         value: capability.riskStatus },
                  { label: 'Responses Received',  value: String(responseRows.length) },
                  { label: 'Demand Matches',      value: String(demandMatches.length) },
                ]} />
              </div>
            )}

            {/* ACTIVITY */}
            {activeTab === 'activity' && (
              activities.length || communications.length ? (
                <div className="space-y-3">
                  {[
                    ...activities.map((a: any) => ({ id: `a-${a.id}`, title: a.message || a.kind || 'Activity', detail: a.kind || '', date: a.occurred_at })),
                    ...communications.map((c: any) => ({ id: `c-${c.id}`, title: c.subject || c.summary || 'Communication', detail: c.body || c.summary || c.status || '', date: c.sent_at || c.created_at })),
                  ]
                    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
                    .map((item) => (
                      <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
                        <p className="font-semibold text-slate-900">{item.title}</p>
                        <p className="mt-0.5 text-xs text-slate-400">{fmtDate(item.date)}</p>
                        <p className="mt-2 text-slate-600">{item.detail || '—'}</p>
                      </div>
                    ))}
                </div>
              ) : (
                <EmptyCard title="No activity yet" desc="Document requests, cost requests, approval changes, and demand links appear here." />
              )
            )}
          </div>
        </div>

        {/* ─── Right sidebar ─── */}
        <div className="space-y-4">
          {/* Next Best Actions */}
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Next Best Actions</p>
              <Link href="#compliance" className="text-xs font-semibold text-[#279491] hover:underline">View All</Link>
            </div>
            <div className="space-y-2">
              {[
                { label: 'Upload mandatory supplier documents', count: Math.max(missingCount, 9), urgent: true },
                { label: 'Provide product catalog & specifications', count: productInterests.length < 3 ? 3 : 0, urgent: productInterests.length < 3 },
                { label: 'Submit certifications and compliance docs', count: 5, urgent: false },
                { label: 'Create a cost request to start sourcing', count: rfqs.length === 0 ? 1 : 0, urgent: false },
              ].filter(a => a.count > 0).map((action) => (
                <div key={action.label} className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-xs font-medium ${action.urgent ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
                  <span>{action.label}</span>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {action.count > 0 && (
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${action.urgent ? 'bg-amber-200 text-amber-800' : 'bg-slate-200 text-slate-600'}`}>{action.count}</span>
                    )}
                    <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </div>
                </div>
              ))}
              {missingCount === 0 && productInterests.length >= 3 && rfqs.length > 0 && (
                <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-medium text-emerald-700">All key actions complete. Ready for approval review.</p>
              )}
            </div>
          </div>

          {/* Outstanding Gaps */}
          {gaps.length > 0 && (
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Outstanding Gaps</p>
                <Link href="#compliance" className="text-xs font-semibold text-[#279491] hover:underline">View All</Link>
              </div>
              <div className="space-y-2">
                {gaps.map((g) => (
                  <div key={g.label} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs">
                    <span className="font-medium text-slate-700">{g.label}</span>
                    <RiskBadge level={g.risk} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Procurement Timeline */}
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Procurement Timeline</p>
              <Link href="#activity" className="text-xs font-semibold text-[#279491] hover:underline">View All</Link>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Lead created', sub: `by ${ownerName}`, date: fmtDate(lead?.created_at), done: true },
                { label: 'Documents requested', sub: 'Waiting for supplier submission', date: rfqs.length > 0 ? fmtDate(rfqs[0]?.updated_at) : 'Pending', done: documents.length > 0 },
                { label: 'Cost request creation', sub: 'Next recommended step', date: rfqs.length ? fmtDate(rfqs[0]?.updated_at) : 'Upcoming', done: rfqs.length > 0 },
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${step.done ? 'bg-[#279491]' : i === 1 ? 'border-2 border-[#1F487C] bg-white' : 'border-2 border-slate-200 bg-white'}`}>
                    {step.done && <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{step.label}</p>
                    <p className="text-xs text-slate-400">{step.sub}</p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-slate-400">{step.date}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
