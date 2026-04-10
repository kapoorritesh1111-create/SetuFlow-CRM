export const APPROVAL_STATES = ['not_required', 'pending', 'approved', 'rejected'] as const;
export type ApprovalState = (typeof APPROVAL_STATES)[number];

export type ApprovalMeta = {
  required: boolean;
  state: ApprovalState;
  actorName?: string | null;
  actedAt?: string | null;
};

export function getQuoteApprovalState(approval?: Partial<ApprovalMeta> | null): ApprovalState {
  if (!approval?.required) return 'not_required';
  if (approval.state === 'approved') return 'approved';
  if (approval.state === 'rejected') return 'rejected';
  return 'pending';
}

export function getApprovalBadgeClasses(state: ApprovalState) {
  switch (state) {
    case 'approved':
      return 'bg-emerald-100 text-emerald-700';
    case 'rejected':
      return 'bg-rose-100 text-rose-700';
    case 'pending':
      return 'bg-amber-100 text-amber-800';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}
