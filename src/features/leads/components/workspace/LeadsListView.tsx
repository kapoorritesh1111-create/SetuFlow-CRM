'use client';
import { AlertTriangle, CheckCircle, Clock } from '@/features/leads/ui/lead-workspace-icons';
// SF-18-007C: LeadsListView — extracted list UI components
// Extracted from leads-workspace-implementation.tsx to reduce file size.

import * as React from 'react';
import { 
  getLeadInitials, 
  getLeadCommandCenterHref,
  getLeadEmailHref, 
  getLeadWhatsAppHref,
  openLeadCommandCenter, 
  shouldIgnoreLeadNavigationTarget, 
  handleLeadCommandCenterKeyDown,
  SignalPill,
} from '@/features/leads/components/workspace/leads-workspace-implementation';
import { getPricingReadinessLabel } from '@/lib/catalog-pricing-model';
import { getReadinessTone } from '@/features/leads/components/workspace/leads-workspace-helpers';
import type { LeadCommercialReadiness } from '@/lib/catalog-pricing-model';
import { useRouter } from 'next/navigation';
import { getFollowUpBadgeClasses, getFollowUpLabel, getFollowUpVisualState } from '@/lib/lead-status';
import { computeLeadHealth } from '@/lib/lead-health';
import { formatDateTime } from '@/lib/utils';
import { PRODUCT_ROUTES } from '@/lib/product-contract';
import type { LeadTableRowProps } from '@/features/leads/ui/lead-table-row';
import type {
  FollowUp,
  Stage,
  Profile,
  LeadRow,
  Market,
  Activity,
  Quote,
  QuoteVersion,
  LeadDocument,
} from '@/features/leads/types/workspace';


function LeadQueueStat({ label, value, tone }: { label: string; value: number; tone: 'slate' | 'blue' | 'amber' }) {
  const toneClass =
    tone === 'blue'
      ? 'border-blue-100 bg-blue-50 text-blue-700'
      : tone === 'amber'
        ? 'border-amber-100 bg-amber-50 text-amber-700'
        : 'border-slate-200 bg-slate-50 text-slate-700';

  return (
    <div className={`rounded-2xl border px-3 py-2 ${toneClass}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em]">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function LeadMobileCard(props: LeadTableRowProps) {
  const {
    lead,
    selected,
    isSpotlight,
    toggleSelect,
    setSpotlightLead,
    stageMap,
    nextStepMap,
    ownerMap,
    safeFormatDateTime,
    activityMap,
    stageHistoryMap,
    stageMetaMap,
    readinessMap,
  } = props;

  const stageMeta = lead.stage_id ? stageMetaMap.get(lead.stage_id) : null;
  const health = computeLeadHealth({
    created_at: lead.created_at,
    updated_at: lead.updated_at,
    last_contacted_at: lead.last_contacted_at,
    next_follow_up_at: lead.next_follow_up_at,
    lastActivityAt: activityMap.get(lead.id),
    lastStageChangeAt: stageHistoryMap.get(lead.id),
    stageSortOrder: stageMeta?.sortOrder ?? null,
    stageCount: stageMeta?.stageCount ?? null,
    isClosedStage: stageMeta?.isClosed ?? null,
  });
  const followUpState = getFollowUpVisualState(lead.next_follow_up_at);
  const readiness = readinessMap.get(lead.id);
  const commandCenterHref = getLeadCommandCenterHref(lead.id);
  const emailHref = getLeadEmailHref(lead);
  const whatsappHref = getLeadWhatsAppHref(lead);
  const router = useRouter();

  return (
    <article
      role="link"
      tabIndex={0}
      className={[
        'cursor-pointer rounded-panel border border-slate-200 bg-white p-3.5 shadow-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200',
        selected || isSpotlight ? 'ring-2 ring-brand-200' : '',
      ].join(' ')}
      onMouseEnter={() => setSpotlightLead(lead.id)}
      onClick={(event) => {
        if (shouldIgnoreLeadNavigationTarget(event.target)) return;
        openLeadCommandCenter(router, commandCenterHref);
      }}
      onKeyDown={(event) => {
        if (shouldIgnoreLeadNavigationTarget(event.target)) return;
        handleLeadCommandCenterKeyDown(event, router, commandCenterHref);
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                openLeadCommandCenter(router, commandCenterHref);
              }}
              className="text-left text-base font-semibold text-slate-900 underline-offset-4 hover:text-brand-700 hover:underline"
            >
              {lead.company_name}
            </button>
            <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${lead.lead_type === 'buyer' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>
              {lead.lead_type}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">{lead.contact_name ?? 'No primary contact'} · {lead.country ?? 'No country'}</p>
        </div>
        <input
          type="checkbox"
          checked={selected}
          aria-label={`Select ${lead.company_name}`}
          onClick={(event) => event.stopPropagation()}
          onChange={() => toggleSelect(lead.id)}
          className="mt-1 h-4 w-4 rounded border-slate-300"
        />
      </div>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          openLeadCommandCenter(router, commandCenterHref);
        }}
        className="mt-3 block w-full rounded-2xl text-left transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Stage</p>
            <p className="mt-1 text-sm font-medium text-slate-800">{stageMap.get(lead.stage_id ?? '') ?? '—'}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{nextStepMap.get(lead.next_step_id ?? '') ?? 'No next step set'}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Follow-up</p>
            <span className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getFollowUpBadgeClasses(followUpState)}`}>
              {lead.next_follow_up_at ? safeFormatDateTime(lead.next_follow_up_at) : getFollowUpLabel(followUpState)}
            </span>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{ownerMap.get(lead.owner_user_id ?? '') ?? 'Unassigned'}</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700">{health.replace('_', ' ')}</span>
          <SignalPill label={getPricingReadinessLabel(readiness?.pricingReadiness ?? 'missing')} tone={getReadinessTone(readiness?.pricingReadiness ?? 'missing')} icon={readiness?.pricingReadiness === 'ready' ? CheckCircle : readiness?.pricingReadiness === 'partial' ? Clock : AlertTriangle} />
          <SignalPill label={`${readiness?.blockerCount ?? 0} blocker${(readiness?.blockerCount ?? 0) === 1 ? '' : 's'}`} tone={(readiness?.blockerCount ?? 0) > 0 ? 'rose' : 'slate'} icon={(readiness?.blockerCount ?? 0) > 0 ? AlertTriangle : CheckCircle} />
        </div>
      </button>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
        <div className="text-xs font-medium text-slate-500">Continue, quote, or contact this lead.</div>
        <div className="flex flex-wrap gap-2">
          {emailHref ? (
            <a
              href={emailHref}
              onClick={(event) => event.stopPropagation()}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.05)]"
            >
              Email
            </a>
          ) : null}
          {whatsappHref ? (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => event.stopPropagation()}
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"
            >
              WhatsApp
            </a>
          ) : null}
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setSpotlightLead(lead.id);
            }}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"
          >
            Preview
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              openLeadCommandCenter(router, commandCenterHref);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.05)]"
          >
            Open
          </button>
        </div>
      </div>
    </article>
  );
}

