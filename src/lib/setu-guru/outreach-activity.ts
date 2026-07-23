import { createClient } from '@/lib/supabase/server';
import type { OutreachDraft, OutreachGoal } from '@/lib/setu-guru/outreach-generator';

const GOAL_TO_COMMUNICATION_TYPE: Record<OutreachGoal, string> = {
  send_catalog: 'introduction',
  book_meeting: 'introduction',
  follow_up_quote: 'follow_up',
  request_supplier_pricing: 'other',
};

export type SavedOutreachDraft = {
  id: string;
  status: string;
  draft_source: string;
  created_at: string;
};

/**
 * Persists a Setu Guru draft as a CRM activity so it is auditable. The row is
 * always written with status 'draft' and draft_source 'ai' — approving or
 * sending the message is a separate, user-initiated CRM action outside this
 * function's scope.
 */
export async function saveOutreachDraftAsActivity(orgId: string, draft: OutreachDraft): Promise<SavedOutreachDraft> {
  const supabase = await createClient();
  const client = supabase as any;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const payload = {
    organization_id: orgId,
    lead_id: draft.leadId,
    related_entity: 'lead',
    related_id: draft.leadId,
    communication_type: GOAL_TO_COMMUNICATION_TYPE[draft.goal],
    direction: 'outbound',
    channel: draft.channel,
    subject: draft.subject,
    body: draft.body,
    summary: `Setu Guru draft: ${draft.goal.replace(/_/g, ' ')} via ${draft.channel}.`,
    draft_source: 'ai',
    status: 'draft',
    created_by: user?.id ?? null,
    metadata: { products_referenced: draft.productsReferenced, used_facts: draft.usedFacts, tone: draft.tone },
  };

  const { data, error } = await client
    .from('communications')
    .insert(payload)
    .select('id,status,draft_source,created_at')
    .single();

  if (error) throw error;
  return data as SavedOutreachDraft;
}
