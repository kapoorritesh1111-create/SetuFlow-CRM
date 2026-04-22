import type { QuoteHistoryItem, QuoteWorkspaceListItem, QuotesWorkspaceViewModel } from '@/features/quotes/types/workspace';
import { PRODUCT_ROUTES } from '@/lib/product-contract';

type LeadRow = { id: string; company_name: string | null; contact_name: string | null; lead_type?: 'buyer' | 'supplier' | null };
type QuoteRow = {
  id: string;
  lead_id: string;
  status: string | null;
  currency: string | null;
  notes: string | null;
  quote_number: string | null;
  created_at: string;
  updated_at: string;
  current_version_id: string | null;
};
type QuoteVersionRow = {
  id: string;
  quote_id: string | null;
  version_no: number | null;
  status: string | null;
  created_at: string | null;
  approved_at: string | null;
  sent_at: string | null;
};
type NegotiationRow = {
  id: string;
  quote_id: string;
  event_type: string | null;
  message: string | null;
  created_at: string | null;
  actor_name: string | null;
};
type CommunicationRow = {
  id: string;
  quote_id: string | null;
  subject: string | null;
  summary: string | null;
  status: string | null;
  created_at: string;
};
type ContractRow = {
  id: string;
  quote_id: string | null;
  status: string | null;
  signed_at: string | null;
  starts_on: string | null;
  commercial_lock_state?: string | null;
  commercial_snapshot?: unknown;
};

function lower(value: string | null | undefined) {
  return String(value ?? '').trim().toLowerCase();
}

function buildHistory(quoteId: string, versions: QuoteVersionRow[], negotiations: NegotiationRow[], communications: CommunicationRow[]): QuoteHistoryItem[] {
  const versionHistory = versions
    .filter((row) => row.quote_id === quoteId)
    .map((row) => ({
      id: `version-${row.id}`,
      label: `Version ${row.version_no ?? 'draft'}`,
      detail: `Status: ${row.status ?? 'unknown'}${row.sent_at ? ' • sent' : row.approved_at ? ' • approved' : ''}`,
      happenedAt: row.sent_at ?? row.approved_at ?? row.created_at,
    }));

  const negotiationHistory = negotiations
    .filter((row) => row.quote_id === quoteId)
    .map((row) => ({
      id: `negotiation-${row.id}`,
      label: row.event_type ? row.event_type.replaceAll('_', ' ') : 'Negotiation update',
      detail: row.message ?? `Updated by ${row.actor_name ?? 'team'}`,
      happenedAt: row.created_at,
    }));

  const communicationHistory = communications
    .filter((row) => row.quote_id === quoteId)
    .map((row) => ({
      id: `communication-${row.id}`,
      label: row.subject ?? 'Quote communication',
      detail: row.summary ?? `Status: ${row.status ?? 'draft'}`,
      happenedAt: row.created_at,
    }));

  return [...versionHistory, ...negotiationHistory, ...communicationHistory].sort((a, b) => {
    const aTime = a.happenedAt ? Date.parse(a.happenedAt) : 0;
    const bTime = b.happenedAt ? Date.parse(b.happenedAt) : 0;
    return bTime - aTime;
  });
}

function getNextStep({ status, hasAcceptedContract, leadId, quoteId }: { status: string; hasAcceptedContract: boolean; leadId: string; quoteId: string }) {
  if (hasAcceptedContract || status === 'accepted') {
    return {
      label: 'Move into Orders / Execution',
      detail: 'The quote is accepted. The next move is order handoff, not more quote edits.',
      href: PRODUCT_ROUTES.app.orders,
      tone: 'orders' as const,
    };
  }

  if (status === 'pending_approval') {
    return {
      label: 'Clear approval before sending',
      detail: 'Approval is the blocker. The quote should not advance into outbound communication until that gate clears.',
      href: PRODUCT_ROUTES.app.integrations,
      tone: 'approval' as const,
    };
  }

  if (status === 'approved') {
    return {
      label: 'Send quote',
      detail: 'Review is complete. The next move is sending this quote and keeping the activity trail visible.',
      href: PRODUCT_ROUTES.app.integrations,
      tone: 'approval' as const,
    };
  }

  if (status === 'sent' || status === 'negotiating') {
    return {
      label: 'Drive response from Follow-up',
      detail: 'The quote is live. Go back to Follow-up to handle the buyer response and next action.',
      href: `/leads/${leadId}?tab=workflow`,
      tone: 'follow_up' as const,
    };
  }

  if (status === 'rejected' || status === 'expired') {
    return {
      label: 'Requalify or close from Follow-up',
      detail: 'This quote is no longer active. Put the lead back into a clear follow-up decision.',
      href: `/leads/${leadId}?tab=workflow`,
      tone: 'follow_up' as const,
    };
  }

  return {
    label: 'Finish quote build',
    detail: 'Keep the working set compressed around the quote builder until pricing, terms, and readiness are explicit.',
    href: `/leads/${leadId}/quote?quoteId=${quoteId}`,
    tone: 'quote' as const,
  };
}

