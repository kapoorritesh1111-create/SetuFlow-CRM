import type { ComponentProps } from 'react';
import Link from 'next/link';
import { ActivityTimeline } from '@/components/ui/activity-timeline';
import { LeadHealthBadge } from '@/components/ui/lead-health-badge';
import { getFollowUpBadgeClasses, getFollowUpLabel, type FollowUpVisualState } from '@/lib/lead-status';
import { formatDate, formatDateTime } from '@/lib/utils';
import type { LeadHealth } from '@/lib/lead-health';
import { LeadProfileControls } from '@/features/leads/components/lead-profile-controls';
import { JOURNEY_COPY, getJourneyPipelinePath, type LeadJourney } from '@/lib/journey';
import { getPricingReadinessClasses, getPricingReadinessLabel, type LeadCommercialReadiness } from '@/lib/catalog-pricing-model';
import type { LeadRequirementState } from '@/lib/document-requirements';

type LeadCommandCenterProps = {
  leadId: string;
  leadType: string;
  companyName: string;
  contactName: string | null;
  jobTitle: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  notes: string | null;
  pipelineName: string;
  stageName: string;
  nextStepName: string;
  ownerName: string;
  followUpState: FollowUpVisualState;
  nextFollowUpAt: string | null;
  pendingFollowUpId: string | null;
  leadHealth: LeadHealth;
  linkedProducts: Array<{ id: string; name: string }>;
  linkedMarkets: Array<{ id: string; name: string }>;
  tradeEvent: { name: string; city: string | null; country: string | null; starts_on: string | null; ends_on: string | null; notes: string | null } | null;
  followUps: Array<{ id: string; scheduled_at: string | null; status: string | null; notes: string | null; completed_at: string | null }>;
  rfqs: Array<{ id: string; status: string | null; currency: string | null; validity_date: string | null; created_at: string | null; updated_at: string | null; notes: string | null; lineItems: Array<{ id: string }> }>;
  quotes: Array<{ id: string; status: string | null; currency: string | null; created_at: string | null; updated_at: string | null; notes: string | null; lineItems: Array<{ id: string }> }>;
  complianceItems: Array<{ id: string; compliance_item_id: string | null; status: string | null; submitted_at: string | null; approved_at: string | null; created_at: string | null; reviewed_at: string | null; review_notes?: string | null; reviewer_name?: string | null }>;
  complianceDefinitions: Array<{ id: string; code: string | null; description: string | null }>;
  documents: Array<{ id: string; file_name: string | null; doc_type: string | null; status: string | null; uploaded_at: string | null; reviewed_at: string | null; expires_at: string | null; version: number | null; version_label: string | null; requirement_code: string | null; review_notes?: string | null; uploaded_by_name?: string | null; reviewer_name?: string | null }>;
  timelineEvents: ComponentProps<typeof ActivityTimeline>['events'];
  pricingSnapshot: LeadCommercialReadiness;
  documentRequirementSnapshot: LeadRequirementState;
  contractRequirementSnapshot: LeadRequirementState;
};

type SummaryMetric = { label: string; value: string; helper: string };

function toTitleCase(value: string | null | undefined) {
  const text = String(value ?? '').trim();
  if (!text) return 'Not set';
  return text.split(/[_\s-]+/).filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()).join(' ');
}


function buildCoverageSummary(input: {
  leadType: string;
  linkedProducts: Array<{ id: string; name: string }>;
  linkedMarkets: Array<{ id: string; name: string }>;
  notes: string | null;
}) {
  const summaryLabel = input.leadType === 'supplier' ? 'Supply summary' : 'Demand summary';
  const productText = input.linkedProducts.length
    ? input.linkedProducts.map((product) => product.name).join(', ')
    : 'No linked products yet';
  const marketText = input.linkedMarkets.length
    ? input.linkedMarkets.map((market) => market.name).join(', ')
    : 'No linked markets yet';
  const noteText = input.notes?.trim() ? input.notes.trim() : 'No additional structured notes yet';
  return {
    label: summaryLabel,
    body: `Products: ${productText}. Markets: ${marketText}. Notes: ${noteText}.`,
  };
}

