import { NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import {
  formatTrialIntentAction,
  getTrialUpgradeModule,
  isTrialUpgradeIntentAction,
  isTrialUpgradeModuleKey,
  type TrialUpgradeIntentAction,
  type TrialUpgradeModuleKey,
} from '@/lib/trial/upgrade-intent';
import { getWorkspaceAccess } from '@/lib/workspace/auth';

type UpgradeIntentBody = {
  module?: unknown;
  action?: unknown;
};

type InternalLeadRow = {
  id: string;
  organization_id: string;
  pipeline_id: string | null;
  stage_id: string | null;
};

type StageRow = {
  id: string;
};

function jsonError(message: string, status = 400) {
  return Response.json({ ok: false, error: message }, { status });
}

function normalizeIntentBody(body: UpgradeIntentBody): { module: TrialUpgradeModuleKey; action: TrialUpgradeIntentAction } | null {
  const module = typeof body.module === 'string' ? body.module : '';
  const action = typeof body.action === 'string' ? body.action : '';

  if (!isTrialUpgradeModuleKey(module) || !isTrialUpgradeIntentAction(action)) {
    return null;
  }

  return { module, action };
}

function getDedupeBucket(date: Date) {
  return new Date(Math.floor(date.getTime() / 60000) * 60000).toISOString();
}

function buildActivityMessage(moduleKey: TrialUpgradeModuleKey, action: TrialUpgradeIntentAction) {
  const module = getTrialUpgradeModule(moduleKey);
  return `${formatTrialIntentAction(action)}: ${module.label} from Trade Show Trial workspace.`;
}

async function getOrCreateEngagedStage(input: { serviceClient: ReturnType<typeof createServiceRoleClient>; lead: InternalLeadRow; occurredAt: string }) {
  const { serviceClient, lead, occurredAt } = input;
  if (!serviceClient || !lead.pipeline_id) return null;

  const { data: existingStage } = await serviceClient
    .from('pipeline_stages')
    .select('id')
    .eq('pipeline_id', lead.pipeline_id)
    .ilike('name', 'Engaged Lead')
    .maybeSingle<StageRow>();

  if (existingStage?.id) return existingStage.id;

  const { data: createdStage, error } = await serviceClient
    .from('pipeline_stages')
    .insert({
      pipeline_id: lead.pipeline_id,
      name: 'Engaged Lead',
      sort_order: 20,
      color: '#2563eb',
      updated_at: occurredAt,
    })
    .select('id')
    .single<StageRow>();

  if (error) return null;
  return createdStage?.id ?? null;
}

export async function POST(request: NextRequest) {
  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.membership || !workspace.organization) {
    return jsonError('Workspace membership required.', 401);
  }

  let body: UpgradeIntentBody;
  try {
    body = (await request.json()) as UpgradeIntentBody;
  } catch {
    return jsonError('Invalid upgrade intent payload.', 400);
  }

  const normalized = normalizeIntentBody(body);
  if (!normalized) {
    return jsonError('Choose a valid upgrade preview module and action.', 400);
  }

  const serviceClient = createServiceRoleClient();
  if (!serviceClient) {
    return jsonError('Upgrade intent tracking is unavailable.', 500);
  }

  const { data: lead, error: leadError } = await serviceClient
    .from('leads')
    .select('id, organization_id, pipeline_id, stage_id')
    .eq('trial_org_id', workspace.organization.id)
    .maybeSingle<InternalLeadRow>();

  if (leadError) {
    return jsonError(leadError.message ?? 'Could not find the internal trial lead.', 500);
  }

  if (!lead?.id) {
    return jsonError('Internal trial lead was not found for this workspace.', 404);
  }

  const now = new Date();
  const occurredAt = now.toISOString();
  const dedupeBucket = getDedupeBucket(now);
  const metadata = {
    trial_workspace_org_name: workspace.organization.name,
    source: 'trade_show_trial_workspace',
  };

  const { error: intentError } = await serviceClient
    .from('trial_intent_events')
    .insert({
      trial_org_id: workspace.organization.id,
      internal_lead_id: lead.id,
      actor_user_id: workspace.user.id,
      action: normalized.action,
      module: normalized.module,
      occurred_at: occurredAt,
      dedupe_bucket: dedupeBucket,
      metadata,
    });

  if (intentError?.code === '23505') {
    return Response.json({ ok: true, deduped: true, module: normalized.module, action: normalized.action });
  }

  if (intentError) {
    return jsonError(intentError.message ?? 'Could not record upgrade intent.', 500);
  }

  const activityMessage = buildActivityMessage(normalized.module, normalized.action);
  await serviceClient.from('lead_activities').insert({
    organization_id: lead.organization_id,
    lead_id: lead.id,
    actor_user_id: null,
    kind: normalized.action === 'upgrade_requested' ? 'trial_upgrade_requested' : 'trial_preview_viewed',
    message: activityMessage,
    occurred_at: occurredAt,
  });

  const { count } = await serviceClient
    .from('trial_intent_events')
    .select('id', { count: 'exact', head: true })
    .eq('trial_org_id', workspace.organization.id);

  const intentCount = count ?? 1;
  const hotLead = normalized.action === 'upgrade_requested' || intentCount >= 2;
  const score = normalized.action === 'upgrade_requested' ? 95 : Math.min(90, 60 + intentCount * 8);
  await serviceClient.from('lead_scores').insert({
    lead_id: lead.id,
    calculated_by: null,
    score,
    rationale: `${activityMessage} Total upgrade intent signals: ${intentCount}.`,
  });

  if (hotLead) {
    const engagedStageId = await getOrCreateEngagedStage({ serviceClient, lead, occurredAt });
    if (engagedStageId) {
      await serviceClient
        .from('leads')
        .update({ stage_id: engagedStageId, updated_at: occurredAt })
        .eq('id', lead.id);
    }
  }

  return Response.json({ ok: true, deduped: false, module: normalized.module, action: normalized.action, hotLead, intentCount });
}
