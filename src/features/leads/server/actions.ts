"use server";

// SF-18-007: Small public server-action entrypoint.
// Keep existing imports stable while the legacy action implementation is split by domain.
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/env';
import { requireWorkspace } from '@/lib/workspace/auth';
import { enforceTrialAction, toTrialActionError } from '@/lib/trial/enforcement';
import {
  saveLead as legacySaveLead,
  openOrCreateLeadQuoteDraft as legacyOpenOrCreateLeadQuoteDraft,
  saveLeadQuoteDraftPreview as legacySaveLeadQuoteDraftPreview,
} from '@/features/leads/server/actions/legacy-actions';

export * from '@/features/leads/server/actions/legacy-actions';

async function getExistingQuoteForLead(organizationId: string, leadId: string) {
  if (!hasSupabaseEnv || !leadId) return null;
  const db: any = await createClient();
  const { data } = await db
    .from('quotes')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('lead_id', leadId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.id ?? null;
}

export async function saveLead(
  previousState: Parameters<typeof legacySaveLead>[0],
  formData: Parameters<typeof legacySaveLead>[1],
): ReturnType<typeof legacySaveLead> {
  const leadId = String(formData.get('lead_id') ?? '').trim();
  if (!leadId) {
    const workspace = await requireWorkspace();
    const organizationId = workspace.organization?.id;
    if (!organizationId) return { error: 'Not authenticated.' };

    const decision = await enforceTrialAction({ organizationId, action: 'create_lead' });
    const error = toTrialActionError(decision);
    if (error) return { error };
  }

  return legacySaveLead(previousState, formData);
}

export async function openOrCreateLeadQuoteDraft(
  leadId: Parameters<typeof legacyOpenOrCreateLeadQuoteDraft>[0],
): ReturnType<typeof legacyOpenOrCreateLeadQuoteDraft> {
  const workspace = await requireWorkspace();
  const organizationId = workspace.organization?.id;
  if (!organizationId) return { error: 'Not authenticated.' };

  const existingQuoteId = await getExistingQuoteForLead(organizationId, leadId);
  if (!existingQuoteId) {
    const decision = await enforceTrialAction({ organizationId, action: 'create_quote' });
    const error = toTrialActionError(decision);
    if (error) return { error };
  }

  return legacyOpenOrCreateLeadQuoteDraft(leadId);
}

export async function saveLeadQuoteDraftPreview(
  input: Parameters<typeof legacySaveLeadQuoteDraftPreview>[0],
): ReturnType<typeof legacySaveLeadQuoteDraftPreview> {
  const workspace = await requireWorkspace();
  const organizationId = workspace.organization?.id;
  if (!organizationId) return { error: 'Not authenticated.' };

  const existingQuoteId = await getExistingQuoteForLead(organizationId, input.leadId);
  if (!existingQuoteId) {
    const decision = await enforceTrialAction({ organizationId, action: 'create_quote' });
    const error = toTrialActionError(decision);
    if (error) return { error };
  }

  return legacySaveLeadQuoteDraftPreview(input);
}
