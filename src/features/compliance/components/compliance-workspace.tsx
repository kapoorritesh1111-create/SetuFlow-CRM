'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { EmptyState } from '@/components/ui/empty-state';
import { StateMessage } from '@/components/ui/state-message';
import type { ComplianceWorkspaceData } from '@/lib/queries/data';
import { formatDate, formatDateTime } from '@/lib/utils';
import { updateComplianceWorkflow, updateDocumentWorkflow, uploadWorkspaceDocument } from '@/features/compliance/server/actions';
import { buildLeadDocumentRequirementState } from '@/lib/document-requirements';

type ComplianceWorkspaceProps = {
  mode?: 'compliance' | 'documents';
  data: ComplianceWorkspaceData;
  canReview?: boolean;
  readOnlyMessage?: string | null;
};

type ActionState = { error?: string; success?: string };

const INITIAL_ACTION_STATE = {} as ActionState;

function badgeClasses(status: string | null | undefined) {
  const normalized = String(status ?? '').toLowerCase();
  if (['approved', 'complete', 'completed', 'ready'].includes(normalized)) return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (['rejected', 'blocked', 'expired', 'missing'].includes(normalized)) return 'border-rose-200 bg-rose-50 text-rose-700';
  if (['submitted', 'in_review', 'pending_review'].includes(normalized)) return 'border-sky-200 bg-sky-50 text-sky-700';
  return 'border-amber-200 bg-amber-50 text-amber-700';
}

function titleCase(value: string | null | undefined) {
  const raw = String(value ?? '').trim();
  if (!raw) return 'Not set';
  return raw.split(/[_\s-]+/).filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function buildLeadCommandHref(leadId: string, mode: 'compliance' | 'documents') {
  const returnTo = encodeURIComponent(mode === 'documents' ? '/documents' : '/compliance');
  return `/leads/${leadId}?tab=workflow&returnTo=${returnTo}`;
}

function SubmitButton({ disabled, pendingLabel = 'Saving...', label = 'Save' }: { disabled?: boolean; pendingLabel?: string; label?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={disabled || pending} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
      {pending ? pendingLabel : label}
    </button>
  );
}


function WorkspaceDocumentUploadCard({ data }: { data: ComplianceWorkspaceData }) {
  const [state, formAction] = useFormState(uploadWorkspaceDocument, INITIAL_ACTION_STATE);
  return (
    <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-5 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Global upload</p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">Upload or register a document from the documents desk</h3>
          <p className="mt-1 text-sm text-slate-600">Attach evidence to a lead without leaving <code>/documents</code>. The record enters review as Submitted.</p>
        </div>
        <Link href="/leads" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:border-brand-200 hover:text-brand-700">Open leads</Link>
      </div>
      {state?.error ? <StateMessage className="mt-3" tone="danger" title="Document upload failed" description={state.error} /> : null}
      {state?.success ? <StateMessage className="mt-3" tone="success" title="Document upload saved" description={state.success} /> : null}
      <form action={formAction} className="mt-4 grid gap-3 lg:grid-cols-[minmax(180px,1.1fr)_minmax(160px,0.8fr)_minmax(160px,0.8fr)_auto] lg:items-end">
        <label className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Lead
          <select name="lead_id" required className="mt-2 min-h-11 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm normal-case tracking-normal text-slate-700">
            <option value="">Choose lead</option>
            {data.leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.company_name}</option>)}
          </select>
        </label>
        <label className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">File
          <input name="file" type="file" className="mt-2 min-h-11 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm normal-case tracking-normal text-slate-700" />
        </label>
        <label className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Document type
          <input name="doc_type" defaultValue="packing_list" className="mt-2 min-h-11 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm normal-case tracking-normal text-slate-700" />
        </label>
        <SubmitButton pendingLabel="Uploading..." label="Upload document" />
        <input name="file_name" placeholder="Optional manual file name" className="min-h-11 rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 lg:col-span-2" />
        <input name="requirement_code" placeholder="Requirement code (optional)" className="min-h-11 rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700" />
        <input name="expires_at" type="date" className="min-h-11 rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700" />
        <input name="review_notes" placeholder="Review notes" className="min-h-11 rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 lg:col-span-4" />
      </form>
    </section>
  );
}

