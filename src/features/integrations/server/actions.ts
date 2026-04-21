"use server";

import { revalidatePath } from 'next/cache';
import { recordAuditEvent } from '@/lib/auditLog';
import { hasSupabaseEnv } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { requireWorkspace } from '@/lib/workspace/auth';
import { buildGovernedContractSyncPayload } from '@/features/integrations/server/governed-sync';

export type IntegrationReplayActionState = {
  error?: string;
  success?: string;
};

export type IntegrationQueueActionState = {
  error?: string;
  success?: string;
};

function readRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function readAttemptCount(payload: Record<string, unknown>) {
  const metadata = readRecord(payload.metadata);
  const value = metadata.attempt_count;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return 1;
}

export async function requestIntegrationReplay(
  _: IntegrationReplayActionState | undefined,
  formData: FormData,
): Promise<IntegrationReplayActionState> {
  if (!hasSupabaseEnv) return { error: 'Missing Supabase environment variables.' };
  const workspace = await requireWorkspace();
  if (!workspace.user || !workspace.organization || !workspace.membership) return { error: 'Not authenticated.' };

  const integrationId = String(formData.get('integration_id') ?? '').trim();
  const eventId = String(formData.get('event_id') ?? '').trim() || null;
  const provider = String(formData.get('provider') ?? '').trim() || 'integration';
  const reason = String(formData.get('reason') ?? '').trim() || 'Operator requested replay from integrations workspace.';
  if (!integrationId || !eventId) return { error: 'Integration event is required.' };

  const supabase = await createClient();
  const { data: integration, error } = await (supabase as any)
    .from('integrations')
    .select('id, provider')
    .eq('organization_id', workspace.organization.id)
    .eq('id', integrationId)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!integration?.id) return { error: 'Integration not found in the active workspace.' };

  const { data: event, error: eventError } = await (supabase as any)
    .from('integration_events')
    .select('id, payload, status, direction')
    .eq('integration_id', integration.id)
    .eq('id', eventId)
    .maybeSingle();

  if (eventError) return { error: eventError.message };
  if (!event?.id) return { error: 'Integration event not found.' };

  const payload = readRecord(event.payload);
  const metadata = readRecord(payload.metadata);
  const nextAttempt = readAttemptCount(payload) + 1;
  const nextPayload = {
    ...payload,
    metadata: {
      ...metadata,
      attempt_count: nextAttempt,
      replay_requested: true,
      replay_reason: reason,
      replay_requested_by: workspace.user.id,
    },
    continuity: {
      ...readRecord(payload.continuity),
      attempt_count: nextAttempt,
    },
  };

  const { error: updateError } = await (supabase as any)
    .from('integration_events')
    .update({
      status: 'queued',
      payload: nextPayload,
      processed_at: null,
    })
    .eq('integration_id', integration.id)
    .eq('id', eventId);

  if (updateError) return { error: updateError.message };

  await recordAuditEvent(workspace.organization.id, {
    eventType: 'integration_replay_requested',
    entityType: 'integrations',
    entityId: integration.id,
    actorId: workspace.user.id,
    metadata: {
      event_id: eventId,
      provider: provider || integration.provider,
      reason,
      requested_from: 'integrations_workspace',
      direction: event.direction,
      next_attempt: nextAttempt,
    },
  });

  revalidatePath('/integrations');
  return { success: `Replay queued for ${provider || integration.provider}.` };
}

export async function queueGovernedIntegrationSync(
  _: IntegrationQueueActionState | undefined,
  formData: FormData,
): Promise<IntegrationQueueActionState> {
  if (!hasSupabaseEnv) return { error: 'Missing Supabase environment variables.' };
  const workspace = await requireWorkspace();
  if (!workspace.user || !workspace.organization || !workspace.membership) return { error: 'Not authenticated.' };

  const integrationId = String(formData.get('integration_id') ?? '').trim();
  const provider = String(formData.get('provider') ?? '').trim();
  const targetType = String(formData.get('target_type') ?? '').trim();
  const targetId = String(formData.get('target_id') ?? '').trim();
  const reason = String(formData.get('reason') ?? '').trim() || 'Operator queued governed outbound sync.';
  if (!integrationId || !provider || !targetType || !targetId) return { error: 'Integration, provider, and target are required.' };
  if (targetType !== 'contract') return { error: 'Only governed contract sync is supported in this baseline.' };

  const db = (await createClient()) as any;
  const { data: integration, error } = await db
    .from('integrations')
    .select('id, provider, organization_id')
    .eq('organization_id', workspace.organization.id)
    .eq('id', integrationId)
    .maybeSingle();
  if (error) return { error: error.message };
  if (!integration?.id) return { error: 'Integration not found in the active workspace.' };

  const governed = await buildGovernedContractSyncPayload({
    db,
    organizationId: workspace.organization.id,
    contractId: targetId,
    provider,
  });
  if (!governed) return { error: 'Governed sync target could not be resolved.' };
  if (governed.blockedReasons.length) return { error: governed.blockedReasons[0] };

  const { data: priorEvents } = await db
    .from('integration_events')
    .select('payload')
    .eq('integration_id', integration.id)
    .order('created_at', { ascending: false })
    .limit(20);

  const priorAttempt = (Array.isArray(priorEvents) ? priorEvents : []).reduce((max: number, event: any) => {
    const payload = readRecord(event.payload);
    const metadata = readRecord(payload.metadata);
    const targetKey = typeof metadata.target_key === 'string' ? metadata.target_key : null;
    return targetKey === governed.targetKey ? Math.max(max, readAttemptCount(payload)) : max;
  }, 0);

  const eventPayload = {
    mapped_payload: governed.payload,
    validation: { ok: true, errors: [], label: 'Outbound payload generated from governed repo truth' },
    continuity: { key: governed.continuityKey, attempt_count: priorAttempt + 1 },
    impact: {
      safeToApply: true,
      summary: governed.summary,
      blockedReasons: [],
    },
    metadata: {
      target_key: governed.targetKey,
      target_type: governed.targetType,
      target_id: governed.targetId,
      attempt_count: priorAttempt + 1,
      queued_reason: reason,
      queued_by: workspace.user.id,
      generated_from: 'integrations_workspace',
    },
  };

  const { error: insertError } = await db
    .from('integration_events')
    .insert({
      integration_id: integration.id,
      direction: 'outbound',
      event_type: provider === 'erp_mock' ? 'commercial_continuity_sync' : 'execution_continuity_sync',
      status: 'queued',
      payload: eventPayload,
      processed_at: null,
    });

  if (insertError) return { error: insertError.message };

  await recordAuditEvent(workspace.organization.id, {
    eventType: 'integration_replay_requested',
    entityType: 'integrations',
    entityId: integration.id,
    actorId: workspace.user.id,
    metadata: {
      provider,
      reason,
      requested_from: 'governed_outbound_queue',
      target_type: governed.targetType,
      target_id: governed.targetId,
      continuity_key: governed.continuityKey,
      attempt_count: priorAttempt + 1,
    },
  });

  revalidatePath('/integrations');
  revalidatePath('/orders');
  revalidatePath('/contracts');
  return { success: `Governed ${provider.replace(/_/g, ' ')} sync queued.` };
}
