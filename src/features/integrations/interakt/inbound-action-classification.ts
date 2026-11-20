export type InboundAction = 'reply_now' | 'reconnect' | 'waiting' | 'review' | 'converted';
export type InboundEvidence = {
  last_inbound_at?: string | null;
  last_outbound_at?: string | null;
  source_provider?: string | null;
  sales_queue_suppressed?: boolean | null;
  browsing_only?: boolean | null;
  qualified_lead_id?: string | null;
  intake_status?: string | null;
  needs_reply?: boolean | null;
};
const CLOSED = new Set(['qualified','duplicate','existing_customer','not_relevant','ignored']);
export function classifyInboundNextAction(row: InboundEvidence, now = Date.now()): InboundAction {
  if (row.qualified_lead_id) return 'converted';
  const status = String(row.intake_status||'').toLowerCase();
  if(row.sales_queue_suppressed || row.browsing_only || CLOSED.has(status)) return 'review';
  const lastInbound = Date.parse(String(row.last_inbound_at||''));
  const lastOutbound = Date.parse(String(row.last_outbound_at||''));
  if (!Number.isFinite(lastInbound) || lastInbound > now || String(row.source_provider||'').toLowerCase()!=='interakt') return 'review';
  if (Number.isFinite(lastOutbound) && lastOutbound >= lastInbound) return 'waiting';
  const elapsed=now-lastInbound;
  return elapsed >=0 && elapsed <24*60*60*1000 ? 'reply_now' : 'reconnect';
}
export function inboundActionLabel(action: InboundAction) {
  switch(action) {
    case 'reply_now':return 'Reply now';
    case 'reconnect':return 'Reconnect · approved template';
    case 'waiting':return 'Waiting for customer';
    case 'converted':return 'Open CRM lead';
    default:return 'Review inquiry';
  }
}

