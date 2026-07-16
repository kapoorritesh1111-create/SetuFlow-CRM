import { createClient } from '@/lib/supabase/server';

export type FollowUpEntity = 'lead' | 'external_opportunity';

/**
 * S48-GROWTH-018: schedules a follow-up by inserting an ai_recommendations row so it appears
 * in the existing Today/Work Queue and Completed history without a parallel task system.
 * Explicit human action only — never created automatically in the background.
 */
export async function scheduleGrowthFollowUp(
  orgId: string,
  entityType: FollowUpEntity,
  entityId: string,
  companyName: string,
  dueAt: string,
  note: string | null,
  actionHref: string,
) {
  const supabase = await createClient();
  const client = supabase as any;
  const { data: { user } } = await supabase.auth.getUser();

  const priority = new Date(dueAt).getTime() <= Date.now() + 24 * 60 * 60 * 1000 ? 'high' : 'medium';

  const { data: recommendation, error } = await client
    .from('ai_recommendations')
    .insert({
      org_id: orgId,
      entity_type: entityType,
      entity_id: entityId,
      recommendation_type: 'growth_outreach_follow_up',
      title: `Follow up with ${companyName}`,
      summary: note ?? `Scheduled follow-up for ${companyName}.`,
      reason: entityType === 'lead' ? 'A CRM Matches outreach follow-up was scheduled.' : 'An External Discovery outreach follow-up was scheduled.',
      recommended_action: note?.trim() || `Reach out to ${companyName} again.`,
      action_href: actionHref,
      priority,
      status: 'open',
      created_by: user?.id ?? null,
      metadata: { due_at: dueAt, entity_type: entityType, entity_id: entityId, source: 'growth_center' },
    })
    .select('id')
    .single();
  if (error) throw error;

  if (entityType === 'external_opportunity') {
    const { error: updateError } = await client
      .from('external_opportunities')
      .update({ next_follow_up_at: dueAt, follow_up_recommendation_id: recommendation.id, updated_at: new Date().toISOString() })
      .eq('org_id', orgId)
      .eq('id', entityId);
    if (updateError) throw updateError;
  } else {
    const { error: updateError } = await client
      .from('leads')
      .update({ next_follow_up_at: dueAt })
      .eq('organization_id', orgId)
      .eq('id', entityId);
    if (updateError) throw updateError;
  }

  return { recommendationId: recommendation.id as string };
}

/** Cancels a scheduled follow-up. Requires an explicit user action — never silent. */
export async function cancelGrowthFollowUp(orgId: string, entityType: FollowUpEntity, entityId: string, recommendationId: string) {
  const supabase = await createClient();
  const client = supabase as any;

  const { error: dismissError } = await client
    .from('ai_recommendations')
    .update({ status: 'dismissed', dismissed_at: new Date().toISOString(), dismiss_reason: 'Cancelled from Growth Center.' })
    .eq('org_id', orgId)
    .eq('id', recommendationId)
    .eq('status', 'open');
  if (dismissError) throw dismissError;

  if (entityType === 'external_opportunity') {
    await client
      .from('external_opportunities')
      .update({ next_follow_up_at: null, follow_up_recommendation_id: null, updated_at: new Date().toISOString() })
      .eq('org_id', orgId)
      .eq('id', entityId)
      .eq('follow_up_recommendation_id', recommendationId);
  } else {
    await client.from('leads').update({ next_follow_up_at: null }).eq('organization_id', orgId).eq('id', entityId);
  }
}
