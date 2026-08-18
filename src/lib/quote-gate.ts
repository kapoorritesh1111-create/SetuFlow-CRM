// S37-BUG-007: single source of truth for quote-gate messaging.
// Every quote-creation / quote-open entry point resolves user-facing copy here.

export type LeadQuoteGateCode =
  | 'LEAD_NOT_FOUND'
  | 'LEAD_DISQUALIFIED'
  | 'NO_PRODUCT_COVERAGE'
  | 'LEAD_COMPANY_NAME_REQUIRED'
  | 'NOT_ORG_MEMBER'
  | 'MISSING_REQUIRED_INPUT'
  | 'QUOTE_NOT_FOUND'
  | 'LOAD_FAILED'
  | 'UNKNOWN';

export const LEAD_QUOTE_GATE_MESSAGES: Record<LeadQuoteGateCode, string> = {
  LEAD_NOT_FOUND: 'This lead is no longer available in your workspace. Refresh and try again.',
  LEAD_DISQUALIFIED: 'This lead is disqualified. Reopen qualification before starting quote work.',
  NO_PRODUCT_COVERAGE: 'Capture at least one product or packaging requirement on this lead before creating a quote.',
  LEAD_COMPANY_NAME_REQUIRED: 'Add the buyer / company name to this lead before creating a quote.',
  NOT_ORG_MEMBER: 'You do not have access to create quotes in this workspace.',
  MISSING_REQUIRED_INPUT: 'Some required lead information is missing, so the quote could not be created.',
  QUOTE_NOT_FOUND: 'That quote could not be found in your workspace.',
  LOAD_FAILED: 'Quote details could not be loaded. Please refresh and try again.',
  UNKNOWN: 'Quote could not be created. Please refresh and try again.',
};

export function leadQuoteGateMessage(code: LeadQuoteGateCode): string {
  return LEAD_QUOTE_GATE_MESSAGES[code] ?? LEAD_QUOTE_GATE_MESSAGES.UNKNOWN;
}

export function mapLeadQuoteRpcErrorToCode(error: any): LeadQuoteGateCode {
  const code = String(error?.code ?? '').trim();
  const msg = String(error?.message ?? '').toLowerCase();
  switch (code) {
    case '42501':
      return 'NOT_ORG_MEMBER';
    case 'P0002':
      return 'LEAD_NOT_FOUND';
    case '22023':
      return 'MISSING_REQUIRED_INPUT';
    case 'P0001':
      if (msg.includes('disqualified')) return 'LEAD_DISQUALIFIED';
      if (msg.includes('company name')) return 'LEAD_COMPANY_NAME_REQUIRED';
      if (msg.includes('product interest') || msg.includes('product requirement') || msg.includes('coverage')) return 'NO_PRODUCT_COVERAGE';
      return 'UNKNOWN';
    default:
      if (msg.includes('could not find the function') || msg.includes('schema cache')) return 'LOAD_FAILED';
      return 'UNKNOWN';
  }
}

export function mapLeadQuoteDraftRpcError(error: any): string {
  const mapped = mapLeadQuoteRpcErrorToCode(error);
  if (mapped === 'UNKNOWN' && String(error?.code ?? '') === 'P0001') {
    const raw = String(error?.message ?? '').trim();
    if (raw) return raw;
  }
  return leadQuoteGateMessage(mapped);
}

export type QuoteApprovalState = 'pending' | 'approved' | 'rejected' | 'none';

export function quoteApprovalBlocker(state: QuoteApprovalState): { code: string; detail: string } | null {
  if (state === 'pending') {
    return { code: 'APPROVAL_PENDING', detail: 'An approval request is still pending for this quote version.' };
  }
  if (state === 'rejected') {
    return { code: 'APPROVAL_REJECTED', detail: 'The most recent approval request for this quote version was rejected. Revise and resubmit before sending.' };
  }
  return null;
}
