import { createClient } from '@/lib/supabase/server';
import { checkGovernedDelivery, type GovernedChannel } from '@/lib/setu-guru/governed-delivery';
import { scheduleGrowthFollowUp, cancelGrowthFollowUp } from '@/lib/setu-guru/growth-followups';

/**
 * S48-GROWTH-017: approves and attempts to send a CRM Matches outreach draft saved via
 * /api/setu-guru/crm-matches/outreach. Uses the same governed-delivery check as External
 * Discovery — an honest "not configured" result if no email_outbound/whatsapp_outbound
 * integration is connected, never a fabricated "sent".
 */
export async function sendCrmMatchOutreachDraft(orgId: string, draftId: string, leadId: string) {
  const supabase = await createClient();
  const client = supabase as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Authentication is required.');

  const { data: draft, error: draftError } = await client
    .from('communications')
    .select('id,channel,status')
    .eq('organization_id', orgId)
    .eq('id', draftId)
    .eq('lead_id', leadId)
    .single();
  if (draftError || !draft) throw new Error('Outreach draft was not found.');
  if (draft.status === 'sent') throw new Error('This draft has already been sent.');

  const { data: lead, error: leadError } = await client
    .from('leads')
    .select('id,email,phone,whatsapp_number')
    .eq('organization_id', orgId)
    .eq('id', leadId)
    .single();
  if (leadError || !lead) throw new Error('Lead was not found.');

  const governedChannel = draft.channel === 'email' || draft.channel === 'whatsapp';
  const target = draft.channel === 'email' ? lead.email : lead.whatsapp_number || lead.phone;
  const delivery = governedChannel
    ? await checkGovernedDelivery(client, orgId, draft.channel as GovernedChannel, target)
    : { queued: false, provider: 'manual', reason: 'This channel is sent manually (copy the draft and record it as sent).', target: null };

  const now = new Date().toISOString();
  const nextStatus = delivery.queued ? 'sent' : 'approved';
  const { error: updateError } = await client
    .from('communications')
    .update({
      status: nextStatus,
      approved_at: now,
      approved_by: user.id,
      sent_at: delivery.queued ? now : null,
      provider_payload: { provider: delivery.provider, queued: delivery.queued, reason: delivery.reason, target: delivery.target },
    })
    .eq('id', draftId)
    .eq('organization_id', orgId);
  if (updateError) throw updateError;

  if (delivery.queued) {
    await client.from('leads').update({ last_contacted_at: now, intro_sent: true }).eq('organization_id', orgId).eq('id', leadId);
  }

  return { status: nextStatus, queued: delivery.queued, reason: delivery.reason };
}

export async function scheduleLeadFollowUp(orgId: string, leadId: string, dueAt: string, note: string | null) {
  const supabase = await createClient();
  const client = supabase as any;
  const { data: lead, error } = await client.from('leads').select('id,company_name,contact_name').eq('organization_id', orgId).eq('id', leadId).single();
  if (error || !lead) throw new Error('Lead was not found.');

  return scheduleGrowthFollowUp(orgId, 'lead', leadId, lead.company_name || lead.contact_name || 'this record', dueAt, note, `/leads/${leadId}`);
}

export async function cancelLeadFollowUp(orgId: string, leadId: string, recommendationId: string) {
  return cancelGrowthFollowUp(orgId, 'lead', leadId, recommendationId);
}
