import { createClient } from '@/lib/supabase/server';

export type SetuGuruAuditItem = {
  id: string;
  kind: 'recommendation' | 'draft' | 'approved_action';
  title: string;
  detail: string;
  actor: string;
  entity_type: string | null;
  entity_id: string | null;
  outcome: string;
  occurred_at: string;
  reason?: string | null;
  source_context?: string | null;
};

function actorLabel(profile: any, fallback = 'System') {
  return profile?.full_name || profile?.email || fallback;
}

export async function getSetuGuruAuditHistory(orgId: string): Promise<SetuGuruAuditItem[]> {
  const supabase = await createClient();
  const client = supabase as any;

  const [recommendationsResult, draftsResult, actionsResult] = await Promise.all([
    client
      .from('ai_recommendations')
      .select('id,entity_type,entity_id,title,reason,recommended_action,status,metadata,created_by,created_at,updated_at,dismissed_at,dismiss_reason,completed_at,expired_at')
      .eq('org_id', orgId)
      .in('status', ['completed', 'dismissed', 'expired'])
      .order('updated_at', { ascending: false })
      .limit(20),
    client
      .from('communications')
      .select('id,lead_id,related_entity,related_id,channel,subject,summary,status,created_by,created_at,approved_by,approved_at,metadata')
      .eq('organization_id', orgId)
      .eq('draft_source', 'ai')
      .order('created_at', { ascending: false })
      .limit(20),
    client
      .from('audit_logs')
      .select('id,actor_user_id,entity_type,entity_id,action,payload,created_at')
      .eq('organization_id', orgId)
      .like('action', 'setu_guru_action_%')
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  for (const result of [recommendationsResult, draftsResult, actionsResult]) {
    if (result.error) throw result.error;
  }

  const actorIds = new Set<string>();
  for (const item of recommendationsResult.data ?? []) if (item.created_by) actorIds.add(item.created_by);
  for (const item of draftsResult.data ?? []) {
    if (item.created_by) actorIds.add(item.created_by);
    if (item.approved_by) actorIds.add(item.approved_by);
  }
  for (const item of actionsResult.data ?? []) if (item.actor_user_id) actorIds.add(item.actor_user_id);

  const profilesResult = actorIds.size
    ? await client.from('profiles').select('id,full_name,email').in('id', [...actorIds])
    : { data: [], error: null };
  if (profilesResult.error) throw profilesResult.error;
  const profiles = new Map((profilesResult.data ?? []).map((profile: any) => [profile.id, profile]));

  const recommendations: SetuGuruAuditItem[] = (recommendationsResult.data ?? []).map((item: any) => {
    const occurredAt = item.completed_at || item.dismissed_at || item.expired_at || item.updated_at;
    const sourceContext = item.metadata && Object.keys(item.metadata).length
      ? Object.entries(item.metadata).slice(0, 4).map(([key, value]) => `${key.replace(/_/g, ' ')}: ${String(value)}`).join(' · ')
      : null;
    return {
      id: `recommendation:${item.id}`,
      kind: 'recommendation',
      title: item.title,
      detail: item.status === 'dismissed'
        ? `Dismissed: ${item.dismiss_reason}`
        : item.status === 'completed'
          ? `Completed action: ${item.recommended_action}`
          : `Expired before action: ${item.recommended_action}`,
      actor: actorLabel(profiles.get(item.created_by)),
      entity_type: item.entity_type,
      entity_id: item.entity_id,
      outcome: item.status,
      occurred_at: occurredAt,
      reason: item.reason,
      source_context: sourceContext,
    };
  });

  const drafts: SetuGuruAuditItem[] = (draftsResult.data ?? []).map((item: any) => ({
    id: `draft:${item.id}`,
    kind: 'draft',
    title: item.subject || item.summary || `Setu Guru ${item.channel} draft`,
    detail: item.approved_at
      ? `Draft approved by ${actorLabel(profiles.get(item.approved_by), 'User')}. Sending remains a separate CRM action.`
      : 'AI-assisted draft saved to CRM. It has not been sent or approved by this workflow.',
    actor: actorLabel(profiles.get(item.created_by), 'User'),
    entity_type: item.related_entity || 'lead',
    entity_id: item.related_id || item.lead_id,
    outcome: item.approved_at ? 'approved' : item.status || 'draft',
    occurred_at: item.approved_at || item.created_at,
    source_context: item.metadata?.used_facts?.length
      ? `Grounded facts: ${item.metadata.used_facts.join(' · ')}`
      : null,
  }));

  const actions: SetuGuruAuditItem[] = (actionsResult.data ?? []).map((item: any) => ({
    id: `action:${item.id}`,
    kind: 'approved_action',
    title: item.action.replace(/^setu_guru_action_/, '').replace(/_/g, ' '),
    detail: item.payload?.approved_by_human
      ? 'Human-approved Setu Guru action recorded.'
      : 'Action record is missing explicit human-approval evidence.',
    actor: actorLabel(profiles.get(item.actor_user_id), 'User'),
    entity_type: item.entity_type,
    entity_id: item.entity_id,
    outcome: item.payload?.approved_by_human ? 'approved' : 'attention required',
    occurred_at: item.created_at,
    source_context: item.payload?.idempotency_key ? `Idempotency key: ${item.payload.idempotency_key}` : null,
  }));

  return [...recommendations, ...drafts, ...actions]
    .sort((a, b) => Date.parse(b.occurred_at) - Date.parse(a.occurred_at))
    .slice(0, 30);
}