function AuditTrailSection({ data, mode }: { data: ComplianceWorkspaceData; mode: 'compliance' | 'documents' }) {
  const isDocumentsMode = mode === 'documents';
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Audit visibility</p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">Recent evidence and review decisions</h3>
        </div>
        <Link href="/admin/audit" className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 hover:border-brand-200 hover:text-brand-700">Admin audit</Link>
      </div>
      <div className="mt-4 space-y-3">
        {data.auditEvents.length ? data.auditEvents.slice(0, 8).map((event) => (
          <div key={event.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{titleCase(event.event_type)}</p>
                <p className="mt-1 text-xs text-slate-500">{event.actor_name ?? event.actor_email ?? 'System'} · {formatDateTime(event.created_at)}</p>
              </div>
              <span className={`rounded-full border px-3 py-1 text-xs font-medium ${badgeClasses(event.event_type.includes('rejected') ? 'rejected' : event.event_type.includes('approved') ? 'approved' : event.event_type.includes('revision') ? 'revision_requested' : 'submitted')}`}>
                {event.entity_type.replace(/_/g, ' ')}
              </span>
            </div>
            {event.entity_id ? <p className="mt-2 text-xs text-slate-500">Entity {event.entity_id.slice(0, 8)}</p> : null}
          </div>
        )) : (
          <EmptyState
            title={isDocumentsMode ? 'No document audit activity yet' : 'No compliance audit activity yet'}
            description={isDocumentsMode ? 'Document approvals, rejections, and revision requests will appear here once evidence review starts.' : 'Compliance blocker progression and reviewer decisions will appear here once the queue starts moving.'}
            actionHref="/admin/audit"
            actionLabel="Open audit log"
          />
        )}
      </div>
    </article>
  );
}

function DocumentReviewCard({
  document,
  relatedLeadName,
  relatedLeadId,
  relatedQuoteId,
  relatedRfqId,
  ownerName,
  reviewerName,
  canReview,
  readOnlyMessage,
  mode,
}: {
  document: ComplianceWorkspaceData['documents'][number];
  relatedLeadName: string | null;
  relatedLeadId: string | null;
  relatedQuoteId: string | null;
  relatedRfqId: string | null;
  ownerName: string;
  reviewerName: string | null;
  canReview: boolean;
  readOnlyMessage: string | null;
  mode: 'compliance' | 'documents';
}) {
  const [state, formAction] = useFormState(updateDocumentWorkflow, INITIAL_ACTION_STATE);
  const blockedMessage = !canReview ? (readOnlyMessage ?? 'Your current role can review the evidence posture here, but only compliance reviewers can update document status.') : null;
  return (
    <form action={formAction} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <input type="hidden" name="document_id" value={document.id} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{document.file_name}</p>
          <p className="mt-1 text-xs text-slate-500">{titleCase(document.doc_type)} · {titleCase(document.related_entity)} {relatedLeadName ? `· ${relatedLeadName}` : ''}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
            {relatedQuoteId ? <span className="rounded-full border border-slate-200 bg-white px-3 py-1">Quote {relatedQuoteId.slice(0, 8)}</span> : null}
            {relatedRfqId ? <span className="rounded-full border border-slate-200 bg-white px-3 py-1">RFQ {relatedRfqId.slice(0, 8)}</span> : null}
            <span className={`rounded-full border px-3 py-1 ${badgeClasses(document.status)}`}>{titleCase(document.status)}</span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1">Uploaded {formatDateTime(document.uploaded_at)}</span>
            {document.expires_at ? <span className="rounded-full border border-slate-200 bg-white px-3 py-1">Expires {formatDate(document.expires_at)}</span> : null}
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1">v{document.version}{document.version_label ? ` · ${document.version_label}` : ''}</span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1">Owner {ownerName}</span>
            {reviewerName ? <span className="rounded-full border border-slate-200 bg-white px-3 py-1">Reviewer {reviewerName}</span> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={relatedLeadId ? buildLeadCommandHref(relatedLeadId, mode) : '/leads'} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-brand-200 hover:text-brand-700">Open lead</Link>
          <Link href={mode === 'documents' ? '/compliance' : '/documents'} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-brand-200 hover:text-brand-700">Open {mode === 'documents' ? 'compliance' : 'documents'}</Link>
        </div>
      </div>
      {blockedMessage ? <StateMessage className="mt-3" tone="warning" title="Read-only evidence review" description={`${blockedMessage} Status controls stay visible so the progression path is clear.`} /> : null}
      {state?.error ? <StateMessage className="mt-3" tone="danger" title="Document review update failed" description={state.error} /> : null}
      {state?.success ? <StateMessage className="mt-3" tone="success" title="Document review updated" description={state.success} /> : null}
      <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,160px)_minmax(0,1fr)_auto] sm:items-start">
        <select name="status" defaultValue={document.status ?? 'pending'} disabled={!canReview} className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100">
          <option value="pending">Pending</option>
          <option value="submitted">Submitted</option>
          <option value="approved">Approved</option>
          <option value="revision_requested">Revision requested</option>
          <option value="rejected">Rejected</option>
          <option value="expired">Expired</option>
        </select>
        <input name="review_notes" defaultValue={document.review_notes ?? ''} disabled={!canReview} placeholder="Review notes" className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100" />
        <SubmitButton disabled={!canReview} pendingLabel="Saving review..." />
      </div>
    </form>
  );
}

