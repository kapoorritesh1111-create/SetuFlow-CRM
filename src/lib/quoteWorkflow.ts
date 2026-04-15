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

/**
 * Sprint 5 Batch 1 — lock-state enforcement.
 *
 * Returns true when a quote has reached a terminal or customer-facing
 * status that should prevent further commercial edits. Locked quotes
 * may still be read and used for audit or context, but the workflow
 * action buttons and the updateQuoteWorkflow server action should both
 * refuse mutations unless an explicit revision path is opened (Sprint
 * 5 later batch).
 *
 * Statuses that lock:
 *  - sent      — quote is now customer-facing; edits must be deliberate
 *  - accepted  — commercial outcome is closed
 *  - rejected  — commercial outcome is closed
 *  - expired   — quote validity window has passed
 */
export function isQuoteLocked(status: QuoteStatus | string): boolean {
  return ['sent', 'accepted', 'rejected', 'expired'].includes(status);
}

/**
 * Returns a human-readable lock reason for display in the fast lane
 * banner and any server-side error messages.
 */
export function getQuoteLockReason(status: QuoteStatus | string): string {
  switch (status) {
    case 'sent':
      return 'This quote is customer-facing. Open the full editor to record a revision or outcome.';
    case 'accepted':
      return 'This quote has been accepted. The commercial record is now closed.';
    case 'rejected':
      return 'This quote has been rejected. The commercial record is now closed.';
    case 'expired':
      return 'This quote has expired. Create a new quote or revise this one to continue.';
    default:
      return 'This quote is locked and cannot be edited in its current state.';
  }
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
