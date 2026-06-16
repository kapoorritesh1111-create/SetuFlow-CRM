export type CaptureTermKind = 'product' | 'category';

export type SavedCaptureTerm = {
  kind: CaptureTermKind;
  key: string;
};

export function normalizeCaptureTermKey(term: string) {
  return term.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function buildReusableCaptureTermPayload(input: {
  organizationId: string;
  tradeEventId: string;
  userId: string;
  kind: CaptureTermKind;
  term: string;
  usedAt: string;
}) {
  const key = normalizeCaptureTermKey(input.term);
  if (!key) return null;

  return {
    organization_id: input.organizationId,
    trade_event_id: input.tradeEventId,
    kind: input.kind,
    normalized_key: key,
    display_term: input.term.trim(),
    usage_count: 1,
    last_used_at: input.usedAt,
    created_by: input.userId,
  };
}