function getComplianceTone(status: string | null | undefined) {
  switch (status) {
    case 'approved':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'submitted':
      return 'border-sky-200 bg-sky-50 text-sky-700';
    case 'rejected':
    case 'blocked':
      return 'border-rose-200 bg-rose-50 text-rose-700';
    default:
      return 'border-amber-200 bg-amber-50 text-amber-700';
  }
}

function buildNextBestAction(input: {
  followUps: LeadCommandCenterProps['followUps'];
  complianceItems: LeadCommandCenterProps['complianceItems'];
  rfqs: LeadCommandCenterProps['rfqs'];
  quotes: LeadCommandCenterProps['quotes'];
  nextStepName: string;
  nextFollowUpAt: string | null;
  leadType: string;
  pricingSnapshot: LeadCommercialReadiness;
  documentRequirementSnapshot: LeadRequirementState;
}) {
  const pendingFollowUp = input.followUps.find((item) => item.status !== 'completed');
  const openCompliance = input.complianceItems.find((item) => item.status !== 'approved');
  const activeQuote = input.quotes.find((item) => !['won', 'lost', 'rejected', 'expired', 'accepted'].includes(String(item.status ?? '').toLowerCase()));
  const activeRfq = input.rfqs.find((item) => !['closed', 'cancelled', 'completed'].includes(String(item.status ?? '').toLowerCase()));

  if (input.documentRequirementSnapshot.blockerCount > 0) {
    return {
      title: 'Resolve required document blockers',
      description: 'Quote send readiness is blocked until the required document rules are satisfied or reviewed.',
      emphasis: input.documentRequirementSnapshot.blockerReasons[0] ?? 'Document blockers are still active.',
    };
  }
  if (openCompliance) {
    return {
      title: 'Resolve compliance blocker',
      description: 'Commercial progress is exposed until the remaining compliance requirement is submitted or approved.',
      emphasis: 'Compliance is currently the clearest blocker to progression.',
    };
  }
  if (input.pricingSnapshot.pricingReadiness !== 'ready' && input.pricingSnapshot.linkedProductCount > 0) {
    return {
      title: 'Close catalog pricing gaps',
      description: 'Linked product coverage is still missing catalog truth or price-backed RFQ/quote coverage. Tighten catalog pricing before pushing the deal forward.',
      emphasis: `${input.pricingSnapshot.linkedPricedProductCount}/${input.pricingSnapshot.linkedProductCount} linked products are currently price-ready.`,
    };
  }
  if (pendingFollowUp) {
    return {
      title: 'Complete the next follow-up touchpoint',
      description: `The latest follow-up is scheduled for ${formatDateTime(input.nextFollowUpAt)}. Keep momentum before the lead slips further.`,
      emphasis: `Recommended next step: ${input.nextStepName}.`,
    };
  }
  if (!activeRfq) {
    return {
      title: `Start the ${input.leadType === 'supplier' ? 'supplier' : 'buyer'} RFQ motion`,
      description: 'No active RFQ is currently attached to this lead, so the commercial thread still lacks a live request workflow.',
      emphasis: 'Move from relationship context into an executable commercial thread.',
    };
  }
  if (!activeQuote) {
    return {
      title: 'Convert the active RFQ into a quote-ready path',
      description: 'RFQ activity exists, but no active quote is visible yet. The next best move is to turn request context into a priced commercial offer.',
      emphasis: 'RFQ momentum is present; quote readiness is the next unlock.',
    };
  }
  return {
    title: 'Drive the active deal toward decision',
    description: 'The lead already has active RFQ and quote context. Focus on response timing, blockers, and decision support.',
    emphasis: `Recommended next step: ${input.nextStepName}.`,
  };
}

