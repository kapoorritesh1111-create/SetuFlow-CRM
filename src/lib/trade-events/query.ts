import { hasSupabaseEnv } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';

export type TradeCommandEvent = {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  starts_on: string | null;
  ends_on: string | null;
  notes: string | null;
  booth_number: string | null;
  capture_defaults: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
  organization_id: string;
};

export type TradeCommandEntry = {
  id: string;
  trade_event_id: string | null;
  captured_company_name: string | null;
  captured_contact_name: string | null;
  captured_email: string | null;
  captured_phone: string | null;
  captured_country: string | null;
  captured_notes: string | null;
  source_label: string | null;
  source_scan_ref: string | null;
  status: string | null;
  assigned_user_id: string | null;
  converted_lead_id: string | null;
  normalized_payload: Record<string, unknown> | null;
  raw_payload: Record<string, unknown> | null;
  captured_at: string | null;
  qualified_at: string | null;
  converted_at: string | null;
  created_at: string | null;
};

export type TradeCommandLead = {
  id: string;
  company_name: string;
  contact_name: string | null;
  lead_type: string | null;
  trade_event_id: string | null;
  source_type: string | null;
  source_label: string | null;
  stage_id: string | null;
  owner_user_id: string | null;
  next_follow_up_at: string | null;
  deal_value: number | null;
  deal_currency: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type TradeCommandTask = {
  id: string;
  lead_id: string | null;
  scheduled_for: string | null;
  status: string | null;
  task_type: string | null;
  payload: Record<string, unknown> | null;
  completed_at: string | null;
};

export type TradeEventsCommandCenterData = {
  queryIssues: string[];
  events: TradeCommandEvent[];
  entries: TradeCommandEntry[];
  leads: TradeCommandLead[];
  tasks: TradeCommandTask[];
};

function rows<T>(value: T[] | null | undefined) {
  return value ?? [];
}

function addIssue(issues: string[], scope: string, error: { message?: string } | null | undefined) {
  if (!error?.message) return;
  console.error(`[trade-events:${scope}]`, error.message);
  issues.push(`${scope}: A live event query could not complete. Refresh or use the linked CRM workspace.`);
}

export async function getTradeEventsCommandCenterData(organizationId: string): Promise<TradeEventsCommandCenterData> {
  if (!hasSupabaseEnv) return { queryIssues: [], events: [], entries: [], leads: [], tasks: [] };

  const supabase = await createClient();
  const db = supabase as any;
  const issues: string[] = [];
  const [eventsResult, entriesResult, leadsResult] = await Promise.all([
    db
      .from('trade_events')
      .select('id, name, city, country, starts_on, ends_on, notes, booth_number, capture_defaults, created_at, updated_at, organization_id')
      .eq('organization_id', organizationId)
      .order('starts_on', { ascending: true, nullsFirst: false }),
    db
      .from('trade_event_entries')
      .select('id, trade_event_id, captured_company_name, captured_contact_name, captured_email, captured_phone, captured_country, captured_notes, source_label, source_scan_ref, status, assigned_user_id, converted_lead_id, normalized_payload, raw_payload, captured_at, qualified_at, converted_at, created_at')
      .eq('organization_id', organizationId)
      .order('captured_at', { ascending: false, nullsFirst: false })
      .limit(240),
    db
      .from('leads')
      .select('id, company_name, contact_name, lead_type, trade_event_id, source_type, source_label, stage_id, owner_user_id, next_follow_up_at, deal_value, deal_currency, created_at, updated_at')
      .eq('organization_id', organizationId)
      .not('trade_event_id', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(400),
  ]);

  addIssue(issues, 'events', eventsResult.error);
  addIssue(issues, 'entries', entriesResult.error);
  addIssue(issues, 'event leads', leadsResult.error);

  const leads = rows(leadsResult.data) as TradeCommandLead[];
  const leadIds = leads.map((lead) => lead.id).filter(Boolean);
  let tasks: TradeCommandTask[] = [];
  if (leadIds.length) {
    const tasksResult = await db
      .from('scheduled_tasks')
      .select('id, lead_id, scheduled_for, status, task_type, payload, completed_at')
      .eq('organization_id', organizationId)
      .in('lead_id', leadIds)
      .order('scheduled_for', { ascending: true })
      .limit(400);
    addIssue(issues, 'event tasks', tasksResult.error);
    tasks = rows(tasksResult.data) as TradeCommandTask[];
  }

  return {
    queryIssues: issues,
    events: rows(eventsResult.data) as TradeCommandEvent[],
    entries: rows(entriesResult.data) as TradeCommandEntry[],
    leads,
    tasks,
  };
}
