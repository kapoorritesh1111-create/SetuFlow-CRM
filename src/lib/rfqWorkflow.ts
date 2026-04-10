import { parseNotesMetadata, composeNotesMetadata } from '@/lib/notes-metadata';
import type { SupplierResponse } from '@/lib/supplierResponse';
import { getSupplierResponseState } from '@/lib/supplierResponse';

export const RFQ_STATUSES = [
  'draft',
  'submitted',
  'under_review',
  'sent_to_suppliers',
  'supplier_responses_pending',
  'partially_responded',
  'fully_responded',
  'closed',
  'cancelled',
] as const;

export type RfqStatus = (typeof RFQ_STATUSES)[number];

export type RfqWorkflowMeta = {
  title?: string;
  requestSummary?: string;
  neededBy?: string | null;
  buyerSubmittedAt?: string | null;
  sentToSuppliersAt?: string | null;
  linkedLeadLabel?: string | null;
  supplierResponses?: SupplierResponse[];
};

export function parseRfqWorkflow(notes: string | null | undefined) {
  return parseNotesMetadata<RfqWorkflowMeta>(notes);
}

export function serializeRfqWorkflow(plainNotes: string | null | undefined, meta: RfqWorkflowMeta) {
  return composeNotesMetadata(plainNotes, meta);
}

export function computeRFQStatus(
  rfq: { status: string; notes?: string | null; updated_at?: string | null },
  supplierResponses: SupplierResponse[] = [],
): RfqStatus {
  if (RFQ_STATUSES.includes(rfq.status as RfqStatus)) {
    return rfq.status as RfqStatus;
  }

  const states = supplierResponses.map(getSupplierResponseState);
  const responded = states.filter((state) => state === 'responded').length;
  if (responded && responded === supplierResponses.length) return 'fully_responded';
  if (responded > 0) return 'partially_responded';
  if (states.some((state) => state === 'requested' || state === 'viewed' || state === 'overdue')) {
    return 'supplier_responses_pending';
  }
  return 'draft';
}

export function getRfqStatusBadgeClasses(status: RfqStatus) {
  switch (status) {
    case 'fully_responded':
    case 'closed':
      return 'bg-emerald-100 text-emerald-700';
    case 'partially_responded':
    case 'under_review':
      return 'bg-amber-100 text-amber-800';
    case 'cancelled':
      return 'bg-rose-100 text-rose-700';
    case 'sent_to_suppliers':
    case 'supplier_responses_pending':
    case 'submitted':
      return 'bg-sky-100 text-sky-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}