export function buildQuotesPageViewModel({ quotes, leads, versions, negotiations, communications, contracts, selectedQuoteId }: {
  quotes: QuoteRow[];
  leads: LeadRow[];
  versions: QuoteVersionRow[];
  negotiations: NegotiationRow[];
  communications: CommunicationRow[];
  contracts: ContractRow[];
  selectedQuoteId: string | null;
}): QuotesWorkspaceViewModel {
  const leadMap = new Map(leads.map((lead) => [lead.id, lead]));
  const versionCounts = new Map<string, number>();
  const negotiationCounts = new Map<string, number>();
  const communicationCounts = new Map<string, number>();
  const contractByQuoteId = new Map(contracts.filter((row) => row.quote_id).map((row) => [String(row.quote_id), row]));
  const contractQuoteIds = new Set(contractByQuoteId.keys());

  for (const row of versions) {
    if (!row.quote_id) continue;
    versionCounts.set(row.quote_id, (versionCounts.get(row.quote_id) ?? 0) + 1);
  }
  for (const row of negotiations) {
    negotiationCounts.set(row.quote_id, (negotiationCounts.get(row.quote_id) ?? 0) + 1);
  }
  for (const row of communications) {
    if (!row.quote_id) continue;
    communicationCounts.set(row.quote_id, (communicationCounts.get(row.quote_id) ?? 0) + 1);
  }

  const items: QuoteWorkspaceListItem[] = quotes.map((quote) => {
    const lead = leadMap.get(quote.lead_id);
    const quoteNegotiations = negotiations.filter((row) => row.quote_id === quote.id);
    const leadType: QuoteWorkspaceListItem['leadType'] = lead?.lead_type === 'buyer' || lead?.lead_type === 'supplier' ? lead.lead_type : 'mixed';
    const status = lower(quote.status) || 'draft';
    const hasAcceptedContract = contractQuoteIds.has(quote.id);

    return {
      id: quote.id,
      leadId: quote.lead_id,
      companyName: lead?.company_name ?? 'Unknown company',
      leadType,
      contactName: lead?.contact_name ?? null,
      status,
      currency: quote.currency,
      quoteNumber: quote.quote_number,
      notes: quote.notes,
      createdAt: quote.created_at,
      updatedAt: quote.updated_at,
      currentVersionId: quote.current_version_id,
      totalVersions: versionCounts.get(quote.id) ?? 0,
      negotiationCount: negotiationCounts.get(quote.id) ?? 0,
      historyCount: (versionCounts.get(quote.id) ?? 0) + (negotiationCounts.get(quote.id) ?? 0) + (communicationCounts.get(quote.id) ?? 0),
      hasAcceptedContract,
      nextStep: getNextStep({ status, hasAcceptedContract, leadId: quote.lead_id, quoteId: quote.id }),
      contract: contractByQuoteId.get(quote.id) ?? null,
      lastNegotiationMessage: quoteNegotiations.sort((a, b) => Date.parse(b.created_at ?? '') - Date.parse(a.created_at ?? ''))[0]?.message ?? null,
    };
  }).sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));

  const selectedItem = items.find((item) => item.id === selectedQuoteId) ?? items[0] ?? null;
  const selectedHistory = selectedItem ? buildHistory(selectedItem.id, versions, negotiations, communications) : [];
  const activeStatuses = new Set(['draft', 'review', 'review_requested', 'pending_approval', 'approved', 'sent', 'negotiating']);
  const acceptedQuotes = items.filter((item) => item.status === 'accepted').length;

  return {
    items,
    selectedItem,
    selectedHistory,
    summary: {
      totalQuotes: items.length,
      activeQuotes: items.filter((item) => activeStatuses.has(item.status)).length,
      acceptedQuotes,
      contractReadyQuotes: items.filter((item) => item.hasAcceptedContract || item.status === 'accepted').length,
    },
  };
}
