'use server';

import { revalidatePath } from 'next/cache';
import { requireSetuInternalAdminWorkspace } from '@/lib/workspace/auth';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { INTERNAL_ORG_ID } from '@/lib/config/internal';

function str(v: FormDataEntryValue | null): string { return typeof v === 'string' ? v.trim() : ''; }

export async function createIncident(formData: FormData): Promise<void> {
  await requireSetuInternalAdminWorkspace();
  const title = str(formData.get('title'));
  if (!title) return;
  const ref = `INC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 900 + 100)}`;
  const admin = createAdminSupabaseClient() as any;
  await admin.from('smc_incidents').insert({
    organization_id: INTERNAL_ORG_ID,
    incident_ref: ref,
    title,
    severity: str(formData.get('severity')) || 'P2',
    status: 'investigating',
    description: str(formData.get('description')) || null,
    impact_summary: str(formData.get('impact_summary')) || null,
    commander_name: str(formData.get('commander_name')) || null,
    detected_at: new Date().toISOString(),
  });
  revalidatePath('/smc/incidents');
}

export async function resolveIncident(formData: FormData): Promise<void> {
  await requireSetuInternalAdminWorkspace();
  const id = str(formData.get('id'));
  if (!id) return;
  const admin = createAdminSupabaseClient() as any;
  await admin.from('smc_incidents').update({
    status: 'resolved',
    resolution: str(formData.get('resolution')) || null,
    resolved_at: new Date().toISOString(),
  }).eq('id', id);
  revalidatePath('/smc/incidents');
}
