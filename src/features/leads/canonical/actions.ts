"use server";

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireWorkspace } from '@/lib/workspace/auth';
import { hasSupabaseEnv } from '@/lib/env';

function clean(value: FormDataEntryValue | null) {
  return String(value ?? '').trim();
}

function nullable(value: FormDataEntryValue | null) {
  const next = clean(value);
  return next ? next : null;
}

function numberOrNull(value: FormDataEntryValue | null) {
  const raw = clean(value).replace(/,/g, '');
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function saveCanonicalLeadDetails(formData: FormData) {
  if (!hasSupabaseEnv) return;
  const workspace = await requireWorkspace();
  if (!workspace?.organization || !workspace?.user) return;

  const leadId = clean(formData.get('lead_id'));
  const companyName = clean(formData.get('company_name'));
  if (!leadId || !companyName) return;

  const supabase = (await createClient()) as any;
  const updatePayload = {
    company_name: companyName,
    contact_name: nullable(formData.get('contact_name')),
    job_title: nullable(formData.get('job_title')),
    email: nullable(formData.get('email')),
    phone: nullable(formData.get('phone')),
    whatsapp_number: nullable(formData.get('whatsapp_number')),
    website: nullable(formData.get('website')),
    country: nullable(formData.get('country')),
    deal_value: numberOrNull(formData.get('deal_value')),
    deal_currency: nullable(formData.get('deal_currency')),
    notes: nullable(formData.get('notes')),
    updated_by: workspace.user!.id,
  };

  await supabase
    .from('leads')
    .update(updatePayload)
    .eq('organization_id', workspace.organization!.id)
    .eq('id', leadId);

  await supabase.from('lead_activities').insert({
    organization_id: workspace.organization!.id,
    lead_id: leadId,
    actor_user_id: workspace.user!.id,
    kind: 'lead_updated',
    message: 'Lead details updated from the canonical Lead Detail page.',
    occurred_at: new Date().toISOString(),
  });

  revalidatePath('/leads');
  revalidatePath(`/leads/${leadId}`);
  revalidatePath(`/leads/${leadId}/quote`);
  redirect(`/leads/${leadId}?saved=lead#edit-lead`);
}

import { moveLeadToStage } from '@/features/pipeline/server/actions';
import { scheduleLeadFollowUp } from '@/features/leads/server/actions';

export async function moveCanonicalLeadStage(formData: FormData) {
  await moveLeadToStage(undefined, formData);
}

export async function scheduleCanonicalLeadFollowUp(formData: FormData): Promise<void> {
  const leadId = clean(formData.get('lead_id'));
  await scheduleLeadFollowUp(undefined, formData);
  if (leadId) redirect(`/leads/${leadId}?saved=follow-up#follow-up`);
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
  revalidatePath('/leads');
  revalidatePath(`/leads/${leadId}`);
  redirect(`/leads/${leadId}?saved=follow-up#follow-up`);
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
  const readiness = nullable(formData.get('readiness'));
  const now = new Date().toISOString();

  await supabase.from('lead_product_interests').delete().eq('organization_id', workspace.organization!.id).eq('lead_id', leadId);
  if (productIds.length) {
    await supabase.from('lead_product_interests').insert(productIds.map((productId) => ({ organization_id: workspace.organization!.id, lead_id: leadId, product_id: productId, interest_type: 'mapped', source_context: { source: 'canonical_lead_detail' } })));
  }
  await supabase.from('lead_markets').delete().eq('organization_id', workspace.organization!.id).eq('lead_id', leadId);
  if (marketIds.length) {
    await supabase.from('lead_markets').insert(marketIds.map((marketId) => ({ organization_id: workspace.organization!.id, lead_id: leadId, market_id: marketId })));
  }
  await supabase.from('leads').update({ notes: qualificationNotes ?? undefined, updated_by: workspace.user!.id }).eq('organization_id', workspace.organization!.id).eq('id', leadId);
  await supabase.from('lead_activities').insert({ organization_id: workspace.organization!.id, lead_id: leadId, actor_user_id: workspace.user!.id, kind: 'lead_qualified', message: `Qualification and mapping saved from canonical Lead Detail (${productIds.length} products, ${marketIds.length} markets).`, occurred_at: now });
  revalidatePath('/leads');
  revalidatePath(`/leads/${leadId}`);
  revalidatePath(`/leads/${leadId}/quote`);
  redirect(`/leads/${leadId}?saved=qualification#qualification`);
}