export function LeadCommandCenter(props: LeadCommandCenterProps) {
  const journey = JOURNEY_COPY[(props.leadType === 'supplier' ? 'supplier' : 'buyer') as LeadJourney];
  const pendingFollowUps = props.followUps.filter((item) => item.status !== 'completed');
  const openRfqs = props.rfqs.filter((item) => !['closed', 'cancelled', 'completed'].includes(String(item.status ?? '').toLowerCase()));
  const activeQuotes = props.quotes.filter((item) => !['won', 'lost', 'rejected', 'expired'].includes(String(item.status ?? '').toLowerCase()));
  const blockingCompliance = props.complianceItems.filter((item) => item.status !== 'approved');
  const pendingDocuments = props.documents.filter((item) => !['approved', 'complete', 'completed'].includes(String(item.status ?? '').toLowerCase()));
  const coverageSummary = buildCoverageSummary({
    leadType: props.leadType,
    linkedProducts: props.linkedProducts,
    linkedMarkets: props.linkedMarkets,
    notes: props.notes,
  });

  const nextBestAction = buildNextBestAction({
    followUps: props.followUps,
    complianceItems: props.complianceItems,
    rfqs: props.rfqs,
    quotes: props.quotes,
    nextStepName: props.nextStepName,
    nextFollowUpAt: props.nextFollowUpAt,
    leadType: props.leadType,
    pricingSnapshot: props.pricingSnapshot,
    documentRequirementSnapshot: props.documentRequirementSnapshot,
  });

  const summaryMetrics: SummaryMetric[] = [
    { label: 'Pending follow-ups', value: String(pendingFollowUps.length), helper: pendingFollowUps[0]?.scheduled_at ? `Next due ${formatDateTime(pendingFollowUps[0].scheduled_at)}` : 'Nothing overdue right now' },
    { label: 'Pricing readiness', value: getPricingReadinessLabel(props.pricingSnapshot.pricingReadiness), helper: props.pricingSnapshot.missingLinkedProductCount ? `${props.pricingSnapshot.missingLinkedProductCount} linked product gaps remain` : 'Linked products have catalog coverage' },
    { label: 'Active RFQs', value: String(openRfqs.length), helper: openRfqs[0]?.updated_at ? `Latest updated ${formatDate(openRfqs[0].updated_at)}` : 'No RFQ started yet' },
    { label: 'Active quotes', value: String(activeQuotes.length), helper: activeQuotes[0]?.updated_at ? `Latest updated ${formatDate(activeQuotes[0].updated_at)}` : 'No quote in motion' },
    { label: 'Compliance blockers', value: String(blockingCompliance.length), helper: blockingCompliance.length ? 'Needs action before progression' : 'No blockers currently visible' },
    { label: 'Quote-send docs', value: props.documentRequirementSnapshot.blockerCount ? `${props.documentRequirementSnapshot.blockerCount} blocked` : 'Ready', helper: props.documentRequirementSnapshot.blockerReasons[0] ?? 'Required document rules satisfied for quote send' },
    { label: 'Contract docs', value: props.contractRequirementSnapshot.blockerCount ? `${props.contractRequirementSnapshot.blockerCount} blocked` : 'Ready', helper: props.contractRequirementSnapshot.blockerReasons[0] ?? 'Required document rules satisfied for contract progression' },
    { label: 'Documents', value: String(props.documents.length), helper: pendingDocuments.length ? `${pendingDocuments.length} still need review` : 'Document pack is current' },
  ];


  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-soft">
        <div className="border-b border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-brand-900 px-5 py-5 text-white sm:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/90">{journey.commandSurfaceLabel}</span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold capitalize text-white/90">{props.leadType}</span>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getFollowUpBadgeClasses(props.followUpState)}`}>{getFollowUpLabel(props.followUpState)}</span>
              </div>
              <div>
                <h3 className="text-2xl font-semibold tracking-tight">{props.companyName}</h3>
                <p className="mt-2 max-w-3xl text-sm text-white/75">Connected {journey.label.toLowerCase()} operating surface for summary, follow-ups, activity, RFQ/quote context, compliance visibility, and next-best-action guidance.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-white/80">
                <span>{props.contactName ?? 'No primary contact'}</span>
                {props.jobTitle ? <span>· {props.jobTitle}</span> : null}
                <span>· {props.pipelineName}</span>
                <span>· {props.stageName}</span>
                <span>· {props.ownerName}</span>
              </div>
            </div>
            <div className="grid min-w-full gap-3 sm:grid-cols-2 xl:min-w-[380px]">
              {summaryMetrics.map((metric) => (
                <article key={metric.label} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/60">{metric.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{metric.value}</p>
                  <p className="mt-1 text-xs text-white/70">{metric.helper}</p>
                </article>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-5 sm:p-6 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">Next best action</p>
                <h4 className="mt-2 text-xl font-semibold text-slate-900">{nextBestAction.title}</h4>
                <p className="mt-2 text-sm text-slate-600">{nextBestAction.description}</p>
              </div>
              <LeadHealthBadge health={props.leadHealth} />
            </div>
            <div className="mt-4 rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm text-slate-700">
              <p className="font-medium text-slate-900">{nextBestAction.emphasis}</p>
              <p className="mt-2 text-slate-600">Current next step: {props.nextStepName}. Next follow-up: {formatDateTime(props.nextFollowUpAt)}.</p>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Country</p><p className="mt-2 text-sm font-medium text-slate-900">{props.country ?? 'Not set'}</p></div>
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Contact</p><p className="mt-2 text-sm font-medium text-slate-900">{props.email ?? props.phone ?? 'Add contact details'}</p></div>
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Coverage</p><p className="mt-2 text-sm font-medium text-slate-900">{props.linkedMarkets.length || props.linkedProducts.length ? `${props.linkedMarkets.length} markets · ${props.linkedProducts.length} products` : 'No product-market links yet'}</p></div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Quick actions</p><h4 className="mt-2 text-lg font-semibold text-slate-900">Operate without leaving the lead</h4></div>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">Drawer-first</span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Link href="#rfq-workspace" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-brand-200 hover:text-brand-700">Review RFQ workspace</Link>
              <Link href={`/leads?leadId=${props.leadId}&view=quote`} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-brand-200 hover:text-brand-700">Open quote workspace (qualified leads)</Link>
            </div>
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"><p className="font-medium text-slate-900">Commercial thread</p><p className="mt-1">Use the RFQ workspace for request orchestration, use the quote workspace for pricing/offer review, and keep notes plus follow-ups here to preserve context. Qualified leads with mapped products are now required before quote drafting starts.</p></div>
          </section>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="space-y-4">
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
            <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Tasks and follow-ups</p><h4 className="mt-2 text-lg font-semibold text-slate-900">Keep the next motion visible</h4></div><span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">{pendingFollowUps.length} open</span></div>
            <div className="mt-4 space-y-3">
              {props.followUps.length ? props.followUps.slice(0, 4).map((item) => {
                const isCompleted = item.status === 'completed';
                const visualState = isCompleted ? 'completed' : getRelativeFollowUpState(item.scheduled_at);
                return (
                  <article key={item.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div><p className="text-sm font-medium text-slate-900">{isCompleted ? 'Completed follow-up' : 'Pending follow-up'}</p><p className="mt-1 text-sm text-slate-600">{item.notes?.trim() || 'No follow-up notes provided yet.'}</p></div>
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getFollowUpBadgeClasses(visualState)}`}>{getFollowUpLabel(visualState)}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500"><span>Scheduled {formatDateTime(item.scheduled_at)}</span><span>Status {toTitleCase(item.status)}</span>{item.completed_at ? <span>Completed {formatDateTime(item.completed_at)}</span> : null}</div>
                  </article>
                );
              }) : <EmptyPanel label="No follow-ups logged yet" body="Use the quick action block to schedule the next touchpoint and keep the lead moving." />}
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
            <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Timeline and activity</p><h4 className="mt-2 text-lg font-semibold text-slate-900">Commercial history in one thread</h4></div><span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">Most recent first</span></div>
            <div className="mt-4"><ActivityTimeline events={props.timelineEvents} emptyLabel="No activity logged yet." /></div>
          </article>
        </section>

        <section className="space-y-4">
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
            <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">RFQs and quotes</p><h4 className="mt-2 text-lg font-semibold text-slate-900">Commercial execution visibility</h4></div><Link href={`/leads?leadId=${props.leadId}&view=quote`} className="text-sm font-medium text-brand-700">Open quotes (qualified leads)</Link></div>
            <div className="mt-4 space-y-3">
              <CompactListBlock title="RFQs" emptyLabel="No RFQs attached yet." items={props.rfqs.slice(0, 3).map((rfq) => ({ id: rfq.id, title: `RFQ · ${toTitleCase(rfq.status)}`, meta: `${rfq.lineItems.length} line items · ${rfq.currency ?? 'Currency pending'}`, timestamp: rfq.updated_at ?? rfq.created_at }))} />
              <CompactListBlock title="Quotes" emptyLabel="No quotes attached yet." items={props.quotes.slice(0, 3).map((quote) => ({ id: quote.id, title: `Quote · ${toTitleCase(quote.status)}`, meta: `${quote.lineItems.length} line items · ${quote.currency ?? 'Currency pending'}`, timestamp: quote.updated_at ?? quote.created_at }))} />
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
            <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Compliance</p><h4 className="mt-2 text-lg font-semibold text-slate-900">Blockers and approvals</h4></div><span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">{blockingCompliance.length} open</span></div>
            <div className="mt-4 space-y-3">
              {props.complianceItems.length ? props.complianceItems.slice(0, 4).map((item) => {
                const definition = props.complianceDefinitions.find((entry) => entry.id === item.compliance_item_id);
                return (
                  <article key={item.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium text-slate-900">{definition?.code ?? 'Checklist item'}</p><p className="mt-1 text-sm text-slate-600">{definition?.description ?? 'Compliance detail unavailable in the current schema projection.'}</p></div><span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getComplianceTone(item.status)}`}>{toTitleCase(item.status)}</span></div>
                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500"><span>Created {formatDate(item.created_at)}</span>{item.submitted_at ? <span>Submitted {formatDate(item.submitted_at)}</span> : null}{item.approved_at ? <span>Approved {formatDate(item.approved_at)}</span> : null}</div>
                  </article>
                );
              }) : <EmptyPanel label="No compliance blockers yet" body="Compliance surfaces remain visible here so commercial progression stays connected to document and approval readiness." />}
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
            <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Documents</p><h4 className="mt-2 text-lg font-semibold text-slate-900">Document readiness</h4></div><span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">Document hub</span></div>
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
              <div className="flex items-center justify-between gap-3"><p className="font-medium text-slate-900">Document visibility stays connected to the lead</p><Link href="/documents" className="text-sm font-medium text-brand-700 hover:text-brand-800">Open documents workspace</Link></div>
              <p className="mt-2">Track document packs, approvals, shipment files, and compliance attachments from one clear command-center slot. When files are available for this lead, they appear here without changing the current workflow path.</p>
              <div className="mt-3 space-y-2">
                {props.documents.length ? props.documents.slice(0, 4).map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-900">{item.file_name ?? 'Document'}</p>
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getComplianceTone(item.status)}`}>{toTitleCase(item.status)}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{toTitleCase(item.doc_type)} · Uploaded {formatDateTime(item.uploaded_at)}{item.expires_at ? ` · Expires ${formatDate(item.expires_at)}` : ''}</p>
                    <p className="mt-1 text-xs text-slate-500">Owner {item.uploaded_by_name ?? 'Unknown'}{item.reviewer_name ? ` · Reviewed by ${item.reviewer_name}` : ''}{item.review_notes ? ` · ${item.review_notes}` : ''}</p>
                  </div>
                )) : <p className="text-sm text-slate-500">No lead-linked documents yet. Use the documents workspace to keep approvals, expiry, and version posture visible.</p>}
              </div>
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
            <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Contract readiness desk</p><h4 className="mt-2 text-lg font-semibold text-slate-900">Contract progression operator surface</h4></div><span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">Phase 6.5</span></div>
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${props.contractRequirementSnapshot.blockerCount ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{props.contractRequirementSnapshot.blockerCount ? `${props.contractRequirementSnapshot.blockerCount} contract blockers` : 'Contract-ready'}</span>
                <Link href="/compliance" className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">Open compliance desk</Link>
                <Link href="/documents" className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">Open documents desk</Link>
              </div>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm">
                {(props.contractRequirementSnapshot.blockerReasons.length ? props.contractRequirementSnapshot.blockerReasons : ['Required contract-progression documents are currently satisfied.']).map((reason) => <li key={reason}>{reason}</li>)}
              </ul>
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
            <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">AI assist</p><h4 className="mt-2 text-lg font-semibold text-slate-900">Read-only assist slot</h4></div><span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">Assistive only</span></div>
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600"><p className="font-medium text-slate-900">Assistive summary slot</p><p className="mt-2">Keep commercial summaries and drafting support visible in one read-only surface. This slot stays assistive-only so the workflow remains human-led and predictable during customer demos.</p></div>
          </article>
        </section>
      </div>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{journey.label} relationship context</p><h4 className="mt-2 text-lg font-semibold text-slate-900">Company, markets, and trade context</h4></div><span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">Context block</span></div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 p-4"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Products</p><p className="mt-2 text-sm text-slate-700">{props.linkedProducts.length ? props.linkedProducts.map((product) => product.name).join(', ') : 'No linked products yet.'}</p></div>
            <div className="rounded-2xl border border-slate-200 p-4"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Markets</p><p className="mt-2 text-sm text-slate-700">{props.linkedMarkets.length ? props.linkedMarkets.map((market) => market.name).join(', ') : 'No linked markets yet.'}</p></div>
            <div className="rounded-2xl border border-slate-200 p-4 md:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Pricing context</p><p className="mt-2 text-sm text-slate-700">Connect catalog coverage to active RFQ and quote motion without leaving the command center.</p></div>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getPricingReadinessClasses(props.pricingSnapshot.pricingReadiness)}`}>{getPricingReadinessLabel(props.pricingSnapshot.pricingReadiness)}</span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl bg-slate-50 px-3 py-3"><p className="text-xs uppercase tracking-[0.14em] text-slate-500">Linked products</p><p className="mt-2 text-lg font-semibold text-slate-900">{props.pricingSnapshot.linkedProductCount}</p><p className="mt-1 text-xs text-slate-500">{props.pricingSnapshot.linkedPricedProductCount} already priced</p></div>
                <div className="rounded-2xl bg-slate-50 px-3 py-3"><p className="text-xs uppercase tracking-[0.14em] text-slate-500">Catalog prices</p><p className="mt-2 text-lg font-semibold text-slate-900">{props.pricingSnapshot.linkedPriceCount}</p><p className="mt-1 text-xs text-slate-500">Across {props.pricingSnapshot.coveredMarketCount} markets</p></div>
                <div className="rounded-2xl bg-slate-50 px-3 py-3"><p className="text-xs uppercase tracking-[0.14em] text-slate-500">RFQ coverage</p><p className="mt-2 text-lg font-semibold text-slate-900">{props.pricingSnapshot.rfqPricedLineCount}/{props.pricingSnapshot.rfqLinkedLineCount || 0}</p><p className="mt-1 text-xs text-slate-500">Linked RFQ lines with pricing</p></div>
                <div className="rounded-2xl bg-slate-50 px-3 py-3"><p className="text-xs uppercase tracking-[0.14em] text-slate-500">Quote coverage</p><p className="mt-2 text-lg font-semibold text-slate-900">{props.pricingSnapshot.quotePricedLineCount}/{props.pricingSnapshot.quoteLinkedLineCount || 0}</p><p className="mt-1 text-xs text-slate-500">Linked quote lines with pricing</p></div>
              </div>
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Commercial blocker view</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {props.pricingSnapshot.blockerReasons.length ? props.pricingSnapshot.blockerReasons.map((reason) => <span key={reason} className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">{reason}</span>) : <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">No active commercial blockers</span>}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium">                <Link href="#rfq-workspace" className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-50">Open RFQ workspace</Link>
                <Link href={`/leads?leadId=${props.leadId}&view=quote`} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-50">Open quote workspace (qualified)</Link>
                <Link href="/products" className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-50">Review catalog pricing</Link>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4 md:col-span-2"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{coverageSummary.label}</p><p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{coverageSummary.body}</p></div>
            <div className="rounded-2xl border border-slate-200 p-4 md:col-span-2"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Notes</p><p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{props.notes ?? 'No lead notes saved yet.'}</p></div>
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Quick capture</p><h4 className="mt-2 text-lg font-semibold text-slate-900">Follow-up and note actions</h4></div><span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">Action rail</span></div>
          <div className="mt-4"><LeadProfileControls leadId={props.leadId} pendingFollowUpId={props.pendingFollowUpId} /></div>
        </article>
      </section>

      {props.tradeEvent ? (
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Trade event context</p><h4 className="mt-2 text-lg font-semibold text-slate-900">{props.tradeEvent.name}</h4></div><span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">Relationship origin</span></div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-600"><p className="font-medium text-slate-900">Location</p><p className="mt-1">{[props.tradeEvent.city, props.tradeEvent.country].filter(Boolean).join(', ') || 'Location not set'}</p></div>
            <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-600"><p className="font-medium text-slate-900">Dates</p><p className="mt-1">{formatDate(props.tradeEvent.starts_on)}{props.tradeEvent.ends_on ? ` to ${formatDate(props.tradeEvent.ends_on)}` : ''}</p></div>
            <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-600 md:col-span-1"><p className="font-medium text-slate-900">Notes</p><p className="mt-1 whitespace-pre-wrap">{props.tradeEvent.notes ?? 'No event notes.'}</p></div>
          </div>
        </article>
      ) : null}
    </div>
  );
}

function CompactListBlock({ title, emptyLabel, items }: { title: string; emptyLabel: string; items: Array<{ id: string; title: string; meta: string; timestamp: string | null }>; }) {
  return <div className="rounded-2xl border border-slate-200 p-4"><p className="text-sm font-semibold text-slate-900">{title}</p><div className="mt-3 space-y-3">{items.length ? items.map((item) => <article key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3"><p className="text-sm font-medium text-slate-900">{item.title}</p><p className="mt-1 text-xs text-slate-500">{item.meta}</p><p className="mt-2 text-xs text-slate-500">Updated {formatDateTime(item.timestamp)}</p></article>) : <p className="text-sm text-slate-500">{emptyLabel}</p>}</div></div>;
}

function EmptyPanel({ label, body }: { label: string; body: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-600"><p className="font-medium text-slate-900">{label}</p><p className="mt-2">{body}</p></div>;
}

function getRelativeFollowUpState(scheduledAt: string | null): FollowUpVisualState {
  if (!scheduledAt) return 'unscheduled';
  const scheduled = new Date(scheduledAt);
  if (Number.isNaN(scheduled.getTime())) return 'unscheduled';
  const now = new Date();
  const msUntil = scheduled.getTime() - now.getTime();
  if (msUntil < 0) return 'overdue';
  if (msUntil <= 1000 * 60 * 60 * 24) return 'today';
  return 'upcoming';
}
