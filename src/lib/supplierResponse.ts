export const SUPPLIER_RESPONSE_STATES = [
  'not_sent',
  'requested',
  'viewed',
  'responded',
  'declined',
  'overdue',
] as const;

export type SupplierResponseState = (typeof SUPPLIER_RESPONSE_STATES)[number];

export type SupplierResponse = {
  id: string;
  supplierName: string;
  status: SupplierResponseState;
  contactedAt: string | null;
  viewedAt: string | null;
  respondedAt: string | null;
  notes: string;
};

export function getSupplierResponseState(response: Partial<SupplierResponse>): SupplierResponseState {
  if (response.status && SUPPLIER_RESPONSE_STATES.includes(response.status as SupplierResponseState)) {
    return response.status as SupplierResponseState;
  }
  if (response.respondedAt) return 'responded';
  if (response.viewedAt) return 'viewed';
  if (response.contactedAt) return 'requested';
  return 'not_sent';
}

export function getSupplierResponseBadgeClasses(status: SupplierResponseState) {
  switch (status) {
    case 'responded':
      return 'bg-emerald-100 text-emerald-700';
    case 'declined':
      return 'bg-rose-100 text-rose-700';
    case 'overdue':
      return 'bg-amber-100 text-amber-800';
    case 'requested':
    case 'viewed':
      return 'bg-sky-100 text-sky-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}
