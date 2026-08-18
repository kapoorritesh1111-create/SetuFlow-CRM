import type { CommandCenterEvent } from './command-center';
import type { TradeCommandLead, TradeCommandOrder, TradeCommandQuote } from './query';

export type EventSpend = { currency: string; booth: number; registration: number; travel: number; hotel: number; collateral: number; misc: number };

const objectValue = (value: unknown) => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const amount = (value: unknown) => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;

export function readEventSpend(event: CommandCenterEvent): EventSpend {
  const defaults = objectValue(event.capture_defaults);
  const spend = objectValue(defaults.event_spend);
  return {
    currency: typeof spend.currency === 'string' && spend.currency.trim() ? spend.currency.trim().toUpperCase() : 'INR',
    booth: amount(spend.booth), registration: amount(spend.registration), travel: amount(spend.travel), hotel: amount(spend.hotel), collateral: amount(spend.collateral), misc: amount(spend.misc),
  };
}

export function totalEventSpend(spend: EventSpend) {
  return spend.booth + spend.registration + spend.travel + spend.hotel + spend.collateral + spend.misc;
}

export function money(value: number, currency: string) {
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value); } catch { return `${currency} ${Math.round(value).toLocaleString()}`; }
}

export function buildEventOutcome(event: CommandCenterEvent, leads: TradeCommandLead[], quotes: TradeCommandQuote[], orders: TradeCommandOrder[]) {
  const leadIds = new Set(leads.map((lead) => lead.id));
  const eventQuotes = quotes.filter((quote) => Boolean(quote.lead_id && leadIds.has(quote.lead_id)));
  const eventOrders = orders.filter((order) => Boolean(order.lead_id && leadIds.has(order.lead_id)));
  const pipelineRows = leads.filter((lead) => Number(lead.deal_value ?? 0) > 0);
  const pipelineCurrencies = new Set(pipelineRows.map((lead) => lead.deal_currency || 'USD'));
  const pipelineValue = pipelineRows.reduce((sum, lead) => sum + Number(lead.deal_value ?? 0), 0);
  const revenueRows = eventOrders.filter((order) => Number(order.total_order_value ?? 0) > 0 && !['cancelled', 'rejected'].includes(String(order.status ?? '').toLowerCase()));
  const revenueCurrencies = new Set(revenueRows.map((order) => order.currency || 'USD'));
  const wonRevenue = revenueRows.reduce((sum, order) => sum + Number(order.total_order_value ?? 0), 0);
  const spend = readEventSpend(event);
  const spendTotal = totalEventSpend(spend);
  const revenueCurrency = revenueCurrencies.size === 1 ? Array.from(revenueCurrencies)[0] : null;
  const pipelineCurrency = pipelineCurrencies.size === 1 ? Array.from(pipelineCurrencies)[0] : null;
  const roiMultiple = spendTotal > 0 && revenueCurrency === spend.currency ? wonRevenue / spendTotal : null;
  return {
    quoteCount: eventQuotes.length,
    acceptedQuotes: eventQuotes.filter((quote) => String(quote.status ?? '').toLowerCase() === 'accepted').length,
    orderCount: eventOrders.length,
    pipelineValue,
    pipelineCurrency,
    wonRevenue,
    revenueCurrency,
    spend,
    spendTotal,
    roiMultiple,
  };
}
