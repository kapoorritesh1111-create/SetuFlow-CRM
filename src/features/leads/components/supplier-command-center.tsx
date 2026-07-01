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

const supplierTerms = getJourneyTerminology('supplier');

type SupplierTab =
  | 'overview'
  | 'capability'
  | 'documents'
  | 'cost_requests'
  | 'responses'
  | 'approval'
  | 'linked_demand'
  | 'performance'
  | 'activity';

function formatDateValue(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function EmptyTabState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-teal-200 bg-teal-50/40 px-5 py-8 text-center text-sm text-slate-600">
      <p className="font-semibold text-slate-900">{title}</p>
      <p className="mt-2">{description}</p>
    </div>
  );
}

function MetricCard({ label, value, helper, tone = 'slate' }: { label: string; value: string; helper?: string; tone?: 'slate' | 'teal' | 'amber' | 'rose' | 'emerald' }) {
  const toneClass = {
    slate: 'border-slate-200 bg-white text-slate-900',
    teal: 'border-teal-200 bg-teal-50 text-teal-900',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    rose: 'border-rose-200 bg-rose-50 text-rose-900',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  }[tone];
  return (
    <div className={`rounded-3xl border px-4 py-4 shadow-soft ${toneClass}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] opacity-70">{label}</p>
      <p className="mt-2 text-lg font-semibold capitalize">{value}</p>
      {helper ? <p className="mt-1 text-xs opacity-75">{helper}</p> : null}
    </div>
  );
}

function InfoGrid({ rows }: { rows: Array<[string, string | null | undefined]> }) {
  return (
    <dl className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map(([label, value]) => (
        <div key={label} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</dt>
          <dd className="mt-1 font-medium text-slate-900">{value || '—'}</dd>
        </div>
      ))}
    </dl>
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
  const stageName = stages.find((item: any) => item.id === lead?.stage_id)?.name || '—';
  const ownerName = data?.profiles?.find?.((item: any) => item.id === lead?.owner_user_id)?.full_name || data?.profiles?.find?.((item: any) => item.id === lead?.owner_user_id)?.username || 'Unassigned';

  const readiness = useMemo(() => getSupplierComplianceReadiness({ documents, complianceItems }), [documents, complianceItems]);
  const capabilityCompleteness = useMemo(() => getSupplierCapabilityCompleteness(capability), [capability]);
  const approval = useMemo(() => getSupplierApprovalState({ capability, stageName, readiness }), [capability, stageName, readiness]);
  const responseRows = useMemo(() => getSupplierResponseRows({ rfqs, communications, quotes }), [rfqs, communications, quotes]);
  const offerComparison = useMemo(() => getSupplierOfferComparison(responseRows), [responseRows]);
  const demandMatches = useMemo(() => getSupplierDemandMatches({ supplierProducts: productInterests, supplierMarkets: linkedMarkets, buyerDemand: data?.buyerDemand ?? [] }), [productInterests, linkedMarkets, data?.buyerDemand]);

  const tabs: Array<{ id: SupplierTab; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'capability', label: 'Capability' },
    { id: 'documents', label: 'Documents' },
    { id: 'cost_requests', label: 'Cost Requests' },
    { id: 'responses', label: 'Responses' },
    { id: 'approval', label: 'Approval' },
    { id: 'linked_demand', label: 'Linked Demand' },
    { id: 'performance', label: 'Performance' },
    { id: 'activity', label: 'Activity' },
  ];

  const missingMandatoryCount = readiness.missingMandatory.length;
  const canApprove = approval.canApprove;

  return (
    <div data-s41-supplier-command-center="true" className="space-y-6 p-4 md:p-6">
      <div className="rounded-[2rem] border border-teal-200 bg-gradient-to-br from-teal-50 via-white to-slate-50 p-5 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">{supplierTerms.commandCenterTitle}</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">{lead?.company_name ?? 'Supplier profile'}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{supplierTerms.commandCenterDescription}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-teal-200 bg-white px-3 py-1 text-xs font-semibold text-teal-800">{stageName}</span>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">Owner: {ownerName}</span>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">{productInterests.length} capability links</span>
            </div>
          </div>
          <div className="grid min-w-[220px] gap-2 text-sm">
            <Link href={`/leads/${lead?.id}/rfq/new?mode=suppliers`} className="rounded-2xl border border-teal-200 bg-teal-600 px-4 py-3 text-center font-semibold text-white shadow-soft hover:bg-teal-700">{supplierTerms.primaryActionLabel}</Link>
            <Link href="/documents?mode=suppliers" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center font-semibold text-slate-800 hover:border-teal-200 hover:text-teal-700">{supplierTerms.documentActionLabel}</Link>
            <Link href={`/leads/${lead?.id}/rfq/new?request=sample&mode=suppliers`} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center font-semibold text-slate-800 hover:border-teal-200 hover:text-teal-700">{supplierTerms.sampleActionLabel}</Link>
            <span className={`rounded-2xl border px-4 py-3 text-center text-sm font-semibold ${canApprove ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>{canApprove ? supplierTerms.approvalActionLabel : 'Approval blocked'}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <MetricCard label="Verification" value={String(capability.approvalStatus || approval.stateLabel)} helper="Supplier approval state" tone={canApprove ? 'emerald' : 'amber'} />
        <MetricCard label="Capability" value={`${capabilityCompleteness.completed}/${capabilityCompleteness.total}`} helper={`${capabilityCompleteness.percent}% mapped`} tone={capabilityCompleteness.percent >= 70 ? 'teal' : 'amber'} />
        <MetricCard label="Documents" value={`${readiness.completedCount}/${readiness.totalCount}`} helper={missingMandatoryCount ? `${missingMandatoryCount} mandatory missing` : 'Mandatory docs ready'} tone={missingMandatoryCount ? 'rose' : 'emerald'} />
        <MetricCard label="Cost Requests" value={String(rfqs.length)} helper="Supplier RFQ/cost request records" tone="teal" />
        <MetricCard label="Responses" value={String(responseRows.length)} helper={offerComparison.bestSummary} tone="slate" />
        <MetricCard label="Linked Demand" value={String(demandMatches.length)} helper="Buyer demand matches" tone={demandMatches.length ? 'emerald' : 'slate'} />
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-soft">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={activeTab === tab.id ? 'rounded-full bg-teal-700 px-4 py-2 text-sm font-semibold text-white' : 'rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200'}>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-5">
          {activeTab === 'overview' ? (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Supplier snapshot</p>
                <InfoGrid rows={[
                  ['Contact', lead?.contact_name],
                  ['Email', lead?.email],
                  ['Phone', lead?.phone],
                  ['Country', lead?.country],
                  ['Source', lead?.source_label],
                  ['Updated', formatDateValue(lead?.updated_at)],
                ]} />
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Next best actions</p>
                <div className="mt-4 space-y-3 text-sm text-slate-700">
                  <p className="rounded-2xl border border-white bg-white p-3">{missingMandatoryCount ? `Request ${missingMandatoryCount} missing mandatory supplier document${missingMandatoryCount === 1 ? '' : 's'}.` : 'Mandatory supplier documents are ready.'}</p>
                  <p className="rounded-2xl border border-white bg-white p-3">{capabilityCompleteness.percent < 70 ? 'Complete MOQ, capacity, lead time, Incoterms, export markets, and payment terms before approval.' : 'Capability mapping is strong enough for cost request and response review.'}</p>
                  <p className="rounded-2xl border border-white bg-white p-3">{demandMatches.length ? 'Review matching buyer demand before approving or shortlisting supplier.' : 'No linked buyer demand yet. Match by category/product and market after response review.'}</p>
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === 'capability' ? (
            <div className="space-y-4">
              <InfoGrid rows={[
                ['Capability category', capability.category],
                ['MOQ', capability.moq],
                ['Production capacity', capability.productionCapacity],
                ['Lead time', capability.leadTime],
                ['Payment terms', capability.paymentTerms],
                ['Incoterms', capability.incoterms],
                ['Export markets', capability.exportMarkets],
                ['Risk status', capability.riskStatus],
                ['Approval status', capability.approvalStatus],
              ]} />
              <InfoGrid rows={[
                ['Reliability score', capability.reliabilityScore],
                ['Quality score', capability.qualityScore],
                ['Response speed', capability.responseTimeScore],
              ]} />
            </div>
          ) : null}

          {activeTab === 'documents' ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <span className="font-semibold text-slate-900">Readiness:</span> {readiness.completedCount}/{readiness.totalCount} complete. {missingMandatoryCount ? `${missingMandatoryCount} mandatory missing.` : 'Approval document gate is clear.'}
              </div>
              {documents.length ? <div className="overflow-x-auto rounded-3xl border border-slate-200"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.14em] text-slate-500"><tr><th className="px-4 py-3">Document</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Uploaded</th></tr></thead><tbody>{documents.map((item: any) => <tr key={item.id} className="border-t border-slate-100"><td className="px-4 py-3 font-medium text-slate-900">{item.file_name || 'Document'}</td><td className="px-4 py-3 text-slate-600">{item.doc_type || 'supplier_document'}</td><td className="px-4 py-3 text-slate-600">{item.status || 'pending'}</td><td className="px-4 py-3 text-slate-600">{formatDateValue(item.uploaded_at)}</td></tr>)}</tbody></table></div> : <EmptyTabState title="No supplier documents yet" description="Request profile, business registration, factory profile, certifications, quality docs, payment terms, Incoterms capability, and sample approval documents." />}
            </div>
          ) : null}

          {activeTab === 'cost_requests' ? (
            rfqs.length ? <div className="overflow-x-auto rounded-3xl border border-slate-200"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.14em] text-slate-500"><tr><th className="px-4 py-3">Cost request</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Currency</th><th className="px-4 py-3">Validity</th><th className="px-4 py-3">Notes</th></tr></thead><tbody>{rfqs.map((rfq: any) => <tr key={rfq.id} className="border-t border-slate-100"><td className="px-4 py-3 font-medium text-slate-900">{String(rfq.id).slice(0, 8)}</td><td className="px-4 py-3 text-slate-600">{rfq.status || 'draft'}</td><td className="px-4 py-3 text-slate-600">{rfq.currency || 'USD'}</td><td className="px-4 py-3 text-slate-600">{formatDateValue(rfq.validity_date)}</td><td className="px-4 py-3 text-slate-600">{rfq.notes || 'Supplier cost request'}</td></tr>)}</tbody></table></div> : <EmptyTabState title="No cost requests yet" description="Use Request Cost to create the sourcing request instead of opening the buyer quote workspace." />
          ) : null}

          {activeTab === 'responses' ? (
            responseRows.length ? <div className="space-y-4"><div className="rounded-2xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-900"><span className="font-semibold">Offer comparison:</span> {offerComparison.bestSummary}</div><div className="overflow-x-auto rounded-3xl border border-slate-200"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.14em] text-slate-500"><tr><th className="px-4 py-3">Supplier response</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">MOQ</th><th className="px-4 py-3">Lead time</th><th className="px-4 py-3">Price</th><th className="px-4 py-3">Sample</th></tr></thead><tbody>{responseRows.map((row) => <tr key={row.id} className="border-t border-slate-100"><td className="px-4 py-3 font-medium text-slate-900">{row.label}</td><td className="px-4 py-3 text-slate-600">{row.status}</td><td className="px-4 py-3 text-slate-600">{row.moq || '—'}</td><td className="px-4 py-3 text-slate-600">{row.leadTime || '—'}</td><td className="px-4 py-3 text-slate-600">{row.price || '—'}</td><td className="px-4 py-3 text-slate-600">{row.sampleStatus || '—'}</td></tr>)}</tbody></table></div></div> : <EmptyTabState title="No supplier responses yet" description="Responses received through RFQs, communications, or supplier offer notes will appear here for comparison and shortlisting." />
          ) : null}

          {activeTab === 'approval' ? (
            <div className="space-y-4">
              <div className={`rounded-3xl border p-5 text-sm ${canApprove ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
                <p className="font-semibold">{canApprove ? 'Supplier can be approved' : 'Supplier approval is blocked'}</p>
                <p className="mt-2">{approval.reason}</p>
              </div>
              {approval.blockers.length ? <div className="space-y-2">{approval.blockers.map((blocker) => <p key={blocker} className="rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm text-amber-900">{blocker}</p>)}</div> : null}
            </div>
          ) : null}

          {activeTab === 'linked_demand' ? (
            demandMatches.length ? <div className="space-y-3">{demandMatches.map((match) => <div key={match.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700"><p className="font-semibold text-slate-900">{match.title}</p><p className="mt-1">{match.reason}</p><p className="mt-2 text-xs text-slate-500">{match.confidence}</p></div>)}</div> : <EmptyTabState title="No linked buyer demand yet" description="Approved and under-review suppliers can be matched to buyer RFQs by category, product interest, and target market." />
          ) : null}

          {activeTab === 'performance' ? (
            <InfoGrid rows={[
              ['Reliability', capability.reliabilityScore],
              ['Quality', capability.qualityScore],
              ['Response speed', capability.responseTimeScore],
              ['Risk', capability.riskStatus],
              ['Responses received', String(responseRows.length)],
              ['Demand matches', String(demandMatches.length)],
            ]} />
          ) : null}

          {activeTab === 'activity' ? (
            activities.length || communications.length ? <div className="space-y-3">{[...activities.map((item: any) => ({ id: `a-${item.id}`, title: item.message || item.kind || 'Supplier activity', detail: item.kind || '', date: item.occurred_at })), ...communications.map((item: any) => ({ id: `c-${item.id}`, title: item.subject || item.summary || 'Supplier communication', detail: item.body || item.summary || item.status || '', date: item.sent_at || item.scheduled_at || item.created_at }))].sort((left, right) => String(right.date || '').localeCompare(String(left.date || ''))).map((item) => <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700"><p className="font-semibold text-slate-900">{item.title}</p><p className="mt-1 text-xs text-slate-500">{formatDateValue(item.date)}</p><p className="mt-2">{item.detail || '—'}</p></div>)}</div> : <EmptyTabState title="No supplier activity yet" description="Document requests, cost requests, RFQ responses, approval changes, and demand links will appear here." />
          ) : null}
        </div>
      </div>
    </div>
  );
}
