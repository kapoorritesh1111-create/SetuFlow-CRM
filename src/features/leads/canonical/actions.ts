"use server";

import { revalidatePath } from 'next/cache';
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
    updated_by: workspace.user.id,
  };

  await supabase
    .from('leads')
    .update(updatePayload)
    .eq('organization_id', workspace.organization.id)
    .eq('id', leadId);

  await supabase.from('lead_activities').insert({
    organization_id: workspace.organization.id,
    lead_id: leadId,
    actor_user_id: workspace.user.id,
    kind: 'lead_updated',
    message: 'Lead details updated from the canonical Lead Detail page.',
    occurred_at: new Date().toISOString(),
  });

  revalidatePath('/leads');
  revalidatePath(`/leads/${leadId}`);
  revalidatePath(`/leads/${leadId}/quote`);
}

import { moveLeadToStage } from '@/features/pipeline/server/actions';
import { scheduleLeadFollowUp } from '@/features/leads/server/actions';

export async function moveCanonicalLeadStage(formData: FormData) {
  await moveLeadToStage(undefined, formData);
}

export async function scheduleCanonicalLeadFollowUp(formData: FormData) {
  await scheduleLeadFollowUp(undefined, formData);
}
