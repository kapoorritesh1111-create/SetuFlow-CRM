'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { GenerateLeadDraftControls } from '@/features/ai/components/ai-draft-controls';
import { getPricingBasisLabel } from '@/lib/pricing-basis-contract';
import { LeadProfileControls } from '@/features/leads/components/lead-profile-controls';
import { SupplierCommandCenter } from '@/features/leads/components/supplier-command-center';

type BuyerDetailTab = 'overview' | 'timeline' | 'communications' | 'product_interest' | 'quotes' | 'documents' | 'compliance' | 'follow_ups';

function formatDateValue(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function EmptyTabState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm text-slate-600">
      <p className="font-semibold text-slate-900">{title}</p>
      <p className="mt-2">{description}</p>
    </div>
  );
}

function SnapshotCard({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white px-4 py-4 shadow-soft">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-slate-900">{value}</p>
      {helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}
    </div>
  );
}

function TimelineList({ rows, emptyTitle, emptyDescription }: { rows: any[]; emptyTitle: string; emptyDescription: string }) {
  if (!rows.length) return <EmptyTabState title={emptyTitle} description={emptyDescription} />;
  return (
    <div className="space-y-3">
      {rows.map((item) => (
        <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-slate-900">{item.title}</p>
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600">{item.type}</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">{formatDateValue(item.occurred_at)}</p>
          <p className="mt-3 whitespace-pre-wrap">{item.detail || '—'}</p>
        </div>
      ))}
    </div>
  );
}

