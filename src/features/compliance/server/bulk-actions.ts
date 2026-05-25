"use server";

import { revalidatePath } from 'next/cache';
import { hasSupabaseEnv } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { getReadOnlyWorkspaceMessage, hasWorkspaceCapability } from '@/lib/workspace/permissions';

type ActionState = { error?: string; success?: string };

export async function bulkWaiveComplianceWorkflow(_: ActionState | undefined, formData: FormData): Promise<ActionState> {
  if (!hasSupabaseEnv) return { error: 'Missing Supabase environment variables.' };

  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.organization) return { error: 'Not authenticated.' };
  if (!hasWorkspaceCapability(workspace.currentRoles, 'compliance.review')) {
    return { error: getReadOnlyWorkspaceMessage(workspace.currentRoles, 'compliance.review') ?? 'Your current role cannot waive compliance requirements.' };
  }

  const complianceIds = Array.from(new Set(formData.getAll('compliance_id').map((value) => String(value).trim()).filter(Boolean)));
  const reviewNotes = String(formData.get('review_notes') ?? '').trim();

  if (!complianceIds.length) return { error: 'Select at least one compliance requirement to waive.' };
  if (complianceIds.length > 25) return { error: 'Bulk waive is limited to 25 requirements at a time.' };
  if (reviewNotes.length < 8) return { error: 'Add a waiver reason before approving these exceptions.' };

  const db = await createClient();
  const { data: existingItems, error: existingError } = await db
    .from('lead_compliance_items')
    .select('id, lead_id')
    .eq('organization_id', workspace.organization.id)
    .in('id', complianceIds);

  if (existingError) return { error: existingError.message };
  if (!existingItems?.length) return { error: 'No selected compliance items were found in the active organization.' };
  if (existingItems.length !== complianceIds.length) return { error: 'One or more selected compliance items are no longer available in this workspace.' };

  const touchedLeadIds = new Set<string>();

  for (const item of existingItems) {
    const { data: updatedComplianceResult, error: updateComplianceTxError } = await db.rpc('app_update_compliance_workflow_tx', {
      p_organization_id: workspace.organization.id,
      p_compliance_id: item.id,
      p_actor_user_id: workspace.user.id,
      p_status: 'waived',
      p_review_notes: reviewNotes,
      p_action_source: 'bulkWaiveComplianceWorkflow',
    });

    if (updateComplianceTxError) return { error: updateComplianceTxError.message };

    const updatedCompliance = Array.isArray(updatedComplianceResult) ? updatedComplianceResult[0] : updatedComplianceResult;
    const leadId = typeof updatedCompliance?.lead_id === 'string' ? updatedCompliance.lead_id : item.lead_id;
    if (typeof leadId === 'string') touchedLeadIds.add(leadId);
  }

  revalidatePath('/documents');
  revalidatePath('/compliance');
  revalidatePath('/pipeline');
  for (const leadId of touchedLeadIds) revalidatePath(`/leads/${leadId}`);

  return { success: `Waived ${existingItems.length} compliance requirement${existingItems.length === 1 ? '' : 's'}.` };
}
