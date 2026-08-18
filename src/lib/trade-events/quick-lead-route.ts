export type TradeEventQuickLeadRouteOptions = {
  eventId?: string | null;
  eventName?: string | null;
  mode?: 'buyers' | 'suppliers' | null;
  dictate?: boolean;
};

export function buildTradeEventQuickLeadHref({
  eventId,
  eventName,
  mode,
  dictate = false,
}: TradeEventQuickLeadRouteOptions) {
  const params = new URLSearchParams();
  params.set('quickLead', '1');
  params.set('sourceType', 'trade_show');
  if (eventName) params.set('sourceLabel', eventName);
  if (eventId) params.set('eventId', eventId);
  if (mode) params.set('mode', mode);
  if (dictate) params.set('dictate', '1');
  return `/leads?${params.toString()}`;
}
