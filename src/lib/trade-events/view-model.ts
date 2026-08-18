import { buildEventOutcome } from './analytics';
import { entryProductInterest, eventEntrySummary, eventReadiness, getTradeEventStatus, selectCommandEvent } from './command-center';
import { collapseTradeEventDuplicates } from './dedupe';
import { buildTradeEventQuickLeadHref } from './quick-lead-route';
import type { TradeEventsCommandCenterData } from './query';

export function formatEventPipeline(leads: Array<{ deal_value: number | null; deal_currency: string | null }>) {
  const valued = leads.filter((lead) => Number(lead.deal_value ?? 0) > 0);
  if (!valued.length) return 'Not linked';
  const currencies = new Set(valued.map((lead) => lead.deal_currency || 'USD'));
  if (currencies.size !== 1) return `${valued.length} valued leads`;
  const currency = Array.from(currencies)[0];
  const total = valued.reduce((sum, lead) => sum + Number(lead.deal_value ?? 0), 0);
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(total);
}

export function buildTradeEventsViewModel(data: TradeEventsCommandCenterData, isTrial: boolean) {
  const groups = collapseTradeEventDuplicates(data.events);
  const events = groups.map((group) => group.event);
  const current = selectCommandEvent(events);
  const group = current ? groups.find((item) => item.event.id === current.id) : null;
  const ids = group ? [group.event, ...group.duplicates].map((event) => String(event.id)) : [];
  const entries = data.entries.filter((entry) => ids.includes(String(entry.trade_event_id ?? '')));
  const leads = data.leads.filter((lead) => ids.includes(String(lead.trade_event_id ?? '')) || (lead.event_influence_ids ?? []).some((id) => ids.includes(String(id))));
  const leadIds = new Set(leads.map((lead) => lead.id));
  const tasks = data.tasks.filter((task) => Boolean(task.lead_id && leadIds.has(task.lead_id)));
  const quotes = data.quotes.filter((quote) => Boolean(quote.lead_id && leadIds.has(quote.lead_id)));
  const orders = data.orders.filter((order) => Boolean(order.lead_id && leadIds.has(order.lead_id)));
  const openTasks = tasks.filter((task) => !['completed', 'cancelled'].includes(String(task.status ?? '').toLowerCase()));
  const entrySummary = eventEntrySummary(entries);
  const convertedIds = new Set(entries.map((entry) => entry.converted_lead_id).filter(Boolean));
  const directLeads = leads.filter((lead) => !convertedIds.has(lead.id));
  const captured = entries.length + directLeads.length;
  const qualified = entries.filter((entry) => Boolean(entryProductInterest(entry))).length + directLeads.length;
  const unassigned = leads.filter((lead) => !lead.owner_user_id).length;
  const noNextAction = leads.filter((lead) => !openTasks.some((task) => task.lead_id === lead.id)).length;
  const meetings = tasks.filter((task) => String(task.task_type ?? '').toLowerCase().includes('meeting')).length;
  const influenced = leads.filter((lead) => (lead.event_influence_ids ?? []).some((id) => ids.includes(String(id)))).length;
  const duplicateCount = groups.reduce((sum, item) => sum + item.duplicates.length, 0);
  const possibleCount = groups.reduce((sum, item) => sum + item.possibleMatches.length, 0);
  const status = current ? getTradeEventStatus(current) : 'unscheduled';
  const readiness = current ? eventReadiness(current) : null;
  const eventId = current?.id ? String(current.id) : '';
  const eventName = current?.name ? String(current.name) : '';
  const trialCaptureHref = eventId ? `/trade-events/capture?eventId=${encodeURIComponent(eventId)}` : '/trade-events/capture';
  const captureHref = isTrial ? trialCaptureHref : buildTradeEventQuickLeadHref({ eventId, eventName });
  const trialJoin = trialCaptureHref.includes('?') ? '&' : '?';
  const scanHref = isTrial ? `${trialCaptureHref}${trialJoin}source=scan` : eventId ? `/contact-exchange/scan?eventId=${encodeURIComponent(eventId)}&sourceType=trade_show&sourceLabel=${encodeURIComponent(eventName)}` : '/contact-exchange/scan?sourceType=trade_show';
  const dictateHref = isTrial ? `${trialCaptureHref}${trialJoin}source=dictate` : buildTradeEventQuickLeadHref({ eventId, eventName, dictate: true });
  const pipeline = formatEventPipeline(leads);
  const outcome = current ? buildEventOutcome(current, leads, quotes, orders) : null;
  return { allData: data, groups, events, current, group, entries, leads, tasks, quotes, orders, openTasks, entrySummary, captured, qualified, unassigned, noNextAction, meetings, influenced, duplicateCount, possibleCount, status, readiness, captureHref, scanHref, dictateHref, pipeline, outcome };
}
