import { hasSupabaseEnv } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';

export type TradeCommandEvent = { id: string; name: string; city: string | null; country: string | null; starts_on: string | null; ends_on: string | null; notes: string | null; booth_number: string | null; capture_defaults: Record<string, unknown> | null; created_at: string | null; updated_at: string | null; organization_id: string };
export type TradeCommandEntry = { id: string; trade_event_id: string | null; captured_company_name: string | null; captured_contact_name: string | null; captured_email: string | null; captured_phone: string | null; captured_country: string | null; captured_notes: string | null; source_label: string | null; source_scan_ref: string | null; status: string | null; assigned_user_id: string | null; converted_lead_id: string | null; normalized_payload: Record<string, unknown> | null; raw_payload: Record<string, unknown> | null; captured_at: string | null; qualified_at: string | null; converted_at: string | null; created_at: string | null };
export type TradeCommandLead = { id: string; company_name: string; contact_name: string | null; lead_type: string | null; trade_event_id: string | null; source_type: string | null; source_label: string | null; stage_id: string | null; owner_user_id: string | null; next_follow_up_at: string | null; deal_value: number | null; deal_currency: string | null; created_at: string | null; updated_at: string | null; event_influence_ids?: string[] };
export type TradeCommandTask = { id: string; lead_id: string | null; scheduled_for: string | null; status: string | null; task_type: string | null; payload: Record<string, unknown> | null; completed_at: string | null };
export type TradeCommandQuote = { id: string; lead_id: string | null; status: string | null; currency: string | null; created_at: string | null };
export type TradeCommandOrder = { id: string; lead_id: string | null; status: string | null; currency: string | null; total_order_value: number | null; created_at: string | null };
export type TradeEventsCommandCenterData = { queryIssues: string[]; events: TradeCommandEvent[]; entries: TradeCommandEntry[]; leads: TradeCommandLead[]; tasks: TradeCommandTask[]; quotes: TradeCommandQuote[]; orders: TradeCommandOrder[] };

const leadSelect = 'id, company_name, contact_name, lead_type, trade_event_id, source_type, source_label, stage_id, owner_user_id, next_follow_up_at, deal_value, deal_currency, created_at, updated_at';
const rows = <T,>(value: T[] | null | undefined) => value ?? [];
function addIssue(issues: string[], scope: string, error: { message?: string } | null | undefined) { if (!error?.message) return; console.error(`[trade-events:${scope}]`, error.message); issues.push(`${scope}: A live event query could not complete. Refresh or use the linked CRM workspace.`); }

export async function getTradeEventsCommandCenterData(organizationId: string): Promise<TradeEventsCommandCenterData> {
  if (!hasSupabaseEnv) return { queryIssues: [], events: [], entries: [], leads: [], tasks: [], quotes: [], orders: [] };
  const db: any = await createClient();
  const issues: string[] = [];
  const [eventsResult, entriesResult, directLeadsResult] = await Promise.all([
    db.from('trade_events').select('id, name, city, country, starts_on, ends_on, notes, booth_number, capture_defaults, created_at, updated_at, organization_id').eq('organization_id', organizationId).order('starts_on', { ascending: true, nullsFirst: false }),
    db.from('trade_event_entries').select('id, trade_event_id, captured_company_name, captured_contact_name, captured_email, captured_phone, captured_country, captured_notes, source_label, source_scan_ref, status, assigned_user_id, converted_lead_id, normalized_payload, raw_payload, captured_at, qualified_at, converted_at, created_at').eq('organization_id', organizationId).order('captured_at', { ascending: false, nullsFirst: false }).limit(400),
    db.from('leads').select(leadSelect).eq('organization_id', organizationId).not('trade_event_id', 'is', null).order('updated_at', { ascending: false }).limit(500),
  ]);
  addIssue(issues, 'events', eventsResult.error); addIssue(issues, 'entries', entriesResult.error); addIssue(issues, 'event leads', directLeadsResult.error);

  const entries = rows(entriesResult.data) as TradeCommandEntry[];
  const influenceByLead = new Map<string, Set<string>>();
  for (const entry of entries) {
    if (!entry.converted_lead_id || !entry.trade_event_id) continue;
    const set = influenceByLead.get(entry.converted_lead_id) ?? new Set<string>(); set.add(entry.trade_event_id); influenceByLead.set(entry.converted_lead_id, set);
  }
  const directLeads = rows(directLeadsResult.data) as TradeCommandLead[];
  const directIds = new Set(directLeads.map((lead) => lead.id));
  const influencedOnlyIds = Array.from(influenceByLead.keys()).filter((id) => !directIds.has(id));
  let influencedOnly: TradeCommandLead[] = [];
  if (influencedOnlyIds.length) {
    const result = await db.from('leads').select(leadSelect).eq('organization_id', organizationId).in('id', influencedOnlyIds).limit(500);
    addIssue(issues, 'event-influenced leads', result.error); influencedOnly = rows(result.data) as TradeCommandLead[];
  }
  const leads = [...directLeads, ...influencedOnly].map((lead) => ({ ...lead, event_influence_ids: Array.from(influenceByLead.get(lead.id) ?? []) }));

  const leadIds = leads.map((lead) => lead.id).filter(Boolean);
  let tasks: TradeCommandTask[] = [];
  let quotes: TradeCommandQuote[] = [];
  let orders: TradeCommandOrder[] = [];
  if (leadIds.length) {
    const [taskResult, quoteResult, orderResult] = await Promise.all([
      db.from('scheduled_tasks').select('id, lead_id, scheduled_for, status, task_type, payload, completed_at').eq('organization_id', organizationId).in('lead_id', leadIds).order('scheduled_for', { ascending: true }).limit(500),
      db.from('quotes').select('id, lead_id, status, currency, created_at').eq('organization_id', organizationId).in('lead_id', leadIds).order('created_at', { ascending: false }).limit(500),
      db.from('orders').select('id, lead_id, status, currency, total_order_value, created_at').eq('organization_id', organizationId).in('lead_id', leadIds).order('created_at', { ascending: false }).limit(500),
    ]);
    addIssue(issues, 'event tasks', taskResult.error); addIssue(issues, 'event quotes', quoteResult.error); addIssue(issues, 'event orders', orderResult.error);
    tasks = rows(taskResult.data) as TradeCommandTask[]; quotes = rows(quoteResult.data) as TradeCommandQuote[]; orders = rows(orderResult.data) as TradeCommandOrder[];
  }

  return { queryIssues: issues, events: rows(eventsResult.data) as TradeCommandEvent[], entries, leads, tasks, quotes, orders };
}
