"use server";

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { writeAuditLog } from '@/lib/auditLog';
import { hasSupabaseEnv } from '@/lib/env';
import { getComplianceStatus, getMappingState, getPricingReadiness, getQualificationState, getTaskStatus } from '@/lib/queries/lead-command-center';
import { getLeadProfileData } from '@/lib/queries/leads';
import { buildStageMoveReadiness } from '@/lib/queries/pipeline-stage-gating';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { getReadOnlyWorkspaceMessage, hasWorkspaceCapability } from '@/lib/workspace/permissions';

type ActionState = {
  error?: string;
  success?: string;
  lead?: {
    id: string;
    stage_id: string | null;
    updated_at: string | null;
  };
};

async function writeLeadStageAuditLog(input: {
  organizationId: string;
  actorUserId: string;
  leadId: string;
  previousStageId: string | null;
  nextStageId: string;
  leadName: string;
  stageName: string;
}) {
  await writeAuditLog({
    organizationId: input.organizationId,
    action: 'lead_stage_changed',
    entityType: 'lead',
    entityId: input.leadId,
    actorUserId: input.actorUserId,
    payload: {
      previous: { stage_id: input.previousStageId },
      new: { stage_id: input.nextStageId },
      metadata: {
        company_name: input.leadName,
        stage_name: input.stageName,
      },
    },
  });
}

export async function moveLeadToStage(_: ActionState | undefined, formData: FormData): Promise<ActionState> {
  if (!hasSupabaseEnv) return { error: 'Missing Supabase environment variables.' };

  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.organization || !workspace.membership) return { error: 'Not authenticated.' };
  if (!hasWorkspaceCapability(workspace.currentRoles, 'lead.manage')) {
    return { error: getReadOnlyWorkspaceMessage(workspace.currentRoles, 'lead.manage') ?? 'Your current role cannot update the pipeline.' };
  }

  const leadId = String(formData.get('lead_id') ?? '').trim();
  const stageId = String(formData.get('stage_id') ?? '').trim();
  if (!leadId || !stageId) return { error: 'Lead and stage are required.' };

  const supabase = await createClient();
  const db = supabase as any;

  const { data: currentLead, error: currentLeadError } = await db
    .from('leads')
    .select('id, company_name, stage_id, pipeline_id, organization_id')
    .eq('id', leadId)
    .eq('organization_id', workspace.organization.id)
    .single();

  if (currentLeadError || !currentLead) {
    return { error: currentLeadError?.message ?? 'Lead not found.' };
  }

  const { data: targetStage, error: stageError } = await db
    .from('pipeline_stages')
    .select('id, name, pipeline_id, sort_order, is_closed, is_won, is_lost')
    .eq('id', stageId)
    .single();

  if (stageError || !targetStage) {
    return { error: stageError?.message ?? 'Target stage not found.' };
  }

  if (!currentLead.pipeline_id) {
    return { error: 'Lead does not have a pipeline assigned yet.' };
  }

  if (targetStage.pipeline_id !== currentLead.pipeline_id) {
    return { error: 'Cannot move a lead into a stage from another pipeline.' };
  }

  const leadProfile = await getLeadProfileData(workspace.organization.id, leadId);
  if (!leadProfile?.lead) return { error: 'Lead profile could not be loaded for stage validation.' };

  const qualification = getQualificationState(leadProfile);
  const mapping = getMappingState(leadProfile);
  const compliance = getComplianceStatus(leadProfile);
  const tasks = getTaskStatus(leadProfile);
  const pricingReadiness = getPricingReadiness(leadProfile);
  const currentStage = leadProfile.stages.find((item) => item.id === currentLead.stage_id);
  const acceptedQuoteCount = leadProfile.quotes.filter((item) => ['accepted', 'approved'].includes(String(item.status ?? '').toLowerCase())).length;
  const stageReadiness = buildStageMoveReadiness({
    currentStageName: currentStage?.name ?? null,
    currentStageOrder: currentStage?.sort_order ?? null,
    targetStageName: targetStage.name,
    targetStageOrder: targetStage.sort_order ?? null,
    targetStageIsClosed: targetStage.is_closed,
    targetStageIsWon: targetStage.is_won,
    targetStageIsLost: targetStage.is_lost,
    qualificationStatus: qualification.status,
    mappingComplete: mapping.isComplete,
    complianceGate: compliance.gate,
    overdueFollowUpCount: tasks.overdueCount,
    pricingReadiness,
    rfqCount: leadProfile.rfqs.length,
    quoteCount: leadProfile.quotes.length,
    acceptedQuoteCount,
    contractCount: leadProfile.contracts.length,
  });

  if (!stageReadiness.canMove) return { error: stageReadiness.blockers[0] ?? stageReadiness.summary };

  const occurredAt = new Date().toISOString();
  const { data: moveResult, error: moveError } = await db.rpc('app_move_lead_stage_tx', {
    p_organization_id: workspace.organization.id,
    p_lead_id: leadId,
    p_stage_id: stageId,
    p_actor_user_id: workspace.user.id,
    p_occurred_at: occurredAt,
  });

  if (moveError) return { error: moveError.message };

  const updatedLeadRow = Array.isArray(moveResult) ? moveResult[0] : moveResult;
  if (!updatedLeadRow?.id) {
    return { error: 'Lead stage move did not return an updated lead record.' };
  }

  await writeLeadStageAuditLog({
    organizationId: workspace.organization.id,
    actorUserId: workspace.user.id,
    leadId,
    previousStageId: updatedLeadRow.previous_stage_id ?? currentLead.stage_id,
    nextStageId: stageId,
    leadName: updatedLeadRow.company_name ?? currentLead.company_name,
    stageName: updatedLeadRow.stage_name ?? targetStage.name,
  });

  revalidatePath('/pipeline');
  revalidatePath('/leads');
  revalidatePath('/dashboard');
  revalidatePath(`/leads/${leadId}`);

  return { success: 'Lead stage updated.', lead: { id: updatedLeadRow.id, stage_id: updatedLeadRow.stage_id ?? stageId, updated_at: updatedLeadRow.updated_at ?? occurredAt } };
}

export const moveLeadStage = moveLeadToStage;
