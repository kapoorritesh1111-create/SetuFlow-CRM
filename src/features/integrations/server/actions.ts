"use server";

import { revalidatePath } from 'next/cache';
import { recordAuditEvent } from '@/lib/auditLog';
import { hasSupabaseEnv } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { requireWorkspace } from '@/lib/workspace/auth';

export type IntegrationReplayActionState = {
  error?: string;
  success?: string;
};

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
  if (!integrationId) return { error: 'Integration is required.' };

  const supabase = await createClient();
  const { data: integration, error } = await (supabase as any)
    .from('integrations')
    .select('id, provider')
    .eq('organization_id', workspace.organization.id)
    .eq('id', integrationId)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!integration?.id) return { error: 'Integration not found in the active workspace.' };

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
    },
  });

  revalidatePath('/integrations');
  return { success: `Replay request logged for ${provider || integration.provider}.` };
}