function LeadSpotlightCard({
  lead,
  stageMap,
  nextStepMap,
  ownerMap,
  safeFormatDateTime,
  onQuickAdd,
  activityMap,
  stageHistoryMap,
  stageMetaMap,
  readinessMap,
  quotes,
  quoteVersions,
  documents,
}: {
  lead: LeadRow | undefined;
  stageMap: Map<string, string>;
  nextStepMap: Map<string, string>;
  ownerMap: Map<string, string>;
  safeFormatDateTime: (value?: string | null) => string;
  onQuickAdd: () => void;
  activityMap: Map<string, string>;
  stageHistoryMap: Map<string, string>;
  stageMetaMap: Map<string, { sortOrder: number; stageCount: number; isClosed: boolean }>;
  readinessMap: Map<string, LeadCommercialReadiness>;
  quotes: Quote[];
  quoteVersions: QuoteVersion[];
  documents: LeadDocument[];
}) {
  if (!lead) {
    return (
      <div className="sticky top-[144px] rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Lead spotlight</p>
        <h3 className="mt-3 text-xl font-semibold text-slate-900">No lead selected yet</h3>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Hover a row on desktop or choose a card on mobile to keep a detail preview visible inside the workspace.</p>
        <button type="button" onClick={onQuickAdd} className="mt-4 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">Quick add lead</button>
      </div>
    );
  }

  const stageMeta = lead.stage_id ? stageMetaMap.get(lead.stage_id) : null;
  const health = computeLeadHealth({
    created_at: lead.created_at,
    updated_at: lead.updated_at,
    last_contacted_at: lead.last_contacted_at,
    next_follow_up_at: lead.next_follow_up_at,
    lastActivityAt: activityMap.get(lead.id),
    lastStageChangeAt: stageHistoryMap.get(lead.id),
    stageSortOrder: stageMeta?.sortOrder ?? null,
    stageCount: stageMeta?.stageCount ?? null,
    isClosedStage: stageMeta?.isClosed ?? null,
  });
  const followUpState = getFollowUpVisualState(lead.next_follow_up_at);
  const readiness = readinessMap.get(lead.id);
  const latestQuote = quotes
    .filter((quote) => quote.lead_id === lead.id)
    .sort((left, right) => String(right.updated_at ?? right.created_at ?? '').localeCompare(String(left.updated_at ?? left.created_at ?? '')))[0] ?? null;
  const leadDocuments = documents.filter((document) => document.related_id === lead.id);
  const router = useRouter();

  return (
    <div className="sticky top-[144px] space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Lead spotlight</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <h3 className="text-xl font-semibold text-slate-900">{lead.company_name}</h3>
          <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${lead.lead_type === 'buyer' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>
            {lead.lead_type}
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-500">{lead.contact_name ?? 'No primary contact'} · {lead.country ?? 'No country'} · {ownerMap.get(lead.owner_user_id ?? '') ?? 'Unassigned'}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        <SpotlightItem label="Stage" value={stageMap.get(lead.stage_id ?? '') ?? '—'} />
        <SpotlightItem label="Next step" value={nextStepMap.get(lead.next_step_id ?? '') ?? 'No next step set'} />
        <SpotlightItem label="Follow-up" value={lead.next_follow_up_at ? safeFormatDateTime(lead.next_follow_up_at) : getFollowUpLabel(followUpState)} />
        <SpotlightItem label="Health" value={health.replace('_', ' ')} />
        <SpotlightItem label="Pricing readiness" value={getPricingReadinessLabel(readiness?.pricingReadiness ?? 'missing')} />
        <SpotlightItem label="Blockers" value={readiness?.blockerReasons[0] ?? 'No active blockers'} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Recent context</p>
        <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
          <p>Last contacted: <span className="font-medium text-slate-800">{lead.last_contacted_at ? safeFormatDateTime(lead.last_contacted_at) : 'Not logged'}</span></p>
          <p>Last activity: <span className="font-medium text-slate-800">{activityMap.get(lead.id) ? safeFormatDateTime(activityMap.get(lead.id)) : 'Not logged'}</span></p>
          <p>Last stage change: <span className="font-medium text-slate-800">{stageHistoryMap.get(lead.id) ? safeFormatDateTime(stageHistoryMap.get(lead.id)) : 'Not logged'}</span></p>
        </div>
      </div>

      <QuoteReviewCard quote={latestQuote} quoteVersions={quoteVersions.filter((version) => quotes.some((candidate) => candidate.id === version.quote_id && candidate.lead_id === lead.id))} documents={leadDocuments} leadId={lead.id} safeFormatDateTime={safeFormatDateTime} />

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => openLeadCommandCenter(router, getLeadCommandCenterHref(lead.id))}
          className="rounded-2xl bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-slate-800"
        >
          Open
        </button>
        <button type="button" onClick={onQuickAdd} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          Add another lead
        </button>
      </div>
    </div>
  );
}

function SpotlightItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}


function getQuoteStatusTone(status: string | null | undefined) {
  const normalized = String(status ?? '').toLowerCase();
  if (['approved', 'accepted', 'sent'].includes(normalized)) return 'emerald';
  if (['pending_approval', 'pending', 'draft'].includes(normalized)) return 'amber';
  return 'slate';
}

function QuoteReviewCard({
  quote,
  quoteVersions,
  documents,
  leadId,
  safeFormatDateTime,
}: {
  quote: Quote | null;
  quoteVersions: QuoteVersion[];
  documents: LeadDocument[];
  leadId: string;
  safeFormatDateTime: (value?: string | null) => string;
}) {
  if (!quote) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-600 dark:text-slate-300">
        No quote created yet. Quotes will surface here once the lead enters the commercial workflow.
      </div>
    );
  }

  const versions = quoteVersions
    .filter((version) => version.quote_id === quote.id)
    .sort((left, right) => Number(right.version_no ?? 0) - Number(left.version_no ?? 0) || String(right.created_at ?? '').localeCompare(String(left.created_at ?? '')));
  const quoteDocuments = documents
    .filter((document) => document.linked_quote_id === quote.id || (document.source_related_entity?.startsWith('quote') && document.related_id === leadId))
    .sort((left, right) => String(right.uploaded_at ?? '').localeCompare(String(left.uploaded_at ?? '')));
  const documentById = new Map(quoteDocuments.map((document) => [document.id, document] as const));
  const versionRows = versions.map((version) => ({
    version,
    document: version.pdf_document_id ? documentById.get(version.pdf_document_id) ?? quoteDocuments.find((document) => document.id === version.pdf_document_id) ?? null : null,
  }));
  const latestDocument = versionRows.find((row) => row.document)?.document ?? quoteDocuments[0] ?? null;
  const approvedDocument = versionRows.find((row) => row.version.approved_at || String(row.version.status ?? '').toLowerCase() === 'approved')?.document ?? quoteDocuments.find((document) => String(document.status ?? '').toLowerCase() === 'approved') ?? null;
  const sentDocument = versionRows.find((row) => row.version.sent_at || String(row.version.status ?? '').toLowerCase() === 'sent')?.document ?? quoteDocuments.find((document) => String(document.status ?? '').toLowerCase() === 'sent') ?? null;
  const approvedVersion = versions.find((version) => version.approved_at);
  const sentVersion = versions.find((version) => version.sent_at);
  const router = useRouter();
  const statusTimeline = [
    quote.created_at ? { label: 'Quote created', at: quote.created_at } : null,
    approvedVersion?.approved_at ? { label: 'Version approved', at: approvedVersion.approved_at } : null,
    sentVersion?.sent_at ? { label: 'Version sent', at: sentVersion.sent_at } : null,
    quote.updated_at && quote.updated_at !== quote.created_at ? { label: 'Quote updated', at: quote.updated_at } : null,
  ].filter((item): item is { label: string; at: string } => Boolean(item?.at));

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Quote review</p>
          <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-50">{quote.quote_number ?? 'Latest quote'} · {quote.status.replace(/_/g, ' ')}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Updated {safeFormatDateTime(quote.updated_at)} · Version {quote.current_version_id ?? 'Current pending sync'}</p>
        </div>
        <StatusChip label={quote.status.replace(/_/g, ' ')} tone={getQuoteStatusTone(quote.status)} />
      </div>
      <div className="mt-3 grid gap-2 text-xs text-slate-600">
        <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2">Latest document: <span className="font-medium text-slate-800">{latestDocument?.file_name ?? 'No quote PDF linked yet'}</span></div>
        <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2">Approved document: <span className="font-medium text-slate-800">{approvedDocument?.file_name ?? 'Not approved yet'}</span></div>
        <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2">Sent document: <span className="font-medium text-slate-800">{sentDocument?.file_name ?? 'Not sent yet'}</span></div>
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Version history</p>
          <div className="mt-2 space-y-2 text-xs text-slate-600">
            {versionRows.length ? versionRows.map(({ version, document }) => (
              <div key={version.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-800">v{version.version_no ?? '—'} · {String(version.status ?? 'draft').replace(/_/g, ' ')}</span>
                  <span>{safeFormatDateTime(version.sent_at ?? version.approved_at ?? version.created_at)}</span>
                </div>
                <p className="mt-1 text-slate-500">{document?.file_name ?? 'No linked PDF yet'}</p>
              </div>
            )) : <p>No quote versions synced yet.</p>}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Approval and send timeline</p>
          <div className="mt-2 space-y-2 text-xs text-slate-600">
            {statusTimeline.length ? statusTimeline.map((item) => (
              <div key={`${item.label}-${item.at}`} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-800">{item.label}</span>
                  <span>{safeFormatDateTime(item.at)}</span>
                </div>
              </div>
            )) : <p>No approval or send timeline available yet.</p>}
          </div>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => openLeadCommandCenter(router, getLeadCommandCenterHref(leadId, 'quotes'))}
          className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
        >
          Open
        </button>
        <button
          type="button"
          onClick={() => openLeadCommandCenter(router, getLeadCommandCenterHref(leadId, 'quotes'))}
          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-white"
        >
          Open commercial view
        </button>
      </div>
    </div>
  );
}

function StatusChip({ label, tone }: { label: string; tone: 'rose' | 'amber' | 'slate' | 'emerald' }) {
  const classes =
    tone === 'rose'
      ? 'bg-rose-50 text-rose-700'
      : tone === 'amber'
        ? 'bg-amber-50 text-amber-700'
        : tone === 'emerald'
          ? 'bg-emerald-50 text-emerald-700'
          : 'bg-slate-100 text-slate-700';
  return <span className={`rounded-full px-3 py-1 text-sm font-medium ${classes}`}>{label}</span>;
}


// Re-export all as named exports
export { LeadQueueStat, LeadMobileCard, LeadSpotlightCard };