function ComplianceReviewCard({
  item,
  leadName,
  leadType,
  definitionLabel,
  reviewerName,
  canReview,
  readOnlyMessage,
  mode,
}: {
  item: ComplianceWorkspaceData['complianceItems'][number];
  leadName: string | null;
  leadType: string | null;
  definitionLabel: string;
  reviewerName: string | null;
  canReview: boolean;
  readOnlyMessage: string | null;
  mode: 'compliance' | 'documents';
}) {
  const [state, formAction] = useFormState(updateComplianceWorkflow, INITIAL_ACTION_STATE);
  const blockedMessage = !canReview ? (readOnlyMessage ?? 'Your current role can inspect blockers, but only compliance reviewers can move review status forward.') : null;
  return (
    <form action={formAction} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <input type="hidden" name="compliance_id" value={item.id} />
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">{definitionLabel}</p>
            <p className="mt-1 text-xs text-slate-500">{leadName ? `${leadName} · ${titleCase(leadType)}` : 'Lead not found'} {item.due_at ? `· Due ${formatDate(item.due_at)}` : ''}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
              <span className={`rounded-full border px-3 py-1 ${badgeClasses(item.status)}`}>{titleCase(item.status)}</span>
              {item.severity ? <span className="rounded-full border border-slate-200 bg-white px-3 py-1">Severity {titleCase(item.severity)}</span> : null}
              {item.blocked_stage ? <span className="rounded-full border border-slate-200 bg-white px-3 py-1">Blocked stage {titleCase(item.blocked_stage)}</span> : null}
              {item.reviewed_at ? <span className="rounded-full border border-slate-200 bg-white px-3 py-1">Reviewed {formatDateTime(item.reviewed_at)}</span> : null}
              {reviewerName ? <span className="rounded-full border border-slate-200 bg-white px-3 py-1">Approver {reviewerName}</span> : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={item.lead_id ? buildLeadCommandHref(item.lead_id, mode) : '/leads'} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-brand-200 hover:text-brand-700">Open lead</Link>
            <Link href={mode === 'documents' ? '/documents' : '/compliance'} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-brand-200 hover:text-brand-700">Stay on {mode}</Link>
          </div>
        </div>
        {blockedMessage ? <StateMessage tone="warning" title="Read-only compliance queue" description={`${blockedMessage} Status controls stay visible so operators can see the expected progression path.`} /> : null}
        {state?.error ? <StateMessage tone="danger" title="Compliance update failed" description={state.error} /> : null}
        {state?.success ? <StateMessage tone="success" title="Compliance workflow updated" description={state.success} /> : null}
        <div className="grid gap-2 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)_auto] sm:items-start">
          <select name="status" defaultValue={item.status ?? 'pending'} disabled={!canReview} className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100">
            <option value="pending">Pending</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="revision_requested">Revision requested</option>
            <option value="blocked">Blocked</option>
            <option value="rejected">Rejected</option>
            <option value="waived">Waived</option>
          </select>
          <input name="review_notes" defaultValue={item.review_notes ?? ''} disabled={!canReview} placeholder="Review or blocker notes" className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100" />
          <SubmitButton disabled={!canReview} pendingLabel="Saving status..." />
        </div>
      </div>
    </form>
  );
}

export function ComplianceWorkspace({ mode = 'compliance', data, canReview = true, readOnlyMessage = null }: ComplianceWorkspaceProps) {
  const isDocumentsMode = mode === 'documents';

  const derived = useMemo(() => {
    const leadsById = new Map(data.leads.map((lead) => [lead.id, lead]));
    const stagesById = new Map(data.stages.map((stage) => [stage.id, stage]));
    const profilesById = new Map(data.profiles.map((profile) => [profile.id, profile.full_name ?? profile.username ?? 'Team member']));
    const definitionsById = new Map(data.complianceDefinitions.map((item) => [item.id, item]));
    const quotesById = new Map(data.quotes.map((quote) => [quote.id, quote]));
    const rfqsById = new Map(data.rfqs.map((rfq) => [rfq.id, rfq]));
    const documentsByLead = new Map<string, typeof data.documents>();
    const resolvedLeadIdByDocumentId = new Map<string, string>();

    for (const document of data.documents) {
      const resolvedLeadId = document.related_entity === 'lead'
        ? document.related_id
        : document.related_entity === 'quote'
          ? (quotesById.get(document.related_id)?.lead_id ?? null)
          : document.related_entity === 'rfq'
            ? (rfqsById.get(document.related_id)?.lead_id ?? null)
            : null;
      if (!resolvedLeadId) continue;
      const existing = documentsByLead.get(resolvedLeadId) ?? [];
      existing.push(document);
      documentsByLead.set(resolvedLeadId, existing);
      resolvedLeadIdByDocumentId.set(document.id, resolvedLeadId);
    }

    const leadMarketIdsByLead = new Map<string, string[]>();
    for (const item of data.leadMarkets) leadMarketIdsByLead.set(item.lead_id, [...(leadMarketIdsByLead.get(item.lead_id) ?? []), item.market_id]);
    const leadProductIdsByLead = new Map<string, string[]>();
    for (const item of data.leadProductInterests) leadProductIdsByLead.set(item.lead_id, [...(leadProductIdsByLead.get(item.lead_id) ?? []), item.product_id]);

    const blockedLeadRows = data.leads.map((lead) => {
      const leadCompliance = data.complianceItems.filter((item) => item.lead_id === lead.id);
      const leadDocuments = documentsByLead.get(lead.id) ?? [];
      const leadRfqs = data.rfqs.filter((item) => item.lead_id === lead.id);
      const leadQuotes = data.quotes.filter((item) => item.lead_id === lead.id);
      const openCompliance = leadCompliance.filter((item) => !['approved', 'waived', 'complete', 'completed'].includes(String(item.status ?? '').toLowerCase()));
      const pendingDocumentReviews = leadDocuments.filter((item) => ['pending', 'submitted', 'revision_requested'].includes(String(item.status ?? '').toLowerCase()));
      const expiredDocuments = leadDocuments.filter((item) => item.expires_at && item.expires_at < new Date().toISOString().slice(0, 10));
      const quoteSendRules = buildLeadDocumentRequirementState({
        rules: data.documentRequirementRules,
        leadType: lead.lead_type,
        marketIds: leadMarketIdsByLead.get(lead.id) ?? [],
        productIds: leadProductIdsByLead.get(lead.id) ?? [],
        documents: leadDocuments,
        scope: 'quote_send',
      });
      const contractRules = buildLeadDocumentRequirementState({
        rules: data.documentRequirementRules,
        leadType: lead.lead_type,
        marketIds: leadMarketIdsByLead.get(lead.id) ?? [],
        productIds: leadProductIdsByLead.get(lead.id) ?? [],
        documents: leadDocuments,
        scope: 'contract_progression',
      });
      const blockerCount = openCompliance.length + pendingDocumentReviews.length + expiredDocuments.length + quoteSendRules.blockerCount + contractRules.blockerCount;
      return {
        lead,
        blockerCount,
        openCompliance,
        pendingDocumentReviews,
        expiredDocuments,
        quoteSendRules,
        contractRules,
        leadRfqs,
        leadQuotes,
        missingEvidence: leadDocuments.length === 0 || quoteSendRules.blockerReasons.some((reason) => reason.includes('missing')) || contractRules.blockerReasons.some((reason) => reason.includes('missing')),
      };
    }).filter((item) => item.blockerCount > 0).sort((a, b) => b.blockerCount - a.blockerCount || String(b.lead.updated_at ?? '').localeCompare(String(a.lead.updated_at ?? '')));

    return {
      leadsById,
      stagesById,
      profilesById,
      definitionsById,
      quotesById,
      rfqsById,
      documentsByLead,
      resolvedLeadIdByDocumentId,
      blockedLeadRows,
    };
  }, [data]);

  const recentDocuments = data.documents.slice(0, 16);
  const reviewQueue = data.complianceItems.slice(0, 16);
  const documentReviewCount = data.documents.filter((item) => ['pending', 'submitted', 'revision_requested'].includes(String(item.status ?? '').toLowerCase())).length;
  const expiredDocumentCount = data.documents.filter((item) => item.expires_at && item.expires_at < new Date().toISOString().slice(0, 10)).length;
  const openComplianceCount = data.complianceItems.filter((item) => !['approved', 'waived', 'complete', 'completed'].includes(String(item.status ?? '').toLowerCase())).length;
  const contractBlockerCount = derived.blockedLeadRows.filter((item) => item.contractRules.blockerCount > 0).length;
  const quoteSendGateCount = derived.blockedLeadRows.filter((item) => item.quoteSendRules.blockerCount > 0).length;
  const missingEvidenceLeadCount = derived.blockedLeadRows.filter((item) => item.missingEvidence).length;
  const reviewedAuditCount = data.auditEvents.length;
  const isEmptyWorkspace = !data.leads.length && !data.documents.length && !data.complianceItems.length;
  const noEvidenceUploaded = !data.documents.length;
  const noComplianceQueue = !data.complianceItems.length;

  const metrics = isDocumentsMode
    ? [
        { label: 'Pending document review', value: String(documentReviewCount), helper: 'Files waiting on operator review or approval.' },
        { label: 'Expired documents', value: String(expiredDocumentCount), helper: 'Files that now block progression because expiry has passed.' },
        { label: 'Missing evidence leads', value: String(missingEvidenceLeadCount), helper: 'Leads still missing required evidence or required approvals.' },
        { label: 'Recent audit events', value: String(reviewedAuditCount), helper: 'Evidence decisions now stay visible without leaving this route.' },
      ]
    : [
        { label: 'Open compliance blockers', value: String(openComplianceCount), helper: 'Checklist items still unresolved.' },
        { label: 'Blocked leads', value: String(derived.blockedLeadRows.length), helper: 'Leads currently exposed to compliance or document blockers.' },
        { label: 'Quote-send gates', value: String(quoteSendGateCount), helper: 'Leads whose quote send is blocked by missing or stale evidence.' },
        { label: 'Recent audit events', value: String(reviewedAuditCount), helper: 'Reviewer decisions and blocker progression remain visible.' },
      ];

  const operatorBullets = isDocumentsMode
    ? [
        'Review file packs without leaving the current deal context.',
        'Approve, reject, or request revision for document versions.',
        'Watch expiry posture before quote send or contract progression.',
        'Keep owner, reviewer, and linked requirement visibility explicit.',
      ]
    : [
        'Resolve checklist blockers before lead progression stalls.',
        'Keep quote-send and contract-progression gates honest across active deals.',
        'Review approver state, severity, due dates, and blocked-stage notes in one place.',
        'Use linked documents as evidence, not as a separate back-office inbox.',
      ];

  if (isEmptyWorkspace) {
    return (
      <EmptyState
        title={isDocumentsMode ? 'No compliance or document records yet' : 'No compliance workflow records yet'}
        description={isDocumentsMode ? 'Lead-linked files, review decisions, and evidence blockers will appear here once the first deal starts using documents.' : 'Compliance items, linked evidence, and blocker decisions will appear here once the first deal enters review.'}
        actionHref="/leads"
        actionLabel="Open leads workspace"
      />
    );
  }

  const leadBlockerSection = (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Lead blocker visibility</p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">Blocked leads by document and compliance posture</h3>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">Operator-first</span>
      </div>
      <div className="mt-4 space-y-3">
        {derived.blockedLeadRows.length ? derived.blockedLeadRows.slice(0, 10).map(({ lead, blockerCount, openCompliance, pendingDocumentReviews, expiredDocuments, quoteSendRules, contractRules, missingEvidence }) => (
          <div key={lead.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Link href={buildLeadCommandHref(lead.id, mode)} className="text-sm font-semibold text-slate-900 hover:text-brand-700">{lead.company_name}</Link>
                <p className="mt-1 text-xs text-slate-500">{titleCase(lead.lead_type)} · {lead.stage_id ? derived.stagesById.get(lead.stage_id)?.name ?? 'Unknown stage' : 'No stage'}</p>
              </div>
              <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">{blockerCount} blocker{blockerCount === 1 ? '' : 's'}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
              {openCompliance.length ? <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1">{openCompliance.length} compliance open</span> : null}
              {pendingDocumentReviews.length ? <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1">{pendingDocumentReviews.length} docs need review</span> : null}
              {expiredDocuments.length ? <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1">{expiredDocuments.length} docs expired</span> : null}
              {quoteSendRules.blockerCount ? <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1">{quoteSendRules.blockerCount} quote-send gate</span> : null}
              {contractRules.blockerCount ? <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1">{contractRules.blockerCount} contract gate</span> : null}
              {missingEvidence ? <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1">Missing evidence</span> : null}
            </div>
          </div>
        )) : <EmptyState title="No blocked leads visible" description="As compliance and document workflows are resolved, blocked leads will disappear from this queue." />}
      </div>
    </article>
  );

  const recentDocumentsSection = (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Recent documents</p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">Versioned files with explicit review posture</h3>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">Version + expiry aware</span>
      </div>
      <div className="mt-4 space-y-3">
        {recentDocuments.length ? recentDocuments.map((document) => {
          const relatedLeadId = derived.resolvedLeadIdByDocumentId.get(document.id) ?? null;
          const relatedLead = relatedLeadId ? derived.leadsById.get(relatedLeadId) ?? null : null;
          const relatedQuote = document.related_entity === 'quote' ? derived.quotesById.get(document.related_id) ?? null : null;
          const relatedRfq = document.related_entity === 'rfq' ? derived.rfqsById.get(document.related_id) ?? null : null;
          return (
            <DocumentReviewCard
              key={document.id}
              document={document}
              relatedLeadName={relatedLead?.company_name ?? null}
              relatedLeadId={relatedLeadId}
              relatedQuoteId={relatedQuote?.id ?? null}
              relatedRfqId={relatedRfq?.id ?? null}
              ownerName={derived.profilesById.get(document.owner_user_id ?? document.uploaded_by ?? '') ?? 'Unassigned'}
              reviewerName={document.reviewer_user_id ? derived.profilesById.get(document.reviewer_user_id) ?? 'Unknown reviewer' : null}
              canReview={canReview}
              readOnlyMessage={readOnlyMessage}
              mode={mode}
            />
          );
        }) : <EmptyState title="No evidence uploaded yet" description="Uploaded lead, RFQ, quote, and contract-supporting files will appear here with review posture, expiry, and version visibility." actionHref="/leads" actionLabel="Open leads workspace" />}
      </div>
    </article>
  );

  const contractReadinessSection = (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Contract progression readiness</p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">Dedicated operator surface for contract blockers</h3>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">Evidence gate</span>
      </div>
      <div className="mt-4 space-y-3">
        {derived.blockedLeadRows.filter((item) => item.contractRules.blockerCount > 0).length ? derived.blockedLeadRows.filter((item) => item.contractRules.blockerCount > 0).slice(0, 8).map((item) => (
          <div key={`contract-${item.lead.id}`} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{item.lead.company_name}</p>
                <p className="mt-1 text-xs text-slate-500">{titleCase(item.lead.lead_type)} · {derived.stagesById.get(item.lead.stage_id ?? '')?.name ?? 'No stage set'}</p>
              </div>
              <Link href={buildLeadCommandHref(item.lead.id, mode)} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-brand-200 hover:text-brand-700">Open lead</Link>
            </div>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-amber-900">
              {item.contractRules.blockerReasons.map((reason) => <li key={reason}>{reason}</li>)}
            </ul>
          </div>
        )) : <p className="text-sm text-slate-500">No active contract-progression blockers right now.</p>}
      </div>
    </article>
  );

  const complianceQueueSection = (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Approval and review queue</p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">Compliance items tied to real lead progression</h3>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">Review UX</span>
      </div>
      <div className="mt-4 space-y-3">
        {reviewQueue.length ? reviewQueue.map((item) => {
          const lead = derived.leadsById.get(item.lead_id);
          const definition = derived.definitionsById.get(item.compliance_item_id);
          return (
            <ComplianceReviewCard
              key={item.id}
              item={item}
              leadName={lead?.company_name ?? null}
              leadType={lead?.lead_type ?? null}
              definitionLabel={`${definition?.code ?? 'Compliance item'}${definition?.description ? ` · ${definition.description}` : ''}`}
              reviewerName={item.reviewer_user_id ? derived.profilesById.get(item.reviewer_user_id) ?? 'Unknown reviewer' : null}
              canReview={canReview}
              readOnlyMessage={readOnlyMessage}
              mode={mode}
            />
          );
        }) : <EmptyState title="No compliance items active" description="New compliance requirements will appear here as leads, quotes, and document requirements become active." actionHref="/leads" actionLabel="Open leads workspace" />}
      </div>
    </article>
  );

  return (
    <div className="space-y-6">
      {readOnlyMessage ? <StateMessage title="Read-only compliance workspace" description={`${readOnlyMessage} Review context, evidence summaries, and audit visibility stay available, but status updates are disabled on this route.`} tone="warning" /> : null}
      {isDocumentsMode && noEvidenceUploaded ? <StateMessage title="Missing evidence state is active" description="No lead-linked documents are visible yet. Keep this workspace as the review surface, but use the lead, RFQ, or quote flows to create the first evidence pack." tone="warning" /> : null}
      {!isDocumentsMode && noComplianceQueue ? <StateMessage title="No compliance queue yet" description="The compliance route is ready, but no checklist items are active yet. Review blocker visibility and linked documents here once the first deal enters compliance review." tone="neutral" /> : null}
      {!data.documentRequirementRules.length ? <StateMessage title="No evidence rules configured" description="Document requirement rules are still empty for this workspace. The screen can show uploaded files, but quote-send and contract gates will stay incomplete until rules are configured." tone="warning" /> : null}
      {missingEvidenceLeadCount > 0 ? <StateMessage title="Missing evidence is still blocking progression" description={`${missingEvidenceLeadCount} lead${missingEvidenceLeadCount === 1 ? '' : 's'} still need required evidence before quote send or contract progression can move forward.`} tone="danger" /> : null}

      <section className="rounded-[28px] border border-slate-200 bg-white shadow-soft">
        <div className="border-b border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-brand-900 px-5 py-5 text-white sm:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-3">
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/90">{isDocumentsMode ? 'Documents workspace' : 'Compliance workspace'}</span>
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">{isDocumentsMode ? 'Document control and review' : 'Compliance blocker and approval control'}</h2>
                <p className="mt-2 max-w-3xl text-sm text-white/75">{isDocumentsMode ? 'Keep versioned deal files, reviewer state, expiry posture, and linked requirements visible in one operational workspace instead of treating documents like storage.' : 'Keep checklist blockers, reviewer posture, due-state visibility, and progression gates tied to the same operational workflow used by leads, RFQs, quotes, and contracts.'}</p>
              </div>
            </div>
            <div className="grid min-w-full gap-3 sm:grid-cols-2 xl:min-w-[420px]">
              {metrics.map((metric) => (
                <article key={metric.label} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/60">{metric.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{metric.value}</p>
                  <p className="mt-1 text-xs text-white/70">{metric.helper}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
        <div className="grid gap-4 p-5 sm:p-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">What operators can do here</p>
            <ul className="mt-4 space-y-3 text-sm text-slate-700">
              {operatorBullets.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </section>
          <section className="rounded-3xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Linked workspaces</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Link href="/documents" className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${isDocumentsMode ? 'border-brand-200 bg-brand-50 text-brand-700' : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-brand-200 hover:text-brand-700'}`}>Documents workspace</Link>
              <Link href="/compliance" className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${!isDocumentsMode ? 'border-brand-200 bg-brand-50 text-brand-700' : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-brand-200 hover:text-brand-700'}`}>Compliance workspace</Link>
            </div>
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">{isDocumentsMode ? 'Document decisions here should unblock quote send, contract progression, and downstream compliance review without leaving the deal context.' : 'Compliance decisions here should remain linked to the evidence stored in Documents rather than creating a disconnected review process.'}</div>
          </section>
        </div>
      </section>

      {isDocumentsMode ? <WorkspaceDocumentUploadCard data={data} /> : null}

      <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <section className="space-y-6">
          {isDocumentsMode ? recentDocumentsSection : leadBlockerSection}
          {isDocumentsMode ? leadBlockerSection : complianceQueueSection}
        </section>

        <section className="space-y-6">
          {isDocumentsMode ? contractReadinessSection : recentDocumentsSection}
          {isDocumentsMode ? AuditTrailSection({ data, mode }) : contractReadinessSection}
          {!isDocumentsMode ? AuditTrailSection({ data, mode }) : null}
        </section>
      </div>
    </div>
  );
}
