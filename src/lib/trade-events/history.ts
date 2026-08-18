import { buildEventOutcome } from './analytics';
import { entryProductInterest, getTradeEventStatus } from './command-center';
import { collapseTradeEventDuplicates } from './dedupe';
import type { TradeEventsCommandCenterData } from './query';

export function buildTradeEventHistoryRows(data: TradeEventsCommandCenterData) {
  return collapseTradeEventDuplicates(data.events)
    .filter((group) => getTradeEventStatus(group.event) === 'completed')
    .map((group) => {
      const ids = [group.event, ...group.duplicates].map((event) => String(event.id));
      const entries = data.entries.filter((entry) => ids.includes(String(entry.trade_event_id ?? '')));
      const leads = data.leads.filter((lead) => ids.includes(String(lead.trade_event_id ?? '')) || (lead.event_influence_ids ?? []).some((id) => ids.includes(String(id))));
      const leadIds = new Set(leads.map((lead) => lead.id));
      const quotes = data.quotes.filter((quote) => Boolean(quote.lead_id && leadIds.has(quote.lead_id)));
      const orders = data.orders.filter((order) => Boolean(order.lead_id && leadIds.has(order.lead_id)));
      const converted = new Set(entries.map((entry) => entry.converted_lead_id).filter(Boolean));
      const directLeads = leads.filter((lead) => !converted.has(lead.id));
      return {
        event: group.event,
        captured: entries.length + directLeads.length,
        qualified: entries.filter((entry) => Boolean(entryProductInterest(entry))).length + directLeads.length,
        outcome: buildEventOutcome(group.event, leads, quotes, orders),
      };
    });
}
