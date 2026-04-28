import type { QuoteHistoryItem, QuoteWorkspaceListItem, QuotesWorkspaceViewModel } from '@/features/quotes/types/workspace';
import { PRODUCT_ROUTES } from '@/lib/product-contract';
import { buildApprovalSendHref, buildLeadQuoteHref, buildLeadWorkflowHref, buildOrdersHref } from '@/lib/workflow/handoffs';
import { getQuoteFxLockFromNotes } from '@/lib/quote-fx';

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
type QuoteLineItemRow = {
  id: string;
  quote_id: string | null;
  product_id: string | null;
  quantity: number | string | null;
  unit_price: number | string | null;
  currency: string | null;
  catalog_price_amount: number | string | null;
  catalog_price_currency: string | null;
  is_price_overridden: boolean | null;
  override_reason: string | null;
  notes: string | null;
};
type ProductRow = { id: string; name: string | null; sku: string | null; catalogPriceAmount?: number | string | null; catalogPriceCurrency?: string | null };
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

function numberOrNull(value: number | string | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
function positiveNumberOrNull(value: number | string | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function buildHistory(quoteId: string, versions: QuoteVersionRow[], negotiations: NegotiationRow[], communications: CommunicationRow[]): QuoteHistoryItem[] {
  const versionHistory = versions
    .filter((row) => row.quote_id === quoteId)
    .map((row) => ({
      id: `version-${row.id}`,
      label: `Version ${row.version_no ?? 'draft'}`,
      detail: `Status changed to ${row.status ?? 'unknown'}${row.sent_at ? ' · sent' : row.approved_at ? ' · approved' : ''}`,
      happenedAt: row.sent_at ?? row.approved_at ?? row.created_at,
    }));

  const negotiationHistory = negotiations
    .filter((row) => row.quote_id === quoteId)
    .map((row) => ({
      id: `negotiation-${row.id}`,
      label: row.event_type ? row.event_type.replaceAll('_', ' ') : 'Quote response',
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

function getNextStep({ status, hasAcceptedContract, leadId, quoteId, leadType }: { status: string; hasAcceptedContract: boolean; leadId: string; quoteId: string; leadType?: 'buyer' | 'supplier' | 'mixed' | null }) {
  const mode = leadType === 'buyer' ? 'buyers' : leadType === 'supplier' ? 'suppliers' : null;
  if (hasAcceptedContract || status === 'accepted') {
    return { label: 'Open order handoff', detail: 'The quote is accepted. Keep the locked commercial record visible in Orders.', href: buildOrdersHref({ notice: 'quote-accepted', quoteId, leadId, handoff: 'quote-to-orders' }, mode), tone: 'orders' as const };
  }
  if (status === 'pending_approval') {
    return { label: 'Review approval status', detail: 'Approval is the blocker before this quote can be sent.', href: buildApprovalSendHref({ queue: 'approvals', quoteId, leadId, handoff: 'quote-needs-approval' }, mode), tone: 'approval' as const };
  }
  if (status === 'approved') {
    return { label: 'Send quote', detail: 'Approval is complete. Send the selected version and keep the activity trail visible.', href: buildApprovalSendHref({ queue: 'send', quoteId, leadId, handoff: 'quote-ready-to-send' }, mode), tone: 'approval' as const };
  }
  if (status === 'sent' || status === 'negotiating') {
    return { label: 'Track customer response', detail: 'The quote is live. Continue follow-up from the lead workspace.', href: buildLeadWorkflowHref(leadId, mode, { quoteId, handoff: 'quote-live-follow-up' }), tone: 'follow_up' as const };
  }
  if (status === 'rejected' || status === 'expired') {
    return { label: 'Revise or close', detail: 'This quote needs a fresh decision before more commercial movement.', href: buildLeadWorkflowHref(leadId, mode, { quoteId, handoff: 'quote-requalify' }), tone: 'follow_up' as const };
  }
  return { label: 'Continue quote build', detail: 'Finish pricing, terms, and readiness before approval or sending.', href: buildLeadQuoteHref(leadId, quoteId, mode, { handoff: 'quote-build' }), tone: 'quote' as const };
}

export function buildQuotesPageViewModel({ quotes, leads, versions, negotiations, communications, contracts, lineItems = [], products = [], selectedQuoteId }: {
  quotes: QuoteRow[];
  leads: LeadRow[];
  versions: QuoteVersionRow[];
  negotiations: NegotiationRow[];
  communications: CommunicationRow[];
  contracts: ContractRow[];
  lineItems?: QuoteLineItemRow[];
  products?: ProductRow[];
  selectedQuoteId: string | null;
}): QuotesWorkspaceViewModel {
  const leadMap = new Map(leads.map((lead) => [lead.id, lead]));
  const productMap = new Map(products.map((product) => [product.id, product]));
  const lineItemsByQuote = new Map<string, QuoteLineItemRow[]>();
  const versionCounts = new Map<string, number>();
  const negotiationCounts = new Map<string, number>();
  const communicationCounts = new Map<string, number>();
  const latestApprovedAt = new Map<string, string>();
  const latestSentAt = new Map<string, string>();
  const contractByQuoteId = new Map(contracts.filter((row) => row.quote_id).map((row) => [String(row.quote_id), row]));
  const contractQuoteIds = new Set(contractByQuoteId.keys());

  for (const row of lineItems) {
    if (!row.quote_id) continue;
    const next = lineItemsByQuote.get(row.quote_id) ?? [];
    next.push(row);
    lineItemsByQuote.set(row.quote_id, next);
  }
  for (const row of versions) {
    if (!row.quote_id) continue;
    versionCounts.set(row.quote_id, (versionCounts.get(row.quote_id) ?? 0) + 1);
    if (row.approved_at && (!latestApprovedAt.get(row.quote_id) || Date.parse(row.approved_at) > Date.parse(latestApprovedAt.get(row.quote_id) ?? ''))) latestApprovedAt.set(row.quote_id, row.approved_at);
    if (row.sent_at && (!latestSentAt.get(row.quote_id) || Date.parse(row.sent_at) > Date.parse(latestSentAt.get(row.quote_id) ?? ''))) latestSentAt.set(row.quote_id, row.sent_at);
  }
  for (const row of negotiations) negotiationCounts.set(row.quote_id, (negotiationCounts.get(row.quote_id) ?? 0) + 1);
  for (const row of communications) if (row.quote_id) communicationCounts.set(row.quote_id, (communicationCounts.get(row.quote_id) ?? 0) + 1);

  const items: QuoteWorkspaceListItem[] = quotes.map((quote) => {
    const lead = leadMap.get(quote.lead_id);
    const quoteNegotiations = negotiations.filter((row) => row.quote_id === quote.id);
    const leadType: QuoteWorkspaceListItem['leadType'] = lead?.lead_type === 'buyer' || lead?.lead_type === 'supplier' ? lead.lead_type : 'mixed';
    const status = lower(quote.status) || 'draft';
    const hasAcceptedContract = contractQuoteIds.has(quote.id);
    const fx = getQuoteFxLockFromNotes(quote.notes);
    const quoteLines = (lineItemsByQuote.get(quote.id) ?? []).map((line, index) => {
      const product = line.product_id ? productMap.get(line.product_id) : null;
      const quantity = numberOrNull(line.quantity) ?? 0;
      const catalogPriceAmount = positiveNumberOrNull(line.catalog_price_amount) ?? positiveNumberOrNull((product as ProductRow | null | undefined)?.catalogPriceAmount);
      const unitPrice = positiveNumberOrNull(line.unit_price) ?? catalogPriceAmount ?? numberOrNull(line.unit_price);
      const lineCurrency = unitPrice === catalogPriceAmount && catalogPriceAmount != null
        ? (line.catalog_price_currency ?? (product as ProductRow | null | undefined)?.catalogPriceCurrency ?? line.currency ?? quote.currency)
        : (line.currency ?? quote.currency);
      return {
        id: line.id,
        quoteId: quote.id,
        productId: line.product_id,
        productName: product?.name ?? product?.sku ?? line.notes ?? `Line ${index + 1}`,
        quantity,
        unitPrice,
        currency: lineCurrency,
        catalogPriceAmount,
        catalogPriceCurrency: line.catalog_price_currency ?? (product as ProductRow | null | undefined)?.catalogPriceCurrency ?? null,
        isPriceOverridden: Boolean(line.is_price_overridden),
        overrideReason: line.override_reason,
        notes: line.notes,
      };
    });
    const subtotal = quoteLines.reduce((sum, line) => sum + line.quantity * (line.unitPrice ?? 0), 0);

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
      nextStep: getNextStep({ status, hasAcceptedContract, leadId: quote.lead_id, quoteId: quote.id, leadType }),
      contract: contractByQuoteId.get(quote.id) ?? null,
      lastNegotiationMessage: quoteNegotiations.sort((a, b) => Date.parse(b.created_at ?? '') - Date.parse(a.created_at ?? ''))[0]?.message ?? null,
      lineItems: quoteLines,
      subtotal,
      fxLock: fx ? { sourceCurrency: fx.source_currency, quoteCurrency: fx.quote_currency, fxRate: fx.fx_rate, fxWeekStart: fx.fx_week_start, fxValidUntil: fx.fx_valid_until, provider: fx.provider, effectiveAt: fx.effective_at } : null,
      hasPriceOverride: quoteLines.some((line) => line.isPriceOverridden),
      latestApprovedAt: latestApprovedAt.get(quote.id) ?? null,
      latestSentAt: latestSentAt.get(quote.id) ?? null,
    };
  }).sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));

  const selectedItem = items.find((item) => item.id === selectedQuoteId) ?? items[0] ?? null;
  const selectedHistory = selectedItem ? buildHistory(selectedItem.id, versions, negotiations, communications) : [];
  const activeStatuses = new Set(['draft', 'review', 'internal_review', 'revised', 'pending_approval', 'approved', 'sent', 'negotiating']);

  return {
    items,
    selectedItem,
    selectedHistory,
    summary: {
      totalQuotes: items.length,
      activeQuotes: items.filter((item) => activeStatuses.has(item.status)).length,
      acceptedQuotes: items.filter((item) => item.status === 'accepted').length,
      contractReadyQuotes: items.filter((item) => item.hasAcceptedContract || item.status === 'accepted').length,
    },
  };
}
