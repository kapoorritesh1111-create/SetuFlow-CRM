import { parseNotesMetadata, composeNotesMetadata } from '@/lib/notes-metadata';
import type { ApprovalMeta } from '@/lib/approvalRouting';
import { getQuoteApprovalState } from '@/lib/approvalRouting';

export const QUOTE_STATUSES = [
  'draft',
  'internal_review',
  'pending_approval',
  'approved',
  'sent',
  'revised',
  'accepted',
  'rejected',
  'expired',
] as const;

export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export type QuoteWorkflowMeta = {
  templateId?: string | null;
  pricingBasis?: 'ex_factory' | 'fob' | 'cif' | null;
  approval?: ApprovalMeta;
  sentAt?: string | null;
  revisedAt?: string | null;
};

export function parseQuoteWorkflow(notes: string | null | undefined) {
  return parseNotesMetadata<QuoteWorkflowMeta>(notes);
}

export function serializeQuoteWorkflow(plainNotes: string | null | undefined, meta: QuoteWorkflowMeta) {
  return composeNotesMetadata(plainNotes, meta);
}

export function computeQuoteTotals(
  lineItems: Array<{ quantity: number; unit_price?: number | null }>,
  currency: string | null | undefined,
) {
  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * (item.unit_price ?? 0), 0);
  return {
    currency: currency ?? 'USD',
    subtotal,
    lineItemCount: lineItems.length,
  };
}

export function getQuoteWorkflowStatus(
  quote: { status: string; notes?: string | null },
  approval?: ApprovalMeta | null,
): QuoteStatus {
  if (QUOTE_STATUSES.includes(quote.status as QuoteStatus)) return quote.status as QuoteStatus;
  return getQuoteApprovalState(approval) === 'pending' ? 'pending_approval' : 'draft';
}

export function getQuoteStatusBadgeClasses(status: QuoteStatus) {
  switch (status) {
    case 'accepted':
    case 'approved':
      return 'bg-emerald-100 text-emerald-700';
    case 'pending_approval':
    case 'internal_review':
    case 'revised':
      return 'bg-amber-100 text-amber-800';
    case 'rejected':
    case 'expired':
      return 'bg-rose-100 text-rose-700';
    case 'sent':
      return 'bg-sky-100 text-sky-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}
