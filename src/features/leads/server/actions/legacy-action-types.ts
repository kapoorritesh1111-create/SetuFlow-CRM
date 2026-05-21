import type { parseLeadWorkflow } from "@/lib/lead-workflow";

export type ExistingLeadSnapshot = {
  id: string;
  company_name: string;
  lead_type?: string | null;
  stage_id: string | null;
  trade_event_id: string | null;
  next_follow_up_at: string | null;
  notes: string | null;
  source_label?: string | null;
  country_id?: string | null;
};

export type LeadWorkflowSnapshot = ReturnType<typeof parseLeadWorkflow>;

export type ActivityPayload = {
  organization_id: string;
  lead_id: string;
  actor_user_id: string | null;
  kind: string;
  message: string;
};

export type CommunicationPayload = {
  organization_id: string;
  lead_id: string;
  quote_id?: string | null;
  rfq_id?: string | null;
  related_entity?: 'lead' | 'quote' | 'rfq' | 'trade_event_entry' | 'other';
  related_id?: string | null;
  communication_type?: 'introduction' | 'follow_up' | 'quote_message' | 'compliance_request' | 'system_note' | 'other';
  direction?: 'inbound' | 'outbound' | 'internal';
  channel?: 'email' | 'phone' | 'whatsapp' | 'linkedin' | 'trade_show' | 'meeting' | 'system' | 'other';
  subject?: string | null;
  body?: string | null;
  summary?: string | null;
  draft_source?: 'manual' | 'ai' | 'imported' | 'system';
  status?: 'draft' | 'approved' | 'sent' | 'received' | 'failed' | 'cancelled';
  sent_at?: string | null;
  scheduled_at?: string | null;
  approved_at?: string | null;
  approved_by?: string | null;
  created_by?: string | null;
  provider_payload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

export type LeadSummary = {
  id: string;
  company_name: string;
};