export function BuyerDetailPage({ data }: { data: any }) {
  const [activeTab, setActiveTab] = useState<BuyerDetailTab>('overview');
  const lead = data?.lead;

  if (lead?.lead_type === 'supplier') {
    return <SupplierCommandCenter data={data} />;
  }

  const workflow = data?.workflow ?? {};
  const quotes = Array.isArray(data?.quotes) ? data.quotes : [];
  const activities = Array.isArray(data?.activities) ? data.activities : [];
  const followUps = Array.isArray(data?.followUps) ? data.followUps : [];
  const communications = Array.isArray(data?.communications) ? data.communications : [];
  const contracts = Array.isArray(data?.contracts) ? data.contracts : [];
  const documents = Array.isArray(data?.documents) ? data.documents : [];
  const complianceItems = Array.isArray(data?.complianceItems) ? data.complianceItems : [];
  const productInterests = Array.isArray(data?.linkedProducts) ? data.linkedProducts : [];
  const linkedMarkets = Array.isArray(data?.linkedMarkets) ? data.linkedMarkets : [];
  const marketName = linkedMarkets.map((item: any) => item?.name).filter(Boolean).join(', ') || '—';
  const countryName = lead?.country || data?.countries?.find?.((item: any) => item.id === lead?.country_id)?.name || '—';
  const stageName = data?.stages?.find?.((item: any) => item.id === lead?.stage_id)?.name || '—';
  const nextStepName = data?.nextSteps?.find?.((item: any) => item.id === lead?.next_step_id)?.name || '—';
  const ownerName = data?.profiles?.find?.((item: any) => item.id === lead?.owner_user_id)?.full_name || data?.profiles?.find?.((item: any) => item.id === lead?.owner_user_id)?.username || 'Unassigned';
  const qualificationStatus = String(workflow?.qualificationStatus ?? 'not_started');
  const qualificationNotes = typeof workflow?.qualificationNotes === 'string' ? workflow.qualificationNotes : '';
  const productMappingStatus = String(workflow?.productMappingStatus ?? 'pending');

  const quoteSummary = useMemo(() => {
    const openStatuses = new Set(['draft', 'sent', 'in_review', 'revised', 'approved', 'countered']);
    const openQuotes = quotes.filter((item: any) => openStatuses.has(String(item?.status ?? '').toLowerCase()));
    const lastSent = [...quotes]
      .filter((item: any) => String(item?.status ?? '').toLowerCase() === 'sent')
      .sort((left: any, right: any) => String(right?.updated_at ?? '').localeCompare(String(left?.updated_at ?? '')))[0] ?? null;
    return { openQuoteCount: openQuotes.length, lastQuoteSent: lastSent };
  }, [quotes]);

  const timelineRows = useMemo(() => {
    const activityRows = activities.map((item: any) => ({ id: `activity-${item.id}`, type: 'Activity', title: item.message || item.kind || 'Activity', occurred_at: item.occurred_at, detail: item.kind || '' }));
    const communicationRows = communications.map((item: any) => {
      const metadata = item?.metadata && typeof item.metadata === 'object' ? item.metadata as Record<string, any> : null;
      const operatorNote = typeof metadata?.operator_notes === 'string' && metadata.operator_notes.trim() ? metadata.operator_notes.trim() : null;
      return {
        id: `communication-${item.id}`,
        type: 'Communication',
        title: item.subject || item.summary || String(item.communication_type || 'communication').replace(/_/g, ' '),
        occurred_at: item.sent_at || item.scheduled_at || item.created_at,
        detail: `${item.body || item.summary || `${item.channel || 'channel'} · ${item.status || 'draft'}`}${operatorNote ? `\n\nOperator note: ${operatorNote}` : ''}`,
      };
    });
    const followUpRows = followUps.map((item: any) => ({ id: `follow-up-${item.id}`, type: 'Follow-up', title: item.status === 'completed' ? 'Follow-up completed' : 'Follow-up scheduled', occurred_at: item.scheduled_at || item.created_at, detail: item.notes || item.status || '' }));
    const quoteRows = quotes.map((item: any) => ({ id: `quote-${item.id}`, type: 'Quote', title: `${item.quote_number || 'Quote'} · ${String(item.status || 'draft').replace(/_/g, ' ')}`, occurred_at: item.updated_at || item.created_at, detail: `${item.currency || 'USD'} · current version ${item.current_version_id ? 'linked' : 'pending'}` }));
    const documentRows = documents.map((item: any) => ({ id: `document-${item.id}`, type: 'Document', title: item.file_name || item.doc_type || 'Document uploaded', occurred_at: item.uploaded_at || item.reviewed_at, detail: item.status || '' }));
    return [...communicationRows, ...activityRows, ...followUpRows, ...quoteRows, ...documentRows].sort((left, right) => String(right.occurred_at || '').localeCompare(String(left.occurred_at || '')));
  }, [activities, communications, followUps, quotes, documents]);

  const tabs: Array<{ id: BuyerDetailTab; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'communications', label: 'Communications' },
    { id: 'product_interest', label: 'Product Interest' },
    { id: 'quotes', label: 'Quotes' },
    { id: 'documents', label: 'Documents' },
    { id: 'compliance', label: 'Compliance' },
    { id: 'follow_ups', label: 'Follow-ups' },
  ];

  return (
    <div className="space-y-6 p-4 md:p-6" data-s41-buyer-command-center="true">
      <div className="rounded-hero border border-slate-200 bg-white p-5 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Lead command center</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">{lead?.company_name ?? 'Buyer'}</h1>
            <p className="mt-2 text-sm text-slate-600">{marketName} · {countryName}</p>
            <p className="mt-2 text-sm text-slate-500">Use this workspace to progress the buyer lead from qualification to RFQ, quote, negotiation, and contract handoff.</p>
            {lead?.id ? <div className="mt-4 max-w-2xl rounded-3xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Inline AI assist</p><p className="mt-1 text-sm text-slate-600">Follow-up and intro assistance remain review-only.</p><div className="mt-3"><GenerateLeadDraftControls leadId={lead.id} /></div></div> : null}
          </div>
          <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
            <div><span className="font-medium text-slate-900">Stage:</span> {stageName}</div>
            <div><span className="font-medium text-slate-900">Next step:</span> {nextStepName}</div>
            <div><span className="font-medium text-slate-900">Owner:</span> {ownerName}</div>
            <div><span className="font-medium text-slate-900">Lead type:</span> {lead?.lead_type ?? 'buyer'}</div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <SnapshotCard label="Qualification" value={qualificationStatus.replace(/_/g, ' ')} helper={qualificationNotes || 'Move the buyer to qualified before RFQ creation.'} />
        <SnapshotCard label="Product Mapping" value={productMappingStatus.replace(/_/g, ' ')} helper={`${productInterests.length} linked products · ${linkedMarkets.length} linked markets`} />
        <SnapshotCard label="Open Quotes" value={String(quoteSummary.openQuoteCount)} helper="Active buyer commercial items" />
        <SnapshotCard label="Last Quote Sent" value={quoteSummary.lastQuoteSent?.quote_number || '—'} helper={quoteSummary.lastQuoteSent?.updated_at ? formatDateValue(quoteSummary.lastQuoteSent.updated_at) : 'No sent quote yet'} />
        <SnapshotCard label="Current Stage" value={stageName} />
        <SnapshotCard label="Contracts" value={String(contracts.length)} helper="Contract handoff remains buyer/order focused" />
      </div>

      <LeadProfileControls
        leadId={String(lead?.id ?? '')}
        pendingFollowUpId={followUps.find((item: any) => item.status !== 'completed')?.id ?? null}
        qualificationStatus={qualificationStatus as never}
        qualificationNotes={qualificationNotes}
        linkedProductCount={productInterests.length}
        linkedMarketCount={linkedMarkets.length}
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Link href={qualificationStatus === 'qualified' && productInterests.length ? `/leads/${lead?.id}/rfq/new` : '#'} aria-disabled={!(qualificationStatus === 'qualified' && productInterests.length)} className={`rounded-3xl border px-4 py-4 text-sm ${qualificationStatus === 'qualified' && productInterests.length ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100' : 'pointer-events-none border-slate-200 bg-slate-50 text-slate-400'}`}><p className="text-[11px] font-semibold uppercase tracking-[0.16em]">RFQ readiness</p><p className="mt-2 font-semibold">Start RFQ</p><p className="mt-1 text-xs">Unlocked only after qualification and mapped products.</p></Link>
        <Link href={`/leads/${lead?.id}/quote`} className="rounded-3xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700 hover:border-brand-200 hover:text-brand-700"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Quote workflow</p><p className="mt-2 font-semibold text-slate-900">Open quote workspace</p><p className="mt-1 text-xs text-slate-500">Review negotiation state and contract handoff from one place.</p></Link>
        <Link href="/tasks" className="rounded-3xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700 hover:border-brand-200 hover:text-brand-700"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Follow-through</p><p className="mt-2 font-semibold text-slate-900">Open tasks workspace</p><p className="mt-1 text-xs text-slate-500">Keep qualification, follow-ups, and owner actions moving.</p></Link>
        <Link href={contracts.length ? '/contracts' : '#'} aria-disabled={!contracts.length} className={`rounded-3xl border px-4 py-4 text-sm ${contracts.length ? 'border-brand-200 bg-brand-50 text-brand-800 hover:bg-brand-100' : 'pointer-events-none border-slate-200 bg-slate-50 text-slate-400'}`}><p className="text-[11px] font-semibold uppercase tracking-[0.16em]">Contract handoff</p><p className="mt-2 font-semibold">Open contracts</p><p className="mt-1 text-xs">{contracts.length ? `${contracts.length} contract workspace${contracts.length === 1 ? '' : 's'} linked.` : 'Contracts unlock after quote acceptance.'}</p></Link>
      </div>

      <div className="rounded-hero border border-slate-200 bg-white p-4 shadow-soft">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={activeTab === tab.id ? 'rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white' : 'rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200'}>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-5">
          {activeTab === 'overview' ? (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Commercial snapshot</p>
                <dl className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                  <div><dt className="font-medium text-slate-900">Source</dt><dd className="mt-1">{lead?.source_label || '—'}</dd></div>
                  <div><dt className="font-medium text-slate-900">Updated</dt><dd className="mt-1">{formatDateValue(lead?.updated_at)}</dd></div>
                  <div><dt className="font-medium text-slate-900">Contact</dt><dd className="mt-1">{lead?.contact_name || '—'}</dd></div>
                  <div><dt className="font-medium text-slate-900">Email</dt><dd className="mt-1">{lead?.email || '—'}</dd></div>
                  <div><dt className="font-medium text-slate-900">Phone</dt><dd className="mt-1">{lead?.phone || '—'}</dd></div>
                  <div><dt className="font-medium text-slate-900">Website</dt><dd className="mt-1">{lead?.website || '—'}</dd></div>
                </dl>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Latest activity</p>
                {timelineRows[0] ? <TimelineList rows={[timelineRows[0]]} emptyTitle="No timeline yet" emptyDescription="Lead activity will appear here." /> : <EmptyTabState title="No timeline yet" description="Lead activity, communications, follow-ups, quotes, and documents will converge here as the commercial journey progresses." />}
              </div>
            </div>
          ) : null}

          {activeTab === 'timeline' ? <TimelineList rows={timelineRows} emptyTitle="No activity yet" emptyDescription="Lead, quote, and document activity will appear here in chronological order." /> : null}
          {activeTab === 'communications' ? <TimelineList rows={communications.map((item: any) => ({ id: item.id, type: item.channel || 'Communication', title: item.subject || item.summary || 'Communication entry', detail: item.body || item.summary || item.status, occurred_at: item.sent_at || item.scheduled_at || item.created_at }))} emptyTitle="No communications yet" emptyDescription="Introduction drafts, follow-ups, and quote messages will appear here." /> : null}
          {activeTab === 'product_interest' ? (productInterests.length ? <div className="overflow-x-auto rounded-3xl border border-slate-200"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.14em] text-slate-500"><tr><th className="px-4 py-3">Product</th><th className="px-4 py-3">Interest Status</th><th className="px-4 py-3">Notes</th></tr></thead><tbody>{productInterests.map((item: any) => <tr key={item.id} className="border-t border-slate-100"><td className="px-4 py-3 font-medium text-slate-900">{item.name}</td><td className="px-4 py-3 text-slate-600">active</td><td className="px-4 py-3 text-slate-600">Linked through buyer coverage</td></tr>)}</tbody></table></div> : <EmptyTabState title="No product coverage yet" description="Add categories or products in the buyer drawer so the commercial team can seed quotes correctly." />) : null}
          {activeTab === 'quotes' ? (quotes.length ? <div className="overflow-x-auto rounded-3xl border border-slate-200"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.14em] text-slate-500"><tr><th className="px-4 py-3">Quote #</th><th className="px-4 py-3">Basis</th><th className="px-4 py-3">Currency</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Updated</th></tr></thead><tbody>{quotes.map((quote: any) => <tr key={quote.id} className="border-t border-slate-100"><td className="px-4 py-3 font-medium text-slate-900"><a className="underline-offset-2 hover:underline" href={`/leads/${lead?.id}/quote?quoteId=${quote.id}`}>{quote.quote_number || `Quote ${String(quote.id).slice(0, 8)}`}</a></td><td className="px-4 py-3 text-slate-600">{getPricingBasisLabel(quote?.pricing_basis)}</td><td className="px-4 py-3 text-slate-600">{quote.currency || 'USD'}</td><td className="px-4 py-3 text-slate-600">{String(quote.status || 'draft').replace(/_/g, ' ')}</td><td className="px-4 py-3 text-slate-600">{formatDateValue(quote.updated_at)}</td></tr>)}</tbody></table></div> : <EmptyTabState title="No quotes yet" description="Create a draft quote from the buyer drawer to start the commercial workflow." />) : null}
          {activeTab === 'documents' ? (documents.length ? <TimelineList rows={documents.map((item: any) => ({ id: item.id, type: item.doc_type || 'Document', title: item.file_name || 'Document', detail: item.status || '—', occurred_at: item.uploaded_at }))} emptyTitle="No documents yet" emptyDescription="Compliance and quote documents will appear here." /> : <EmptyTabState title="No documents yet" description="Compliance, quote PDFs, and supporting commercial documents will appear here." />) : null}
          {activeTab === 'compliance' ? (complianceItems.length ? <TimelineList rows={complianceItems.map((item: any) => ({ id: item.id, type: item.status || 'Compliance', title: item.requirement_code || item.code || 'Compliance item', detail: item.severity || 'Open requirement', occurred_at: item.due_at }))} emptyTitle="No compliance items yet" emptyDescription="Compliance blockers will appear here." /> : <EmptyTabState title="No compliance items yet" description="Compliance blockers will appear here when they are created for the buyer." />) : null}
          {activeTab === 'follow_ups' ? (followUps.length ? <TimelineList rows={followUps.map((item: any) => ({ id: item.id, type: item.status || 'Follow-up', title: item.status === 'completed' ? 'Follow-up completed' : 'Follow-up scheduled', detail: item.notes || '—', occurred_at: item.scheduled_at }))} emptyTitle="No follow-ups yet" emptyDescription="Follow-up tasks will appear here." /> : <EmptyTabState title="No follow-ups yet" description="Follow-up tasks will appear here once the buyer workflow schedules them." />) : null}
        </div>
      </div>
    </div>
  );
}
