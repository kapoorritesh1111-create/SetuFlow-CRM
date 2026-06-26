"use server";

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireWorkspace } from '@/lib/workspace/auth';
import { hasSupabaseEnv } from '@/lib/env';
import { scheduleLeadFollowUp } from '@/features/leads/server/actions';

function clean(value: FormDataEntryValue | null) { return String(value ?? '').trim(); }
function nullable(value: FormDataEntryValue | null) { const next = clean(value); return next ? next : null; }
function numberOrNull(value: FormDataEntryValue | null) { const raw = clean(value).replace(/,/g, ''); if (!raw) return null; const parsed = Number(raw); return Number.isFinite(parsed) ? parsed : null; }
function goLead(leadId: string, params: Record<string, string>, hash?: string) { const search = new URLSearchParams(params); redirect(`/leads/${leadId}?${search.toString()}${hash ? `#${hash}` : ''}`); }
function canReassignOwner(roles: string[] | undefined) { return (roles ?? []).some((role) => ['owner', 'admin', 'manager'].includes(String(role).toLowerCase())); }

export async function saveCanonicalLeadDetails(formData: FormData) {
  if (!hasSupabaseEnv) return;
  const workspace = await requireWorkspace();
  if (!workspace?.organization || !workspace?.user) return;
  const leadId = clean(formData.get('lead_id'));
  const companyName = clean(formData.get('company_name'));
  if (!leadId || !companyName) return;
  const supabase = (await createClient()) as any;
  await supabase.from('leads').update({ company_name: companyName, contact_name: nullable(formData.get('contact_name')), job_title: nullable(formData.get('job_title')), email: nullable(formData.get('email')), phone: nullable(formData.get('phone')), whatsapp_number: nullable(formData.get('whatsapp_number')), website: nullable(formData.get('website')), country: nullable(formData.get('country')), deal_value: numberOrNull(formData.get('deal_value')), deal_currency: nullable(formData.get('deal_currency')), notes: nullable(formData.get('notes')), updated_by: workspace.user!.id }).eq('organization_id', workspace.organization!.id).eq('id', leadId);
  await supabase.from('lead_activities').insert({ organization_id: workspace.organization!.id, lead_id: leadId, actor_user_id: workspace.user!.id, kind: 'lead_updated', message: 'Lead details updated from the canonical Lead Detail page.', occurred_at: new Date().toISOString() });
  revalidatePath('/leads'); revalidatePath(`/leads/${leadId}`); revalidatePath(`/leads/${leadId}/quote`);
  goLead(leadId, { saved: 'lead' }, 'edit-lead');
}

export async function reassignCanonicalLeadOwner(formData: FormData) {
  if (!hasSupabaseEnv) return;
  const workspace = await requireWorkspace();
  if (!workspace?.organization || !workspace?.user) return;
  const leadId = clean(formData.get('lead_id'));
  const ownerUserId = clean(formData.get('owner_user_id'));
  if (!leadId || !ownerUserId) return;
  if (!canReassignOwner(workspace.currentRoles)) goLead(leadId, { stageError: 'owner-permission' }, 'lead-owner');
  const supabase = (await createClient()) as any;
  const { data: lead } = await supabase.from('leads').select('owner_user_id').eq('organization_id', workspace.organization!.id).eq('id', leadId).maybeSingle();
  const { data: member } = await supabase.from('organization_members').select('user_id').eq('organization_id', workspace.organization!.id).eq('user_id', ownerUserId).eq('is_active', true).maybeSingle();
  if (!member?.user_id) goLead(leadId, { stageError: 'owner-invalid' }, 'lead-owner');
  const { data: oldProfile } = lead?.owner_user_id ? await supabase.from('profiles').select('full_name, email').eq('id', lead.owner_user_id).maybeSingle() : { data: null };
  const { data: newProfile } = await supabase.from('profiles').select('full_name, email').eq('id', ownerUserId).maybeSingle();
  const oldName = oldProfile?.full_name || oldProfile?.email || 'Unassigned';
  const newName = newProfile?.full_name || newProfile?.email || 'New owner';
  const { error } = await supabase.from('leads').update({ owner_user_id: ownerUserId, updated_by: workspace.user!.id }).eq('organization_id', workspace.organization!.id).eq('id', leadId);
  if (error) goLead(leadId, { stageError: 'owner-update' }, 'lead-owner');
  await supabase.from('lead_activities').insert({ organization_id: workspace.organization!.id, lead_id: leadId, actor_user_id: workspace.user!.id, kind: 'owner_changed', message: `Lead owner changed from ${oldName} to ${newName}.`, occurred_at: new Date().toISOString() });
  revalidatePath('/leads'); revalidatePath(`/leads/${leadId}`);
  goLead(leadId, { saved: 'owner' }, 'lead-owner');
}

export async function moveCanonicalLeadStage(formData: FormData) {
  if (!hasSupabaseEnv) return;
  const workspace = await requireWorkspace();
  if (!workspace?.organization || !workspace?.user) return;
  const leadId = clean(formData.get('lead_id'));
  const stageId = clean(formData.get('stage_id'));
  if (!leadId || !stageId) return;
  const supabase = (await createClient()) as any;
  const { data: stage, error: stageError } = await supabase.from('pipeline_stages').select('id, name, pipeline_id').eq('id', stageId).maybeSingle();
  if (stageError || !stage?.id) goLead(leadId, { stageError: 'stage-not-found' }, 'stage-strip');
  const { error } = await supabase.from('leads').update({ stage_id: stageId, pipeline_id: stage.pipeline_id, updated_by: workspace.user!.id }).eq('organization_id', workspace.organization!.id).eq('id', leadId);
  if (error) goLead(leadId, { stageError: 'db-update-failed' }, 'stage-strip');
  await supabase.from('lead_activities').insert({ organization_id: workspace.organization!.id, lead_id: leadId, actor_user_id: workspace.user!.id, kind: 'stage_changed', message: `Lead stage moved to ${stage.name} from canonical Lead Detail.`, occurred_at: new Date().toISOString() });
  revalidatePath('/leads'); revalidatePath(`/leads/${leadId}`);
  goLead(leadId, { saved: 'stage' }, 'stage-strip');
}

export async function scheduleCanonicalLeadFollowUp(formData: FormData): Promise<void> {
  const leadId = clean(formData.get('lead_id'));
  await scheduleLeadFollowUp(undefined, formData);
  if (leadId) goLead(leadId, { saved: 'follow-up' }, 'follow-up');
}

export async function completeCanonicalLeadFollowUp(formData: FormData) {
  if (!hasSupabaseEnv) return;
  const workspace = await requireWorkspace();
  if (!workspace?.organization || !workspace?.user) return;
  const leadId = clean(formData.get('lead_id'));
  const followUpId = clean(formData.get('follow_up_id'));
  if (!leadId || !followUpId) return;
  const supabase = (await createClient()) as any;
  const now = new Date().toISOString();
  await supabase.from('lead_follow_ups').update({ status: 'completed', completed_at: now }).eq('organization_id', workspace.organization!.id).eq('lead_id', leadId).eq('id', followUpId);
  await supabase.from('leads').update({ next_follow_up_at: null, updated_by: workspace.user!.id }).eq('organization_id', workspace.organization!.id).eq('id', leadId);
  await supabase.from('lead_activities').insert({ organization_id: workspace.organization!.id, lead_id: leadId, actor_user_id: workspace.user!.id, kind: 'follow_up_completed', message: 'Follow-up marked completed from canonical Lead Detail.', occurred_at: now });
  revalidatePath('/leads'); revalidatePath(`/leads/${leadId}`);
  goLead(leadId, { saved: 'follow-up' }, 'follow-up');
}

export async function saveCanonicalQualificationMapping(formData: FormData) {
  if (!hasSupabaseEnv) return;
  const workspace = await requireWorkspace();
  if (!workspace?.organization || !workspace?.user) return;
  const leadId = clean(formData.get('lead_id'));
  if (!leadId) return;
  const supabase = (await createClient()) as any;
  const productIds = formData.getAll('product_ids').map((value) => String(value).trim()).filter(Boolean);
  const marketIds = formData.getAll('market_ids').map((value) => String(value).trim()).filter(Boolean);
  const qualificationNotes = nullable(formData.get('qualification_notes'));
  const now = new Date().toISOString();
  await supabase.from('lead_product_interests').delete().eq('organization_id', workspace.organization!.id).eq('lead_id', leadId);
  if (productIds.length) await supabase.from('lead_product_interests').insert(productIds.map((productId) => ({ organization_id: workspace.organization!.id, lead_id: leadId, product_id: productId, interest_type: 'mapped', source_context: { source: 'canonical_lead_detail' } })));
  await supabase.from('lead_markets').delete().eq('organization_id', workspace.organization!.id).eq('lead_id', leadId);
  if (marketIds.length) await supabase.from('lead_markets').insert(marketIds.map((marketId) => ({ organization_id: workspace.organization!.id, lead_id: leadId, market_id: marketId })));
  await supabase.from('leads').update({ notes: qualificationNotes ?? undefined, updated_by: workspace.user!.id }).eq('organization_id', workspace.organization!.id).eq('id', leadId);
  await supabase.from('lead_activities').insert({ organization_id: workspace.organization!.id, lead_id: leadId, actor_user_id: workspace.user!.id, kind: 'lead_qualified', message: `Qualification and mapping saved from canonical Lead Detail (${productIds.length} products, ${marketIds.length} markets).`, occurred_at: now });
  revalidatePath('/leads'); revalidatePath(`/leads/${leadId}`); revalidatePath(`/leads/${leadId}/quote`);
  goLead(leadId, { saved: 'qualification' }, 'qualification');
}
